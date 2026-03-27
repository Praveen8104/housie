import { db } from './config';
import { debitWallet, creditWallet } from './walletService';
import {
  ref,
  set,
  get,
  update,
  onValue,
  remove,
  DatabaseReference,
} from 'firebase/database';
import { generateUniqueTickets } from '../utils/ticketGenerator';
import { ClaimType } from '../utils/gameLogic';
import { PRIZE_DISTRIBUTION } from '../constants/theme';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface RoomPlayer {
  name: string;
  tickets: (number | null)[][][];
  ticket?: (number | null)[][];
  markedNumbers: number[];
  ticketCount: number;
  isHost: boolean;
}

export interface RoomClaim {
  playerName: string;
  callNumber: number;
  prizeAmount: number;
  winners?: { name: string; amount: number }[];
}

export interface RoomData {
  hostName: string;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled';
  calledNumbers: number[];
  currentNumber: number | null;
  players: Record<string, RoomPlayer>;
  claims: Record<string, RoomClaim | null>;
  ticketPrice: number;
  totalPool: number;
  prizeDistribution?: Record<string, number>;
  prizeAmounts?: Record<string, number>;
  hostUpiId?: string;
  paymentStatus?: Record<string, 'unpaid' | 'paid' | 'confirmed'>;
  playerUserIds?: Record<string, string>;
  createdAt: number;
  startedAt?: number;
}

function roomRef(roomCode: string): DatabaseReference {
  return ref(db, `rooms/${roomCode}`);
}

function safeArray(val: any): number[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.values(val);
}

function safeTickets(player: RoomPlayer): (number | null)[][][] {
  if (player.tickets) {
    return Array.isArray(player.tickets) ? player.tickets : Object.values(player.tickets);
  }
  if (player.ticket && player.ticket.length > 0) return [player.ticket];
  return [];
}

export async function createRoom(hostName: string, ticketCount: number = 1, ticketPrice: number = 0): Promise<string> {
  const roomCode = generateRoomCode();
  const roomData: RoomData = {
    hostName,
    status: 'waiting',
    calledNumbers: [],
    currentNumber: null,
    players: {
      [hostName]: {
        name: hostName,
        tickets: [],
        markedNumbers: [],
        ticketCount,
        isHost: true,
      },
    },
    claims: {
      jaldiFive: null,
      topLine: null,
      middleLine: null,
      bottomLine: null,
      fullHouse: null,
    },
    ticketPrice,
    totalPool: 0,
    createdAt: Date.now(),
  };
  await set(roomRef(roomCode), roomData);
  return roomCode;
}

export async function joinRoom(roomCode: string, playerName: string, ticketCount: number = 1): Promise<boolean> {
  const snapshot = await get(roomRef(roomCode));
  if (!snapshot.exists()) throw new Error('Room not found');

  const data = snapshot.val() as RoomData;
  if (data.status !== 'waiting') throw new Error('Game already started');
  if (data.players && data.players[playerName]) throw new Error('Name already taken');

  const playerCount = data.players ? Object.keys(data.players).length : 0;
  if (playerCount >= 8) throw new Error('Room is full (max 8)');

  await update(ref(db, `rooms/${roomCode}/players/${playerName}`), {
    name: playerName,
    tickets: [],
    markedNumbers: [],
    ticketCount,
    isHost: false,
  });
  return true;
}

export async function updateTicketPrice(roomCode: string, price: number): Promise<void> {
  await update(ref(db, `rooms/${roomCode}`), { ticketPrice: price });
}

export async function updatePrizeDistribution(roomCode: string, distribution: Record<string, number>): Promise<void> {
  await update(ref(db, `rooms/${roomCode}`), { prizeDistribution: distribution });
}

export async function updatePrizeAmounts(roomCode: string, amounts: Record<string, number>): Promise<void> {
  await update(ref(db, `rooms/${roomCode}`), { prizeAmounts: amounts });
}

export async function updateHostUpiId(roomCode: string, upiId: string): Promise<void> {
  await update(ref(db, `rooms/${roomCode}`), { hostUpiId: upiId });
}

export async function setPlayerPaymentStatus(roomCode: string, playerName: string, status: 'unpaid' | 'paid' | 'confirmed'): Promise<void> {
  await update(ref(db, `rooms/${roomCode}/paymentStatus`), { [playerName]: status });
}

export async function setPlayerUserId(roomCode: string, playerName: string, userId: string): Promise<void> {
  await update(ref(db, `rooms/${roomCode}/playerUserIds`), { [playerName]: userId });
}

export async function updatePlayerTicketCount(roomCode: string, playerName: string, count: number): Promise<void> {
  await update(ref(db, `rooms/${roomCode}/players/${playerName}`), { ticketCount: count });
}

