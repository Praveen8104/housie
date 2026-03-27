import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { getGameHistory, clearGameHistory, GameHistoryEntry } from '../src/utils/storage';
import { CLAIM_LABELS, ClaimType } from '../src/utils/gameLogic';
import { Ionicons } from '@expo/vector-icons';
import GameAlert from '../src/components/GameAlert';
import { useGameAlert } from '../src/hooks/useGameAlert';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${day} ${month} ${year}, ${h}:${mins} ${ampm}`;
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { alertState, showAlert, hideAlert } = useGameAlert();

  const loadHistory = useCallback(async () => {
    const data = await getGameHistory();
    setHistory(data);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleClear = () => {
    showAlert(
      'Clear History',
      'Delete all game history? This cannot be undone.',
      'warning',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearGameHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  if (history.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Ionicons name="clipboard-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>No Games Yet</Text>
        <Text style={styles.emptyText}>
          Your multiplayer game history will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
    >
      <GameAlert {...alertState} onClose={hideAlert} />
      <Text style={styles.countText}>{history.length} game{history.length !== 1 ? 's' : ''}</Text>

      {history.map((game) => {
        const myWins = Object.entries(game.claims || {}).filter(([, w]) => w.playerName === game.playerName);
        const totalWinnings = myWins.reduce((sum, [, w]) => sum + (w.prize || 0), 0);
        const isCancelled = game.status === 'cancelled';
        const ticketCost = game.ticketPrice * game.ticketCount;
        const netAmount = totalWinnings - ticketCost;

        return (
          <TouchableOpacity
            key={game.id}
            style={styles.card}
            onPress={() => router.push(`/history-detail?data=${encodeURIComponent(JSON.stringify(game))}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardLeft}>
                <Text style={styles.roomCode}>{game.roomCode}</Text>
                <Text style={styles.dateText}>{formatDate(game.date)}</Text>
              </View>
              <View style={styles.cardRight}>
                {isCancelled ? (
                  <Text style={styles.cancelledTag}>Cancelled</Text>
                ) : ticketCost > 0 && netAmount > 0 ? (
                  <Text style={styles.wonTag}>+₹{netAmount}</Text>
                ) : ticketCost > 0 ? (
                  <Text style={styles.poolTag}>₹{game.totalPrizePool}</Text>
                ) : null}
                <Text style={styles.playerCount}>{game.players.length} players</Text>
              </View>
            </View>
            {myWins.length > 0 && (
              <View style={styles.winTags}>
                {myWins.map(([type]) => (
                  <Text key={type} style={styles.winTag}>{CLAIM_LABELS[type as ClaimType]}</Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Clear button */}
      <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
        <Text style={styles.clearBtnText}>Clear History</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as const,
  content: {
    padding: 16,
  } as const,
  emptyContainer: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  } as const,
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  } as const,
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
  } as const,
  countText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  } as const,
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  } as const,
  dateText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  } as const,
  cardRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  } as const,
  cardLeft: {} as const,
  cardRight: { alignItems: 'flex-end' as const } as const,
  roomCode: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: 2,
  } as const,
  playerCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  } as const,
  cancelledTag: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700' as const,
  } as const,
  wonTag: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '800' as const,
  } as const,
  poolTag: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  } as const,
  winTags: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 8,
  } as const,
  winTag: {
    backgroundColor: `${colors.success}15`,
    color: colors.success,
    fontSize: 11,
    fontWeight: '700' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden' as const,
  } as const,
  clearBtn: {
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginTop: 8,
  } as const,
  clearBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  } as const,
});
