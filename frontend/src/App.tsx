import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Home from './pages/Home';
import Signals from './pages/Signals';
import Strategies from './pages/Strategies';
import Admins from './pages/Admins';
import Settings from './pages/Settings';
import CodeEditor from './pages/CodeEditor';

function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/strategies" element={<Strategies />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/code-editor" element={<CodeEditor />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}

export default App; 