export async function startGame(roomCode: string): Promise<void> {
  const snapshot = await get(roomRef(roomCode));
  if (!snapshot.exists()) throw new Error('Room not found');

  const data = snapshot.val() as RoomData;
  const playerNames = Object.keys(data.players);

  // Calculate total pool
  let totalTickets = 0;
  const updates: Record<string, any> = {
    [`rooms/${roomCode}/status`]: 'playing',
    [`rooms/${roomCode}/startedAt`]: Date.now(),
  };

  for (const name of playerNames) {
    const count = data.players[name]?.ticketCount || 1;
    totalTickets += count;
    const tickets = generateUniqueTickets(count);
    updates[`rooms/${roomCode}/players/${name}/tickets`] = tickets;
  }

  const price = data.ticketPrice || 0;
  const pool = totalTickets * price;
  updates[`rooms/${roomCode}/totalPool`] = pool;

  // Debit wallet for each player if price > 0 (tracking — allows negative balance)
  if (price > 0 && data.playerUserIds) {
    for (const name of playerNames) {
      const userId = data.playerUserIds[name];
      if (userId) {
        const ticketCost = (data.players[name]?.ticketCount || 1) * price;
        debitWallet(userId, ticketCost, 'ticket_fee', `Ticket fee - Room ${roomCode}`, roomCode).catch(() => {});
      }
    }
  }

  await update(ref(db), updates);
}

export async function drawNumber(roomCode: string): Promise<number | null> {
  const snapshot = await get(ref(db, `rooms/${roomCode}/calledNumbers`));
  const calledNumbers: number[] = safeArray(snapshot.exists() ? snapshot.val() : []);
  const calledSet = new Set(calledNumbers);

  const remaining: number[] = [];
  for (let i = 1; i <= 90; i++) {
    if (!calledSet.has(i)) remaining.push(i);
  }
  if (remaining.length === 0) return null;

  const num = remaining[Math.floor(Math.random() * remaining.length)];
  const newCalled = [...calledNumbers, num];

  await update(ref(db, `rooms/${roomCode}`), {
    calledNumbers: newCalled,
    currentNumber: num,
  });

  if (remaining.length === 1) {
    await update(ref(db, `rooms/${roomCode}`), { status: 'finished' });
  }

  // Auto-check claims after drawing
  autoCheckClaims(roomCode);

  return num;
}

export async function undoLastDraw(roomCode: string): Promise<number | null> {
  const snapshot = await get(ref(db, `rooms/${roomCode}/calledNumbers`));
  const calledNumbers: number[] = safeArray(snapshot.exists() ? snapshot.val() : []);
  if (calledNumbers.length === 0) return null;

  const removed = calledNumbers[calledNumbers.length - 1];
  const newCalled = calledNumbers.slice(0, -1);
  const previousNumber = newCalled.length > 0 ? newCalled[newCalled.length - 1] : null;

  await update(ref(db, `rooms/${roomCode}`), {
    calledNumbers: newCalled.length > 0 ? newCalled : [],
    currentNumber: previousNumber,
  });

  return removed;
}

export async function markNumber(roomCode: string, playerName: string, num: number): Promise<void> {
  const snapshot = await get(ref(db, `rooms/${roomCode}/players/${playerName}/markedNumbers`));
  const marked: number[] = safeArray(snapshot.exists() ? snapshot.val() : []);

  if (marked.includes(num)) return; // Already marked, don't unmark
  await set(ref(db, `rooms/${roomCode}/players/${playerName}/markedNumbers`), [...marked, num]);

  // Auto-check claims after marking
  autoCheckClaims(roomCode);
}

