import React from 'react';
import { Card } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface PriceChartProps {
  chartData: ChartDataPoint[];
  currencies: string[];
}

const PriceChart: React.FC<PriceChartProps> = ({ chartData, currencies }) => {
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
      />
    ));
  };

  return (
    <Card title="Price Chart">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
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
              tickFormatter={(value) => (value > 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value.toFixed(2)}`)}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const primaryCurrency = currencies.includes('usd') ? 'usd' : currencies[0];
                const symbol = primaryCurrency === 'try' ? '₺' : '$';
                return [`${symbol}${value.toLocaleString()}`, name];
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
