/* eslint-disable quote-props */
import { useContext, useEffect, useState } from 'react';
import { LogUploader } from '@/components/LogUploader';
import { LogsContext } from '@/context/LogsContext';
import { Log, LogGraph } from '@/components/LogGraph';

const parseLog = async (file: File): Promise<Log> => {
  const { name } = file;
  const dateTime = name.substring(0, 19);
  const lastWave = name.match(/on Wave (\d+)/)?.[1] ?? 'unknown';
  const contents = await file.text();

  // 2020-10-10 10-10-10
  const date = new Date(`${dateTime.substring(0, 10)}T${dateTime.substring(11, 21).replaceAll('-', ':')}`);

  const toSeconds = (timestamp: string | undefined) => {
    if (!timestamp) {
      return null;
    }
    const [minutes, seconds] = timestamp.split(':').map(Number);
    return minutes * 60 + seconds;
  };

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

const parseLogs = async (file: File[]): Promise<Log[]> => Promise.all(file.map(parseLog));

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
      {parsedLogs.length > 0 && (
        <LogGraph logs={parsedLogs} />
      )}
    </>
  );
}
