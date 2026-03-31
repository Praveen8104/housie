import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/store/AuthContext';
import { useTheme, ThemeColors } from '../src/store/ThemeContext';
import { useThemedStyles } from '../src/hooks/useStyles';
import { getWalletBalance, getTransactions, Transaction } from '../src/firebase/walletService';
import ScreenHeader from '../src/components/ScreenHeader';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  const h = d.getHours() % 12 || 12;
  const mins = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${day} ${month}, ${h}:${mins} ${ampm}`;
}

const REASON_LABELS: Record<string, string> = {
  ticket_fee: 'Ticket Fee',
  prize_won: 'Prize Won',
  refund: 'Refund',
};

const REASON_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ticket_fee: 'ticket',
  prize_won: 'trophy',
  refund: 'refresh-circle',
};

export default function WalletScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [bal, txs] = await Promise.all([
      getWalletBalance(user.userId),
      getTransactions(user.userId),
    ]);
    setBalance(bal);
    setTransactions(txs);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <ScreenHeader title="Wallet" subtitle="Balance and transactions" />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
    >
      {/* Balance Card */}
      <View style={[styles.balanceCard, balance < 0 && { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>{balance >= 0 ? 'NET EARNINGS' : 'NET LOSS'}</Text>
        <Text style={styles.balanceAmount}>{balance >= 0 ? '' : '-'}₹{Math.abs(balance)}</Text>
        <Text style={styles.balanceHint}>
          {balance >= 0 ? 'Your total winnings across all games' : 'You owe this amount to hosts'}
        </Text>
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Transaction History</Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptyHint}>Join a paid game to see transactions here</Text>
        </View>
      ) : (
        transactions.map(tx => (
          <View key={tx.id} style={styles.txCard}>
            <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? `${colors.success}20` : `${colors.primary}20` }]}>
              <Ionicons
                name={REASON_ICONS[tx.reason] || 'cash'}
                size={20}
                color={tx.type === 'credit' ? colors.success : colors.primary}
              />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txDescription}>{tx.description || REASON_LABELS[tx.reason] || tx.reason}</Text>
              <Text style={styles.txDate}>{formatDate(tx.timestamp)}</Text>
              {tx.roomCode && <Text style={styles.txRoom}>Room: {tx.roomCode}</Text>}
            </View>
            <View style={styles.txAmountCol}>
              <Text style={[styles.txAmount, tx.type === 'credit' ? styles.txCredit : styles.txDebit]}>
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
              </Text>
              <Text style={styles.txBalance}>₹{tx.balanceAfter}</Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background } as const,
  content: { padding: 16 } as const,
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center' as const,
    marginBottom: 20,
  } as const,
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' as const, letterSpacing: 2 } as const,
  balanceAmount: { color: '#fff', fontSize: 42, fontWeight: '900' as const, marginTop: 8 } as const,
  balanceHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 } as const,
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' as const, marginBottom: 12 } as const,
  emptyState: { alignItems: 'center' as const, paddingVertical: 40 } as const,
  emptyText: { color: colors.text, fontSize: 16, fontWeight: '600' as const, marginTop: 12 } as const,
  emptyHint: { color: colors.textSecondary, fontSize: 13, marginTop: 4 } as const,
  txCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  } as const,
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  } as const,
  txInfo: { flex: 1 } as const,
  txDescription: { color: colors.text, fontSize: 14, fontWeight: '600' as const } as const,
  txDate: { color: colors.textSecondary, fontSize: 11, marginTop: 2 } as const,
  txRoom: { color: colors.textSecondary, fontSize: 10, marginTop: 1 } as const,
  txAmountCol: { alignItems: 'flex-end' as const } as const,
  txAmount: { fontSize: 16, fontWeight: '800' as const } as const,
  txCredit: { color: colors.success } as const,
  txDebit: { color: colors.primary } as const,
  txBalance: { color: colors.textSecondary, fontSize: 10, marginTop: 2 } as const,
});
