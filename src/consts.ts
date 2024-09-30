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

export type Splits = { [wave: string]: number | null };

export type Log = {
  date: Date;
  lastWave: string;
  splits: Splits;
  deltas: Splits;
  duration: number;
  success: boolean;
};
