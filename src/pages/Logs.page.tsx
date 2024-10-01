/* eslint-disable quote-props */
import { useContext, useEffect, useState } from 'react';
import { LogUploader } from '@/components/LogUploader';
import { LogsContext } from '@/context/LogsContext';
import { LogGraph } from '@/components/LogGraph';
import { Log } from '@/consts';

const parseLog = async (file: File): Promise<Log | null> => {
  const { name } = file;
  if (name.includes('KC, ') || name.includes('Failed KC, ')) {
    return parseInfernoTimerLogs(file);
  }
  return parseInfernoStatsLog(file);
};

const toSeconds = (timestamp: string | undefined) => {
  if (!timestamp) {
    return null;
  }
  const parts = timestamp.replaceAll(';', ':').split(':').map(Number);
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    // this is just dumb, but sometimes it looks like it writes m:s:ms instead of h:m:s
    // so anything over 10 hours is treated as minutes
    if (hours > 10) {
      return hours * 60 + minutes;
    }
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
};

const parseInfernoTimerLogs = async (file: File): Promise<Log | null> => {
  const { name } = file;

  const dateTime = name.match(/([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2};[0-9]{2})\.txt/)?.[1];
  const date = dateTime
    ? new Date(`${dateTime.substring(0, 10)}T${dateTime.substring(11, 16).replaceAll(';', ':')}`)
    : new Date(file.lastModified);
  const contents = await file.text();

  // a lot of these logs are just empty

  const waves: string[] = [];
  for (const wave of contents.matchAll(/Wave: (\d+)/g)) {
    waves.push(wave[1]);
  }
  if (waves.length === 0) {
    return null;
  }

  const splits = waves.reduce(
    (acc, wave) => ({
      ...acc,
      [wave]: toSeconds(contents.match(new RegExp(`Wave: ${wave}, Wave Split: ([\\d:]+)`))?.[1]),
    }),
    {} as { [wave: string]: number | null }
  );

  const deltas = Object.values(splits)
    .map((split, i) => (i === 0 ? split : split! - splits[waves[i - 1]]!))
    .reduce(
      (acc, delta, i) => ({
        ...acc,
        [waves[i]]: delta,
      }),
      {}
    );

  const lastWave = waves[waves.length - 1];
  const durationLine = contents.match(/Duration: ([\d:;]+)/);
  const success = !!durationLine?.[1];
  const duration = success ? toSeconds(durationLine?.[1])! : splits[lastWave]!;

  if (duration > 100000) {
    console.log(duration, file.name);
  }

  return {
    date,
    lastWave,
    splits,
    deltas,
    success,
    duration,
  };
};

const parseInfernoStatsLog = async (file: File): Promise<Log> => {
  const { name } = file;
  const dateTime = name.substring(0, 19);
  const lastWave = name.match(/on Wave (\d+)/)?.[1] ?? 'unknown';
  const contents = await file.text();

  // 2020-10-10 10-10-10
  const date = new Date(
    `${dateTime.substring(0, 10)}T${dateTime.substring(11, 21).replaceAll('-', ':')}`
  );

  const durationLine = contents.match(/Duration \((.*)\): ([\d:]+)/);
  const success = durationLine?.[1] === 'Success';
  const duration = toSeconds(durationLine?.[2])!;

  const waves = [];
  for (const wave of contents.matchAll(/Wave: (\d+)/g)) {
    waves.push(wave[1]);
  }

  return {
    date,
    lastWave,
    splits: waves.reduce(
      (acc, wave) => ({
        ...acc,
        [wave]: toSeconds(contents.match(new RegExp(`Wave: ${wave}, Split: ([\\d:]+)`))?.[1]),
      }),
      {}
    ),
    deltas: waves.reduce(
      (acc, wave) => ({
        ...acc,
        [wave]: toSeconds(
          contents.match(new RegExp(`Wave: ${wave}, Split: [\\d:]+ \\((.*)\\)`))?.[1]
        ),
      }),
      {}
    ),
    success,
    duration,
  };
};

const parseLogs = async (file: File[]): Promise<Log[]> =>
  Promise.all(file.map(parseLog))
    .then((logs) => logs.filter((log) => log !== null))
    .then((logs) => logs.sort((a, b) => a.date.getTime() - b.date.getTime()));

export function LogsPage({ onSetLogs }: { onSetLogs: (logs: File[]) => void }) {
  const [parsedLogs, setParsedLogs] = useState<Log[]>([]);
  const logs = useContext(LogsContext);

  useEffect(() => {
    let active = true;
    load();
    return () => {
      active = false;
    };
    async function load() {
      setParsedLogs([]);
      const parsed = await parseLogs(logs);
      if (active) {
        setParsedLogs(parsed);
      }
    }
  }, [logs]);

  return (
    <>
      <LogUploader minHeight={100} onSetLogs={onSetLogs} />
      {parsedLogs.length > 0 && <LogGraph logs={parsedLogs} />}
    </>
  );
}
