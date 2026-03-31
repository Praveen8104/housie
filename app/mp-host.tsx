import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PRIZE_DISTRIBUTION } from '../src/constants/theme';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { useGameAlert } from '../src/hooks/useGameAlert';
import {
  subscribeToRoom,
  drawNumber as firebaseDrawNumber,
  markNumber as firebaseMarkNumber,
  makeClaim,
  sendReaction,
  cancelGame,
  restartGame,
  RoomData,
} from '../src/firebase/roomService';
import NumberBoard from '../src/components/NumberBoard';
import TicketView, { PLAYER_COLORS } from '../src/components/TicketView';
import ClaimButtons from '../src/components/ClaimButtons';
import Confetti from '../src/components/Confetti';
import GameAlert from '../src/components/GameAlert';
import GameOverSummary from '../src/components/GameOverSummary';
import ReactionBar, { ReactionOverlay } from '../src/components/ReactionBar';
import { CLAIM_LABELS, ClaimType } from '../src/utils/gameLogic';
import { saveGameHistory, clearActiveSession } from '../src/utils/storage';
import { useAuth } from '../src/store/AuthContext';
import { hapticHeavy, hapticLight, hapticSuccess, hapticError } from '../src/utils/haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { getNumberAnnouncement } from '../src/utils/numberNicknames';

function safeArray(val: any): number[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.values(val);
}

function safeTickets(player: any): (number | null)[][][] {
  if (player?.tickets) return Array.isArray(player.tickets) ? player.tickets : Object.values(player.tickets);
  if (player?.ticket?.length > 0) return [player.ticket];
  return [];
}

