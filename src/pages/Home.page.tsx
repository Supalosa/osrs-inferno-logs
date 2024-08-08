import { useNavigate } from 'react-router-dom';
import { Center, Flex, Image } from '@mantine/core';
import { Welcome } from '../components/Welcome/Welcome';

import { LogUploader } from '@/components/LogUploader';

import dragImage from '../../drag.png';
import pluginImage from '../../plugin.png';

export function HomePage({ onSetLogs }: { onSetLogs: (logs: File[]) => void }) {
  const navigate = useNavigate();

  return (
    <>
      <Welcome />
      <LogUploader
        minHeight={220}
        onSetLogs={(files) => {
          onSetLogs(files);
          navigate('/logs');
        }}
      />
      <Center>
        <Flex direction="row" gap="lg">
          <Image src={pluginImage} radius="md" w="auto" fit="contain" />
          <Image src={dragImage} radius="md" w="auto" fit="contain" />
        </Flex>
      </Center>
    </>
  );
}
