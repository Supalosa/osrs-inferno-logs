import { LineChart } from '@mantine/charts';
import {
  Button,
  Checkbox,
  Divider,
  Flex,
  Group,
  NumberInput,
  Paper,
  Switch,
  useMantineColorScheme,
} from '@mantine/core';
import { useMemo, useState } from 'react';

export const SPLIT_WAVES = [
  '9',
  '18',
  '25',
  '35',
  '42',
  '50',
  '57',
  '60',
  '63',
  '66',
  '67',
  '68',
  '69',
];

export const SPLIT_WAVE_COLORS = [
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
  'red',
  'purple',
  'pink',
  'gray',
  'indigo',
  'blue',
  'violet',
];

export type Splits = { [wave: string]: number | null };

export type Log = {
  date: string;
  lastWave: string;
  splits: Splits;
  deltas: Splits;
  duration: number;
  success: boolean;
};

const calculateZukTime = (success: boolean, duration: number, splits: Splits): number | null => {
  if (!success || !splits['69']) {
    return null;
  }

  return duration - splits['69'];
};

const toChartData = (parsedLogs: Log[], showSplits: boolean) =>
  parsedLogs.map(({ splits, deltas, success, duration }, run) => ({
    ...(showSplits && splits),
    ...(!showSplits && deltas),
    ...(success && { last: duration }),
    ...(!showSplits && { last: calculateZukTime(success, duration, splits) }),
    run,
  }));

const getMaxDuration = (logs: Log[]) =>
  logs.map(({ duration }) => duration).reduce((a, b) => Math.max(a, b), 0);

const ALL_SPLITS = [...SPLIT_WAVES, 'last'];

export const LogGraph = ({ logs }: { logs: Log[] }) => {
  const defaultMaxTime = useMemo(() => Math.floor(getMaxDuration(logs) / 300) * 300, [logs]);
  const [showLine, setShowLine] = useState(true);
  const [maxTime, setMaxTime] = useState(defaultMaxTime);
  const [splits, setShowSplits] = useState(true);
  const [selectedWaves, setSelectedWaves] = useState<{ [wave: string]: boolean }>(
    ALL_SPLITS.reduce((acc, wave) => ({ ...acc, [wave]: true }), {})
  );
  const colorScheme = useMantineColorScheme();

  const parsedData = useMemo(() => toChartData(logs, splits), [logs, splits]);

  return (
    <Flex direction="column" gap="md">
      <Group>
        <Paper shadow="xs" withBorder p="xs">
          <Checkbox checked={showLine} onChange={() => setShowLine(!showLine)} label="Show Line" />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <NumberInput
            label="Max Time (Mins)"
            value={maxTime / 60}
            onChange={(v) => setMaxTime((v as number) * 60)}
          />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <Switch
            checked={splits}
            onChange={() => {
              setMaxTime(!splits ? defaultMaxTime : 600);
              setShowSplits(!splits);
            }}
            label="Show Splits"
          />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <Group>
            {ALL_SPLITS.map((wave, i) => (
              <>
                <Checkbox
                  key={i}
                  checked={selectedWaves[wave]}
                  onChange={() => {
                    setSelectedWaves({
                      ...selectedWaves,
                      [wave]: !selectedWaves[wave],
                    });
                  }}
                />
                <Button
                  size="compact-xs"
                  color={SPLIT_WAVE_COLORS[i] ?? 'grey'}
                  onClick={() => {
                    // set all others to false, unless we are the only one, in which case set everything to true
                    const othersOn = Object.entries(selectedWaves)
                      .filter(([k, v]) => v)
                      .some(([k]) => k !== wave);
                    if (othersOn) {
                      setSelectedWaves(
                        ALL_SPLITS.reduce((acc, w) => ({ ...acc, [w]: w === wave }), {})
                      );
                    } else {
                      setSelectedWaves(ALL_SPLITS.reduce((acc, w) => ({ ...acc, [w]: true }), {}));
                    }
                  }}
                >
                  {wave === 'last' ? (splits ? 'Successs' : 'Zuk') : `Wave ${wave}`}
                </Button>
              </>
            ))}
          </Group>
        </Paper>
      </Group>
      <Divider />
      <LineChart
        h={600}
        data={parsedData}
        dataKey="run"
        series={SPLIT_WAVES.map((wave, i) => ({
          name: wave,
          label: `Wave ${wave} ${splits ? 'Split' : 'Delta'}`,
          color: SPLIT_WAVE_COLORS[i],
        }))
          .concat({
            name: 'last',
            label: splits ? 'Success' : 'Zuk',
            color: colorScheme.colorScheme === 'dark' ? 'white' : 'black',
          })
          .filter(({ name }) => selectedWaves[name])}
        valueFormatter={(value) =>
          value === null
            ? 'N/A'
            : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
        }
        dotProps={{ r: 3 }}
        lineProps={{ strokeWidth: showLine ? 1 : 0 }}
        yAxisProps={{ tickCount: 10, domain: [0, () => maxTime] }}
        withLegend
        legendProps={{ verticalAlign: 'bottom' }}
      />
    </Flex>
  );
};
