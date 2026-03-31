import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/store/AuthContext';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import GameAlert from '../src/components/GameAlert';
import ScreenHeader from '../src/components/ScreenHeader';
import { useGameAlert } from '../src/hooks/useGameAlert';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { register, login } = useAuth();
  const { alertState, showAlert, hideAlert } = useGameAlert();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      showAlert('Invalid Phone', 'Enter a valid 10-digit phone number.', 'warning');
      return;
    }
    if (!cleanPin || cleanPin.length !== 4) {
      showAlert('Invalid PIN', 'Enter a 4-digit PIN.', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const cleanName = name.trim();
        if (!cleanName) {
          showAlert('Enter Name', 'Please enter your name.', 'warning');
          setLoading(false);
          return;
        }
        await register(cleanPhone, cleanName, cleanPin);
      } else {
        await login(cleanPhone, cleanPin);
      }
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Welcome" subtitle="Login or create an account" hideBack />
      <GameAlert {...alertState} onClose={hideAlert} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="game-controller" size={40} color="#fff" />
            </View>
            <Text style={styles.title}>HOUSIE</Text>
            <Text style={styles.subtitle}>Tambola / Bingo</Text>
          </View>

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'register' && styles.toggleActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.card}>
            {mode === 'register' && (
              <>
                <Text style={styles.label}>YOUR NAME</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}

            <Text style={styles.label}>PHONE NUMBER</Text>
            <View style={styles.inputRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit number"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <Text style={styles.label}>4-DIGIT PIN</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Enter PIN"
                placeholderTextColor={colors.textSecondary}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'register' ? 'CREATE ACCOUNT' : 'LOGIN'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  safe: { flex: 1, backgroundColor: colors.background } as const,
  container: { flex: 1 } as const,
  content: { padding: 20, paddingTop: 40 } as const,
  logoSection: { alignItems: 'center' as const, marginBottom: 32 } as const,
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 12 } as const,
  title: { fontSize: 32, fontWeight: '900' as const, color: colors.text, letterSpacing: 6 } as const,
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 } as const,
  toggleRow: { flexDirection: 'row' as const, backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 20 } as const,
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' as const } as const,
  toggleActive: { backgroundColor: colors.primary } as const,
  toggleText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' as const } as const,
  toggleTextActive: { color: '#fff' } as const,
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16 } as const,
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5, marginBottom: 8, marginTop: 12 } as const,
  inputRow: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.empty, borderRadius: 10, paddingHorizontal: 12, gap: 8 } as const,
  countryCode: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' as const } as const,
  input: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 16 } as const,
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const, marginTop: 20 } as const,
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' as const, letterSpacing: 1 } as const,
  disabledBtn: { opacity: 0.5 } as const,
  switchText: { color: colors.accent, fontSize: 14, fontWeight: '600' as const, textAlign: 'center' as const, marginTop: 8 } as const,
});
