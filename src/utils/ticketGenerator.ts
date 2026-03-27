export type TicketCell = number | null;
export type TicketRow = TicketCell[];
export type Ticket = TicketRow[];

function getColumnRange(col: number): number[] {
  if (col === 0) return Array.from({ length: 9 }, (_, i) => i + 1);
  if (col === 8) return Array.from({ length: 11 }, (_, i) => i + 80);
  return Array.from({ length: 10 }, (_, i) => i + col * 10);
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateTicket(excludeNumbers?: Set<number>): Ticket {
  let ticket: TicketCell[][] = [
    new Array(9).fill(null),
    new Array(9).fill(null),
    new Array(9).fill(null),
  ];

  let columnCounts: number[] = new Array(9).fill(1);
  let remaining = 6;
  const cols = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);

  for (const col of cols) {
    if (remaining <= 0) break;
    const add = Math.min(remaining, 2);
    columnCounts[col] += add === 2 ? 2 : 1;
    remaining -= add === 2 ? 2 : 1;
  }

  const columnNumbers: number[][] = [];
  for (let col = 0; col < 9; col++) {
    let range = getColumnRange(col);
    if (excludeNumbers) {
      const filtered = range.filter(n => !excludeNumbers.has(n));
      if (filtered.length >= columnCounts[col]) range = filtered;
    }
    const picked = shuffle(range).slice(0, columnCounts[col]).sort((a, b) => a - b);
    columnNumbers.push(picked);
  }

  for (let col = 0; col < 9; col++) {
    const nums = columnNumbers[col];
    if (nums.length === 3) {
      ticket[0][col] = nums[0];
      ticket[1][col] = nums[1];
      ticket[2][col] = nums[2];
    } else if (nums.length === 2) {
      const rows = shuffle([0, 1, 2]).slice(0, 2).sort((a, b) => a - b);
      ticket[rows[0]][col] = nums[0];
      ticket[rows[1]][col] = nums[1];
    } else if (nums.length === 1) {
      ticket[Math.floor(Math.random() * 3)][col] = nums[0];
    }
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    const rowCounts = ticket.map(row => row.filter(c => c !== null).length);
    if (rowCounts[0] === 5 && rowCounts[1] === 5 && rowCounts[2] === 5) return ticket;

    const overRow = rowCounts.findIndex(c => c > 5);
    const underRow = rowCounts.findIndex(c => c < 5);
    if (overRow === -1 || underRow === -1) break;

    const movableCols = [];
    for (let col = 0; col < 9; col++) {
      if (ticket[overRow][col] !== null && ticket[underRow][col] === null) {
        movableCols.push(col);
      }
    }

    if (movableCols.length > 0) {
      const col = movableCols[Math.floor(Math.random() * movableCols.length)];
      ticket[underRow][col] = ticket[overRow][col];
      ticket[overRow][col] = null;

      const colNums = [ticket[0][col], ticket[1][col], ticket[2][col]]
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);
      let idx = 0;
      for (let row = 0; row < 3; row++) {
        if (ticket[row][col] !== null) ticket[row][col] = colNums[idx++];
      }
    }
  }

  const rowCounts = ticket.map(row => row.filter(c => c !== null).length);
  if (rowCounts[0] !== 5 || rowCounts[1] !== 5 || rowCounts[2] !== 5) {
    return generateTicket(excludeNumbers);
  }
  return ticket;
}

// Generate multiple tickets with unique numbers across all tickets per player
export function generateUniqueTickets(count: number): Ticket[] {
  const tickets: Ticket[] = [];
  const usedNumbers = new Set<number>();
  for (let i = 0; i < count; i++) {
    const ticket = generateTicket(usedNumbers);
    tickets.push(ticket);
    for (const row of ticket) {
      for (const cell of row) {
        if (cell !== null) usedNumbers.add(cell);
      }
    }
  }
  return tickets;
}

export function getTicketNumbers(ticket: Ticket): number[] {
  return ticket.flat().filter((n): n is number => n !== null);
}

export function getRowNumbers(ticket: Ticket, rowIndex: number): number[] {
  return ticket[rowIndex].filter((n): n is number => n !== null);
}
