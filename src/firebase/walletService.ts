import { db } from './config';
import { ref, get, set, push, runTransaction } from 'firebase/database';

export interface WalletData {
  balance: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: 'ticket_fee' | 'prize_won' | 'refund';
  roomCode?: string;
  description: string;
  balanceAfter: number;
  timestamp: number;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const snapshot = await get(ref(db, `wallets/${userId}/balance`));
  return snapshot.exists() ? (snapshot.val() as number) : 0;
}

export async function creditWallet(
  userId: string,
  amount: number,
  reason: Transaction['reason'],
  description: string,
  roomCode?: string,
): Promise<number> {
  if (amount <= 0) return getWalletBalance(userId);

  const walletRef = ref(db, `wallets/${userId}/balance`);
  const result = await runTransaction(walletRef, (current) => (current || 0) + amount);
  const newBalance = result.snapshot.val() || 0;

  await set(ref(db, `wallets/${userId}/updatedAt`), Date.now());

  const txRef = push(ref(db, `transactions/${userId}`));
  await set(txRef, {
    type: 'credit',
    amount,
    reason,
    description,
    roomCode,
    balanceAfter: newBalance,
    timestamp: Date.now(),
  });

  return newBalance;
}

export async function debitWallet(
  userId: string,
  amount: number,
  reason: Transaction['reason'],
  description: string,
  roomCode?: string,
): Promise<number> {
  if (amount <= 0) return getWalletBalance(userId);

  const walletRef = ref(db, `wallets/${userId}/balance`);
  // Allow negative balance — wallet is a ledger, not a bank
  const result = await runTransaction(walletRef, (current) => (current || 0) - amount);
  const newBalance = result.snapshot.val() || 0;

  await set(ref(db, `wallets/${userId}/updatedAt`), Date.now());

  const txRef = push(ref(db, `transactions/${userId}`));
  await set(txRef, {
    type: 'debit',
    amount,
    reason,
    description,
    roomCode,
    balanceAfter: newBalance,
    timestamp: Date.now(),
  });

  return newBalance;
}

export async function getTransactions(userId: string, count: number = 50): Promise<Transaction[]> {
  const snapshot = await get(ref(db, `transactions/${userId}`));
  if (!snapshot.exists()) return [];

  const transactions: Transaction[] = [];
  snapshot.forEach((child) => {
    transactions.push({ id: child.key!, ...child.val() });
  });
  return transactions.sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
}

export async function ensureWalletExists(userId: string): Promise<void> {
  const snapshot = await get(ref(db, `wallets/${userId}`));
  if (!snapshot.exists()) {
    await set(ref(db, `wallets/${userId}`), { balance: 0, updatedAt: Date.now() });
  }
}