export default function MpHostScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { isPremium } = useAuth();
  const { alertState, showAlert, hideAlert } = useGameAlert();
  const { roomCode, playerName } = useLocalSearchParams<{ roomCode: string; playerName: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const [showMyTicket, setShowMyTicket] = useState(true);
  const [showAllCalled, setShowAllCalled] = useState(false);
  const [showFloatingNumber, setShowFloatingNumber] = useState(false);
  const calledNumberY = useRef(0);
  const [drawing, setDrawing] = useState(false);
  const [lastClaimAnnounced, setLastClaimAnnounced] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [autoMark, setAutoMark] = useState(false);
  const historySavedRef = useRef(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastAutoMarkedNumber = useRef<number | null>(null);
  const numberAnim = useRef(new Animated.Value(0)).current;
  const [autoDrawInterval, setAutoDrawInterval] = useState<number>(0); // 0 = off
  const [countdown, setCountdown] = useState<number>(0);
  const autoDrawRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomRef = useRef(room);
  const autoDrawIntervalRef = useRef(autoDrawInterval);

  useEffect(() => {
    if (!roomCode) return;
    return subscribeToRoom(roomCode, setRoom);
  }, [roomCode]);

  // Handle restart — go back to lobby
  useEffect(() => {
    if (room?.status === 'waiting' && roomCode && playerName) {
      setShowGameOver(false);
      router.replace(`/lobby?roomCode=${roomCode}&playerName=${playerName}&isHost=true`);
    }
  }, [room?.status]);

  // Keep refs in sync
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { autoDrawIntervalRef.current = autoDrawInterval; }, [autoDrawInterval]);

  // Auto-draw timer
  useEffect(() => {
    if (autoDrawRef.current) { clearInterval(autoDrawRef.current); autoDrawRef.current = null; }
    if (autoDrawInterval <= 0 || !roomCode) { setCountdown(0); return; }

    setCountdown(autoDrawInterval);
    autoDrawRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          const currentRoom = roomRef.current;
          if (currentRoom && currentRoom.status === 'playing') {
            hapticHeavy();
            firebaseDrawNumber(roomCode).catch(() => {});
          }
          return autoDrawIntervalRef.current;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (autoDrawRef.current) clearInterval(autoDrawRef.current); };
  }, [autoDrawInterval, roomCode]);

  // Voice announce called numbers
  useEffect(() => {
    if (!voiceEnabled || !room?.currentNumber) return;
    const text = getNumberAnnouncement(room.currentNumber);
    Speech.speak(text, { rate: 0.9, pitch: 1.0 });
  }, [room?.currentNumber, voiceEnabled]);

  // Auto-mark called numbers on host's tickets
  useEffect(() => {
    if (!autoMark || !isPremium || !room || !roomCode || !playerName) return;
    const currentNum = room.currentNumber;
    if (!currentNum || currentNum === lastAutoMarkedNumber.current) return;

    const hostPlayer = room.players?.[playerName];
    if (!hostPlayer) return;

    const marked = new Set(safeArray(hostPlayer.markedNumbers));
    if (marked.has(currentNum)) { lastAutoMarkedNumber.current = currentNum; return; }

    const tickets = safeTickets(hostPlayer);
    const allTicketNums = new Set(tickets.flat(2).filter((n: number | null): n is number => n !== null));
    if (allTicketNums.has(currentNum)) {
      lastAutoMarkedNumber.current = currentNum;
      firebaseMarkNumber(roomCode, playerName, currentNum).catch(() => {});
    }
  }, [room?.currentNumber, autoMark]);

  // Auto-announce new claims
  useEffect(() => {
    if (!room?.claims) return;
    const claims = room.claims;
    for (const [type, winner] of Object.entries(claims)) {
      if (winner?.playerName && !lastClaimAnnounced.has(type)) {
        setLastClaimAnnounced(prev => new Set([...prev, type]));
        const label = CLAIM_LABELS[type as ClaimType] || type;
        if (winner.playerName === playerName) setShowConfetti(true);
        showAlert(
          `${label} Won!`,
          `${winner.playerName} wins ${label}!${winner.prizeAmount ? ` Prize: ₹${winner.prizeAmount}` : ''}`,
          winner.playerName === playerName ? 'success' : 'info',
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
      const hostPlayer = room.players?.[playerName];
      saveGameHistory({
        id: `${roomCode}-${Date.now()}`,
        date: new Date().toISOString(),
        roomCode: roomCode,
        playerName: playerName,
        isHost: true,
        players: players.map(([n]) => n),
        ticketCount: hostPlayer?.ticketCount || 1,
        ticketPrice: room.ticketPrice || 0,
        totalPrizePool: room.totalPool || 0,
        claims,
        myMarkedCount: safeArray(hostPlayer?.markedNumbers).length,
        totalNumbers: (hostPlayer?.ticketCount || 1) * 15,
        calledCount: safeArray(room.calledNumbers).length,
        status: room.status === 'cancelled' ? 'cancelled' : 'finished',
        playerDetails: Object.fromEntries(players.map(([n, p]) => [n, {
          ticketCount: p.ticketCount || 1,
          markedCount: safeArray(p.markedNumbers).length,
        }])),
      });
    }
  }, [room?.status]);

  const handleDraw = async () => {
    if (!roomCode || drawing || room?.status === 'finished') return;
    setDrawing(true);
    try {
      hapticHeavy();
      await firebaseDrawNumber(roomCode);
      Animated.sequence([
        Animated.timing(numberAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.timing(numberAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
    finally { setDrawing(false); }
  };

  const handleCancelGame = () => {
    showAlert(
      'End Game',
      'This will end the game for all players. Are you sure?',
      'warning',
      [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'End Game',
          style: 'destructive',
          onPress: async () => {
            if (roomCode) {
              try { await cancelGame(roomCode); } catch {}
            }
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleMarkNumber = async (num: number) => {
    if (!roomCode || !playerName) return;
    const calledSet = new Set(safeArray(room?.calledNumbers));
    if (!calledSet.has(num)) { showAlert('Not Called', `Number ${num} hasn't been called yet!`, 'warning'); return; }
    hapticLight();
    try { await firebaseMarkNumber(roomCode, playerName, num); } catch (err: any) { showAlert('Error', err.message, 'error'); }
  };

  const handleClaim = async (claimType: ClaimType) => {
    if (!roomCode || !playerName) return;
    try {
      const result = await makeClaim(roomCode, playerName, claimType);
      if (result.valid) { hapticSuccess(); showAlert('Congratulations!', `You won ${CLAIM_LABELS[claimType]}!`, 'success'); }
      else { hapticError(); showAlert('Invalid Claim', result.message, 'error'); }
    } catch (err: any) { showAlert('Error', err.message, 'error'); }
  };

  if (!room) {
    return (
      <SafeAreaView style={styles.outer} edges={['top', 'left', 'right']}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const calledNumbers = safeArray(room.calledNumbers);
  const calledSet = new Set(calledNumbers);
  const players = Object.entries(room.players || {});
  const isFinished = room.status === 'finished' || room.status === 'cancelled';

  const hostPlayer = playerName ? room.players?.[playerName] : null;
  const hostMarkedSet = new Set(safeArray(hostPlayer?.markedNumbers));
  const hostTickets = safeTickets(hostPlayer);
  const hostIndex = Object.keys(room.players || {}).indexOf(playerName!);
  const hostColor = PLAYER_COLORS[hostIndex % PLAYER_COLORS.length];

  return (
    <SafeAreaView style={styles.outer} edges={['top', 'left', 'right']}>
    <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    {roomCode && <ReactionOverlay roomCode={roomCode} />}
    <GameAlert {...alertState} onClose={hideAlert} />
    {room && (
      <GameOverSummary
        visible={showGameOver}
        onClose={() => setShowGameOver(false)}
        onPlayAgain={async () => {
          setShowGameOver(false);
          historySavedRef.current = false;
          if (roomCode) await restartGame(roomCode);
        }}
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
        <Text style={styles.calledCount}>{calledNumbers.length}/90</Text>
      </View>

      {/* Number + Draw */}
      <View style={styles.drawSection} onLayout={(e) => { calledNumberY.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height; }}>
        {room.currentNumber ? (
          <Animated.View style={[styles.ball, { transform: [{ scale: numberAnim }] }]}>
            <Text style={styles.ballNum}>{room.currentNumber}</Text>
          </Animated.View>
        ) : (
          <View style={styles.ballEmpty}><Ionicons name="dice-outline" size={32} color={colors.textSecondary} /></View>
        )}
        <TouchableOpacity
          style={[styles.drawBtn, (isFinished || drawing) && styles.drawDisabled]}
          onPress={handleDraw} disabled={isFinished || drawing} activeOpacity={0.8}
        >
          <Text style={styles.drawText}>
            {isFinished ? 'GAME OVER' : drawing ? 'DRAWING...' : `DRAW (${90 - calledNumbers.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Controls strip */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.chip, voiceEnabled && styles.chipActive]} onPress={() => setVoiceEnabled(!voiceEnabled)}>
          <Ionicons name={voiceEnabled ? 'volume-high' : 'volume-mute'} size={14} color={voiceEnabled ? '#fff' : colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.timerChips}>
          {[0, 5, 10, 15, 20].map(sec => (
            <TouchableOpacity key={sec} style={[styles.chip, autoDrawInterval === sec && styles.chipActive]} onPress={() => setAutoDrawInterval(sec)}>
              <Text style={[styles.chipText, autoDrawInterval === sec && styles.chipTextActive]}>{sec === 0 ? 'Off' : `${sec}s`}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {autoDrawInterval > 0 && !isFinished && <Text style={styles.countdown}>{countdown}s</Text>}
      </View>

      {/* My Tickets */}
      <TouchableOpacity style={styles.ticketHeader} onPress={() => setShowMyTicket(!showMyTicket)} activeOpacity={0.7}>
        <Text style={styles.cardTitle}>
          <Ionicons name={showMyTicket ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.text} />
          {' '}My Ticket{hostTickets.length > 1 ? 's' : ''} ({hostMarkedSet.size}/{hostTickets.length * 15})
        </Text>
        <TouchableOpacity style={styles.autoRow} onPress={() => {
          if (!isPremium) { showAlert('Premium Feature', 'Auto-mark is a premium feature. Go to Profile to unlock.', 'info'); return; }
          setAutoMark(!autoMark);
        }} activeOpacity={0.7}>
          <Text style={styles.autoLabel}>Auto</Text>
          {isPremium ? (
            <Switch value={autoMark} onValueChange={setAutoMark} trackColor={{ false: colors.empty, true: colors.success }} thumbColor="#fff" />
          ) : (
            <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
      {showMyTicket && hostTickets.length > 0 && (
        <>
          {hostTickets.map((ticket, i) => (
            <TicketView key={i} ticket={ticket} markedNumbers={hostMarkedSet} calledNumbers={calledSet}
              onNumberPress={handleMarkNumber} label={hostTickets.length > 1 ? `Ticket ${i + 1}` : undefined}
              currentNumber={room.currentNumber} playerColor={hostColor} enableBlinking={isPremium} />
          ))}
          <View style={styles.card}>
            <ClaimButtons claims={room.claims} onClaim={handleClaim} totalPool={room.totalPool} />
          </View>
        </>
      )}

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

      {/* Number Board */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => setShowBoard(!showBoard)}>
          <Text style={styles.cardTitle}>
            <Ionicons name={showBoard ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.text} />
            {' '}Board (1-90)
          </Text>
        </TouchableOpacity>
        {showBoard && <View style={{ marginTop: 8 }}><NumberBoard calledNumbers={calledSet} currentNumber={room.currentNumber} /></View>}
      </View>

      {/* Players */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Players</Text>
        <View style={styles.playerList}>
          {players.map(([name, player]) => {
            const marked = safeArray(player.markedNumbers);
            const tc = player.ticketCount || 1;
            return (
              <View key={name} style={styles.playerItem}>
                <View style={styles.playerAvatar}><Text style={styles.playerInitial}>{name.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName}>
                    {player.isHost && <MaterialCommunityIcons name="crown" size={12} color={colors.accent} />}{' '}{name}
                  </Text>
                  <Text style={styles.playerSub}>{marked.length}/{tc * 15} marked</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Prizes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prizes</Text>
        {(['fullHouse', 'jaldiFive', 'topLine', 'middleLine', 'bottomLine'] as ClaimType[]).map(type => {
          const winner = room.claims?.[type];
          const hasWinner = winner?.playerName;
          const prizeAmt = room.prizeAmounts?.[type]
            ?? (room.totalPool > 0 ? Math.round(room.totalPool * ((room.prizeDistribution?.[type] || PRIZE_DISTRIBUTION[type]) / 100)) : 0);
          return (
            <View key={type} style={[styles.prizeRow, hasWinner && styles.prizeRowWon]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prizeName}>{CLAIM_LABELS[type]}</Text>
                {prizeAmt > 0 && <Text style={styles.prizeAmt}>₹{prizeAmt}</Text>}
              </View>
              {hasWinner ? (
                <View style={styles.winnerBadge}>
                  <Ionicons name="trophy" size={12} color="#fff" />
                  <Text style={styles.winnerText}>{winner.playerName}</Text>
                </View>
              ) : (
                <Text style={styles.unclaimed}>—</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Reactions */}
      {roomCode && playerName && (
        <ReactionBar roomCode={roomCode} playerName={playerName} onSend={(emoji) => sendReaction(roomCode, playerName, emoji)} />
      )}

      {/* End Game */}
      {!isFinished && (
        <TouchableOpacity style={styles.endBtn} onPress={handleCancelGame}><Text style={styles.endBtnText}>End Game</Text></TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
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
  topBar: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 12 } as const,
  roomPill: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 } as const,
  roomText: { color: colors.text, fontSize: 14, fontWeight: '800' as const, letterSpacing: 2 } as const,
  poolPill: { backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 } as const,
  poolText: { color: colors.background, fontSize: 13, fontWeight: '800' as const } as const,
  calledCount: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' as const } as const,

  // Draw section
  drawSection: { alignItems: 'center' as const, marginBottom: 14 } as const,
  ball: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
    marginBottom: 14,
  } as const,
  ballNum: { color: '#fff', fontSize: 46, fontWeight: '900' as const } as const,
  ballEmpty: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surface, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 14, borderWidth: 2, borderStyle: 'dashed' as const, borderColor: colors.border } as const,
  drawBtn: { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 14, alignItems: 'center' as const, width: '100%' as const } as const,
  drawDisabled: { backgroundColor: colors.textSecondary, opacity: 0.3 } as const,
  drawText: { color: colors.background, fontSize: 16, fontWeight: '800' as const, letterSpacing: 1 } as const,

  // Controls
  controls: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginBottom: 14, flexWrap: 'wrap' as const } as const,
  chip: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border } as const,
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary } as const,
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' as const } as const,
  chipTextActive: { color: '#fff' } as const,
  timerChips: { flexDirection: 'row' as const, gap: 4 } as const,
  countdown: { color: colors.accent, fontSize: 13, fontWeight: '800' as const, marginLeft: 4 } as const,

  // Cards
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.1)' } as const,
  cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const } as const,
  ticketHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 8 } as const,
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' as const } as const,
  autoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 } as const,
  autoLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' as const } as const,

  // Called numbers
  numGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 5, marginTop: 10 } as const,
  numBall: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
  numLatest: { backgroundColor: colors.primary } as const,
  numText: { color: colors.text, fontSize: 12, fontWeight: '600' as const } as const,
  numLatestText: { color: '#fff', fontWeight: '800' as const } as const,

  // Players
  playerList: { marginTop: 8, gap: 8 } as const,
  playerItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 } as const,
  playerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
  playerInitial: { color: colors.text, fontSize: 14, fontWeight: '700' as const } as const,
  playerName: { color: colors.text, fontSize: 14, fontWeight: '600' as const } as const,
  playerSub: { color: colors.textSecondary, fontSize: 11, marginTop: 1 } as const,

  // Prizes
  prizeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border } as const,
  prizeRowWon: { borderBottomWidth: 0 } as const,
  prizeName: { color: colors.text, fontSize: 14, fontWeight: '600' as const } as const,
  prizeAmt: { color: colors.accent, fontSize: 11, fontWeight: '700' as const, marginTop: 1 } as const,
  winnerBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 } as const,
  winnerText: { color: '#fff', fontSize: 12, fontWeight: '700' as const } as const,
  unclaimed: { color: colors.textSecondary, fontSize: 13 } as const,

  // End game
  endBtn: { paddingVertical: 12, alignItems: 'center' as const, marginTop: 4 } as const,
  endBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' as const } as const,
});
