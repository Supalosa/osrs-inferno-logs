/* eslint-disable quote-props */
import { ScatterChart, ScatterChartSeries } from '@mantine/charts';
import {
  Button,
  Checkbox,
  Container,
  Divider,
  Flex,
  Group,
  NumberInput,
  Paper,
  RangeSlider,
  Switch,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import _ from 'lodash';
import { useEffect, useMemo, useState } from 'react';

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

const calculateZukTime = (success: boolean, duration: number, splits: Splits): number | null => {
  if (!success || !splits['69']) {
    return null;
  }

  return duration - splits['69'];
};

const toUniqueWaves = (logs: Log[]) => {
  const waves = new Set<string>();
  logs.forEach(({ splits }) => {
    Object.keys(splits).forEach((wave) => waves.add(wave));
  });
  return Array.from(waves);
};

const toChartData = (
  parsedLogs: Log[],
  selectedWaves: { [wave: string]: boolean },
  minTimeSeconds: number,
  maxTimeSeconds: number,
  colorScheme: string
) => {
  const waveList = Object.keys(selectedWaves);
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
      if (value! < minTimeSeconds || value! > maxTimeSeconds) {
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
    // add the completion time for successes only
    if (selectedWaves.last && success && duration < maxTimeSeconds) {
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

const getMinDuration = (logs: Log[]) =>
  logs.map(({ duration }) => duration).reduce((a, b) => Math.min(a, b), 0);

const CustomTooltip = ({
  active,
  payload,
  formatter,
}: {
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
  const [showLine, setShowLine] = useState(false);
  const [useDate, setUseDate] = useState(false);
  const [splits, setShowSplits] = useState(true);
  const [selectedWaves, setSelectedWaves] = useState<{ [wave: string]: boolean }>({});
  const [allWaves, setAllWaves] = useState<string[]>([]);
  const colorScheme = useMantineColorScheme();

  const defaultMaxTime = useMemo(() => Math.ceil(getMaxDuration(logs) / 300) * 300, [logs]);
  const defaultMinTime = useMemo(
    () => Math.floor(getMinDuration(logs) / 300) * 300,
    [splits, logs]
  );
  // because the RangeSlider is controlled, we need a value that is updated as we drag (but before onChangeEnd)
  const [visualTimeRange, setVisualTimeRange] = useState([defaultMinTime, defaultMaxTime]);
  const [[minTime, maxTime], setTimeRange] = useState([defaultMinTime, defaultMaxTime]);

  const timeRangeMarks = (
    splits ? _.range(defaultMinTime, defaultMaxTime + 1, 300) : _.range(0, 601, 60)
  ).map((value) => ({ value, label: `${Math.floor(value / 60)}` }));

  useEffect(() => {
    const uniqueWaves = toUniqueWaves(logs);
    setSelectedWaves(
      uniqueWaves.reduce((acc, wave) => ({ ...acc, [wave]: true }), {
        last: true,
      })
    );
    setAllWaves(uniqueWaves.concat('last'));
  }, [logs]);

  const maxRunLength = splits ? maxTime : Number.MAX_SAFE_INTEGER;
  const minRunLength = splits ? minTime : Number.MIN_SAFE_INTEGER;
  const parsedData = useMemo(
    () => toChartData(logs, selectedWaves, minRunLength, maxRunLength, colorScheme.colorScheme),
    [logs, minRunLength, maxRunLength, colorScheme, selectedWaves]
  );
  const minDate = useMemo(
    () => logs.reduce((a, b) => (a.date < b.date ? a : b)).date.getTime(),
    [logs]
  );
  const maxDate = useMemo(
    () => logs.reduce((a, b) => (a.date > b.date ? a : b)).date.getTime(),
    [logs]
  );

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
          <Group>
            <Text size="sm">Delta</Text>
            <Switch
              checked={splits}
              onChange={() => {
                setTimeRange(!splits ? [defaultMinTime, defaultMaxTime] : [0, 600]);
                setVisualTimeRange(!splits ? [defaultMinTime, defaultMaxTime] : [0, 600]);
                setShowSplits(!splits);
              }}
              label="Splits"
            />
          </Group>
        </Paper>
        <Paper shadow="xs" withBorder p="xs" miw="450px">
          <RangeSlider
            label={(v) => Math.floor(v / 60)}
            value={[visualTimeRange[0], visualTimeRange[1]]}
            onChange={([min, max]) => setVisualTimeRange([min, max])}
            onChangeEnd={([min, max]) => setTimeRange([min, max])}
            step={splits ? 300 : 60}
            min={splits ? defaultMinTime : 0}
            max={splits ? defaultMaxTime : 600}
            marks={timeRangeMarks}
            size="sm"
          />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <Group>
            {allWaves.map((wave, i) => (
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
                          allWaves.reduce((acc, w) => ({ ...acc, [w]: w === wave }), {})
                        );
                      } else {
                        setSelectedWaves(allWaves.reduce((acc, w) => ({ ...acc, [w]: true }), {}));
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
        yAxisProps={{ tickCount: 11, domain: [() => minTime, () => maxTime] }}
        withLegend
        legendProps={{ verticalAlign: 'bottom' }}
      />
    </Flex>
  );
};
