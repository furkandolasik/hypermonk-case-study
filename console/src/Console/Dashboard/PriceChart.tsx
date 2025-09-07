import React, { useState } from 'react';
import { Card, Button } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface PriceChartProps {
  chartData: ChartDataPoint[];
  currencies: string[];
  onDateRangeSelect?: (startDate: string, endDate: string) => void;
  onResetZoom?: () => void;
}

const PriceChart: React.FC<PriceChartProps> = ({ chartData, currencies, onDateRangeSelect, onResetZoom }) => {
  const [firstClickDate, setFirstClickDate] = useState<string | null>(null);
  const [secondClickDate, setSecondClickDate] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);

  const getChartLines = () => {
    if (chartData.length === 0) return null;

    const sampleData = chartData[0];
    const lineKeys = Object.keys(sampleData).filter((key) => key !== 'date');

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#413ea0', '#8dd1e1'];

    return lineKeys.map((key, index) => (
      <Line
        key={key}
        type="monotone"
        dataKey={key}
        stroke={colors[index % colors.length]}
        strokeWidth={2}
        name={key.replace('_', ' ').toUpperCase()}
        dot={false}
      />
    ));
  };

  const handleChartClick = (data: any) => {
    if (!data || !data.activeLabel) return;

    const clickedDate = data.activeLabel;

    if (!firstClickDate) {
      // First click - set start point
      setFirstClickDate(clickedDate);
      setSecondClickDate(null);
      setPreviewDate(null);
    } else {
      // Second click - complete selection
      setSecondClickDate(clickedDate);
      setPreviewDate(null);

      // Determine start and end dates (ensure chronological order)
      const date1 = new Date(firstClickDate);
      const date2 = new Date(clickedDate);

      const startDate = date1 < date2 ? firstClickDate : clickedDate;
      const endDate = date1 < date2 ? clickedDate : firstClickDate;

      // Call parent callback
      if (onDateRangeSelect) {
        onDateRangeSelect(startDate, endDate);
      }

      // Reset selection state
      setFirstClickDate(null);
      setSecondClickDate(null);
    }
  };

  const handleChartMouseMove = (data: any) => {
    if (firstClickDate && data && data.activeLabel) {
      setPreviewDate(data.activeLabel);
    }
  };

  const cancelSelection = () => {
    setFirstClickDate(null);
    setSecondClickDate(null);
    setPreviewDate(null);
  };

  const resetZoom = () => {
    if (onResetZoom) {
      onResetZoom();
    }
  };

  // Get reference lines for selection visualization
  const getReferenceLines = () => {
    const lines = [];

    if (firstClickDate) {
      lines.push(
        <ReferenceLine key="start" x={firstClickDate} stroke="#ff4d4f" strokeWidth={2} strokeDasharray="5 5" />
      );
    }

    if (previewDate && firstClickDate && previewDate !== firstClickDate) {
      lines.push(
        <ReferenceLine key="preview" x={previewDate} stroke="#1890ff" strokeWidth={1} strokeDasharray="3 3" />
      );
    }

    if (secondClickDate) {
      lines.push(
        <ReferenceLine key="end" x={secondClickDate} stroke="#52c41a" strokeWidth={2} strokeDasharray="5 5" />
      );
    }

    return lines;
  };

  return (
    <Card
      title="Price Chart"
      extra={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {firstClickDate && (
            <>
              <Button type="primary" danger size="small" onClick={cancelSelection}>
                Cancel Selection
              </Button>
              <span style={{ fontSize: '12px', color: '#666' }}>Click second point to complete</span>
            </>
          )}
          <Button size="small" onClick={resetZoom}>
            Reset Zoom
          </Button>
        </div>
      }>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            onClick={handleChartClick}
            onMouseMove={handleChartMouseMove}
            style={{ cursor: firstClickDate ? 'crosshair' : 'pointer' }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={(value) => {
                if (value.includes(' ')) {
                  const [date, time] = value.split(' ');
                  const [year, month, day] = date.split('-');
                  return `${month}/${day} ${time}`;
                } else {
                  const [year, month, day] = value.split('-');
                  return `${month}/${day}`;
                }
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => (value > 1000 ? `${(value / 1000).toFixed(1)}K` : `${value.toFixed(2)}`)}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                return [value.toLocaleString(), name];
              }}
              labelFormatter={(label) => {
                if (typeof label === 'string' && label.includes(' ')) {
                  const [date, time] = label.split(' ');
                  return `${date} at ${time}`;
                }
                return label;
              }}
            />
            <Legend />
            {getChartLines()}
            {getReferenceLines()}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          No chart data available
        </div>
      )}
    </Card>
  );
};

export default PriceChart;
