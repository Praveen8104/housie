import React from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { GameHistoryEntry } from '../src/utils/storage';

const CLAIM_NAMES: Record<string, string> = {
  fullHouse: 'Full House',
  jaldiFive: 'Jaldi 5',
  topLine: 'Top Line',
  middleLine: 'Middle Line',
  bottomLine: 'Bottom Line',
};

const CLAIM_ORDER = ['fullHouse', 'jaldiFive', 'topLine', 'middleLine', 'bottomLine'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data } = useLocalSearchParams<{ data: string }>();

  if (!data) return <View style={styles.container}><Text style={styles.emptyText}>No data</Text></View>;

  let game: GameHistoryEntry;
  try { game = JSON.parse(data); } catch { return <View style={styles.container}><Text style={styles.emptyText}>Invalid data</Text></View>; }

  const claims = game.claims || {};
  const claimEntries = CLAIM_ORDER.filter(t => claims[t]);
  const unclaimedPrizes = CLAIM_ORDER.filter(t => !claims[t]);
  const totalWon = Object.values(claims).reduce((s, w) => s + (w.prize || 0), 0);
  const myWins = Object.entries(claims).filter(([, w]) => w.playerName === game.playerName);
  const myEarnings = myWins.reduce((s, [, w]) => s + (w.prize || 0), 0);
  const isCancelled = game.status === 'cancelled';

  // Build player earnings map
  const playerEarnings: Record<string, number> = {};
  game.players.forEach(p => { playerEarnings[p] = 0; });
  Object.values(claims).forEach(w => {
    if (w.playerName && playerEarnings[w.playerName] !== undefined) {
      playerEarnings[w.playerName] += w.prize || 0;
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.roomLabel}>ROOM</Text>
            <Text style={styles.roomCode}>{game.roomCode}</Text>
          </View>
          <View style={[styles.statusBadge, isCancelled ? styles.statusCancelled : styles.statusFinished]}>
            <Ionicons name={isCancelled ? 'close-circle' : 'checkmark-circle'} size={14} color={isCancelled ? colors.primary : colors.success} />
            <Text style={[styles.statusText, { color: isCancelled ? colors.primary : colors.success }]}>
              {isCancelled ? 'Cancelled' : 'Finished'}
            </Text>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(game.date)}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name={game.isHost ? 'shield-checkmark' : 'person'} size={13} color={colors.accent} />
          <Text style={styles.roleText}>You played as {game.isHost ? 'Host' : 'Player'}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{game.players.length}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{game.ticketCount}</Text>
          <Text style={styles.statLabel}>Tickets</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{game.calledCount}/90</Text>
          <Text style={styles.statLabel}>Called</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{game.myMarkedCount}/{game.totalNumbers}</Text>
          <Text style={styles.statLabel}>Marked</Text>
        </View>
      </View>

      {/* Prize Pool */}
      {game.totalPrizePool > 0 && (
        <View style={styles.poolCard}>
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>Prize Pool</Text>
            <Text style={styles.poolAmount}>₹{game.totalPrizePool}</Text>
          </View>
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>Ticket Price</Text>
            <Text style={styles.poolDetail}>₹{game.ticketPrice}</Text>
          </View>
          <View style={styles.poolRow}>
            <Text style={styles.poolLabel}>Total Distributed</Text>
            <Text style={styles.poolDetail}>₹{totalWon}</Text>
          </View>
          {myEarnings > 0 && (
            <View style={[styles.poolRow, styles.poolHighlight]}>
              <Text style={styles.poolLabel}>Your Earnings</Text>
              <Text style={styles.myEarnings}>+₹{myEarnings}</Text>
            </View>
          )}
        </View>
      )}

      {/* Prize Winners */}
      <Text style={styles.sectionTitle}>Prizes</Text>
      <View style={styles.card}>
        {CLAIM_ORDER.map(type => {
          const winner = claims[type];
          return (
            <View key={type} style={styles.prizeRow}>
              <View style={styles.prizeLeft}>
                {winner ? (
                  <Ionicons name="trophy" size={16} color={colors.accent} />
                ) : (
                  <Ionicons name="remove-circle-outline" size={16} color={colors.textSecondary} />
                )}
                <Text style={styles.prizeName}>{CLAIM_NAMES[type]}</Text>
              </View>
              {winner ? (
                <View style={styles.prizeRight}>
                  <Text style={[styles.prizeWinner, winner.playerName === game.playerName && styles.prizeWinnerMe]}>
                    {winner.playerName === game.playerName ? 'You' : winner.playerName}
                  </Text>
                  {winner.prize > 0 && <Text style={styles.prizeAmount}>₹{winner.prize}</Text>}
                </View>
              ) : (
                <Text style={styles.unclaimed}>{isCancelled ? '—' : 'Unclaimed'}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Players */}
      <Text style={styles.sectionTitle}>Players</Text>
      <View style={styles.card}>
        {game.players
          .sort((a, b) => (playerEarnings[b] || 0) - (playerEarnings[a] || 0))
          .map((name, i) => {
            const earnings = playerEarnings[name] || 0;
            const isMe = name === game.playerName;
            const pd = game.playerDetails?.[name];
            const tc = pd?.ticketCount || (isMe ? game.ticketCount : 1);
            const mc = pd?.markedCount || (isMe ? game.myMarkedCount : 0);
            const cost = game.ticketPrice * tc;
            const net = earnings - cost;
            return (
              <View key={name} style={styles.playerRow}>
                <View style={styles.playerLeft}>
                  <View style={[styles.playerAvatar, isMe && { borderColor: colors.primary, borderWidth: 2 }]}>
                    <Text style={styles.playerInitial}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={[styles.playerName, isMe && styles.playerNameMe]}>
                      {name}{isMe ? ' (You)' : ''}
                    </Text>
                    <Text style={styles.playerDetail}>
                      {tc} ticket{tc > 1 ? 's' : ''} · {mc}/{tc * 15} marked
                    </Text>
                    {game.totalPrizePool > 0 && (
                      <Text style={styles.playerCost}>Spent: ₹{cost}</Text>
                    )}
                  </View>
                </View>
                {game.totalPrizePool > 0 && (
                  <View style={styles.playerRight}>
                    {earnings > 0 && <Text style={styles.playerEarned}>+₹{earnings}</Text>}
                    <Text style={[styles.playerNet, net >= 0 ? styles.playerNetPos : styles.playerNetNeg]}>
                      {net >= 0 ? '+' : ''}₹{net}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background } as const,
  content: { padding: 16 } as const,
  emptyText: { color: colors.textSecondary, textAlign: 'center' as const, marginTop: 40, fontSize: 16 } as const,

  // Header
  headerCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(128,128,128,0.1)' } as const,
  headerTop: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 8 } as const,
  roomLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' as const, letterSpacing: 2 } as const,
  roomCode: { color: colors.text, fontSize: 28, fontWeight: '900' as const, letterSpacing: 4 } as const,
  statusBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 } as const,
  statusFinished: { backgroundColor: `${colors.success}15` } as const,
  statusCancelled: { backgroundColor: `${colors.primary}15` } as const,
  statusText: { fontSize: 12, fontWeight: '700' as const } as const,
  dateText: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 } as const,
  roleBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 } as const,
  roleText: { color: colors.accent, fontSize: 12, fontWeight: '600' as const } as const,

  // Stats
  statsGrid: { flexDirection: 'row' as const, gap: 8, marginBottom: 14 } as const,
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, alignItems: 'center' as const, borderWidth: 1, borderColor: 'rgba(128,128,128,0.1)' } as const,
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' as const } as const,
  statLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' as const, marginTop: 3 } as const,

  // Pool
  poolCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(128,128,128,0.1)' } as const,
  poolRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 7 } as const,
  poolHighlight: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 10 } as const,
  poolLabel: { color: colors.textSecondary, fontSize: 14 } as const,
  poolAmount: { color: colors.accent, fontSize: 20, fontWeight: '800' as const } as const,
  poolDetail: { color: colors.text, fontSize: 14, fontWeight: '600' as const } as const,
  myEarnings: { color: colors.success, fontSize: 18, fontWeight: '800' as const } as const,

  // Section
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5, marginBottom: 8, marginTop: 4 } as const,
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(128,128,128,0.1)' } as const,

  // Prizes
  prizeRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border } as const,
  prizeLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 } as const,
  prizeName: { color: colors.text, fontSize: 14, fontWeight: '600' as const } as const,
  prizeRight: { alignItems: 'flex-end' as const } as const,
  prizeWinner: { color: colors.text, fontSize: 14, fontWeight: '700' as const } as const,
  prizeWinnerMe: { color: colors.success } as const,
  prizeAmount: { color: colors.accent, fontSize: 12, fontWeight: '700' as const, marginTop: 2 } as const,
  unclaimed: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' as const } as const,

  // Players
  playerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border } as const,
  playerLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 } as const,
  playerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
  playerInitial: { color: colors.text, fontSize: 15, fontWeight: '700' as const } as const,
  playerName: { color: colors.text, fontSize: 14, fontWeight: '600' as const } as const,
  playerNameMe: { color: colors.primary } as const,
  playerDetail: { color: colors.textSecondary, fontSize: 11, marginTop: 2 } as const,
  playerCost: { color: colors.textSecondary, fontSize: 11, marginTop: 1 } as const,
  playerRight: { alignItems: 'flex-end' as const } as const,
  playerEarned: { color: colors.success, fontSize: 14, fontWeight: '700' as const } as const,
  playerNet: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 } as const,
  playerNetPos: { color: colors.success } as const,
  playerNetNeg: { color: colors.primary } as const,
});
