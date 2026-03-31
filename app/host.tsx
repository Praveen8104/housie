import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '../src/store/GameContext';
import NumberBoard from '../src/components/NumberBoard';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { hapticHeavy } from '../src/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import GameAlert from '../src/components/GameAlert';
import { useGameAlert } from '../src/hooks/useGameAlert';

export default function HostScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { state, drawNumber } = useGame();
  const router = useRouter();
  const [showBoard, setShowBoard] = useState(false);
  const numberAnim = useRef(new Animated.Value(1)).current;
  const { alertState, showAlert, hideAlert } = useGameAlert();

  const calledSet = new Set(state.calledNumbers);

  const handleDraw = () => {
    if (state.gameOver) {
      showAlert('Game Over', 'The game has ended!', 'info');
      return;
    }
    hapticHeavy();
    drawNumber();
    Animated.sequence([
      Animated.timing(numberAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(numberAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const openPlayerTicket = (playerIndex: number) => {
    router.push(`/player?index=${playerIndex}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GameAlert {...alertState} onClose={hideAlert} />
      {/* Current Number Display */}
      <View style={styles.currentNumberContainer}>
        {state.currentNumber ? (
          <>
            <Text style={styles.currentLabel}>CALLED</Text>
            <Animated.View style={[styles.numberBall, { transform: [{ scale: numberAnim }] }]}>
              <Text style={styles.currentNumber}>{state.currentNumber}</Text>
            </Animated.View>
          </>
        ) : (
          <Text style={styles.currentLabel}>TAP DRAW TO START</Text>
        )}
      </View>

      {/* Draw Button */}
      <TouchableOpacity
        style={[styles.drawBtn, state.gameOver && styles.drawBtnDisabled]}
        onPress={handleDraw}
        activeOpacity={0.7}
      >
        <Text style={styles.drawBtnText}>
          {state.gameOver ? 'GAME OVER' : `DRAW (${90 - state.calledNumbers.length} left)`}
        </Text>
      </TouchableOpacity>

      {/* Called Numbers History */}
      {state.calledNumbers.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>
            Called ({state.calledNumbers.length})
          </Text>
          <View style={styles.historyRow}>
            {[...state.calledNumbers].reverse().map((num, i) => (
              <View key={num} style={[styles.historyBall, i === 0 && styles.latestBall]}>
                <Text style={[styles.historyText, i === 0 && styles.latestText]}>
                  {num}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Toggle Number Board */}
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setShowBoard(!showBoard)}
      >
        <Text style={styles.toggleBtnText}>
          {showBoard ? 'Hide' : 'Show'} Number Board (1-90)
        </Text>
      </TouchableOpacity>

      {showBoard && (
        <View style={styles.boardContainer}>
          <NumberBoard calledNumbers={calledSet} />
        </View>
      )}

      {/* Player Tickets */}
      <Text style={styles.sectionTitle}>Players - Tap to open ticket</Text>
      <View style={styles.playersGrid}>
        {state.players.map((player, index) => {
          const markedCount = player.markedNumbers.size;
          return (
            <TouchableOpacity
              key={index}
              style={styles.playerCard}
              onPress={() => openPlayerTicket(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerMarked}>{markedCount}/15 marked</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Claims Summary */}
      <View style={styles.claimsContainer}>
        <Text style={styles.sectionTitle}>Prizes</Text>
        {Object.entries(state.claims).map(([type, winner]) => (
          <View key={type} style={styles.claimRow}>
            <Text style={styles.claimLabel}>
              {type === 'jaldiFive' ? 'Jaldi Five' :
               type === 'topLine' ? 'Top Line' :
               type === 'middleLine' ? 'Middle Line' :
               type === 'bottomLine' ? 'Bottom Line' : 'Full House'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {winner && <Ionicons name="trophy" size={14} color={colors.success} />}
              <Text style={[styles.claimWinner, winner && styles.claimWon]}>
                {winner ? winner.playerName : 'Unclaimed'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Scoreboard Button */}
      <TouchableOpacity
        style={styles.scoreboardBtn}
        onPress={() => router.push('/scoreboard')}
      >
        <Text style={styles.scoreboardBtnText}>View Scoreboard</Text>
      </TouchableOpacity>

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
  currentNumberContainer: {
    alignItems: 'center' as const,
    marginVertical: 16,
  } as const,
  currentLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 2,
    marginBottom: 8,
  } as const,
  numberBall: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  } as const,
  currentNumber: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900' as const,
  } as const,
  drawBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 16,
  } as const,
  drawBtnDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  } as const,
  drawBtnText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '800' as const,
  } as const,
  historyContainer: {
    marginBottom: 16,
  } as const,
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
  } as const,
  historyRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  } as const,
  historyBall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  } as const,
  latestBall: {
    backgroundColor: colors.calledNumber,
    borderColor: colors.calledNumber,
  } as const,
  historyText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  } as const,
  latestText: {
    color: colors.background,
    fontWeight: '800' as const,
  } as const,
  toggleBtn: {
    paddingVertical: 10,
    alignItems: 'center' as const,
    marginBottom: 8,
  } as const,
  toggleBtnText: {
    color: colors.calledNumber,
    fontSize: 14,
    fontWeight: '600' as const,
  } as const,
  boardContainer: {
    alignItems: 'center' as const,
    marginBottom: 16,
  } as const,
  playersGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 20,
  } as const,
  playerCard: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    flexBasis: '44%' as const,
    flexGrow: 1,
    alignItems: 'center' as const,
  } as const,
  playerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  } as const,
  playerMarked: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  } as const,
  claimsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  } as const,
  claimRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  } as const,
  claimLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  } as const,
  claimWinner: {
    color: colors.textSecondary,
    fontSize: 13,
  } as const,
  claimWon: {
    color: colors.success,
    fontWeight: '700' as const,
  } as const,
  scoreboardBtn: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  } as const,
  scoreboardBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  } as const,
});
