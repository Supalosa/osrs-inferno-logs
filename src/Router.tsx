import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';
import { LogsPage } from './pages/Logs.page';

const createRouter = (onSetLogs: (logs: File[]) => void) => createBrowserRouter([
  {
    path: '/',
    element: <HomePage onSetLogs={onSetLogs} />,
  },
  {
    path: '/logs',
    element: <LogsPage onSetLogs={onSetLogs} />,
  },
]);

export function Router({ onSetLogs }: { onSetLogs: (logs: File[]) => void }) {
  return <RouterProvider router={createRouter(onSetLogs)} />;
}
