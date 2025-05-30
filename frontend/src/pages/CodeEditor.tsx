import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
  type: 'strategy' | 'prompt' | 'config' | 'webhook' | 'script';
}

const SAMPLE_FILES: CodeFile[] = [
  {
    id: '1',
    name: 'signal-hunter.js',
    type: 'strategy',
    language: 'javascript',
    content: `// Advanced Signal Hunter Strategy
const strategy = {
  name: "Signal Hunter v2.0",
  description: "Multi-timeframe momentum strategy",
  
  config: {
    timeframes: ['1h', '4h', '1d'],
    symbols: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
    riskPerTrade: 0.02 // 2% risk per trade
  },
  
  execute: async function(market, indicators) {
    // Strategy logic here
    return {
      action: 'BUY',
      confidence: 0.85,
      entry: market.price
    };
  }
};

module.exports = strategy;`
  },
  {
    id: '2',
    name: 'market-analysis.md',
    type: 'prompt',
    language: 'markdown',
    content: `# Market Analysis Prompt

Analyze the current market conditions for {symbol} and provide a trading signal.

## Technical Indicators
- RSI: {rsi}
- MACD: {macd}
- Price: ${'{current_price}'}

## Output Format
Please provide analysis in JSON format with signal, confidence, and reasoning.`
  }
];

export default function CodeEditor() {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(SAMPLE_FILES[0]);
  const [code, setCode] = useState(selectedFile.content);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'strategy': return '⚙️';
      case 'prompt': return '🧠';
      case 'config': return '📋';
      case 'webhook': return '🌐';
      default: return '📄';
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'strategy': return 'blue';
      case 'prompt': return 'purple';
      case 'config': return 'green';
      case 'webhook': return 'orange';
      default: return 'gray';
    }
  };

  const handleFileSelect = (file: CodeFile) => {
    setSelectedFile(file);
    setCode(file.content);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-400 mb-2">
          💻 Code Editor
        </h1>
        <p className="text-gray-400">
          Advanced strategy development environment
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Explorer */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <span>📁</span>
              <span>Project Files</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {SAMPLE_FILES.map(file => (
                <div
                  key={file.id}
                  onClick={() => handleFileSelect(file)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedFile.id === file.id 
                      ? 'bg-blue-600' 
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{getFileIcon(file.type)}</span>
                    <span className="text-white text-sm font-medium">{file.name}</span>
                  </div>
                  <Badge 
                    variant={getFileTypeColor(file.type) as any}
                    className="mt-1 text-xs"
                  >
                    {file.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center space-x-2">
                  <span>{getFileIcon(selectedFile.type)}</span>
                  <span>{selectedFile.name}</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="info">{selectedFile.language.toUpperCase()}</Badge>
                  <Badge variant="default">{selectedFile.type.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4">
                <Button size="sm">
                  💾 Save
                </Button>
                <Button size="sm" variant="success">
                  ▶️ Run
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-96 bg-gray-900 text-white p-4 rounded border border-gray-600 font-mono text-sm"
                placeholder="// Enter your code here..."
                style={{
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  lineHeight: '1.5',
                  tabSize: 2
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 