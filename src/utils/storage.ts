import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYER_NAME_KEY = 'housie_player_name';
const GAME_HISTORY_KEY = 'housie_game_history';
const ACTIVE_SESSION_KEY = 'housie_active_session';

// Active game session
export interface ActiveSession {
  roomCode: string;
  playerName: string;
  isHost: boolean;
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  const data = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export async function clearActiveSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
}

// Player name
export async function savePlayerName(name: string): Promise<void> {
  await AsyncStorage.setItem(PLAYER_NAME_KEY, name);
}

export async function getPlayerName(): Promise<string | null> {
  return AsyncStorage.getItem(PLAYER_NAME_KEY);
}

// Game history
export interface GameHistoryEntry {
  id: string;
  date: string;
  roomCode: string;
  playerName: string;
  isHost: boolean;
  players: string[];
  ticketCount: number;
  ticketPrice: number;
  totalPrizePool: number;
  claims: Record<string, { playerName: string; prize: number }>;
  myMarkedCount: number;
  totalNumbers: number;
  calledCount: number;
  duration?: string;
  status?: 'finished' | 'cancelled';
  playerDetails?: Record<string, { ticketCount: number; markedCount: number }>;
}

export async function saveGameHistory(entry: GameHistoryEntry): Promise<void> {
  const existing = await getGameHistory();
  existing.unshift(entry); // newest first
  // Keep last 50 games
  const trimmed = existing.slice(0, 50);
  await AsyncStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(trimmed));
}

export async function getGameHistory(): Promise<GameHistoryEntry[]> {
  const data = await AsyncStorage.getItem(GAME_HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function clearGameHistory(): Promise<void> {
  await AsyncStorage.removeItem(GAME_HISTORY_KEY);
}
