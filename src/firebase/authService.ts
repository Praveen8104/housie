import { db } from './config';
import { ref, get, set, update } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'housie_auth';

export interface UserProfile {
  userId: string;
  name: string;
  phone: string;
  pin: string;
  upiId?: string;
  isPremium?: boolean;
  createdAt: number;
}

function phoneToId(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export async function registerUser(phone: string, name: string, pin: string): Promise<UserProfile> {
  const userId = phoneToId(phone);
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    throw new Error('Phone number already registered. Please login.');
  }

  const profile: UserProfile = {
    userId,
    name,
    phone,
    pin,
    createdAt: Date.now(),
  };

  await set(userRef, profile);

  // Initialize wallet
  await set(ref(db, `wallets/${userId}`), {
    balance: 0,
    updatedAt: Date.now(),
  });

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
  return profile;
}

export async function loginUser(phone: string, pin: string): Promise<UserProfile> {
  const userId = phoneToId(phone);
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  if (!snapshot.exists()) {
    throw new Error('Account not found. Please register first.');
  }

  const profile = snapshot.val() as UserProfile;
  if (profile.pin !== pin) {
    throw new Error('Incorrect PIN.');
  }

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
  return profile;
}

export async function getStoredUser(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await update(ref(db, `users/${userId}`), { name });
  const stored = await getStoredUser();
  if (stored && stored.userId === userId) {
    stored.name = name;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(stored));
  }
}

export async function updateUserPin(userId: string, oldPin: string, newPin: string): Promise<void> {
  const snapshot = await get(ref(db, `users/${userId}`));
  if (!snapshot.exists()) throw new Error('User not found.');
  const profile = snapshot.val() as UserProfile;
  if (profile.pin !== oldPin) throw new Error('Current PIN is incorrect.');
  await update(ref(db, `users/${userId}`), { pin: newPin });
  const stored = await getStoredUser();
  if (stored && stored.userId === userId) {
    stored.pin = newPin;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(stored));
  }
}

export async function updateUserUpiId(userId: string, upiId: string): Promise<void> {
  await update(ref(db, `users/${userId}`), { upiId });
  const stored = await getStoredUser();
  if (stored && stored.userId === userId) {
    stored.upiId = upiId;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(stored));
  }
}

const PREMIUM_CODES = ['HOUSIE2026', 'TAMBOLA', 'PRAVEEN'];

export async function activatePremium(userId: string, code: string): Promise<boolean> {
  if (!PREMIUM_CODES.includes(code.toUpperCase())) return false;
  await update(ref(db, `users/${userId}`), { isPremium: true });
  const stored = await getStoredUser();
  if (stored && stored.userId === userId) {
    stored.isPremium = true;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(stored));
  }
  return true;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}
