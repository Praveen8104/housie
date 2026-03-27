const NICKNAMES: Record<number, string> = {
  1: "Number 1, Kelly's Eye",
  2: 'Number 2, One Little Duck',
  3: 'Number 3, Cup of Tea',
  7: 'Number 7, Lucky Seven',
  8: 'Number 8, Garden Gate',
  9: 'Number 9, Doctor\'s Orders',
  11: 'Number 11, Legs Eleven',
  13: 'Number 13, Unlucky for Some',
  16: 'Number 16, Sweet Sixteen',
  18: 'Number 18, Coming of Age',
  21: 'Number 21, Key of the Door',
  22: 'Number 22, Two Little Ducks',
  25: 'Number 25, Quarter Century',
  30: 'Number 30, Flirty Thirty',
  44: 'Number 44, Droopy Drawers',
  45: 'Number 45, Halfway There',
  50: 'Number 50, Half Century',
  55: 'Number 55, All the Fives',
  57: 'Number 57, Heinz Varieties',
  66: 'Number 66, Clickety Click',
  69: 'Number 69, Either Way Up',
  77: 'Number 77, All the Sevens',
  80: 'Number 80, Gandhi\'s Breakfast',
  88: 'Number 88, Two Fat Ladies',
  90: 'Number 90, Top of the Shop',
};

export function getNumberAnnouncement(num: number): string {
  return NICKNAMES[num] || `Number ${num}`;
}
