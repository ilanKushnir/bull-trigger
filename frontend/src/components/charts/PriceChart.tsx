import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface PriceData {
  timestamp: string;
  price: number;
  volume?: number;
  signal?: 'BUY' | 'SELL' | 'HOLD';
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

interface PriceChartProps {
  symbol: string;
  data: PriceData[];
  height?: number;
  showSignals?: boolean;
  timeframe?: '1h' | '4h' | '1d' | '1w';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-gray-300 text-sm mb-2">{label}</p>
        <p className="text-white text-sm">
          <span className="text-green-400">Price:</span> ${data.price?.toLocaleString()}
        </p>
        {data.volume && (
          <p className="text-white text-sm">
            <span className="text-blue-400">Volume:</span> {data.volume.toLocaleString()}
          </p>
        )}
        {data.signal && (
          <p className="text-white text-sm">
            <span className="text-purple-400">Signal:</span> 
            <Badge 
              variant={data.signal === 'BUY' ? 'success' : data.signal === 'SELL' ? 'error' : 'warning'}
              className="ml-2"
            >
              {data.signal}
            </Badge>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const SignalDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.signal) return null;
  
  const color = payload.signal === 'BUY' ? '#10B981' : 
                payload.signal === 'SELL' ? '#EF4444' : '#F59E0B';
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      stroke="#FFFFFF"
      strokeWidth={2}
      className="animate-pulse"
    />
  );
};

export default function PriceChart({ 
  symbol, 
  data, 
  height = 400, 
  showSignals = true,
  timeframe = '1h'
}: PriceChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick'>('line');
  const [isLive, setIsLive] = useState(false);

  // Calculate price change
  const priceChange = data.length >= 2 ? 
    ((data[data.length - 1].price - data[0].price) / data[0].price) * 100 : 0;
  const isPositive = priceChange >= 0;
  const currentPrice = data[data.length - 1]?.price || 0;

  // Generate signal markers for the chart
  const signalData = data.map(point => ({
    ...point,
    signalMarker: point.signal ? point.price : null
  }));

  const renderChart = () => {
    const commonProps = {
      data: signalData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timestamp" 
              stroke="#9CA3AF" 
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return timeframe === '1h' ? date.toLocaleTimeString() : date.toLocaleDateString();
              }}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              domain={['dataMin - 100', 'dataMax + 100']}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={isPositive ? "#10B981" : "#EF4444"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: isPositive ? "#10B981" : "#EF4444", strokeWidth: 2 }}
            />
            {showSignals && (
              <Line 
                type="monotone" 
                dataKey="signalMarker" 
                stroke="transparent"
                dot={<SignalDot />}
                activeDot={false}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timestamp" 
              stroke="#9CA3AF" 
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return timeframe === '1h' ? date.toLocaleTimeString() : date.toLocaleDateString();
              }}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              domain={['dataMin - 100', 'dataMax + 100']}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={isPositive ? "#10B981" : "#EF4444"}
              fill={isPositive ? "#10B981" : "#EF4444"}
              fillOpacity={0.3}
            />
            {showSignals && (
              <Line 
                type="monotone" 
                dataKey="signalMarker" 
                stroke="transparent"
                dot={<SignalDot />}
                activeDot={false}
              />
            )}
          </AreaChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="timestamp" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-white flex items-center space-x-2">
              <span>📈</span>
              <span>{symbol} Price Chart</span>
              {isLive && <Badge variant="success" className="animate-pulse">Live</Badge>}
            </CardTitle>
            <div className="flex items-center space-x-4 mt-2">
              <div className="text-2xl font-bold text-white">
                ${currentPrice.toLocaleString()}
              </div>
              <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                <span>{isPositive ? '↗' : '↘'}</span>
                <span className="font-medium">
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Chart Type Selector */}
            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'ghost'}
                onClick={() => setChartType('line')}
                className="text-xs"
              >
                Line
              </Button>
              <Button
                size="sm"
                variant={chartType === 'area' ? 'default' : 'ghost'}
                onClick={() => setChartType('area')}
                className="text-xs"
              >
                Area
              </Button>
            </div>
            
            {/* Timeframe Selector */}
            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
              {['1h', '4h', '1d', '1w'].map((tf) => (
                <Button
                  key={tf}
                  size="sm"
                  variant={timeframe === tf ? 'default' : 'ghost'}
                  className="text-xs"
                >
                  {tf}
                </Button>
              ))}
            </div>
            
            {/* Live Toggle */}
            <Button
              size="sm"
              variant={isLive ? 'success' : 'outline'}
              onClick={() => setIsLive(!isLive)}
              className="text-xs"
            >
              {isLive ? '⏹ Stop' : '▶ Live'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
        
        {/* Chart Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-400">High</p>
            <p className="text-sm font-medium text-white">
              ${Math.max(...data.map(d => d.price)).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Low</p>
            <p className="text-sm font-medium text-white">
              ${Math.min(...data.map(d => d.price)).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Volume</p>
            <p className="text-sm font-medium text-white">
              {data.reduce((acc, d) => acc + (d.volume || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Signals</p>
            <p className="text-sm font-medium text-white">
              {data.filter(d => d.signal).length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 