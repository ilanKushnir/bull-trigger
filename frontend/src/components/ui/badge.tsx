import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variants = {
    default: 'bg-gray-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-orange-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white'
  };
  
  const classes = `${baseClasses} ${variants[variant]} ${className}`;
  
  return (
    <span className={classes}>
      {children}
    </span>
  );
} 