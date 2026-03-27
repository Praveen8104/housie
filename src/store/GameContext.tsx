import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  GameState,
  createInitialState,
  setupPlayers,
  callNextNumber,
  markNumber,
  unmarkNumber,
  attemptClaim,
  ClaimAttemptResult,
} from './gameStore';
import { ClaimType } from '../utils/gameLogic';

interface GameContextType {
  state: GameState;
  startGame: (names: string[]) => void;
  drawNumber: () => void;
  toggleMark: (playerIndex: number, num: number) => void;
  claim: (playerIndex: number, claimType: ClaimType) => ClaimAttemptResult;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(createInitialState());

  const startGame = useCallback((names: string[]) => {
    setState(prev => setupPlayers(prev, names));
  }, []);

  const drawNumberAction = useCallback(() => {
    setState(prev => callNextNumber(prev));
  }, []);

  const toggleMark = useCallback((playerIndex: number, num: number) => {
    setState(prev => {
      const player = prev.players[playerIndex];
      if (player.markedNumbers.has(num)) {
        return unmarkNumber(prev, playerIndex, num);
      }
      return markNumber(prev, playerIndex, num);
    });
  }, []);

  const claimResultRef = React.useRef<ClaimAttemptResult>({ state: createInitialState(), valid: false, message: '' });
  const claimAction = useCallback((playerIndex: number, claimType: ClaimType): ClaimAttemptResult => {
    setState(prev => {
      const result = attemptClaim(prev, playerIndex, claimType);
      claimResultRef.current = result;
      return result.state;
    });
    return claimResultRef.current;
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState());
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        startGame,
        drawNumber: drawNumberAction,
        toggleMark,
        claim: claimAction,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
