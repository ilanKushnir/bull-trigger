import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Docs from './pages/Docs';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Signals from './pages/Signals';
import Strategies from './pages/Strategies';
import Users from './pages/Users';

function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/strategies" element={<Strategies />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}

export default App; 