import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import {
  subscribeToRoom,
  markNumber as firebaseMarkNumber,
  makeClaim,
  sendReaction,
  leaveRoom,
  RoomData,
} from '../src/firebase/roomService';
import TicketView, { PLAYER_COLORS } from '../src/components/TicketView';
import Confetti from '../src/components/Confetti';
import GameAlert, { getFunMessage } from '../src/components/GameAlert';
import GameOverSummary from '../src/components/GameOverSummary';
import { useGameAlert } from '../src/hooks/useGameAlert';
import ReactionBar, { ReactionOverlay } from '../src/components/ReactionBar';
import ClaimButtons from '../src/components/ClaimButtons';
import { ClaimType, CLAIM_LABELS } from '../src/utils/gameLogic';
import { saveGameHistory, clearActiveSession } from '../src/utils/storage';
import { useAuth } from '../src/store/AuthContext';
import { hapticLight, hapticSuccess, hapticError } from '../src/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { getNumberAnnouncement } from '../src/utils/numberNicknames';

function safeArray(val: any): number[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.values(val);
}

export default function MpPlayerScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { isPremium } = useAuth();
  const { roomCode, playerName } = useLocalSearchParams<{ roomCode: string; playerName: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [lastClaimAnnounced, setLastClaimAnnounced] = useState<Set<string>>(new Set());
  const [autoMark, setAutoMark] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFloatingNumber, setShowFloatingNumber] = useState(false);
  const calledNumberY = useRef(0);
  const historySavedRef = useRef(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showAllCalled, setShowAllCalled] = useState(false);
  const { alertState, showAlert, hideAlert } = useGameAlert();
  const lastAutoMarkedNumber = useRef<number | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    return subscribeToRoom(roomCode, setRoom);
  }, [roomCode]);

  // Handle host cancelling or restarting the game
  useEffect(() => {
    if (room?.status === 'cancelled') {
      showAlert('Game Ended', 'The host has ended the game.', 'warning', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
    if (room?.status === 'waiting') {
      setShowGameOver(false);
      historySavedRef.current = false;
      router.replace(`/lobby?roomCode=${roomCode}&playerName=${playerName}&isHost=false`);
    }
  }, [room?.status]);

  // Voice announce called numbers
  const lastSpokenNumber = useRef<number | null>(null);
  useEffect(() => {
    if (!voiceEnabled || !room?.currentNumber) return;
    if (room.currentNumber === lastSpokenNumber.current) return;
    lastSpokenNumber.current = room.currentNumber;
    Speech.stop();
    setTimeout(() => {
      Speech.speak(getNumberAnnouncement(room.currentNumber!), { rate: 0.9, pitch: 1.0 });
    }, 100);
  }, [room?.currentNumber, voiceEnabled]);

  // Auto-mark called numbers on tickets
  useEffect(() => {
    if (!autoMark || !isPremium || !room || !roomCode || !playerName) return;
    const currentNum = room.currentNumber;
    if (!currentNum || currentNum === lastAutoMarkedNumber.current) return;

    const player = room.players?.[playerName];
    if (!player) return;

    const marked = new Set(safeArray(player.markedNumbers));
    if (marked.has(currentNum)) { lastAutoMarkedNumber.current = currentNum; return; }

    const tickets = player.tickets
      ? (Array.isArray(player.tickets) ? player.tickets : Object.values(player.tickets))
      : (player.ticket?.length > 0 ? [player.ticket] : []);

    const allTicketNums = new Set(tickets.flat(2).filter((n: number | null): n is number => n !== null));
    if (allTicketNums.has(currentNum)) {
      lastAutoMarkedNumber.current = currentNum;
      firebaseMarkNumber(roomCode, playerName, currentNum).catch(() => {});
    }
  }, [room?.currentNumber, autoMark]);

  // Auto-announce claims
  useEffect(() => {
    if (!room?.claims) return;
    for (const [type, winner] of Object.entries(room.claims)) {
      if (winner?.playerName && !lastClaimAnnounced.has(type)) {
        setLastClaimAnnounced(prev => new Set([...prev, type]));
        const label = CLAIM_LABELS[type as ClaimType] || type;
        const isMe = winner.playerName === playerName;
        if (isMe) setShowConfetti(true);
        showAlert(
          isMe ? `You Won ${label}!` : `${label} Won!`,
          `${winner.playerName} wins ${label}!${winner.prizeAmount ? ` Prize: ₹${winner.prizeAmount}` : ''}`,
          isMe ? 'success' : 'info',
        );
      }
    }
  }, [room?.claims]);

  // Save history when game finishes
  useEffect(() => {
    if ((room?.status === 'finished' || room?.status === 'cancelled') && roomCode && playerName && !historySavedRef.current) {
      historySavedRef.current = true;
      clearActiveSession();
      if (room.status === 'finished') setShowGameOver(true);
      const players = Object.entries(room.players || {});
      const claims: Record<string, { playerName: string; prize: number }> = {};
      for (const [type, w] of Object.entries(room.claims || {})) {
        if (w?.playerName) claims[type] = { playerName: w.playerName, prize: w.prizeAmount || 0 };
      }
      const me = room.players?.[playerName];
      saveGameHistory({
        id: `${roomCode}-${Date.now()}`,
        date: new Date().toISOString(),
        roomCode: roomCode,
        playerName: playerName,
        isHost: false,
        players: players.map(([n]) => n),
        ticketCount: me?.ticketCount || 1,
        ticketPrice: room.ticketPrice || 0,
        totalPrizePool: room.totalPool || 0,
        claims,
        myMarkedCount: safeArray(me?.markedNumbers).length,
        totalNumbers: (me?.ticketCount || 1) * 15,
        calledCount: safeArray(room.calledNumbers).length,
        status: room.status === 'cancelled' ? 'cancelled' : 'finished',
        playerDetails: Object.fromEntries(players.map(([n, p]) => [n, {
          ticketCount: p.ticketCount || 1,
          markedCount: safeArray(p.markedNumbers).length,
        }])),
      });
    }
  }, [room?.status]);

  if (!room || !playerName) return <View style={styles.outer}><Text style={styles.loadingText}>Loading...</Text></View>;

  const player = room.players?.[playerName];
  if (!player) return <View style={styles.outer}><Text style={styles.loadingText}>Player not found</Text></View>;

  const calledNumbers = safeArray(room.calledNumbers);
  const calledSet = new Set(calledNumbers);
  const markedSet = new Set(safeArray(player.markedNumbers));
  const playerIndex = Object.keys(room.players || {}).indexOf(playerName!);
  const playerColor = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];

  const tickets: (number | null)[][][] = player.tickets
    ? (Array.isArray(player.tickets) ? player.tickets : Object.values(player.tickets))
    : (player.ticket?.length > 0 ? [player.ticket] : []);

  const totalNumbers = tickets.length * 15;

  const handleNumberPress = async (num: number) => {
    if (!calledSet.has(num)) { showAlert('Not Called', `Number ${num} hasn't been called yet!`, 'warning'); return; }
    hapticLight();
    try { await firebaseMarkNumber(roomCode!, playerName!, num); } catch (err: any) { showAlert('Error', err.message, 'error'); }
  };

  const handleClaim = async (claimType: ClaimType) => {
    try {
      const result = await makeClaim(roomCode!, playerName!, claimType);
      if (result.valid) {
        hapticSuccess();
        showAlert(`You Won ${CLAIM_LABELS[claimType]}!`, getFunMessage('success'), 'success');
      } else {
        hapticError();
        showAlert('Invalid Claim', `${result.message}\n\n${getFunMessage('error')}`, 'error');
      }
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
  };

  const handleLeaveGame = () => {
    showAlert('Leave Game', 'Are you sure you want to leave? You won\'t be able to rejoin.', 'warning', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (roomCode && playerName && room) {
            // Save to history before leaving
            const players = Object.entries(room.players || {});
            const claims: Record<string, { playerName: string; prize: number }> = {};
            for (const [type, w] of Object.entries(room.claims || {})) {
              if (w?.playerName) claims[type] = { playerName: w.playerName, prize: w.prizeAmount || 0 };
            }
            const me = room.players?.[playerName];
            saveGameHistory({
              id: `${roomCode}-${Date.now()}`,
              date: new Date().toISOString(),
              roomCode,
              playerName,
              isHost: false,
              players: players.map(([n]) => n),
              ticketCount: me?.ticketCount || 1,
              ticketPrice: room.ticketPrice || 0,
              totalPrizePool: room.totalPool || 0,
              claims,
              myMarkedCount: safeArray(me?.markedNumbers).length,
              totalNumbers: (me?.ticketCount || 1) * 15,
              calledCount: safeArray(room.calledNumbers).length,
              status: 'cancelled',
              playerDetails: Object.fromEntries(players.map(([n, p]) => [n, {
                ticketCount: p.ticketCount || 1,
                markedCount: safeArray(p.markedNumbers).length,
              }])),
            });
            await leaveRoom(roomCode, playerName);
            clearActiveSession();
          }
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.outer}>
    <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    {roomCode && <ReactionOverlay roomCode={roomCode} />}
    <GameAlert {...alertState} onClose={hideAlert} />
    {room && (
      <GameOverSummary
        visible={showGameOver}
        onClose={() => setShowGameOver(false)}
        onPlayAgain={() => { setShowGameOver(false); }}
        onGoHome={() => { setShowGameOver(false); router.replace('/'); }}
        claims={room.claims || {}}
        players={Object.entries(room.players || {}).map(([n, p]) => ({
          name: n, markedCount: safeArray(p.markedNumbers).length, ticketCount: p.ticketCount || 1,
        }))}
        calledCount={safeArray(room.calledNumbers).length}
        totalPool={room.totalPool || 0}
        myName={playerName}
      />
    )}
    {showFloatingNumber && room.currentNumber && (
      <View style={styles.floating}><View style={styles.floatingBall}><Text style={styles.floatingText}>{room.currentNumber}</Text></View></View>
    )}
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
      onScroll={(e) => { setShowFloatingNumber(calledNumberY.current > 0 && e.nativeEvent.contentOffset.y > calledNumberY.current); }}
      scrollEventThrottle={100}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.roomPill}><Text style={styles.roomText}>{roomCode}</Text></View>
        {room.totalPool > 0 && <View style={styles.poolPill}><Text style={styles.poolText}>₹{room.totalPool}</Text></View>}
        <View style={{ flex: 1 }} />
        <Text style={styles.markedInfo}>{markedSet.size}/{totalNumbers}</Text>
      </View>

      {/* Current Number */}
      <View style={styles.numberSection} onLayout={(e) => { calledNumberY.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height; }}>
        {room.currentNumber ? (
          <View style={styles.ball}>
            <Text style={styles.ballNum}>{room.currentNumber}</Text>
          </View>
        ) : (
          <View style={styles.ballEmpty}><Ionicons name="hourglass-outline" size={28} color={colors.textSecondary} /></View>
        )}
        {room.status === 'finished' && (
          <View style={styles.gameOverTag}><Text style={styles.gameOverText}>GAME OVER</Text></View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.autoRow}
          onPress={() => {
            if (!isPremium) { showAlert('Premium Feature', 'Auto-mark is a premium feature. Go to Profile to unlock.', 'info'); return; }
            setAutoMark(!autoMark);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.autoLabel}>Auto-mark</Text>
          {isPremium ? (
            <Switch value={autoMark} onValueChange={setAutoMark} trackColor={{ false: colors.empty, true: colors.success }} thumbColor="#fff" />
          ) : (
            <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, voiceEnabled && styles.chipActive]} onPress={() => setVoiceEnabled(!voiceEnabled)}>
          <Ionicons name={voiceEnabled ? 'volume-high' : 'volume-mute'} size={16} color={voiceEnabled ? '#fff' : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tickets */}
      {tickets.map((ticket, i) => (
        <TicketView key={i} ticket={ticket} markedNumbers={markedSet} calledNumbers={calledSet}
          onNumberPress={handleNumberPress} label={tickets.length > 1 ? `Ticket ${i + 1}` : undefined}
          currentNumber={room.currentNumber} playerColor={playerColor} enableBlinking={isPremium} />
      ))}

      {/* Claim Prizes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Claim Prizes</Text>
        <ClaimButtons claims={room.claims} onClaim={handleClaim} totalPool={room.totalPool} />
      </View>

      {/* Called Numbers */}
      {calledNumbers.length > 0 && (
        <View style={styles.card}>
          <TouchableOpacity style={styles.cardHeader} onPress={() => setShowAllCalled(!showAllCalled)}>
            <Text style={styles.cardTitle}>
              <Ionicons name={showAllCalled ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.text} />
              {' '}Called ({calledNumbers.length})
            </Text>
          </TouchableOpacity>
          <View style={styles.numGrid}>
            {[...calledNumbers].reverse().slice(0, showAllCalled ? undefined : 20).map((num, i) => (
              <View key={num} style={[styles.numBall, i === 0 && styles.numLatest]}>
                <Text style={[styles.numText, i === 0 && styles.numLatestText]}>{num}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Reactions */}
      {roomCode && playerName && (
        <ReactionBar roomCode={roomCode} playerName={playerName} onSend={(emoji) => sendReaction(roomCode, playerName, emoji)} />
      )}

      {/* Leave Game */}
      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGame}>
        <Text style={styles.leaveBtnText}>Leave Game</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  outer: { flex: 1, backgroundColor: colors.background } as const,
  floating: { position: 'absolute' as const, top: 8, right: 16, zIndex: 50 } as const,
  floatingBall: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 8 } as const,
  floatingText: { color: '#fff', fontSize: 20, fontWeight: '900' as const } as const,
  scroll: { flex: 1 } as const,
  scrollContent: { padding: 14 } as const,
  loadingText: { color: colors.text, fontSize: 16, textAlign: 'center' as const, marginTop: 40 } as const,

  // Top bar
  topBar: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 10 } as const,
  roomPill: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 } as const,
  roomText: { color: colors.text, fontSize: 14, fontWeight: '800' as const, letterSpacing: 2 } as const,
  poolPill: { backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 } as const,
  poolText: { color: colors.background, fontSize: 13, fontWeight: '800' as const } as const,
  markedInfo: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' as const } as const,

  // Number
  numberSection: { alignItems: 'center' as const, marginBottom: 12 } as const,
  ball: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  } as const,
  ballNum: { color: '#fff', fontSize: 38, fontWeight: '900' as const } as const,
  ballEmpty: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 2, borderStyle: 'dashed' as const, borderColor: colors.border } as const,
  gameOverTag: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, marginTop: 10 } as const,
  gameOverText: { color: '#fff', fontSize: 13, fontWeight: '800' as const, letterSpacing: 2 } as const,

  // Controls
  controls: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 12, marginBottom: 12 } as const,
  autoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 } as const,
  autoLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' as const } as const,
  chip: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: colors.border } as const,
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary } as const,

  // Cards
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.1)' } as const,
  cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const } as const,
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' as const, marginBottom: 8 } as const,

  // Called numbers
  numGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 5, marginTop: 6 } as const,
  numBall: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
  numLatest: { backgroundColor: colors.primary } as const,
  numText: { color: colors.text, fontSize: 12, fontWeight: '600' as const } as const,
  numLatestText: { color: '#fff', fontWeight: '800' as const } as const,

  // Leave
  leaveBtn: { paddingVertical: 12, alignItems: 'center' as const, marginTop: 4 } as const,
  leaveBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' as const } as const,
});
