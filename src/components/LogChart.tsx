import { ScatterChart, ScatterChartSeries } from '@mantine/charts';
import { useMemo } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { Log, SPLIT_WAVE_COLORS, Splits } from '@/consts';

const calculateZukTime = (success: boolean, duration: number, splits: Splits): number | null => {
  if (!success || !splits['69']) {
    return null;
  }
  return duration - splits['69'];
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

type LogChartProps = {
  logs: Log[];
  selectedWaves: { [wave: string]: boolean };
  minTime: number;
  maxTime: number;
  useDate: boolean;
  splits: boolean;
};

export const LogChart = ({
  logs,
  selectedWaves,
  minTime,
  maxTime,
  useDate,
  splits,
}: LogChartProps) => {
  const colorScheme = useMantineColorScheme();

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

  const xAxisLabel = useDate ? 'Date' : 'Run';
  const xAxisProps = useDate
    ? { domain: [minDate, maxDate], tickCount: 15 }
    : { domain: [0, parsedData.length], tickCount: 15 };

  const yFormatter = (value: number | null) =>
    value === null ? 'N/A' : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

  return (
    <ScatterChart
      h={600}
      data={parsedData}
      dataKey={{ x: useDate ? 'date' : 'run', y: splits ? 'split' : 'delta' }}
      valueFormatter={{
        x: (value) => (useDate ? new Date(value).toLocaleDateString() : value.toString()),
        y: yFormatter,
      }}
      tooltipProps={{ content: <CustomTooltip formatter={yFormatter} /> }}
      xAxisLabel={xAxisLabel}
      xAxisProps={xAxisProps}
      yAxisProps={{ tickCount: 11, domain: [() => minTime, () => maxTime] }}
      withLegend
      legendProps={{ verticalAlign: 'bottom' }}
    />
  );
};

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
