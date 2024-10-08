export const SPLIT_WAVE_COLORS: { [wave: string]: string } = {
  /* inferno */
  '9': 'cyan',
  '18': 'teal',
  '25': 'green',
  '35': 'lime',
  '42': 'yellow',
  '50': 'orange',
  '57': 'red',
  '60': 'purple',
  '63': 'pink',
  '66': 'brown',
  '67': 'indigo',
  '68': 'blue',
  '69': 'violet',
  /* fight caves */
  '7': 'cyan',
  '15': 'teal',
  '31': 'green',
  '46': 'lime',
  '53': 'yellow',
  '61': 'orange',
  '62': 'red',
};

// only inferno right now
export const SPLIT_NAMES = {
  '9': 'Melee',
  '18': 'Ranger',
  '25': 'Melee/Ranger',
  '35': 'Mage',
  '42': 'Mage/Melee',
  '50': 'Mage/Ranger',
  '57': 'Mage/Ranger/Melee',
  '60': 'Mage/Range/Melee/Blob',
  '63': 'Mage/Range/Melee/2Blobs',
  '66': 'Mage/Mage',
  '67': 'Jad',
  '68': 'Triples',
  '69': 'Zuk',
};

export type Splits = { [wave: string]: number | null };

export type Log = {
  date: Date;
  lastWave: string;
  splits: Splits;
  deltas: Splits;
  duration: number;
  success: boolean;
};

export const LINE_TYPES = {
  RUN: 'Actual time',
  PB: 'PB Improvement',
  MOVING_AVERAGE: 'Moving Average',
} as const;