// Auto-detect and award claims
async function autoCheckClaims(roomCode: string): Promise<void> {
  const snapshot = await get(roomRef(roomCode));
  if (!snapshot.exists()) return;

  const data = snapshot.val() as RoomData;
  const claims = data.claims || {};
  const calledSet = new Set(safeArray(data.calledNumbers));
  const calledCount = calledSet.size;
  const pool = data.totalPool || 0;
  const updates: Record<string, any> = {};
  let hasUpdate = false;

  type ClaimKey = 'jaldiFive' | 'topLine' | 'middleLine' | 'bottomLine' | 'fullHouse';
  const qualifiedPlayers: Record<ClaimKey, Set<string>> = {
    jaldiFive: new Set(),
    topLine: new Set(),
    middleLine: new Set(),
    bottomLine: new Set(),
    fullHouse: new Set(),
  };

  // Collect all qualifying players for each unclaimed prize
  for (const [pName, player] of Object.entries(data.players || {})) {
    const marked = new Set(safeArray(player.markedNumbers));
    const tickets = safeTickets(player);

    for (const ticket of tickets) {
      const allNums = ticket.flat().filter((n: number | null): n is number => n !== null);

      if (!claims.jaldiFive?.playerName) {
        if (allNums.filter(n => marked.has(n)).length >= 5) qualifiedPlayers.jaldiFive.add(pName);
      }
      if (!claims.topLine?.playerName) {
        const row = (ticket[0] || []).filter((n: number | null): n is number => n !== null);
        if (row.length > 0 && row.every((n: number) => marked.has(n))) qualifiedPlayers.topLine.add(pName);
      }
      if (!claims.middleLine?.playerName) {
        const row = (ticket[1] || []).filter((n: number | null): n is number => n !== null);
        if (row.length > 0 && row.every((n: number) => marked.has(n))) qualifiedPlayers.middleLine.add(pName);
      }
      if (!claims.bottomLine?.playerName) {
        const row = (ticket[2] || []).filter((n: number | null): n is number => n !== null);
        if (row.length > 0 && row.every((n: number) => marked.has(n))) qualifiedPlayers.bottomLine.add(pName);
      }
      if (!claims.fullHouse?.playerName) {
        if (allNums.length > 0 && allNums.every(n => marked.has(n))) qualifiedPlayers.fullHouse.add(pName);
      }
    }
  }

  // Award prizes, splitting if multiple players qualify simultaneously
  for (const [claimType, players] of Object.entries(qualifiedPlayers) as [ClaimKey, Set<string>][]) {
    if (players.size === 0) continue;
    const totalPrize = data.prizeAmounts?.[claimType]
      ?? Math.round(pool * ((data.prizeDistribution?.[claimType] || PRIZE_DISTRIBUTION[claimType] || 0) / 100));
    const playerNames = [...players];
    const splitAmount = Math.round(totalPrize / playerNames.length);
    const winners = playerNames.map(name => ({ name, amount: splitAmount }));

    updates[`rooms/${roomCode}/claims/${claimType}`] = {
      playerName: playerNames.join(', '),
      callNumber: calledCount,
      prizeAmount: totalPrize,
      winners,
    };
    hasUpdate = true;

    // Credit winners' wallets
    if (pool > 0 && data.playerUserIds) {
      for (const w of winners) {
        const userId = data.playerUserIds[w.name];
        if (userId && w.amount > 0) {
          creditWallet(userId, w.amount, 'prize_won', `Won ${claimType} in room ${roomCode}`, roomCode).catch(() => {});
        }
      }
    }

    if (claimType === 'fullHouse') {
      updates[`rooms/${roomCode}/status`] = 'finished';
    }
  }

  if (hasUpdate) {
    await update(ref(db), updates);
  }
}

export async function makeClaim(
  roomCode: string,
  playerName: string,
  claimType: ClaimType,
): Promise<{ valid: boolean; message: string }> {
  const snapshot = await get(roomRef(roomCode));
  if (!snapshot.exists()) return { valid: false, message: 'Room not found' };

  const data = snapshot.val() as RoomData;
  const claims = data.claims || {};

  if (claims[claimType] && claims[claimType].playerName) {
    return { valid: false, message: `Already claimed by ${claims[claimType].playerName}` };
  }

  const player = data.players?.[playerName];
  if (!player) return { valid: false, message: 'Player not found' };

  const markedSet = new Set(safeArray(player.markedNumbers));
  const calledSet = new Set(safeArray(data.calledNumbers));
  const tickets = safeTickets(player);

  for (const num of markedSet) {
    if (!calledSet.has(num)) return { valid: false, message: `Number ${num} was not called!` };
  }

  if (tickets.length === 0) return { valid: false, message: 'No tickets found' };

  let anyValid = false;
  let lastMessage = '';
  const pool = data.totalPool || 0;

  for (const t of tickets) {
    const getRowNums = (rowIdx: number): number[] =>
      (t[rowIdx] || []).filter((n: number | null): n is number => n !== null);
    const allNums = t.flat().filter((n: number | null): n is number => n !== null);

    switch (claimType) {
      case 'jaldiFive': {
        const count = allNums.filter(n => markedSet.has(n)).length;
        if (count >= 5) anyValid = true; else lastMessage = `Only ${count} marked. Need 5.`;
        break;
      }
      case 'topLine': {
        const row = getRowNums(0);
        const missing = row.filter(n => !markedSet.has(n));
        if (missing.length === 0) anyValid = true; else lastMessage = `Missing: ${missing.join(', ')}`;
        break;
      }
      case 'middleLine': {
        const row = getRowNums(1);
        const missing = row.filter(n => !markedSet.has(n));
        if (missing.length === 0) anyValid = true; else lastMessage = `Missing: ${missing.join(', ')}`;
        break;
      }
      case 'bottomLine': {
        const row = getRowNums(2);
        const missing = row.filter(n => !markedSet.has(n));
        if (missing.length === 0) anyValid = true; else lastMessage = `Missing: ${missing.join(', ')}`;
        break;
      }
      case 'fullHouse': {
        const missing = allNums.filter(n => !markedSet.has(n));
        if (missing.length === 0) anyValid = true; else lastMessage = `${missing.length} numbers remaining.`;
        break;
      }
    }
    if (anyValid) break;
  }

  if (!anyValid) return { valid: false, message: lastMessage };

  const prizeAmount = data.prizeAmounts?.[claimType]
    ?? Math.round(pool * ((data.prizeDistribution?.[claimType] || PRIZE_DISTRIBUTION[claimType] || 0) / 100));
  const updates: Record<string, any> = {
    [`rooms/${roomCode}/claims/${claimType}`]: {
      playerName,
      callNumber: safeArray(data.calledNumbers).length,
      prizeAmount,
    },
  };

  if (claimType === 'fullHouse') {
    updates[`rooms/${roomCode}/status`] = 'finished';
  }

  await update(ref(db), updates);
  return { valid: true, message: `${playerName} wins!` };
}

