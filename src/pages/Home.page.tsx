import { Dropzone } from '@mantine/dropzone';
import { IconUpload, IconX, IconPhoto } from '@tabler/icons-react';
import { Welcome } from '../components/Welcome/Welcome';
import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';

export function HomePage() {
  return (
    <>
      <ColorSchemeToggle />
      <Welcome />
      <Dropzone onDrop={(files) => console.log(files)}>
      <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
            stroke={1.5}
          />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
            stroke={1.5}
          />
        </Dropzone.Idle>

        <div>
          <Text size="xl" inline>
            Drag images here or click to select files
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            Attach as many files as you like, each file should not exceed 5mb
          </Text>
        </div>
      </Group>
      </Dropzone>
    </>
  );
}
