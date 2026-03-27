import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGame } from '../src/store/GameContext';
import TicketView from '../src/components/TicketView';
import ClaimButtons from '../src/components/ClaimButtons';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { ClaimType, CLAIM_LABELS } from '../src/utils/gameLogic';
import { hapticLight, hapticSuccess, hapticError } from '../src/utils/haptics';
import Confetti from '../src/components/Confetti';
import GameAlert from '../src/components/GameAlert';
import { useGameAlert } from '../src/hooks/useGameAlert';

export default function PlayerScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { index } = useLocalSearchParams<{ index: string }>();
  const playerIndex = parseInt(index || '0', 10);
  const { state, toggleMark, claim } = useGame();
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const { alertState, showAlert, hideAlert } = useGameAlert();

  const player = state.players[playerIndex];
  if (!player) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Player not found</Text>
      </View>
    );
  }

  const calledSet = new Set(state.calledNumbers);

  const handleNumberPress = (num: number) => {
    if (!calledSet.has(num)) {
      showAlert('Not Called', `Number ${num} hasn't been called yet!`, 'warning');
      return;
    }
    hapticLight();
    toggleMark(playerIndex, num);
  };

  const handleClaim = (claimType: ClaimType) => {
    const result = claim(playerIndex, claimType);
    if (result.valid) {
      hapticSuccess();
      setShowConfetti(true);
      showAlert(
        'Congratulations!',
        `${player.name} wins ${CLAIM_LABELS[claimType]}!`,
        'success',
        [
          { text: 'OK', onPress: () => {} },
        ]
      );
    } else {
      hapticError();
      showAlert('Invalid Claim', result.message, 'error');
    }
  };

  return (
    <View style={styles.outerContainer}>
    <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    <GameAlert {...alertState} onClose={hideAlert} />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Player Header */}
      <View style={styles.header}>
        <Text style={styles.playerName}>{player.name}'s Ticket</Text>
        <Text style={styles.markedCount}>
          {player.markedNumbers.size}/15 marked
        </Text>
      </View>

      {/* Current Called Number */}
      {state.currentNumber && (
        <View style={styles.currentCallContainer}>
          <Text style={styles.currentCallLabel}>Current Number</Text>
          <View style={styles.currentCallBall}>
            <Text style={styles.currentCallNumber}>{state.currentNumber}</Text>
          </View>
        </View>
      )}

      {/* Ticket */}
      <View style={styles.ticketContainer}>
        <TicketView
          ticket={player.ticket}
          markedNumbers={player.markedNumbers}
          calledNumbers={calledSet}
          onNumberPress={handleNumberPress}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.marked }]} />
          <Text style={styles.legendText}>Marked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.calledNumber }]} />
          <Text style={styles.legendText}>Called (tap to mark)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.surface }]} />
          <Text style={styles.legendText}>Not called</Text>
        </View>
      </View>

      {/* Claim Buttons */}
      <Text style={styles.sectionTitle}>Claim Prize</Text>
      <ClaimButtons claims={state.claims} onClaim={handleClaim} />

      {/* Recent Called Numbers */}
      {state.calledNumbers.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>
            Recently Called ({state.calledNumbers.length})
          </Text>
          <View style={styles.recentRow}>
            {[...state.calledNumbers].reverse().slice(0, 15).map((num) => (
              <View key={num} style={styles.recentBall}>
                <Text style={styles.recentText}>{num}</Text>
              </View>
            ))}
            {state.calledNumbers.length > 15 && (
              <Text style={styles.moreText}>+{state.calledNumbers.length - 15} more</Text>
            )}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  } as const,
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as const,
  content: {
    padding: 16,
  } as const,
  errorText: {
    color: colors.primary,
    fontSize: 18,
    textAlign: 'center' as const,
    marginTop: 40,
  } as const,
  header: {
    alignItems: 'center' as const,
    marginBottom: 16,
  } as const,
  playerName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
  } as const,
  markedCount: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  } as const,
  currentCallContainer: {
    alignItems: 'center' as const,
    marginBottom: 16,
  } as const,
  currentCallLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1,
    marginBottom: 6,
  } as const,
  currentCallBall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  } as const,
  currentCallNumber: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900' as const,
  } as const,
  ticketContainer: {
    alignItems: 'center' as const,
    marginBottom: 16,
  } as const,
  legend: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 16,
    marginBottom: 20,
  } as const,
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  } as const,
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  } as const,
  legendText: {
    color: colors.textSecondary,
    fontSize: 11,
  } as const,
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
    marginTop: 8,
  } as const,
  recentContainer: {
    marginTop: 16,
  } as const,
  recentRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    alignItems: 'center' as const,
  } as const,
  recentBall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  } as const,
  recentText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
  } as const,
  moreText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  } as const,
});
