import { CompositeChart, ScatterChart, ScatterChartSeries } from '@mantine/charts';
import { act, useMemo } from 'react';
import { Flex, Text, Title, useMantineColorScheme } from '@mantine/core';
import { LINE_TYPES, Log, SPLIT_NAMES, SPLIT_WAVE_COLORS, Splits } from '@/consts';

const calculateLastWaveTime = (
  success: boolean,
  duration: number,
  splits: Splits
): number | null => {
  const lastWave = Object.keys(splits)[Object.keys(splits).length - 1];
  if (!success || !splits[lastWave]) {
    return null;
  }
  return duration - splits[lastWave];
};

const toScatterChartData = (
  parsedLogs: Log[],
  selectedWaves: { [wave: string]: boolean },
  excludeRunsAbove: number,
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
      if (value! > excludeRunsAbove) {
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
    if (selectedWaves.last && success && duration < excludeRunsAbove) {
      getOrCreateSeries('last', colorScheme === 'dark' ? 'white' : 'black').data.push({
        split: duration,
        delta: calculateLastWaveTime(success, duration, splits)!,
        run,
        date: dateTime,
      });
    }
  });
  return Object.values(waveToSeries);
};

const processSplits = (parsedLogs: Log[], lineType: string) => {
  const _splits: { [wave: string]: number } = {};
  const _deltas: { [wave: string]: number } = {};
  let pbSuccess: number = Number.MAX_SAFE_INTEGER;
  let pbLastWave: number = Number.MAX_SAFE_INTEGER;

  const range = 10;
  const k = 2 / (range + 1);

  switch (lineType) {
    case LINE_TYPES.PB:
      return parsedLogs.map(({ splits, deltas, success, duration }) => {
        const newSplits: { [wave: string]: number } = {};
        const newDeltas: { [wave: string]: number } = {};
        // only add an entry if we actually pb'd a split/delta
        Object.entries(splits).forEach(([wave, time]) => {
          if (time && (!_splits[wave] || time < _splits[wave])) {
            newSplits[wave] = time;
            _splits[wave] = time;
          }
        });
        Object.entries(deltas).forEach(([wave, time]) => {
          if (time && (!_deltas[wave] || time < _deltas[wave])) {
            newDeltas[wave] = time;
            _deltas[wave] = time;
          }
        });
        if (success && duration < pbSuccess) {
          pbSuccess = duration;
          newSplits.last = pbSuccess;
        }
        const lastWaveTime = calculateLastWaveTime(success, duration, splits)!;
        if (lastWaveTime && lastWaveTime < pbLastWave) {
          pbLastWave = lastWaveTime;
          newDeltas.last = pbLastWave;
        }
        return { success, duration, splits: newSplits, deltas: newDeltas };
      });
    case LINE_TYPES.MOVING_AVERAGE:
      return parsedLogs.map(({ splits, deltas, success, duration }, i) => {
        if (i === 0) {
          Object.entries(splits).forEach(([wave, time]) => {
            _splits[wave] = time!;
          });
          Object.entries(deltas).forEach(([wave, time]) => {
            _deltas[wave] = time!;
          });
          return { success, duration, splits, deltas };
        }

        const newSplits: { [wave: string]: number } = {};
        const newDeltas: { [wave: string]: number } = {};
        Object.entries(splits).forEach(([wave, time]) => {
          const emaValue = time! * k + (_splits[wave] ?? time) * (1 - k);
          newSplits[wave] = emaValue;
          _splits[wave] = emaValue;
        });
        Object.entries(deltas).forEach(([wave, time]) => {
          const emaValue = time! * k + (_deltas[wave] ?? time) * (1 - k);
          newDeltas[wave] = emaValue;
          _deltas[wave] = emaValue;
        });

        return { success, duration, splits: newSplits, deltas: newDeltas };
      });
    case LINE_TYPES.RUN:
    default:
      return parsedLogs.map(({ splits, deltas, success, duration }) => ({
        splits: {
          ...splits,
          ...(success && { last: duration }),
        },
        deltas: {
          ...deltas,
          last: calculateLastWaveTime(success, duration, splits),
        },
      }));
  }
};

const toLineChartData = (
  parsedLogs: Log[],
  showSplits: boolean,
  lineType: string,
  excludeRunsAbove: number,
  selectedWaves: { [wave: string]: boolean }
) => {
  const processedLogs = processSplits(
    parsedLogs.filter(({ duration }) => duration <= excludeRunsAbove),
    lineType
  );
  const removeUnwantedWaves = (times: any) => {
    Object.keys(times).forEach((split) => {
      if (!selectedWaves[split] && split in times) {
        delete times[split];
      }
    });
    return times;
  };
  return processedLogs.map(({ splits, deltas }, run) => ({
    ...(showSplits && removeUnwantedWaves(splits)),
    ...(!showSplits && removeUnwantedWaves(deltas)),
    run,
  }));
};
type LogChartProps = {
  logs: Log[];
  selectedWaves: { [wave: string]: boolean };
  minTime: number;
  maxTime: number;
  excludeRunsAbove: number;
  useDate: boolean;
  splits: boolean;
  lineType: string;
  autoZoom: boolean;
};

