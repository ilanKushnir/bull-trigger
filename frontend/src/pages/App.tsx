import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StrategiesPage from './Strategies';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/strategies" replace />} />
        <Route path="/strategies" element={<StrategiesPage />} />
      </Routes>
    </BrowserRouter>
  );
} 