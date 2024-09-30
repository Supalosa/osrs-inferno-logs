/* eslint-disable quote-props */
import {
  Button,
  Checkbox,
  Divider,
  Flex,
  Group,
  Paper,
  RangeSlider,
  Select,
  Switch,
  Text,
} from '@mantine/core';
import _ from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { LogChart } from './LogChart';
import { LINE_TYPES, Log, SPLIT_WAVE_COLORS } from '@/consts';

const toUniqueWaves = (logs: Log[]) => {
  const waves = new Set<string>();
  logs.forEach(({ splits }) => {
    Object.keys(splits).forEach((wave) => waves.add(wave));
  });
  return Array.from(waves);
};

const getMaxDuration = (logs: Log[]) =>
  logs.map(({ duration }) => duration).reduce((a, b) => Math.max(a, b), 0);

const getMinDuration = (logs: Log[]) =>
  logs.map(({ duration }) => duration).reduce((a, b) => Math.min(a, b), 0);

export const LogGraph = ({ logs }: { logs: Log[] }) => {
  const [useDate, setUseDate] = useState(false);
  const [splits, setShowSplits] = useState(true);
  const [selectedWaves, setSelectedWaves] = useState<{ [wave: string]: boolean }>({});
  const [allWaves, setAllWaves] = useState<string[]>([]);
  const [lineType, setLineType] = useState<string>(LINE_TYPES.RUN);

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

  return (
    <Flex direction="column" gap="md" ml="lg" mr="lg">
      <Group>
        <Paper shadow="xs" withBorder p="xs">
          <Checkbox checked={useDate} onChange={() => setUseDate(!useDate)} label="By Date" />
        </Paper>
        <Paper shadow="xs" withBorder p="xs">
          <Group>
            <Text size="sm">Showing:</Text>
            <Select
              disabled={useDate}
              value={lineType}
              data={Object.values(LINE_TYPES)}
              onChange={(v) => setLineType(v!)}
              allowDeselect={false}
            />
          </Group>
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
      <LogChart
        logs={logs}
        selectedWaves={selectedWaves}
        minTime={minTime}
        maxTime={maxTime}
        useDate={useDate}
        splits={splits}
        lineType={lineType}
      />
    </Flex>
  );
};
