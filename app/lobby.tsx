import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Share,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PRIZE_DISTRIBUTION } from '../src/constants/theme';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { subscribeToRoom, startGame, leaveRoom, deleteRoom, updateTicketPrice, updatePrizeAmounts, updatePlayerTicketCount, updateHostUpiId, setPlayerPaymentStatus, setPlayerUserId, RoomData } from '../src/firebase/roomService';
import { saveActiveSession } from '../src/utils/storage';
import { useAuth } from '../src/store/AuthContext';
import * as Linking from 'expo-linking';
import GameAlert from '../src/components/GameAlert';
import ScreenHeader from '../src/components/ScreenHeader';
import { useGameAlert } from '../src/hooks/useGameAlert';

const PRIZE_KEYS = ['fullHouse', 'jaldiFive', 'topLine', 'middleLine', 'bottomLine'] as const;
const PRIZE_NAMES: Record<string, string> = {
  jaldiFive: 'Jaldi 5',
  topLine: 'Top Line',
  middleLine: 'Middle Line',
  bottomLine: 'Bottom Line',
  fullHouse: 'Full House',
};

export default function LobbyScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { roomCode, playerName, isHost } = useLocalSearchParams<{
    roomCode: string;
    playerName: string;
    isHost: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [upiInput, setUpiInput] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [prizeInputs, setPrizeInputs] = useState<Record<string, string>>({});
  const isHostBool = isHost === 'true';
  const { alertState, showAlert, hideAlert } = useGameAlert();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, (data) => {
      if (!data && !isHostBool) {
        showAlert('Room Closed', 'The host has cancelled the room.', 'warning', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      setRoom(data);
      if (data?.ticketPrice) setPriceInput(String(data.ticketPrice));
      if (data?.hostUpiId) setUpiInput(data.hostUpiId);
      if (data?.status === 'playing') {
        saveActiveSession({ roomCode: roomCode!, playerName: playerName!, isHost: isHostBool });
        if (isHostBool) {
          router.replace(`/mp-host?roomCode=${roomCode}&playerName=${playerName}`);
        } else {
          router.replace(`/mp-player?roomCode=${roomCode}&playerName=${playerName}`);
        }
      }
    });
    return unsub;
  }, [roomCode]);

  // Register userId in room for wallet operations
  useEffect(() => {
    if (roomCode && playerName && user) {
      setPlayerUserId(roomCode, playerName, user.userId);
    }
  }, [roomCode, playerName, user]);

  const handleStart = async () => {
    if (!room || !roomCode) return;
    const playerCount = Object.keys(room.players || {}).length;
    if (playerCount < 2) { showAlert('Need Players', 'At least 2 players needed.', 'warning'); return; }
    try { await startGame(roomCode); } catch (err: any) { showAlert('Error', err.message, 'error'); }
  };

  const handleLeave = async () => {
    if (!roomCode || !playerName) return;
    try {
      if (isHostBool) await deleteRoom(roomCode); else await leaveRoom(roomCode, playerName);
    } catch {}
    router.back();
  };

  const handleShare = async () => {
    const code = (roomCode || '').trim().toUpperCase();
    if (!code) return;
    const inviteBase = (process.env.EXPO_PUBLIC_INVITE_BASE_URL || 'https://housie-155ea.web.app')
      .trim()
      .replace(/\/+$/, '');
    const joinWebLink = inviteBase
      ? `${inviteBase}/multiplayer?room=${encodeURIComponent(code)}&autoJoin=1`
      : '';
    const joinAppLink = `housie://multiplayer?room=${encodeURIComponent(code)}&autoJoin=1`;

    try {
      await Share.share({
        message: [
          'Join my Housie game!',
          '',
          joinWebLink ? `Tap to join: ${joinWebLink}` : `App deep link: ${joinAppLink}`,
          joinWebLink ? `App deep link: ${joinAppLink}` : '',
          '',
          `Room code: ${code}`,
        ].filter(Boolean).join('\n'),
      });
    } catch {}
  };

  const handleSaveUpiId = async () => {
    if (!roomCode || !upiInput.trim()) {
      showAlert('UPI Required', 'Please enter a valid UPI ID before saving.', 'warning');
      return;
    }
    setSavingUpi(true);
    try {
      await updateHostUpiId(roomCode, upiInput.trim());
      showAlert('Saved', 'UPI ID saved. Players can now pay you.', 'success');
    } catch {
      showAlert('Error', 'Could not save UPI ID. Please try again.', 'error');
    } finally {
      setSavingUpi(false);
    }
  };

  const handlePayUpi = async () => {
    if (!room?.hostUpiId || !roomCode || !playerName) return;
    const amount = myTicketCount * price;
    const upiUrl = `upi://pay?pa=${room.hostUpiId}&pn=${room.hostName}&am=${amount}&cu=INR&tn=Housie+Ticket+${roomCode}`;
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        showAlert('No UPI App', 'No UPI app found on your device.', 'error');
      }
    } catch {
      showAlert('Error', 'Could not open UPI app.', 'error');
    }
  };

  const handleMarkPaid = async () => {
    if (!roomCode || !playerName) return;
    await setPlayerPaymentStatus(roomCode, playerName, 'paid');
  };

  const handleConfirmPayment = async (pName: string) => {
    if (!roomCode || !room) return;
    await setPlayerPaymentStatus(roomCode, pName, 'confirmed');
    // Just mark as confirmed — wallet debit happens on game start
  };

  const handleUpdatePrice = async () => {
    if (!roomCode) return;
    const price = parseInt(priceInput) || 0;
    await updateTicketPrice(roomCode, price);
  };

  const handleSavePrizes = async () => {
    if (!roomCode) return;
    const amounts: Record<string, number> = {};
    let total = 0;
    for (const key of PRIZE_KEYS) {
      const val = parseInt(prizeInputs[key] || '') || 0;
      amounts[key] = val;
      total += val;
    }
    if (total > totalPool) {
      showAlert('Exceeds Pool', `Total prizes (₹${total}) exceed the pool (₹${totalPool}).`, 'error');
      return;
    }
    if (total === 0) {
      showAlert('No Prizes', 'Set at least one prize amount.', 'warning');
      return;
    }
    await updatePrizeAmounts(roomCode, amounts);
    showAlert('Saved', `Prize amounts saved. ₹${totalPool - total} unallocated.`, 'success');
  };

  const players = room?.players ? Object.entries(room.players) : [];
  const totalTickets = players.reduce((sum, [, p]) => sum + (p.ticketCount || 1), 0);
  const price = room?.ticketPrice || 0;
  const totalPool = totalTickets * price;
  const myPlayer = playerName ? room?.players?.[playerName] : null;
  const myTicketCount = myPlayer?.ticketCount || 1;
  const savedUpi = (room?.hostUpiId || '').trim();
  const draftUpi = upiInput.trim();
  const isUpiDirty = draftUpi !== savedUpi;

  const handleTicketCountChange = async (count: number) => {
    if (!roomCode || !playerName) return;
    await updatePlayerTicketCount(roomCode, playerName, count);
  };
  const currentDist = room?.prizeDistribution || PRIZE_DISTRIBUTION;
  const currentAmounts = room?.prizeAmounts;
  const prizeAmountTotal = PRIZE_KEYS.reduce((s, k) => s + (parseInt(prizeInputs[k] || '') || 0), 0);
  const hasCustomInputs = Object.keys(prizeInputs).length > 0;

  // Default amounts based on percentage distribution
  const getDefaultAmount = (key: string) => Math.round(totalPool * ((currentDist[key] || PRIZE_DISTRIBUTION[key] || 0) / 100));
  const getDisplayAmount = (key: string) => currentAmounts?.[key] ?? getDefaultAmount(key);

  return (
    <SafeAreaView style={styles.outerContainer} edges={['top', 'left', 'right']}>
    <ScreenHeader title="Lobby" subtitle="Share code and configure game" />
    <KeyboardAvoidingView style={styles.outerContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <GameAlert {...alertState} onClose={hideAlert} />

      {/* Room Code */}
      <Text style={styles.topLabel}>ROOM CODE</Text>
      <View style={styles.codeContainer}>
        {(roomCode || '').split('').map((char, i) => (
          <View key={i} style={styles.codeLetter}>
            <Text style={styles.codeText}>{char}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Ionicons name="share-outline" size={16} color={colors.accent} />
        <Text style={styles.shareBtnText}>Share Code</Text>
      </TouchableOpacity>

      {/* 1. Ticket Price (host only) */}
      {isHostBool && (
        <View style={styles.card}>
          <Text style={styles.label}>TICKET PRICE</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.priceInput}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              onBlur={handleUpdatePrice}
            />
          </View>
          {price > 0 && (
            <View style={styles.poolInfo}>
              <Text style={styles.poolText}>Total Tickets: {totalTickets}</Text>
              <Text style={styles.poolAmount}>Prize Pool: ₹{totalPool}</Text>
            </View>
          )}
        </View>
      )}

      {/* 2. Your Tickets */}
      {(() => {
        const myPayStatus = playerName ? room?.paymentStatus?.[playerName] : undefined;
        const isLocked = myPayStatus === 'confirmed';
        return (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ticket-outline" size={16} color={colors.primary} />
              <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}>YOUR TICKETS</Text>
              {isLocked && <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />}
            </View>
            {isLocked ? (
              <Text style={styles.ticketCostHint}>{myTicketCount} ticket{myTicketCount > 1 ? 's' : ''} (locked after payment)</Text>
            ) : (
              <View style={styles.ticketCountRow}>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.ticketCountBtn, myTicketCount === n && styles.ticketCountBtnActive]}
                    onPress={() => handleTicketCountChange(n)}
                  >
                    <Text style={[styles.ticketCountText, myTicketCount === n && styles.ticketCountTextActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {price > 0 && (
              <Text style={styles.ticketCostHint}>
                Your cost: ₹{myTicketCount * price} ({myTicketCount} x ₹{price})
              </Text>
            )}
          </View>
        );
      })()}

      {/* 3. UPI (host enters ID / player pays) */}
      {isHostBool && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={16} color={colors.accent} />
            <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}>YOUR UPI ID</Text>
          </View>
          <Text style={styles.distHint}>
            {price > 0 ? 'Players can pay you using this UPI ID.' : 'Set your UPI ID now. It will be used once ticket price is greater than 0.'}
          </Text>
          <View style={styles.upiInputWrap}>
            <TextInput
              style={styles.upiInput}
              value={upiInput}
              onChangeText={setUpiInput}
              placeholder="yourname@upi"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              onFocus={() => setTimeout(() => scrollRef.current?.scrollTo({ y: 400, animated: true }), 300)}
            />
          </View>
          {isUpiDirty ? (
            <TouchableOpacity
              style={[styles.upiSaveBtn, (!draftUpi || savingUpi) && styles.disabledBtn]}
              onPress={handleSaveUpiId}
              activeOpacity={0.85}
              disabled={!draftUpi || savingUpi}
            >
              <Ionicons name="save-outline" size={16} color="#fff" />
              <Text style={styles.upiSaveBtnText}>{savingUpi ? 'Saving...' : 'Save UPI ID'}</Text>
            </TouchableOpacity>
          ) : (
            !!savedUpi && (
              <View style={styles.upiSavedRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.upiSavedText}>UPI saved</Text>
              </View>
            )
          )}
        </View>
      )}

      {price > 0 && !isHostBool && room?.hostUpiId && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={16} color={colors.accent} />
            <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}>PAYMENT</Text>
          </View>
          <Text style={styles.distHint}>
            Pay ₹{myTicketCount * price} to {room.hostName} ({room.hostUpiId})
          </Text>
          {room.paymentStatus?.[playerName!] === 'confirmed' ? (
            <View style={styles.paymentConfirmedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.paymentConfirmedText}>Payment Confirmed</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={styles.payUpiBtn} onPress={handlePayUpi} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.payUpiBtnText}>Pay ₹{myTicketCount * price} via UPI</Text>
              </TouchableOpacity>
              {room.paymentStatus?.[playerName!] !== 'paid' && (
                <TouchableOpacity style={styles.markPaidBtn} onPress={handleMarkPaid} activeOpacity={0.8}>
                  <Text style={styles.markPaidBtnText}>I've Paid</Text>
                </TouchableOpacity>
              )}
              {room.paymentStatus?.[playerName!] === 'paid' && (
                <Text style={styles.waitingConfirmText}>Waiting for host to confirm...</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* 4. Players */}
      <View style={styles.card}>
        <Text style={styles.label}>PLAYERS ({players.length}/8)</Text>
        {players.map(([name, p]) => {
          const payStatus = room?.paymentStatus?.[name];
          return (
            <View key={name} style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {p.isHost && <MaterialCommunityIcons name="crown" size={14} color={colors.accent} />}{' '}{name}
                </Text>
                <Text style={styles.playerTickets}>{p.ticketCount || 1} ticket{(p.ticketCount || 1) > 1 ? 's' : ''}</Text>
              </View>
              {price > 0 && !p.isHost && (
                payStatus === 'confirmed' && isHostBool ? (
                  <TouchableOpacity onPress={() => setPlayerPaymentStatus(roomCode!, name, 'unpaid')}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  </TouchableOpacity>
                ) : payStatus === 'confirmed' ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                ) : payStatus === 'paid' && isHostBool ? (
                  <TouchableOpacity style={styles.confirmPayBtn} onPress={() => handleConfirmPayment(name)}>
                    <Text style={styles.confirmPayText}>Confirm</Text>
                  </TouchableOpacity>
                ) : payStatus === 'paid' ? (
                  <Ionicons name="time-outline" size={16} color={colors.accent} />
                ) : (
                  <Ionicons name="ellipse-outline" size={16} color={colors.textSecondary} />
                )
              )}
              {name === playerName && <View style={styles.youBadge}><Text style={styles.youText}>You</Text></View>}
            </View>
          );
        })}
        {players.length < 2 && (
          <Text style={styles.waitingText}>Waiting for players...</Text>
        )}
      </View>

      {/* 5. Prize Amounts */}
      {price > 0 && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={16} color={colors.accent} />
            <Text style={[styles.label, { marginBottom: 0, flex: 1 }]}>PRIZE AMOUNTS</Text>
            <Text style={styles.poolBadge}>Pool: ₹{totalPool}</Text>
          </View>
          {isHostBool && <Text style={styles.distHint}>Tap amounts to edit</Text>}

          {PRIZE_KEYS.map(key => {
            const displayVal = prizeInputs[key] ?? String(getDisplayAmount(key));
            return (
              <View key={key} style={styles.prizeEditRow}>
                <Text style={styles.prizeName}>{PRIZE_NAMES[key]}</Text>
                <View style={styles.prizeEditRight}>
                  <Text style={styles.currencySmall}>₹</Text>
                  {isHostBool ? (
                    <TextInput
                      style={styles.prizeAmountInput}
                      value={displayVal}
                      onChangeText={(v) => setPrizeInputs(prev => ({ ...prev, [key]: v }))}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  ) : (
                    <Text style={styles.prizeAmountReadonly}>{getDisplayAmount(key)}</Text>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[
              styles.totalValue,
              (hasCustomInputs ? prizeAmountTotal : PRIZE_KEYS.reduce((s, k) => s + getDisplayAmount(k), 0)) > totalPool && styles.totalError,
            ]}>
              ₹{hasCustomInputs ? prizeAmountTotal : PRIZE_KEYS.reduce((s, k) => s + getDisplayAmount(k), 0)}
            </Text>
            <Text style={styles.poolRemaining}>/ ₹{totalPool}</Text>
          </View>

          {isHostBool && hasCustomInputs && (
            <TouchableOpacity
              style={[styles.saveDistBtn, prizeAmountTotal > totalPool && styles.disabledBtn]}
              onPress={handleSavePrizes}
              disabled={prizeAmountTotal > totalPool}
            >
              <Text style={styles.saveDistBtnText}>Save Prizes</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 6. Actions */}
      {isHostBool ? (
        <TouchableOpacity
          style={[styles.startBtn, players.length < 2 && styles.disabledBtn]}
          onPress={handleStart}
          disabled={players.length < 2}
        >
          <Text style={styles.startBtnText}>START GAME</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.waitingCard}>
          <Text style={styles.waitingBigText}>Waiting for host to start...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
        <Text style={styles.leaveBtnText}>{isHostBool ? 'Cancel Room' : 'Leave Room'}</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  outerContainer: { flex: 1, backgroundColor: colors.background } as const,
  container: { flex: 1, backgroundColor: colors.background } as const,
  content: { padding: 20, alignItems: 'center' as const } as const,
  topLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' as const, letterSpacing: 2, marginBottom: 12 } as const,
  codeContainer: { flexDirection: 'row' as const, gap: 10, marginBottom: 12 } as const,
  codeLetter: { width: 56, height: 66, backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
  codeText: { color: '#fff', fontSize: 32, fontWeight: '900' as const } as const,
  shareBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: colors.card, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginBottom: 20 } as const,
  shareBtnText: { color: colors.accent, fontWeight: '700' as const, fontSize: 14 } as const,
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, width: '100%' as const, marginBottom: 14 } as const,
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 } as const,
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5, marginBottom: 10 } as const,
  priceRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 } as const,
  currency: { color: colors.accent, fontSize: 24, fontWeight: '800' as const } as const,
  priceInput: { flex: 1, backgroundColor: colors.empty, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 20, fontWeight: '700' as const } as const,
  poolInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border } as const,
  poolText: { color: colors.textSecondary, fontSize: 13 } as const,
  poolAmount: { color: colors.accent, fontSize: 18, fontWeight: '800' as const, marginTop: 4 } as const,
  distHint: { color: colors.textSecondary, fontSize: 11, marginBottom: 12 } as const,
  prizeEditRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border } as const,
  prizeName: { color: colors.text, fontSize: 14, fontWeight: '600' as const, flex: 1 } as const,
  prizeEditRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 } as const,
  currencySmall: { color: colors.accent, fontSize: 16, fontWeight: '700' as const } as const,
  prizeAmountInput: { backgroundColor: colors.empty, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, fontSize: 16, fontWeight: '700' as const, width: 70, textAlign: 'center' as const } as const,
  prizeAmountReadonly: { color: colors.text, fontSize: 16, fontWeight: '700' as const, width: 70, textAlign: 'center' as const } as const,
  poolBadge: { backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, color: colors.accent, fontSize: 12, fontWeight: '700' as const, overflow: 'hidden' as const } as const,
  poolRemaining: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' as const, marginLeft: 2 } as const,
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingTop: 10, marginTop: 4 } as const,
  totalLabel: { color: colors.text, fontSize: 14, fontWeight: '700' as const } as const,
  totalValue: { color: colors.success, fontSize: 16, fontWeight: '800' as const } as const,
  totalError: { color: colors.primary } as const,
  saveDistBtn: { backgroundColor: colors.secondary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' as const, marginTop: 12 } as const,
  saveDistBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' as const } as const,
  upiInputWrap: {
    backgroundColor: colors.empty,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 2,
    marginBottom: 10,
  } as const,
  upiInput: {
    backgroundColor: 'transparent' as const,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  } as const,
  upiSaveBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  } as const,
  upiSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' as const, letterSpacing: 0.4 } as const,
  upiSavedRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 8,
  } as const,
  upiSavedText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700' as const,
  } as const,
  payUpiBtn: { flexDirection: 'row' as const, backgroundColor: colors.secondary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6 } as const,
  payUpiBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' as const } as const,
  markPaidBtn: { backgroundColor: colors.card, paddingVertical: 10, borderRadius: 10, alignItems: 'center' as const } as const,
  markPaidBtnText: { color: colors.accent, fontSize: 14, fontWeight: '600' as const } as const,
  waitingConfirmText: { color: colors.accent, fontSize: 13, fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 4 } as const,
  paymentConfirmedBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 8 } as const,
  paymentConfirmedText: { color: colors.success, fontSize: 14, fontWeight: '700' as const } as const,
  confirmPayBtn: { backgroundColor: colors.success, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 } as const,
  confirmPayText: { color: '#fff', fontSize: 12, fontWeight: '700' as const } as const,
  ticketCountRow: { flexDirection: 'row' as const, gap: 10, justifyContent: 'center' as const, marginTop: 8 } as const,
  ticketCountBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.empty, justifyContent: 'center' as const, alignItems: 'center' as const,
    borderWidth: 2, borderColor: 'transparent' as const,
  } as const,
  ticketCountBtnActive: { backgroundColor: colors.primary, borderColor: colors.accent } as const,
  ticketCountText: { color: colors.textSecondary, fontSize: 18, fontWeight: '800' as const } as const,
  ticketCountTextActive: { color: '#fff' } as const,
  ticketCostHint: { color: colors.accent, fontSize: 12, marginTop: 10, fontWeight: '600' as const, textAlign: 'center' as const } as const,
  prizeBreakdown: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginTop: 10 } as const,
  prizeItem: { backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' as const } as const,
  prizeLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' as const } as const,
  prizeValue: { color: colors.accent, fontSize: 12, fontWeight: '800' as const } as const,
  playerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border } as const,
  playerInfo: { flex: 1 } as const,
  playerName: { color: colors.text, fontSize: 16, fontWeight: '600' as const } as const,
  playerTickets: { color: colors.textSecondary, fontSize: 12, marginTop: 2 } as const,
  youBadge: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 } as const,
  youText: { color: colors.background, fontSize: 11, fontWeight: '800' as const } as const,
  waitingText: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' as const, textAlign: 'center' as const, marginTop: 12 } as const,
  startBtn: { backgroundColor: colors.success, paddingVertical: 16, borderRadius: 14, alignItems: 'center' as const, width: '100%' as const, marginBottom: 12 } as const,
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' as const, letterSpacing: 2 } as const,
  disabledBtn: { opacity: 0.4 } as const,
  waitingCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, width: '100%' as const, alignItems: 'center' as const, marginBottom: 12 } as const,
  waitingBigText: { color: colors.accent, fontSize: 15, fontWeight: '600' as const } as const,
  leaveBtn: { paddingVertical: 12 } as const,
  leaveBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' as const } as const,
});
