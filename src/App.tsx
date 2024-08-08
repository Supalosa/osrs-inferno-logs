import { useState } from 'react';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import { LogsContext } from './context/LogsContext';
import { ColorSchemeToggle } from './components/ColorSchemeToggle/ColorSchemeToggle';

import '@mantine/charts/styles.css';

export default function App() {
  const [logs, setLogs] = useState<File[]>([]);

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <LogsContext.Provider value={logs}>
        <Router onSetLogs={setLogs} />
      </LogsContext.Provider>
      <ColorSchemeToggle />
    </MantineProvider>
  );
}
