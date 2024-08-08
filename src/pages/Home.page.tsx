import { useNavigate } from 'react-router-dom';
import { Welcome } from '../components/Welcome/Welcome';

import { LogUploader } from '@/components/LogUploader';

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
        }} />
    </>
  );
}
