import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { createRoom, joinRoom } from '../src/firebase/roomService';
import { useAuth } from '../src/store/AuthContext';
import GameAlert from '../src/components/GameAlert';
import { useGameAlert } from '../src/hooks/useGameAlert';

export default function MultiplayerScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { user } = useAuth();
  const playerName = user?.name || '';
  const [roomCode, setRoomCode] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { alertState, showAlert, hideAlert } = useGameAlert();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) {
        const parsed = Linking.parse(url);
        if (parsed.queryParams?.room) setRoomCode(String(parsed.queryParams.room).toUpperCase());
      }
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      if (parsed.queryParams?.room) setRoomCode(String(parsed.queryParams.room).toUpperCase());
    });
    return () => sub.remove();
  }, []);

  const handleCreate = async () => {
    if (!playerName) return;
    setLoading(true);
    try {
      const price = parseInt(ticketPrice) || 0;
      const code = await createRoom(playerName, 1, price);
      router.push(`/lobby?roomCode=${code}&playerName=${playerName}&isHost=true`);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to create room.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!code || code.length !== 4) { showAlert('Enter Code', 'Enter the 4-letter room code.', 'warning'); return; }
    setLoading(true);
    try {
      await joinRoom(code, playerName, 1);
      router.push(`/lobby?roomCode=${code}&playerName=${playerName}&isHost=false`);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to join room.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <GameAlert {...alertState} onClose={hideAlert} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Create Room */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="add-circle" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Create Room</Text>
          </View>

          <Text style={styles.label}>TICKET PRICE (optional)</Text>
          <View style={styles.priceRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              value={ticketPrice}
              onChangeText={setTicketPrice}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={[styles.createBtn, loading && styles.disabledBtn]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.createBtnText}>CREATE ROOM</Text>
          </TouchableOpacity>
          <Text style={styles.btnSub}>You'll be the host & caller</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Section 3: Join Room */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="enter" size={16} color={colors.accent} />
            <Text style={styles.sectionTitle}>Join Room</Text>
          </View>

          <Text style={styles.label}>ROOM CODE</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="ABCD"
            placeholderTextColor={colors.textSecondary}
            value={roomCode}
            onChangeText={(text) => setRoomCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={4}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
          />

          <TouchableOpacity
            style={[styles.joinBtn, loading && styles.disabledBtn]}
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in" size={20} color={colors.background} style={{ marginRight: 6 }} />
            <Text style={styles.joinBtnText}>JOIN ROOM</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background } as const,
  keyboardContainer: { flex: 1 } as const,
  content: { padding: 16, paddingTop: 12 } as const,
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14 } as const,
  sectionHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 14 } as const,
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' as const } as const,
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' as const, marginBottom: 8, letterSpacing: 1.5 } as const,
  input: { backgroundColor: colors.empty, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 16 } as const,
  codeInput: { fontSize: 28, fontWeight: '900' as const, textAlign: 'center' as const, letterSpacing: 12, paddingVertical: 16, marginBottom: 4 } as const,
  priceRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 } as const,
  currencySymbol: { color: colors.accent, fontSize: 24, fontWeight: '800' as const } as const,
  priceInput: { flex: 1, fontSize: 20, fontWeight: '700' as const } as const,
  createBtn: { flexDirection: 'row' as const, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 16 } as const,
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' as const, letterSpacing: 1 } as const,
  btnSub: { color: colors.textSecondary, fontSize: 11, marginTop: 6, textAlign: 'center' as const } as const,
  disabledBtn: { opacity: 0.5 } as const,
  divider: { flexDirection: 'row' as const, alignItems: 'center' as const, marginVertical: 6 } as const,
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border } as const,
  dividerText: { color: colors.textSecondary, marginHorizontal: 14, fontWeight: '700' as const, fontSize: 12, letterSpacing: 1 } as const,
  joinBtn: { flexDirection: 'row' as const, backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 14 } as const,
  joinBtnText: { color: colors.background, fontSize: 16, fontWeight: '800' as const, letterSpacing: 1 } as const,
});
