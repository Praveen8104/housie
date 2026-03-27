import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/store/AuthContext';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { getWalletBalance } from '../src/firebase/walletService';
import GameAlert from '../src/components/GameAlert';
import { useGameAlert } from '../src/hooks/useGameAlert';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, logout, updateName, updateUpi, changePin, unlockPremium, isPremium } = useAuth();
  const router = useRouter();
  const { alertState, showAlert, hideAlert } = useGameAlert();
  const [balance, setBalance] = useState(0);
  const [editField, setEditField] = useState<'name' | 'upi' | 'pin' | 'premium' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [oldPin, setOldPin] = useState('');

  useEffect(() => {
    if (user) getWalletBalance(user.userId).then(setBalance);
  }, [user]);

  const startEdit = (field: 'name' | 'upi' | 'pin' | 'premium') => {
    setEditField(field);
    setEditValue(field === 'name' ? (user?.name || '') : (field === 'upi' ? (user?.upiId || '') : ''));
    setOldPin('');
  };

  const cancelEdit = () => { setEditField(null); setEditValue(''); setOldPin(''); };

  const saveEdit = async () => {
    const val = editValue.trim();
    if (editField === 'premium') {
      if (!val) { showAlert('Required', 'Enter a premium code.', 'warning'); return; }
      const success = await unlockPremium(val);
      if (success) {
        setEditField(null);
        showAlert('Premium Unlocked', 'You now have access to all premium features!', 'success');
      } else {
        showAlert('Invalid Code', 'The code you entered is not valid.', 'error');
      }
      return;
    }
    if (editField === 'pin') {
      if (!oldPin || oldPin.length !== 4) { showAlert('Invalid', 'Enter your current 4-digit PIN.', 'warning'); return; }
      if (!val || val.length !== 4) { showAlert('Invalid', 'New PIN must be 4 digits.', 'warning'); return; }
      try {
        await changePin(oldPin, val);
        setEditField(null);
        showAlert('Updated', 'PIN changed successfully.', 'success');
      } catch (err: any) {
        showAlert('Error', err.message, 'error');
      }
      return;
    }
    if (!val) { showAlert('Required', `${editField === 'name' ? 'Name' : 'UPI ID'} cannot be empty.`, 'warning'); return; }
    if (editField === 'name') await updateName(val);
    else if (editField === 'upi') await updateUpi(val);
    setEditField(null);
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', 'warning', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  if (!user) return null;

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GameAlert {...alertState} onClose={hideAlert} />

      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.phone}>+91 {user.phone}</Text>
      </View>

      {/* Balance */}
      <TouchableOpacity style={styles.balanceCard} onPress={() => router.push('/wallet')} activeOpacity={0.7}>
        <View>
          <Text style={styles.balanceLabel}>Wallet</Text>
          <Text style={styles.balanceAmount}>₹{balance}</Text>
        </View>
        <View style={styles.balanceAction}>
          <Text style={styles.balanceActionText}>View</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </View>
      </TouchableOpacity>

      {/* Settings list */}
      <View style={styles.list}>
        {/* Name */}
        <TouchableOpacity style={styles.row} onPress={() => startEdit('name')} activeOpacity={0.6}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{user.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* UPI */}
        <TouchableOpacity style={styles.row} onPress={() => startEdit('upi')} activeOpacity={0.6}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="card-outline" size={18} color={colors.accent} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>UPI ID</Text>
            <Text style={[styles.rowValue, !user.upiId && { color: colors.textSecondary, fontStyle: 'italic' }]}>
              {user.upiId || 'Not set'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Premium */}
        <TouchableOpacity style={styles.row} onPress={isPremium ? undefined : () => startEdit('premium')} activeOpacity={isPremium ? 1 : 0.6}>
          <View style={[styles.rowIcon, { backgroundColor: '#FFD70020' }]}>
            <Ionicons name={isPremium ? 'star' : 'star-outline'} size={18} color="#FFD700" />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Premium</Text>
            <Text style={[styles.rowValue, isPremium && { color: '#FFD700' }]}>
              {isPremium ? 'Active' : 'Enter code to unlock'}
            </Text>
          </View>
          {!isPremium && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
        </TouchableOpacity>

        {/* Phone (read-only) */}
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.success}20` }]}>
            <Ionicons name="call-outline" size={18} color={colors.success} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Phone</Text>
            <Text style={styles.rowValue}>+91 {user.phone}</Text>
          </View>
        </View>

        {/* Change PIN */}
        <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => startEdit('pin')} activeOpacity={0.6}>
          <View style={[styles.rowIcon, { backgroundColor: `${colors.warning}20` }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>PIN</Text>
            <Text style={styles.rowValue}>Change PIN</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.primary} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>

    {/* Edit modal */}
    <Modal visible={!!editField} transparent animationType="fade" onRequestClose={cancelEdit}>
      <KeyboardAvoidingView style={styles.editOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={cancelEdit} />
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>
            {editField === 'name' ? 'Edit Name' : editField === 'upi' ? 'Edit UPI ID' : editField === 'premium' ? 'Enter Premium Code' : 'Change PIN'}
          </Text>
          {editField === 'pin' && (
            <TextInput
              style={styles.editInput}
              value={oldPin}
              onChangeText={setOldPin}
              placeholder="Current PIN"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
            />
          )}
          <TextInput
            style={styles.editInput}
            value={editValue}
            onChangeText={setEditValue}
            autoCapitalize={editField === 'premium' ? 'characters' : editField === 'name' ? 'words' : 'none'}
            placeholder={editField === 'name' ? 'Your name' : editField === 'upi' ? 'yourname@upi' : editField === 'premium' ? 'Enter code' : 'New PIN'}
            placeholderTextColor={colors.textSecondary}
            keyboardType={editField === 'pin' ? 'number-pad' : 'default'}
            maxLength={editField === 'pin' ? 4 : undefined}
            secureTextEntry={editField === 'pin'}
            autoFocus={editField !== 'pin'}
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.editCancelBtn} onPress={cancelEdit}>
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editSaveBtn} onPress={saveEdit}>
              <Text style={styles.editSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background } as const,
  content: { padding: 16 } as const,

  // Header
  header: { alignItems: 'center' as const, paddingVertical: 20 } as const,
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: colors.primary,
    justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 14,
  } as const,
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  } as const,
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' as const } as const,
  name: { color: colors.text, fontSize: 24, fontWeight: '800' as const } as const,
  phone: { color: colors.textSecondary, fontSize: 14, marginTop: 4 } as const,

  // Balance
  balanceCard: {
    flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const,
    backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 20,
  } as const,
  balanceLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' as const } as const,
  balanceAmount: { color: colors.accent, fontSize: 28, fontWeight: '900' as const, marginTop: 2 } as const,
  balanceAction: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 } as const,
  balanceActionText: { color: colors.accent, fontSize: 14, fontWeight: '600' as const } as const,

  // List
  list: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' as const, marginBottom: 20 } as const,
  row: {
    flexDirection: 'row' as const, alignItems: 'center' as const, padding: 16, gap: 14,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  } as const,
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center' as const, alignItems: 'center' as const } as const,
  rowContent: { flex: 1 } as const,
  rowLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' as const } as const,
  rowValue: { color: colors.text, fontSize: 16, fontWeight: '600' as const, marginTop: 2 } as const,

  // Logout
  logoutBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
  } as const,
  logoutText: { color: colors.primary, fontSize: 16, fontWeight: '700' as const } as const,

  // Edit overlay
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  } as const,
  editCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 } as const,
  editTitle: { color: colors.text, fontSize: 18, fontWeight: '700' as const, marginBottom: 16 } as const,
  editInput: {
    backgroundColor: colors.empty, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: colors.text, fontSize: 16, marginBottom: 16,
  } as const,
  editActions: { flexDirection: 'row' as const, gap: 10 } as const,
  editCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center' as const } as const,
  editCancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' as const } as const,
  editSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' as const } as const,
  editSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' as const } as const,
});
