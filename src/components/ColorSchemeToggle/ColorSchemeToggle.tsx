import { Button, Group, useMantineColorScheme } from '@mantine/core';

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();

  return (
    <Group justify="center" mt="xl">
      <Button size="compact-md" onClick={() => setColorScheme('light')}>Light</Button>
      <Button size="compact-md" onClick={() => setColorScheme('dark')}>Dark</Button>
      <Button size="compact-md" onClick={() => setColorScheme('auto')}>Auto</Button>
    </Group>
  );
}
