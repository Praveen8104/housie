import { Ticket, getTicketNumbers, getRowNumbers } from './ticketGenerator';

export type ClaimType = 'jaldiFive' | 'topLine' | 'middleLine' | 'bottomLine' | 'fullHouse';

export interface ClaimResult {
  valid: boolean;
  message: string;
}

export const CLAIM_LABELS: Record<ClaimType, string> = {
  jaldiFive: 'Jaldi Five',
  topLine: 'Top Line',
  middleLine: 'Middle Line',
  bottomLine: 'Bottom Line',
  fullHouse: 'Full House',
};

// Validate a claim
export function validateClaim(
  claimType: ClaimType,
  ticket: Ticket,
  markedNumbers: Set<number>,
  calledNumbers: Set<number>,
): ClaimResult {
  // First check: all marked numbers must have been called
  for (const num of markedNumbers) {
    if (!calledNumbers.has(num)) {
      return { valid: false, message: `Number ${num} was not called!` };
    }
  }

  switch (claimType) {
    case 'jaldiFive': {
      const ticketNums = getTicketNumbers(ticket);
      const matchCount = ticketNums.filter(n => markedNumbers.has(n)).length;
      if (matchCount >= 5) {
        return { valid: true, message: 'Jaldi Five claimed!' };
      }
      return { valid: false, message: `Only ${matchCount} numbers marked. Need 5.` };
    }

    case 'topLine': {
      const rowNums = getRowNumbers(ticket, 0);
      const allMarked = rowNums.every(n => markedNumbers.has(n));
      if (allMarked) {
        return { valid: true, message: 'Top Line claimed!' };
      }
      const unmarked = rowNums.filter(n => !markedNumbers.has(n));
      return { valid: false, message: `Missing: ${unmarked.join(', ')}` };
    }

    case 'middleLine': {
      const rowNums = getRowNumbers(ticket, 1);
      const allMarked = rowNums.every(n => markedNumbers.has(n));
      if (allMarked) {
        return { valid: true, message: 'Middle Line claimed!' };
      }
      const unmarked = rowNums.filter(n => !markedNumbers.has(n));
      return { valid: false, message: `Missing: ${unmarked.join(', ')}` };
    }

    case 'bottomLine': {
      const rowNums = getRowNumbers(ticket, 2);
      const allMarked = rowNums.every(n => markedNumbers.has(n));
      if (allMarked) {
        return { valid: true, message: 'Bottom Line claimed!' };
      }
      const unmarked = rowNums.filter(n => !markedNumbers.has(n));
      return { valid: false, message: `Missing: ${unmarked.join(', ')}` };
    }

    case 'fullHouse': {
      const ticketNums = getTicketNumbers(ticket);
      const allMarked = ticketNums.every(n => markedNumbers.has(n));
      if (allMarked) {
        return { valid: true, message: 'Full House! You win!' };
      }
      const unmarked = ticketNums.filter(n => !markedNumbers.has(n));
      return { valid: false, message: `${unmarked.length} numbers remaining.` };
    }

    default:
      return { valid: false, message: 'Unknown claim type.' };
  }
}

// Draw a random number from remaining pool
export function drawNumber(calledNumbers: Set<number>): number | null {
  const remaining: number[] = [];
  for (let i = 1; i <= 90; i++) {
    if (!calledNumbers.has(i)) {
      remaining.push(i);
    }
  }
  if (remaining.length === 0) return null;
  return remaining[Math.floor(Math.random() * remaining.length)];
}
