/* eslint-disable quote-props */
import { useContext, useEffect, useState } from 'react';
import { Button, Collapse, Divider, Table } from '@mantine/core';
import { LogUploader } from '@/components/LogUploader';
import { LogsContext } from '@/context/LogsContext';
import { Log, LogGraph, SPLIT_WAVES } from '@/components/LogGraph';

const parseLog = async (file: File): Promise<Log> => {
  const { name } = file;
  const date = name.substring(0, 19);
  const lastWave = name.match(/on Wave (\d+)/)?.[1] ?? 'unknown';
  const contents = await file.text();

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

  return {
    date,
    lastWave,
    splits: SPLIT_WAVES.reduce(
      (acc, wave) => ({
        ...acc,
        [wave]: toSeconds(contents.match(new RegExp(`Wave: ${wave}, Split: ([\\d:]+)`))?.[1]),
      }),
      {}
    ),
    deltas: SPLIT_WAVES.reduce(
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
  const [showLogs, setShowLogs] = useState(false);
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
      <Divider />
      <Button size="sm" onClick={() => setShowLogs((s) => !s)} mt="lg">
        {showLogs ? 'hide' : 'show'} all {parsedLogs.length} logs
      </Button>
      <Collapse in={showLogs}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Last Wave</Table.Th>
              {SPLIT_WAVES.map((wave) => (
                <Table.Th>W{wave}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {parsedLogs.map(({ date, lastWave, splits, deltas }, i) => (
              <Table.Tr key={i}>
                <Table.Td>{date}</Table.Td>
                <Table.Td>{lastWave}</Table.Td>
                {SPLIT_WAVES.map((wave) => (
                  <Table.Td>
                    {splits[wave] && (
                      <>
                        {splits[wave]} (+{deltas[wave]})
                      </>
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Collapse>
    </>
  );
}
