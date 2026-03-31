import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '../src/store/GameContext';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { CLAIM_LABELS, ClaimType } from '../src/utils/gameLogic';
import ScreenHeader from '../src/components/ScreenHeader';
import { Ionicons } from '@expo/vector-icons';

const CLAIM_ORDER: ClaimType[] = ['fullHouse', 'jaldiFive', 'topLine', 'middleLine', 'bottomLine'];

export default function ScoreboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { state, resetGame } = useGame();
  const router = useRouter();

  const handleNewGame = () => {
    resetGame();
    router.replace('/');
  };

  const totalClaimed = CLAIM_ORDER.filter(t => state.claims[t] !== null).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <ScreenHeader title="Scoreboard" subtitle="Winners and game summary" />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {state.gameOver ? 'Game Over!' : 'Scoreboard'}
      </Text>

      <Text style={styles.statsText}>
        Numbers called: {state.calledNumbers.length}/90 | Prizes won: {totalClaimed}/5
      </Text>

      {/* Prize Results */}
      <View style={styles.prizesContainer}>
        {CLAIM_ORDER.map((type) => {
          const winner = state.claims[type];
          return (
            <View
              key={type}
              style={[styles.prizeCard, winner && styles.prizeCardWon]}
            >
              <View style={styles.prizeHeader}>
                <Text style={styles.prizeName}>{CLAIM_LABELS[type]}</Text>
                {winner && <Ionicons name="trophy" size={20} color={colors.accent} />}
              </View>
              {winner ? (
                <View>
                  <Text style={styles.winnerName}>{winner.playerName}</Text>
                  <Text style={styles.winnerDetail}>
                    Won after call #{winner.callNumber}
                  </Text>
                </View>
              ) : (
                <Text style={styles.unclaimed}>Unclaimed</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Player Stats */}
      <Text style={styles.sectionTitle}>Player Stats</Text>
      <View style={styles.playerStatsContainer}>
        {state.players.map((player, index) => {
          const prizes = CLAIM_ORDER.filter(
            t => state.claims[t]?.playerName === player.name
          );
          return (
            <View key={index} style={styles.playerStatCard}>
              <Text style={styles.playerStatName}>{player.name}</Text>
              <Text style={styles.playerStatMarked}>
                {player.markedNumbers.size}/15 marked
              </Text>
              {prizes.length > 0 ? (
                <View style={styles.playerPrizes}>
                  {prizes.map(p => (
                    <Text key={p} style={styles.playerPrizeTag}>
                      {CLAIM_LABELS[p]}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.noPrize}>No prizes yet</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!state.gameOver && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Back to Game</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.newGameBtn} onPress={handleNewGame}>
          <Text style={styles.newGameBtnText}>New Game</Text>
        </TouchableOpacity>
      </View>

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
  title: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginTop: 10,
    marginBottom: 8,
  } as const,
  statsText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 20,
  } as const,
  prizesContainer: {
    gap: 10,
    marginBottom: 24,
  } as const,
  prizeCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
  } as const,
  prizeCardWon: {
    borderLeftColor: colors.success,
    backgroundColor: colors.card,
  } as const,
  prizeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  } as const,
  prizeName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  } as const,
  winnerName: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '800' as const,
  } as const,
  winnerDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  } as const,
  unclaimed: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic' as const,
  } as const,
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  } as const,
  playerStatsContainer: {
    gap: 10,
    marginBottom: 24,
  } as const,
  playerStatCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
  } as const,
  playerStatName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  } as const,
  playerStatMarked: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  } as const,
  playerPrizes: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 6,
  } as const,
  playerPrizeTag: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600' as const,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden' as const,
  } as const,
  noPrize: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  } as const,
  actions: {
    gap: 10,
  } as const,
  backBtn: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  } as const,
  backBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  } as const,
  newGameBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  } as const,
  newGameBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  } as const,
});
