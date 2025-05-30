import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

// Icons as simple components
const SettingsIcon = () => <span>⚙️</span>;
const BotIcon = () => <span>🤖</span>;
const DollarIcon = () => <span>💰</span>;
const KeyIcon = () => <span>🔑</span>;
const SaveIcon = () => <span>💾</span>;
const RefreshIcon = () => <span>🔄</span>;
const AlertIcon = () => <span>⚠️</span>;
const CheckIcon = () => <span>✅</span>;

interface Setting {
  key: string;
  label: string;
  description: string;
  type: 'select' | 'number' | 'text' | 'boolean' | 'password';
  value: any;
  options?: { value: string; label: string }[];
  unit?: string;
  min?: number;
  max?: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([
    {
      key: 'MODEL_DEEP',
      label: 'Deep Model',
      description: 'OpenAI model for complex analysis and strategy execution',
      type: 'select',
      value: 'gpt-4-turbo-preview',
      options: [
        { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo Preview' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-32k', label: 'GPT-4 32K' },
      ]
    },
    {
      key: 'MODEL_CHEAP',
      label: 'Cheap Model',
      description: 'Lightweight model for simple tasks and monitoring',
      type: 'select',
      value: 'gpt-3.5-turbo',
      options: [
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' },
      ]
    },
    {
      key: 'TOKEN_LIMIT_MONTH',
      label: 'Monthly Token Limit',
      description: 'Maximum tokens to consume per month',
      type: 'number',
      value: 100000,
      unit: 'tokens',
      min: 1000,
      max: 1000000
    },
    {
      key: 'TOKEN_WARN_PERCENTAGE',
      label: 'Warning Threshold',
      description: 'Send warning when token usage reaches this percentage',
      type: 'number',
      value: 80,
      unit: '%',
      min: 50,
      max: 99
    },
    {
      key: 'TOKEN_PANIC_PERCENTAGE',
      label: 'Panic Threshold',
      description: 'Send critical alert when token usage reaches this percentage',
      type: 'number',
      value: 95,
      unit: '%',
      min: 51,
      max: 100
    },
    {
      key: 'TELEGRAM_BOT_TOKEN',
      label: 'Telegram Bot Token',
      description: 'Bot token for Telegram integration',
      type: 'password',
      value: '***************:AAH***************************'
    },
    {
      key: 'OPENAI_API_KEY',
      label: 'OpenAI API Key',
      description: 'API key for OpenAI services',
      type: 'password',
      value: 'sk-***********************************'
    },
    {
      key: 'TELEGRAM_CHAT_ID',
      label: 'Telegram Chat ID',
      description: 'Target chat/group ID for signal posts',
      type: 'text',
      value: '-1001234567890'
    },
    {
      key: 'SIGNAL_COOLDOWN',
      label: 'Signal Cooldown',
      description: 'Minimum time between signals for the same symbol',
      type: 'number',
      value: 30,
      unit: 'minutes',
      min: 1,
      max: 1440
    },
    {
      key: 'HEARTBEAT_INTERVAL',
      label: 'Heartbeat Interval',
      description: 'How often to send system status updates',
      type: 'number',
      value: 120,
      unit: 'minutes',
      min: 30,
      max: 1440
    },
    {
      key: 'ENABLE_NOTIFICATIONS',
      label: 'Enable Notifications',
      description: 'Send system alerts and status updates',
      type: 'boolean',
      value: true
    },
    {
      key: 'AUTO_DISABLE_FAILING_STRATEGIES',
      label: 'Auto-disable Failing Strategies',
      description: 'Automatically disable strategies with low success rates',
      type: 'boolean',
      value: false
    }
  ]);

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tokenUsage] = useState({
    current: 75000,
    limit: 100000,
    resetDate: new Date(2024, 1, 1) // Next reset date
  });

  const formatNumber = (num: number) => num.toLocaleString();

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTokenUsage = async () => {
    if (confirm('Are you sure you want to reset the token usage counter? This action cannot be undone.')) {
      // Reset token usage logic would go here
      alert('Token usage reset successfully!');
    }
  };

  const getSettingsByCategory = () => {
    const categories = {
      'AI Models': settings.filter(s => s.key.includes('MODEL')),
      'Token Management': settings.filter(s => s.key.includes('TOKEN')),
      'Telegram Integration': settings.filter(s => s.key.includes('TELEGRAM')),
      'API Configuration': settings.filter(s => s.key.includes('API')),
      'System Behavior': settings.filter(s => 
        !s.key.includes('MODEL') && 
        !s.key.includes('TOKEN') && 
        !s.key.includes('TELEGRAM') && 
        !s.key.includes('API')
      ),
    };
    return categories;
  };

  const renderSettingInput = (setting: Setting) => {
    const baseClasses = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none";
    
    switch (setting.type) {
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={baseClasses}
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={setting.value}
              onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value))}
              className={baseClasses}
              min={setting.min}
              max={setting.max}
            />
            {setting.unit && (
              <span className="text-gray-400 text-sm">{setting.unit}</span>
            )}
          </div>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
              className="rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-300">
              {setting.value ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );
      
      case 'password':
        return (
          <input
            type="password"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={baseClasses}
            placeholder="Enter new value to change"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={baseClasses}
          />
        );
    }
  };

  const categories = getSettingsByCategory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            ⚙️ System Settings
          </h1>
          <p className="text-gray-400">
            Configure AI models, token limits, and system behavior
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            variant="success"
          >
            <SaveIcon /> {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Token Usage Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center space-x-2">
            <DollarIcon />
            <span>Token Usage Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400">Current Usage</div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(tokenUsage.current)}
              </div>
              <div className="text-sm text-gray-500">
                of {formatNumber(tokenUsage.limit)} tokens
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400">Usage Percentage</div>
              <div className="text-2xl font-bold text-orange-400">
                {Math.round((tokenUsage.current / tokenUsage.limit) * 100)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((tokenUsage.current / tokenUsage.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400">Next Reset</div>
              <div className="text-lg font-medium text-white">
                {tokenUsage.resetDate.toLocaleDateString()}
              </div>
              <Button 
                size="sm"
                onClick={handleResetTokenUsage}
                variant="error"
                className="mt-2"
              >
                <RefreshIcon /> Reset Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Indicator */}
      {hasChanges && (
        <Card className="border-blue-500 bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-blue-400">
              <AlertIcon />
              <span className="font-medium">You have unsaved changes</span>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="ml-auto"
              >
                Save Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Categories */}
      {Object.entries(categories).map(([category, categorySettings]) => (
        categorySettings.length > 0 && (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center space-x-2">
                {category === 'AI Models' && <BotIcon />}
                {category === 'Token Management' && <DollarIcon />}
                {category === 'Telegram Integration' && <BotIcon />}
                {category === 'API Configuration' && <KeyIcon />}
                {category === 'System Behavior' && <SettingsIcon />}
                <span>{category}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categorySettings.map((setting) => (
                  <div key={setting.key} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <div className="font-medium text-white">{setting.label}</div>
                      <div className="text-sm text-gray-400 mt-1">{setting.description}</div>
                    </div>
                    <div className="lg:col-span-2">
                      {renderSettingInput(setting)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}

      {/* Danger Zone */}
      <Card className="border-red-700 bg-red-900/20">
        <CardHeader>
          <CardTitle className="text-xl text-red-400 flex items-center space-x-2">
            <AlertIcon />
            <span>Danger Zone</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-white">Reset All Settings</div>
                <div className="text-sm text-gray-400">
                  Reset all settings to their default values. This cannot be undone.
                </div>
              </div>
              <Button variant="error">
                Reset All
              </Button>
            </div>
            
            <div className="border-t border-red-700 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-white">Clear All Data</div>
                  <div className="text-sm text-gray-400">
                    Remove all signals, strategy history, and analytics data.
                  </div>
                </div>
                <Button variant="error">
                  Clear Data
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 