export function subscribeToRoom(roomCode: string, callback: (data: RoomData | null) => void): () => void {
  const unsubscribe = onValue(roomRef(roomCode), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as RoomData) : null);
  });
  return unsubscribe;
}

export async function sendReaction(roomCode: string, playerName: string, emoji: string): Promise<void> {
  const reactionRef = ref(db, `rooms/${roomCode}/reactions/${Date.now()}`);
  await set(reactionRef, { playerName, emoji, timestamp: Date.now() });
}

export async function restartGame(roomCode: string): Promise<void> {
  const snapshot = await get(roomRef(roomCode));
  if (!snapshot.exists()) throw new Error('Room not found');

  const data = snapshot.val() as RoomData;
  const updates: Record<string, any> = {
    [`rooms/${roomCode}/status`]: 'waiting',
    [`rooms/${roomCode}/calledNumbers`]: [],
    [`rooms/${roomCode}/currentNumber`]: null,
    [`rooms/${roomCode}/claims`]: {
      jaldiFive: null, topLine: null, middleLine: null, bottomLine: null, fullHouse: null,
    },
    [`rooms/${roomCode}/startedAt`]: null,
    [`rooms/${roomCode}/totalPool`]: 0,
  };

  // Reset player tickets and marked numbers
  for (const name of Object.keys(data.players || {})) {
    updates[`rooms/${roomCode}/players/${name}/tickets`] = [];
    updates[`rooms/${roomCode}/players/${name}/markedNumbers`] = [];
  }

  await update(ref(db), updates);
}

export async function cancelGame(roomCode: string): Promise<void> {
  const snapshot = await get(roomRef(roomCode));
  if (snapshot.exists()) {
    const data = snapshot.val() as RoomData;
    // Only refund if game was playing (debits already happened)
    if (data.status === 'playing') {
      const price = data.ticketPrice || 0;
      if (price > 0 && data.playerUserIds) {
        for (const [pName, player] of Object.entries(data.players || {})) {
          const userId = data.playerUserIds[pName];
          if (userId) {
            const ticketCost = (player.ticketCount || 1) * price;
            creditWallet(userId, ticketCost, 'refund', `Refund - Room ${roomCode} cancelled`, roomCode).catch(() => {});
          }
        }
      }
    }
  }
  await update(ref(db, `rooms/${roomCode}`), { status: 'cancelled' });
}

export async function deleteRoom(roomCode: string): Promise<void> {
  await remove(roomRef(roomCode));
}

export async function leaveRoom(roomCode: string, playerName: string): Promise<void> {
  await remove(ref(db, `rooms/${roomCode}/players/${playerName}`));

  // Check if game is playing and only 1 player left — auto-cancel
  const snapshot = await get(roomRef(roomCode));
  if (snapshot.exists()) {
    const data = snapshot.val() as RoomData;
    if (data.status === 'playing') {
      const remainingPlayers = Object.keys(data.players || {});
      if (remainingPlayers.length <= 1) {
        // Refund remaining player and cancel
        const price = data.ticketPrice || 0;
        if (price > 0 && data.playerUserIds) {
          for (const pName of remainingPlayers) {
            const userId = data.playerUserIds[pName];
            if (userId) {
              const ticketCost = (data.players[pName]?.ticketCount || 1) * price;
              creditWallet(userId, ticketCost, 'refund', `Refund - opponent left (Room ${roomCode})`, roomCode).catch(() => {});
            }
          }
        }
        await update(ref(db, `rooms/${roomCode}`), { status: 'cancelled' });
      }
    }
  }
}
