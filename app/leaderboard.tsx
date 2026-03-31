import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { getGameHistory, GameHistoryEntry } from '../src/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../src/components/ScreenHeader';

interface PlayerStats {
  name: string;
  gamesPlayed: number;
  totalWins: number;
  totalPrize: number;
  claims: Record<string, number>; // claim type -> count
}

function buildLeaderboard(history: GameHistoryEntry[]): PlayerStats[] {
  const statsMap: Record<string, PlayerStats> = {};

  for (const game of history) {
    // Track all players in the game
    for (const name of game.players) {
      if (!statsMap[name]) {
        statsMap[name] = { name, gamesPlayed: 0, totalWins: 0, totalPrize: 0, claims: {} };
      }
      statsMap[name].gamesPlayed++;
    }

    // Track claims
    for (const [type, winner] of Object.entries(game.claims || {})) {
      const pName = winner.playerName;
      if (!statsMap[pName]) {
        statsMap[pName] = { name: pName, gamesPlayed: 0, totalWins: 0, totalPrize: 0, claims: {} };
      }
      statsMap[pName].totalWins++;
      statsMap[pName].totalPrize += winner.prize || 0;
      statsMap[pName].claims[type] = (statsMap[pName].claims[type] || 0) + 1;
    }
  }

  return Object.values(statsMap).sort((a, b) => {
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    return b.totalPrize - a.totalPrize;
  });
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const history = await getGameHistory();
    setTotalGames(history.length);
    setLeaderboard(buildLeaderboard(history));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (leaderboard.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader title="Leaderboard" subtitle="Top performers across games" />
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Data Yet</Text>
          <Text style={styles.emptyText}>Play some multiplayer games to see the leaderboard.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <ScreenHeader title="Leaderboard" subtitle="Top performers across games" />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
    >
      <Text style={styles.subtitle}>Based on {totalGames} game{totalGames !== 1 ? 's' : ''}</Text>

      {leaderboard.map((player, index) => (
        <View key={player.name} style={[styles.card, index < 3 && styles.topCard]}>
          <View style={styles.rankCol}>
            {index < 3 ? (
              <Ionicons name="medal" size={24} color={MEDAL_COLORS[index]} />
            ) : (
              <Text style={styles.rank}>{`#${index + 1}`}</Text>
            )}
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.statsText}>
              {player.gamesPlayed} game{player.gamesPlayed !== 1 ? 's' : ''} played
            </Text>
            {Object.keys(player.claims).length > 0 && (
              <View style={styles.claimTags}>
                {Object.entries(player.claims).map(([type, count]) => (
                  <Text key={type} style={styles.claimTag}>
                    {type === 'jaldiFive' ? 'J5' : type === 'topLine' ? 'Top' : type === 'middleLine' ? 'Mid' : type === 'bottomLine' ? 'Bot' : 'FH'}
                    {count > 1 ? ` x${count}` : ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
          <View style={styles.winsCol}>
            <Text style={styles.winsCount}>{player.totalWins}</Text>
            <Text style={styles.winsLabel}>win{player.totalWins !== 1 ? 's' : ''}</Text>
            {player.totalPrize > 0 && (
              <Text style={styles.prizeTotal}>₹{player.totalPrize}</Text>
            )}
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center' as const,
  } as const,
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  } as const,
  topCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  } as const,
  rankCol: {
    width: 40,
    alignItems: 'center' as const,
  } as const,
  rank: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '800' as const,
  } as const,
  infoCol: {
    flex: 1,
    marginLeft: 8,
  } as const,
  playerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  } as const,
  statsText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  } as const,
  claimTags: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 4,
    marginTop: 6,
  } as const,
  claimTag: {
    backgroundColor: colors.card,
    color: colors.calledNumber,
    fontSize: 10,
    fontWeight: '700' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden' as const,
  } as const,
  winsCol: {
    alignItems: 'center' as const,
    marginLeft: 8,
  } as const,
  winsCount: {
    color: colors.success,
    fontSize: 24,
    fontWeight: '900' as const,
  } as const,
  winsLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600' as const,
  } as const,
  prizeTotal: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800' as const,
    marginTop: 4,
  } as const,
});
