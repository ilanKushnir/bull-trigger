import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '🏠 Home', icon: '🏠' },
    { path: '/signals', label: '📈 Signals', icon: '📈' },
    { path: '/strategies', label: '⚙️ Strategies', icon: '⚙️' },
    { path: '/users', label: '👥 Users', icon: '👥' },
    { path: '/settings', label: '⚙️ Settings', icon: '⚙️' }
  ];

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-xl font-bold text-blue-400 mb-8">🐂 Bull Trigger</h2>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label.split(' ').slice(1).join(' ')}</span>
              </Link>
            ))}
          </nav>
        </div>
        
        {/* Footer with docs button and version */}
        <div className="p-6 pt-0">
          <div className="flex items-center justify-between text-xs ">
            <Link
              to="/docs"
              className={`px-2 py-1 rounded text-xs transition-colors ${
                location.pathname === '/docs'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              docs
            </Link>
            <span className="text-gray-500">version 1.0.0</span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-8 bg-gray-950">
          {children}
        </div>
      </main>
    </div>
  );
} 