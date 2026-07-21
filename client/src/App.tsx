import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';
import Login from './pages/Login';
import BoardList from './pages/BoardList';
import BoardView from './pages/BoardView';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { user } = useSession();
  const loc = useLocation();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login redirectTo={loc.pathname !== '/login' ? loc.pathname : '/'} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<BoardList />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/board/:id" element={<BoardView />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
