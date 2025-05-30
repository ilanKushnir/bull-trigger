import React, { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  height?: string;
  theme?: string;
  options?: any;
  title?: string;
  showLanguageSelector?: boolean;
  showFormatButton?: boolean;
  placeholder?: string;
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', icon: '🟨' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'json', label: 'JSON', icon: '📋' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'markdown', label: 'Markdown', icon: '📝' },
  { value: 'yaml', label: 'YAML', icon: '📄' },
  { value: 'sql', label: 'SQL', icon: '🗄️' },
  { value: 'plaintext', label: 'Plain Text', icon: '📄' },
];

const SAMPLE_TEMPLATES = {
  prompt: `Analyze the current market conditions for {symbol} and provide a trading signal.

Consider the following factors:
- Recent price action and trend analysis
- Technical indicators (RSI, MACD, Moving averages)
- Volume patterns and market sentiment
- Support and resistance levels

Provide your analysis in the following format:
{
  "signal": "BUY|SELL|HOLD",
  "confidence": 0.85,
  "reasoning": "Brief explanation of the decision",
  "entry_price": 43250,
  "stop_loss": 42000,
  "take_profit": 45000
}`,
  trigger: `{
  "type": "price_change",
  "conditions": {
    "symbol": "BTC/USDT",
    "threshold": 2.0,
    "direction": "up",
    "timeframe": "1h"
  },
  "filters": {
    "volume_minimum": 1000000,
    "price_range": {
      "min": 40000,
      "max": 50000
    }
  }
}`,
  webhook: `{
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {API_KEY}",
    "Content-Type": "application/json"
  },
  "payload": {
    "signal": "{signal}",
    "symbol": "{symbol}",
    "confidence": "{confidence}",
    "timestamp": "{timestamp}"
  }
}`,
  strategy: `// Advanced Strategy Configuration
const strategy = {
  name: "Advanced Signal Hunter",
  description: "Multi-indicator strategy with dynamic thresholds",
  
  // Entry conditions
  entry: {
    rsi: { min: 25, max: 35 },
    macd: "bullish_crossover",
    volume: "above_average",
    trend: "upward"
  },
  
  // Risk management
  risk: {
    stop_loss: 0.02,  // 2%
    take_profit: 0.06, // 6%
    position_size: 0.1 // 10% of portfolio
  },
  
  // Advanced filters
  filters: {
    market_cap: { min: 1000000000 }, // 1B+
    daily_volume: { min: 50000000 },  // 50M+
    volatility: { max: 0.05 }         // Max 5%
  }
};

module.exports = strategy;`
};

export default function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  height = '400px',
  theme = 'vs-dark',
  options = {},
  title,
  showLanguageSelector = true,
  showFormatButton = true,
  placeholder
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isFormatting, setIsFormatting] = useState(false);

  const defaultOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    folding: true,
    lineNumbersMinChars: 3,
    glyphMargin: false,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    overviewRulerLanes: 0,
    contextmenu: true,
    selectOnLineNumbers: true,
    matchBrackets: 'always',
    theme: 'crypto-dark',
    ...options
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Define custom crypto-dark theme
    monaco.editor.defineTheme('crypto-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '60A5FA' },
        { token: 'string', foreground: '34D399' },
        { token: 'number', foreground: 'F59E0B' },
        { token: 'regexp', foreground: 'EC4899' },
        { token: 'type', foreground: 'A78BFA' },
        { token: 'class', foreground: 'F472B6' },
        { token: 'function', foreground: '06B6D4' },
        { token: 'variable', foreground: 'E5E7EB' },
      ],
      colors: {
        'editor.background': '#111827',
        'editor.foreground': '#E5E7EB',
        'editor.lineHighlightBackground': '#1F2937',
        'editorCursor.foreground': '#60A5FA',
        'editor.selectionBackground': '#374151',
        'editor.inactiveSelectionBackground': '#1F2937',
        'editorLineNumber.foreground': '#6B7280',
        'editorLineNumber.activeForeground': '#9CA3AF',
        'editor.wordHighlightBackground': '#374151',
        'editor.wordHighlightStrongBackground': '#4B5563',
        'editorBracketMatch.background': '#374151',
        'editorBracketMatch.border': '#60A5FA',
      }
    });
    
    // Set theme
    monaco.editor.setTheme('crypto-dark');
  };

  const formatDocument = async () => {
    if (!editorRef.current) return;
    
    setIsFormatting(true);
    try {
      await editorRef.current.getAction('editor.action.formatDocument').run();
    } catch (error) {
      console.warn('Auto-formatting not available for this language');
    } finally {
      setIsFormatting(false);
    }
  };

  const insertTemplate = (templateKey: keyof typeof SAMPLE_TEMPLATES) => {
    const template = SAMPLE_TEMPLATES[templateKey];
    onChange(template);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    // The language change will be handled by the parent component
    // You might want to add a callback here if needed
  };

  const getLanguageIcon = (lang: string) => {
    return SUPPORTED_LANGUAGES.find(l => l.value === lang)?.icon || '📄';
  };

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white flex items-center space-x-2">
            <span>{getLanguageIcon(selectedLanguage)}</span>
            <span>{title}</span>
          </h3>
          <Badge variant="info">{selectedLanguage.toUpperCase()}</Badge>
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              {showLanguageSelector && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.icon} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showFormatButton && (
                <Button
                  size="sm"
                  onClick={formatDocument}
                  disabled={isFormatting}
                  variant="outline"
                >
                  {isFormatting ? '⏳' : '✨'} Format
                </Button>
              )}
            </div>

            {/* Template Shortcuts */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Templates:</span>
              <Button size="sm" onClick={() => insertTemplate('prompt')} variant="ghost">
                🧠 Prompt
              </Button>
              <Button size="sm" onClick={() => insertTemplate('trigger')} variant="ghost">
                ⚡ Trigger
              </Button>
              <Button size="sm" onClick={() => insertTemplate('webhook')} variant="ghost">
                🌐 Webhook
              </Button>
              <Button size="sm" onClick={() => insertTemplate('strategy')} variant="ghost">
                ⚙️ Strategy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <Editor
          height={height}
          language={selectedLanguage}
          value={value || placeholder || ''}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={defaultOptions}
          theme="crypto-dark"
          loading={
            <div className="flex items-center justify-center h-full bg-gray-900">
              <div className="text-gray-400">⏳ Loading Monaco Editor...</div>
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>💡 Press Ctrl+Space for autocomplete</span>
          <span>📋 Ctrl+Shift+P for command palette</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Lines: {value?.split('\n').length || 1}</span>
          <span>•</span>
          <span>Characters: {value?.length || 0}</span>
        </div>
      </div>
    </div>
  );
} 