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
    { path: '/code-editor', label: '💻 Code Editor', icon: '💻' },
    { path: '/admins', label: '👥 Admins', icon: '👥' },
    { path: '/settings', label: '⚙️ Settings', icon: '⚙️' }
  ];

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-8">🚀 Crypto‑Kush</h2>
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
        
        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-gray-500 text-center">
            <p>v1.0.0</p>
            <p>Open Source MIT</p>
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