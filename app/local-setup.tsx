import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../src/store/GameContext';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import GameAlert from '../src/components/GameAlert';
import ScreenHeader from '../src/components/ScreenHeader';
import { useGameAlert } from '../src/hooks/useGameAlert';

export default function LocalSetupScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const router = useRouter();
  const { startGame, resetGame } = useGame();
  const { alertState, showAlert, hideAlert } = useGameAlert();

  const addPlayer = () => {
    if (playerNames.length < 8) setPlayerNames([...playerNames, '']);
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 2) setPlayerNames(playerNames.filter((_, i) => i !== index));
  };

  const updateName = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  const handleStart = () => {
    const names = playerNames.map(n => n.trim()).filter(n => n.length > 0);
    if (names.length < 2) {
      showAlert('Need Players', 'Enter at least 2 player names.', 'warning');
      return;
    }
    if (new Set(names).size !== names.length) {
      showAlert('Duplicate Names', 'Each player must have a unique name.', 'warning');
      return;
    }
    resetGame();
    startGame(names);
    router.push('/host');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <ScreenHeader title="Local Setup" subtitle="Add players on this device" />
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GameAlert {...alertState} onClose={hideAlert} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Add Players</Text>
        <Text style={styles.sub}>Enter names for everyone playing on this device</Text>

        {playerNames.map((name, index) => (
          <View key={index} style={styles.inputRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={`Player ${index + 1}`}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(text) => updateName(index, text)}
              autoCapitalize="words"
            />
            {playerNames.length > 2 && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePlayer(index)}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {playerNames.length < 8 && (
          <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addBtnText}>Add Player</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
          <Ionicons name="play" size={22} color="#fff" />
          <Text style={styles.startBtnText}>START GAME</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background } as const,
  content: { padding: 20, paddingTop: 16 } as const,
  heading: { color: colors.text, fontSize: 22, fontWeight: '800' as const, marginBottom: 4 } as const,
  sub: { color: colors.textSecondary, fontSize: 14, marginBottom: 20 } as const,
  inputRow: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: colors.empty, borderRadius: 12, marginBottom: 10, paddingRight: 6,
  } as const,
  badge: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card,
    justifyContent: 'center' as const, alignItems: 'center' as const, marginLeft: 6,
  } as const,
  badgeText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' as const } as const,
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, color: colors.text, fontSize: 16 } as const,
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
  addBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 6, borderWidth: 1.5, borderStyle: 'dashed' as const, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 12, marginBottom: 24,
  } as const,
  addBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' as const } as const,
  startBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 10, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 14,
  } as const,
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' as const, letterSpacing: 1 } as const,
});
