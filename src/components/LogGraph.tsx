/* eslint-disable quote-props */
import { ScatterChart, ScatterChartSeries } from '@mantine/charts';
import {
  Button,
  Checkbox,
  Divider,
  Flex,
  Group,
  NumberInput,
  Paper,
  Switch,
  Text,
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

export const SPLIT_WAVE_COLORS: { [wave: string]: string } = {
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

const calculateZukTime = (success: boolean, duration: number, splits: Splits): number | null => {
  if (!success || !splits['69']) {
    return null;
  }

  return duration - splits['69'];
};
/*
const toChartData = (parsedLogs: Log[], showSplits: boolean) =>
  parsedLogs.map(({ splits, deltas, success, duration, date }, run) => ({
    ...(showSplits && splits),
    ...(!showSplits && deltas),
    ...(success && { last: duration }),
    ...(!showSplits && { last: calculateZukTime(success, duration, splits) }),
    run,
    date: date.getTime(),
  }));
*/
const toChartData = (
  parsedLogs: Log[],
  selectedWaves: { [wave: string]: boolean },
  colorScheme: string
) => {
  // TODO get waves from data instead
  const waveList = SPLIT_WAVES.filter((wave) => !!selectedWaves[wave]);
  const waveToSeries: { [wave: string]: ScatterChartSeries } = {};
  const getOrCreateSeries = (wave: string, defaultColor: string = 'black') => {
    if (waveToSeries[wave]) {
      return waveToSeries[wave];
    }
    waveToSeries[wave] = {
      name: `Wave ${wave}`,
      color: SPLIT_WAVE_COLORS[wave] ?? defaultColor,
      data: [],
    };
    return waveToSeries[wave];
  };
  waveList.forEach((wave) => getOrCreateSeries(wave));
  parsedLogs.forEach(({ duration, splits, deltas, date, success }, run) => {
    const dateTime = date.getTime();
    Object.entries(splits).forEach(([wave, value]) => {
      if (!selectedWaves[wave]) {
        return;
      }
      const series = getOrCreateSeries(wave);
      series.data.push({
        split: value!,
        delta: deltas[wave]!,
        run,
        date: dateTime,
      });
    });
    if (selectedWaves.last && success) {
      getOrCreateSeries('last', colorScheme === 'dark' ? 'white' : 'black').data.push({
        split: duration,
        delta: calculateZukTime(success, duration, splits)!,
        run,
        date: dateTime,
      });
    }
  });
  return Object.values(waveToSeries);
};

const getMaxDuration = (logs: Log[]) =>
  logs.map(({ duration }) => duration).reduce((a, b) => Math.max(a, b), 0);

const ALL_SPLITS = [...SPLIT_WAVES, 'last'];

const CustomTooltip = ({ active, payload, formatter }: {
  active?: boolean;
  payload?: any;
  formatter: (value: number | null) => string;
}) => {
  if (active && payload && payload.length) {
    return (
      <>
        <strong>Attempt:</strong> {payload[0].value}
        <br />
        <strong>Date:</strong> {new Date(payload[0].payload.date).toDateString()}
        <br />
        {payload[0].payload.name}
        <br />
        <strong>Split:</strong> {formatter(payload[0].payload.split)}
        <br />
        {payload[0].payload.delta && (
          <>
            <strong>Delta:</strong> {formatter(payload[0].payload.delta)}
            <br />
          </>
        )}
      </>
    );
  }
  return null;
};

export const LogGraph = ({ logs }: { logs: Log[] }) => {
  const defaultMaxTime = useMemo(() => Math.floor(getMaxDuration(logs) / 300) * 300, [logs]);
  const [showLine, setShowLine] = useState(false);
  const [useDate, setUseDate] = useState(false);
  const [maxTime, setMaxTime] = useState(defaultMaxTime);
  const [splits, setShowSplits] = useState(true);
  const [selectedWaves, setSelectedWaves] = useState<{ [wave: string]: boolean }>(
    ALL_SPLITS.reduce((acc, wave) => ({ ...acc, [wave]: true }), {})
  );
  const colorScheme = useMantineColorScheme();

  const parsedData = useMemo(
    () => toChartData(logs, selectedWaves, colorScheme.colorScheme),
    [logs, colorScheme, selectedWaves]
  );
  const minDate = logs.reduce((a, b) => (a.date < b.date ? a : b)).date.getTime();
  const maxDate = logs.reduce((a, b) => (a.date > b.date ? a : b)).date.getTime();

  const yFormatter = (value: number | null) =>
    value === null ? 'N/A' : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

  return (
    <Flex direction="column" gap="md" ml="lg" mr="lg">
      <Group>
        <Paper shadow="xs" withBorder p="xs">
          <Checkbox checked={showLine} onChange={() => setShowLine(!showLine)} label="Show Line" />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <Checkbox checked={useDate} onChange={() => setUseDate(!useDate)} label="By Date" />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <NumberInput
            label="Max Time (Mins)"
            value={maxTime / 60}
            onChange={(v) => setMaxTime((v as number) * 60)}
          />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <Group>
            <Text size="sm">Delta</Text>
            <Switch
              checked={splits}
              onChange={() => {
                setMaxTime(!splits ? defaultMaxTime : 600);
                setShowSplits(!splits);
              }}
              label="Splits"
            />
          </Group>
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <Group>
            {ALL_SPLITS.map((wave, i) => (
              <Paper withBorder p="xs">
                <Group>
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
                    color={SPLIT_WAVE_COLORS[wave] ?? 'grey'}
                    onClick={() => {
                      // set all others to false, unless we are the only one, in which case set everything to true
                      const othersOn = Object.entries(selectedWaves)
                        .filter(([, v]) => v)
                        .some(([k]) => k !== wave);
                      if (othersOn) {
                        setSelectedWaves(
                          ALL_SPLITS.reduce((acc, w) => ({ ...acc, [w]: w === wave }), {})
                        );
                      } else {
                        setSelectedWaves(
                          ALL_SPLITS.reduce((acc, w) => ({ ...acc, [w]: true }), {})
                        );
                      }
                    }}
                  >
                    {wave === 'last' ? (splits ? 'Success' : 'Zuk') : wave}
                  </Button>
                </Group>
              </Paper>
            ))}
          </Group>
        </Paper>
      </Group>
      <Divider />
      <ScatterChart
        h={600}
        data={parsedData}
        dataKey={{ x: useDate ? 'date' : 'run', y: splits ? 'split' : 'delta' }}
        valueFormatter={{
          x: (value) => (useDate ? new Date(value).toLocaleDateString() : value.toString()),
          y: yFormatter,
        }}
        tooltipProps={{ content: <CustomTooltip formatter={yFormatter} /> }}
        xAxisLabel={useDate ? 'Date' : 'Run'}
        xAxisProps={
          useDate
            ? { domain: [minDate, maxDate], tickCount: 15 }
            : { domain: [0, parsedData.length], tickCount: 15 }
        }
        yAxisProps={{ tickCount: 11, domain: [0, () => maxTime] }}
        withLegend
        legendProps={{ verticalAlign: 'bottom' }}
      />
    </Flex>
  );
};
