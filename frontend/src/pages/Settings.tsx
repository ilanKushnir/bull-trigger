import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useApi } from '../services/websocketService';

// Icons as simple components
const SettingsIcon = () => <span className="text-lg">⚙️</span>;
const BotIcon = () => <span className="text-lg">🤖</span>;
const DollarIcon = () => <span className="text-lg">💰</span>;
const KeyIcon = () => <span className="text-lg">🔑</span>;
const SaveIcon = () => <span className="text-sm">💾</span>;
const RefreshIcon = () => <span className="text-sm">🔄</span>;
const AlertIcon = () => <span className="text-lg">⚠️</span>;
const CheckIcon = () => <span className="text-sm">✅</span>;
const LoadingIcon = () => <span className="text-sm animate-spin">⚡</span>;

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
  category: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [originalSettings, setOriginalSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState({
    current: 0,
    limit: 100000,
    resetDate: new Date(2024, 1, 1)
  });

  const api = useApi();

  // Define setting configurations
  const settingDefinitions: Omit<Setting, 'value'>[] = [
    // AI Models
    {
      key: 'MODEL_DEEP',
      label: 'Deep Model',
      description: 'OpenAI model for complex analysis and strategy execution',
      type: 'select',
      category: 'AI Models',
      options: [
        { value: 'o1-pro', label: 'o1 Pro (Latest - Premium Reasoning)' },
        { value: 'o1', label: 'o1 (Advanced Reasoning)' },
        { value: 'o3-mini', label: 'o3 Mini (New Reasoning)' },
        { value: 'gpt-4o', label: 'GPT-4o (Multimodal)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
      ]
    },
    {
      key: 'MODEL_CHEAP',
      label: 'Cheap Model',
      description: 'Lightweight model for simple tasks and monitoring',
      type: 'select',
      category: 'AI Models',
      options: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Latest Efficient)' },
        { value: 'o1-mini', label: 'o1 Mini (Reasoning Lite)' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' },
        { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K (Legacy)' },
      ]
    },
    // Token Management
    {
      key: 'TOKEN_LIMIT',
      label: 'Monthly Token Limit',
      description: 'Maximum tokens to consume per month',
      type: 'number',
      category: 'Token Management',
      unit: 'tokens',
      min: 1000,
      max: 10000000
    },
    {
      key: 'TOKEN_WARN',
      label: 'Warning Threshold',
      description: 'Send warning when token usage reaches this percentage (0.0-1.0)',
      type: 'number',
      category: 'Token Management',
      unit: 'ratio',
      min: 0.5,
      max: 0.99
    },
    {
      key: 'TOKEN_PANIC',
      label: 'Panic Threshold',
      description: 'Send critical alert when token usage reaches this percentage (0.0-1.0)',
      type: 'number',
      category: 'Token Management',
      unit: 'ratio',
      min: 0.51,
      max: 1.0
    },
    // API Configuration
    {
      key: 'OPENAI_API_KEY',
      label: 'OpenAI API Key',
      description: 'API key for OpenAI services',
      type: 'password',
      category: 'API Configuration'
    },
    // Telegram Integration
    {
      key: 'TELEGRAM_BOT_TOKEN',
      label: 'Telegram Bot Token',
      description: 'Bot token for Telegram integration',
      type: 'password',
      category: 'Telegram Integration'
    },
    {
      key: 'TELEGRAM_CHAT_ID',
      label: 'Telegram Chat ID',
      description: 'Target chat/group ID for signal posts',
      type: 'text',
      category: 'Telegram Integration'
    },
    // System Behavior
    {
      key: 'SIGNAL_COOLDOWN',
      label: 'Signal Cooldown',
      description: 'Minimum time between signals for the same symbol',
      type: 'number',
      category: 'System Behavior',
      unit: 'minutes',
      min: 1,
      max: 1440
    },
    {
      key: 'HEARTBEAT_INTERVAL',
      label: 'Heartbeat Interval',
      description: 'How often to send system status updates',
      type: 'number',
      category: 'System Behavior',
      unit: 'minutes',
      min: 30,
      max: 1440
    },
    {
      key: 'ENABLE_NOTIFICATIONS',
      label: 'Enable Notifications',
      description: 'Send system alerts and status updates',
      type: 'boolean',
      category: 'System Behavior'
    },
    {
      key: 'AUTO_DISABLE_FAILING_STRATEGIES',
      label: 'Auto-disable Failing Strategies',
      description: 'Automatically disable strategies with low success rates',
      type: 'boolean',
      category: 'System Behavior'
    }
  ];

  useEffect(() => {
    loadSettings();
    loadTokenUsage();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.getSettings();
      
      if (result.success && result.data) {
        setOriginalSettings(result.data);
        
        // Merge with setting definitions to create full setting objects
        const fullSettings = settingDefinitions.map(def => ({
          ...def,
          value: result.data![def.key] !== undefined ? result.data![def.key] : getDefaultValue(def)
        }));
        
        setSettings(fullSettings);
      } else {
        setError(result.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTokenUsage = async () => {
    try {
      const result = await api.getTokenUsage();
      if (result.success && result.data) {
        setTokenUsage({
          current: result.data.used,
          limit: result.data.limit,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });
      }
    } catch (error) {
      console.error('Failed to load token usage:', error);
    }
  };

  const getDefaultValue = (setting: Omit<Setting, 'value'>) => {
    switch (setting.type) {
      case 'boolean':
        return false;
      case 'number':
        return setting.min || 0;
      case 'select':
        return setting.options?.[0]?.value || '';
      default:
        return '';
    }
  };

  const formatNumber = (num: number) => num.toLocaleString();

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
    
    // Check if there are changes compared to original
    const currentValues = Object.fromEntries(
      settings.map(s => [s.key, s.key === key ? value : s.value])
    );
    
    const hasActualChanges = Object.keys(currentValues).some(
      k => currentValues[k] !== originalSettings[k]
    );
    
    setHasChanges(hasActualChanges);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Create settings object from current values
      const settingsToSave = Object.fromEntries(
        settings.map(s => [s.key, s.value])
      );
      
      const result = await api.updateSettings(settingsToSave);
      
      if (result.success) {
        setOriginalSettings(settingsToSave);
        setHasChanges(false);
        
        // Reload token usage if token settings were changed
        const tokenKeys = ['TOKEN_LIMIT', 'TOKEN_WARN', 'TOKEN_PANIC'];
        if (tokenKeys.some(key => settingsToSave[key] !== originalSettings[key])) {
          await loadTokenUsage();
        }
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTokenUsage = async () => {
    if (confirm('Are you sure you want to reset the token usage counter? This action cannot be undone.')) {
      try {
        const result = await api.resetTokenUsage();
        if (result.success) {
          await loadTokenUsage();
        } else {
          alert('Failed to reset token usage: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Failed to reset token usage:', error);
        alert('Failed to reset token usage');
      }
    }
  };

  const handleResetAllSettings = async () => {
    if (confirm('Are you sure you want to reset ALL settings to their default values? This action cannot be undone.')) {
      try {
        setIsSaving(true);
        const result = await api.resetAllSettings();
        
        if (result.success) {
          await loadSettings();
          await loadTokenUsage();
        } else {
          setError(result.error || 'Failed to reset settings');
        }
      } catch (error) {
        console.error('Failed to reset settings:', error);
        setError('Failed to reset settings');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const getSettingsByCategory = () => {
    const categories: Record<string, Setting[]> = {};
    settings.forEach(setting => {
      if (!categories[setting.category]) {
        categories[setting.category] = [];
      }
      categories[setting.category].push(setting);
    });
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
            disabled={isSaving}
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
              onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value) || 0)}
              className={baseClasses}
              min={setting.min}
              max={setting.max}
              step={setting.unit === 'ratio' ? 0.01 : 1}
              disabled={isSaving}
            />
            {setting.unit && (
              <span className="text-gray-400 text-sm">
                {setting.unit === 'ratio' ? 'ratio' : setting.unit}
              </span>
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
              disabled={isSaving}
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
            value={setting.value || ''}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={baseClasses}
            placeholder="Enter new value to change"
            disabled={isSaving}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={setting.value || ''}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={baseClasses}
            disabled={isSaving}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-blue-400">
          <LoadingIcon />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

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
            className="flex items-center space-x-1"
          >
            {isSaving ? <LoadingIcon /> : <SaveIcon />}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-500 bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertIcon />
              <span className="font-medium">Error: {error}</span>
              <Button 
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
                variant="outline"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                className="mt-2 flex items-center space-x-1"
                disabled={isSaving}
              >
                <RefreshIcon />
                <span>Reset Now</span>
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
                className="ml-auto flex items-center space-x-1"
              >
                {isSaving ? <LoadingIcon /> : <SaveIcon />}
                <span>Save Now</span>
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
              <Button 
                variant="error" 
                className="flex items-center space-x-1"
                onClick={handleResetAllSettings}
                disabled={isSaving}
              >
                <AlertIcon />
                <span>Reset All</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 