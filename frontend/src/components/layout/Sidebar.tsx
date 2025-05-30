import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  Settings, 
  Users, 
  Activity,
  Bot,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Signals', href: '/signals', icon: TrendingUp },
  { name: 'Strategies', href: '/strategies', icon: Activity },
  { name: 'Admins', href: '/admins', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🐂📈</span>
          <span className="text-xl font-bold bg-gradient-to-r from-crypto-blue to-crypto-purple bg-clip-text text-transparent">
            Bull Trigger
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-crypto-blue text-white shadow-lg crypto-glow'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 transition-colors',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
              {isActive && <Zap className="ml-auto h-4 w-4 text-yellow-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <div className="text-xs text-gray-500 text-center">
          <div>v1.0.0</div>
          <div className="mt-1">Open Source • MIT</div>
        </div>
      </div>
    </div>
  );
} 