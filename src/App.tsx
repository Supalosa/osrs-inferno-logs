import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';

export default function App() {
  return (
    <MantineProvider forceColorScheme="dark" theme={theme}>
      <Router />
    </MantineProvider>
  );
}