export const LogChart = ({
  logs,
  selectedWaves,
  minTime,
  maxTime,
  excludeRunsAbove,
  useDate,
  splits,
  lineType,
  autoZoom,
}: LogChartProps) => {
  const colorScheme = useMantineColorScheme();

  const maxRunLength = splits ? maxTime : Number.MAX_SAFE_INTEGER;
  const minRunLength = splits ? minTime : Number.MIN_SAFE_INTEGER;

  const parsedScatterData = useMemo(
    () =>
      useDate
        ? toScatterChartData(logs, selectedWaves, excludeRunsAbove, colorScheme.colorScheme)
        : [],
    [useDate, logs, minRunLength, maxRunLength, colorScheme, selectedWaves]
  );
  const parsedLineData = useMemo(
    () =>
      !useDate ? toLineChartData(logs, splits, lineType, excludeRunsAbove, selectedWaves) : [],
    [logs, lineType, minRunLength, maxRunLength, colorScheme, selectedWaves]
  );
  const uniqueWaves = Object.keys(selectedWaves);
  const lineChartSeries = uniqueWaves
    .filter((w) => w !== 'last')
    .map((wave) => ({
      name: wave,
      label: `${wave} ${splits ? 'Split' : 'Delta'}`,
      color: SPLIT_WAVE_COLORS[wave],
      type: 'line' as const,
    }))
    // special colouring for 'last' wave
    .concat({
      name: 'last',
      label: splits ? 'Success' : 'Zuk',
      color: colorScheme.colorScheme === 'dark' ? 'white' : 'black',
      type: 'line',
    })
    .filter(({ name }) => selectedWaves[name]);

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
    : { domain: [0, parsedScatterData.length], tickCount: 15 };

  const yFormatter = (value: number | null) =>
    value === null ? 'N/A' : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

  const title = generateTitle(lineType, selectedWaves, splits);

  return (
    <>
      <Flex justify="center">
        <Title order={4}>{title}</Title>
      </Flex>
      {useDate ? (
        <ScatterChart
          h={600}
          data={parsedScatterData}
          dataKey={{ x: useDate ? 'date' : 'run', y: splits ? 'split' : 'delta' }}
          valueFormatter={{
            x: (value) => (useDate ? new Date(value).toLocaleDateString() : value.toString()),
            y: yFormatter,
          }}
          tooltipProps={{ content: <CustomTooltip formatter={yFormatter} /> }}
          xAxisLabel={xAxisLabel}
          xAxisProps={xAxisProps}
          yAxisProps={{
            tickCount: 11,
            domain: [() => minTime, () => maxTime],
            allowDataOverflow: false,
          }}
          withLegend
          legendProps={{ verticalAlign: 'bottom' }}
        />
      ) : (
        <CompositeChart
          title="hello"
          data={parsedLineData}
          h={600}
          dataKey="run"
          series={lineChartSeries}
          valueFormatter={(value) =>
            value === null
              ? 'N/A'
              : `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
          }
          dotProps={{ r: 3 }}
          lineProps={{ strokeWidth: 1 }}
          xAxisProps={{
            minTickGap: 10,
            tickCount: 10,
            tick: {
              fill: 'white',
              fontSize: 10,
            },
          }}
          yAxisProps={{
            tickCount: 11,
            domain: autoZoom ? ['auto', 'auto'] : [() => minTime, () => maxTime],
            allowDataOverflow: false,
            includeHidden: false,
            tick: {
              fill: 'white',
              fontSize: 12,
            },
          }}
          withLegend
          legendProps={{ verticalAlign: 'bottom' }}
          xAxisLabel="Task #"
          referenceLines={[
            { label: 'Sub 45', y: 2700, labelPosition: 'insideBottomRight', color: 'red' },
            { label: 'Sub 50', y: 3000, labelPosition: 'insideBottomRight', color: 'red' },
            { label: 'Sub 65', y: 3900, labelPosition: 'insideBottomRight', color: 'red' },
          ]}
        />
      )}
    </>
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

function generateTitle(
  lineType: string,
  selectedWaves: { [wave: string]: boolean },
  splits: boolean
) {
  let result = '';
  switch (lineType) {
    case LINE_TYPES.PB:
        result += 'Personal Best ';
        break;
    case LINE_TYPES.MOVING_AVERAGE:
        result += 'Moving Average ';
        break;
  }

  result += splits ? 'Splits' : 'Wave Deltas';

  const actualWaves = Object.entries(selectedWaves).filter(([, selected]) => selected);
  if (actualWaves.length < 3) {
    let first = true;
    actualWaves.forEach(([wave]) => {
        const splitName = (SPLIT_NAMES as any)[wave];
        if (splitName) {
            result += ` ${first ? 'to' : 'and'} ${splitName}`;
            first = false;
        }
    });
  }

  return result;
}
