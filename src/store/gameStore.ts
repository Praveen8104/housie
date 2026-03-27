import React, { createContext, useContext } from 'react';
import { Ticket, generateTicket } from '../utils/ticketGenerator';
import { ClaimType, validateClaim, drawNumber } from '../utils/gameLogic';

export interface Player {
  name: string;
  ticket: Ticket;
  markedNumbers: Set<number>;
}

export interface ClaimWinner {
  playerName: string;
  callNumber: number; // which call # it was claimed on
}

export interface GameState {
  players: Player[];
  calledNumbers: number[];
  currentNumber: number | null;
  claims: Record<ClaimType, ClaimWinner | null>;
  gameStarted: boolean;
  gameOver: boolean;
}

export function createInitialState(): GameState {
  return {
    players: [],
    calledNumbers: [],
    currentNumber: null,
    claims: {
      jaldiFive: null,
      topLine: null,
      middleLine: null,
      bottomLine: null,
      fullHouse: null,
    },
    gameStarted: false,
    gameOver: false,
  };
}

export function setupPlayers(state: GameState, names: string[]): GameState {
  const players: Player[] = names.map(name => ({
    name,
    ticket: generateTicket(),
    markedNumbers: new Set<number>(),
  }));
  return { ...state, players, gameStarted: true };
}

export function callNextNumber(state: GameState): GameState {
  const calledSet = new Set(state.calledNumbers);
  const num = drawNumber(calledSet);
  if (num === null) {
    return { ...state, gameOver: true };
  }
  return {
    ...state,
    currentNumber: num,
    calledNumbers: [...state.calledNumbers, num],
  };
}

export function markNumber(state: GameState, playerIndex: number, num: number): GameState {
  const calledSet = new Set(state.calledNumbers);
  if (!calledSet.has(num)) return state; // Can't mark uncalled number

  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIndex] };
  player.markedNumbers = new Set(player.markedNumbers);
  player.markedNumbers.add(num);
  newPlayers[playerIndex] = player;

  return { ...state, players: newPlayers };
}

export function unmarkNumber(state: GameState, playerIndex: number, num: number): GameState {
  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIndex] };
  player.markedNumbers = new Set(player.markedNumbers);
  player.markedNumbers.delete(num);
  newPlayers[playerIndex] = player;

  return { ...state, players: newPlayers };
}

export interface ClaimAttemptResult {
  state: GameState;
  valid: boolean;
  message: string;
}

export function attemptClaim(
  state: GameState,
  playerIndex: number,
  claimType: ClaimType,
): ClaimAttemptResult {
  // Check if already claimed
  if (state.claims[claimType] !== null) {
    return {
      state,
      valid: false,
      message: `${claimType} already claimed by ${state.claims[claimType]!.playerName}!`,
    };
  }

  const player = state.players[playerIndex];
  const calledSet = new Set(state.calledNumbers);
  const result = validateClaim(claimType, player.ticket, player.markedNumbers, calledSet);

  if (result.valid) {
    const newClaims = {
      ...state.claims,
      [claimType]: {
        playerName: player.name,
        callNumber: state.calledNumbers.length,
      },
    };

    const gameOver = claimType === 'fullHouse';

    return {
      state: { ...state, claims: newClaims, gameOver },
      valid: true,
      message: result.message,
    };
  }

  return { state, valid: false, message: result.message };
}
