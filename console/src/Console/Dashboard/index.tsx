import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, DatePicker, Checkbox, Table, Spin, message, Typography, Tabs } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ColumnsType } from 'antd/lib/table';
import dayjs from 'dayjs';
import api from '../../api';
import ConsoleLayout from '../Layout/ConsoleLayout';

const { RangePicker } = DatePicker;
const { Title } = Typography;

// Updated interface for processed data from API
interface ProcessedDataPoint {
  date: string;
  coin?: string;
  currency?: string;
  price: number;
  sourceRecords?: number;
  aggregatedCoins?: string[];
  aggregatedCurrencies?: string[];
}

interface DashboardFilters {
  coins: string[];
  currencies: string[];
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  breakdownDimensions: string[];
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface TableDataPoint {
  key: string;
  coin?: string;
  currency?: string;
  date: string;
  price: number;
  [key: string]: any;
}

const CryptoDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<TableDataPoint[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const [availableCoins, setAvailableCoins] = useState<string[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);

  const [filters, setFilters] = useState<DashboardFilters>({
    coins: ['bitcoin', 'ethereum'],
    currencies: ['usd', 'try'],
    dateRange: [dayjs().subtract(7, 'days'), dayjs()],
    breakdownDimensions: ['date'],
  });

  useEffect(() => {
    fetchAvailableOptions();
  }, []);

  useEffect(() => {
    fetchPriceData();
  }, [filters]);

  const fetchAvailableOptions = async () => {
    try {
      const [coinsRes, currenciesRes] = await Promise.all([
        api.get('/v1/prices/coins'),
        api.get('/v1/prices/currencies'),
      ]);

      if (coinsRes.data.success) {
        setAvailableCoins(coinsRes.data.data.map((coin: any) => coin.id));
      }

      if (currenciesRes.data.success) {
        setAvailableCurrencies(currenciesRes.data.data.map((currency: any) => currency.code));
      }
    } catch (error) {
      message.error('Failed to fetch available options');
      console.error('Error fetching options:', error);
    }
  };

  const fetchPriceData = async () => {
    if (!filters.dateRange || filters.coins.length === 0 || filters.currencies.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        coins: filters.coins.join(','),
        currencies: filters.currencies.join(','),
        from: filters.dateRange[0].toISOString(),
        to: filters.dateRange[1].toISOString(),
        breakdownDimensions: filters.breakdownDimensions.join(','),
      });

      const response = await api.get(`/v1/prices?${params}`);

      if (response.data.success) {
        const apiData = response.data.data;
        prepareTableData(apiData);
        prepareChartData(apiData);
      } else {
        message.error('Failed to fetch price data');
      }
    } catch (error) {
      message.error('Failed to fetch price data');
      console.error('Error fetching price data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare table data from processed API data
  const prepareTableData = (data: ProcessedDataPoint[]) => {
    if (data.length === 0) {
      setTableData([]);
      return;
    }

    const isDateOnly = filters.breakdownDimensions.length === 1 && filters.breakdownDimensions[0] === 'date';

    if (isDateOnly) {
      // For date-only, group by date
      const groupedByDate = new Map<string, Map<string, ProcessedDataPoint>>();

      data.forEach((item) => {
        const date = item.date.split(' ')[0];

        if (!groupedByDate.has(date)) {
          groupedByDate.set(date, new Map());
        }

        const coinKey = item.aggregatedCoins ? item.aggregatedCoins.join(',') : 'Unknown';
        groupedByDate.get(date)!.set(coinKey, item);
      });

      const tableRows: TableDataPoint[] = [];

      groupedByDate.forEach((coinMap, date) => {
        coinMap.forEach((item, coinKey) => {
          const row: TableDataPoint = {
            key: `${date}_${coinKey}`,
            date,
            price: item.price,
          };

          // Only add fields for selected breakdown dimensions
          if (filters.breakdownDimensions.includes('coin')) {
            row.coin = coinKey;
          }

          if (filters.breakdownDimensions.includes('currency')) {
            row.currency = item.currency;
          }

          tableRows.push(row);
        });
      });

      setTableData(tableRows);
    } else {
      // Standard table for other breakdown combinations
      const tableRows: TableDataPoint[] = data.map((item, index) => {
        const row: TableDataPoint = {
          key: `${item.date}_${item.coin || 'agg'}_${item.currency || 'agg'}_${index}`,
          date: item.date.split(' ')[0],
          price: item.price,
        };

        // Only add fields for selected breakdown dimensions
        if (filters.breakdownDimensions.includes('coin')) {
          row.coin = item.coin;
        }

        if (filters.breakdownDimensions.includes('currency')) {
          row.currency = item.currency;
        }

        return row;
      });

      setTableData(tableRows);
    }
  };

  // Prepare chart data from processed API data
  const prepareChartData = (data: ProcessedDataPoint[]) => {
    if (data.length === 0) {
      setChartData([]);
      return;
    }

    const groupedByDate = new Map<string, Map<string, number>>();

    data.forEach((item) => {
      const date = item.date;

      if (!groupedByDate.has(date)) {
        groupedByDate.set(date, new Map());
      }

      // Create line key based on breakdown dimensions
      let lineKey = '';
      if (item.coin) {
        lineKey = item.coin;
      } else if (item.aggregatedCoins) {
        lineKey = `Avg(${item.aggregatedCoins.join(',')})`;
      }

      if (item.currency) {
        lineKey = lineKey ? `${lineKey}_${item.currency}` : item.currency;
      } else if (item.aggregatedCurrencies) {
        const currencyPart = `Avg(${item.aggregatedCurrencies.join(',')})`;
        lineKey = lineKey ? `${lineKey}_${currencyPart}` : currencyPart;
      }

      if (!lineKey) {
        lineKey = 'Average Price';
      }

      groupedByDate.get(date)!.set(lineKey, item.price);
    });

    // Convert to chart format
    const chartRows: ChartDataPoint[] = [];

    groupedByDate.forEach((lineMap, date) => {
      const row: ChartDataPoint = { date };

      lineMap.forEach((price, lineKey) => {
        row[lineKey] = price;
      });

      chartRows.push(row);
    });

    chartRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setChartData(chartRows);
  };

  const handleFilterChange = (filterType: keyof DashboardFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const getTableColumns = (): ColumnsType<any> => {
    const columns: ColumnsType<any> = [
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
    ];

    // Only show columns for selected breakdown dimensions
    if (filters.breakdownDimensions.includes('coin')) {
      columns.push({
        title: 'Coin',
        dataIndex: 'coin',
        key: 'coin',
        sorter: (a: any, b: any) => (a.coin || '').localeCompare(b.coin || ''),
      });
    }

    if (filters.breakdownDimensions.includes('currency')) {
      columns.push({
        title: 'Currency',
        dataIndex: 'currency',
        key: 'currency',
        sorter: (a: any, b: any) => (a.currency || '').localeCompare(b.currency || ''),
      });
    }

    columns.push({
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a: any, b: any) => (a.price || 0) - (b.price || 0),
      render: (value: number) => {
        if (value === null || value === undefined || isNaN(value)) return 'N/A';
        return value.toLocaleString();
      },
    });

    return columns;
  };

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
    <ConsoleLayout
      content={
        <div style={{ padding: '24px', width: '100%' }}>
          <Title level={2} style={{ color: 'white' }}>
            Cryptocurrency Price Dashboard
          </Title>

          <Card title="Filters" style={{ marginBottom: '24px' }}>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <label>Coins:</label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Select coins"
                  value={filters.coins}
                  onChange={(value) => handleFilterChange('coins', value)}
                  options={availableCoins.map((coin) => ({ label: coin.toUpperCase(), value: coin }))}
                />
              </Col>

              <Col span={6}>
                <label>Currencies:</label>
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Select currencies"
                  value={filters.currencies}
                  onChange={(value) => handleFilterChange('currencies', value)}
                  options={availableCurrencies.map((currency) => ({
                    label: currency.toUpperCase(),
                    value: currency,
                  }))}
                />
              </Col>

              <Col span={6}>
                <label>Date Range:</label>
                <RangePicker
                  style={{ width: '100%' }}
                  value={filters.dateRange}
                  onChange={(dates) => handleFilterChange('dateRange', dates)}
                />
              </Col>

              <Col span={6}>
                <label>Breakdown Dimensions:</label>
                <Checkbox.Group
                  style={{ width: '100%' }}
                  value={filters.breakdownDimensions}
                  onChange={(values) => handleFilterChange('breakdownDimensions', values)}>
                  <div>
                    <Checkbox value="coin">Coin</Checkbox>
                    <Checkbox value="currency">Currency</Checkbox>
                    <Checkbox value="date">Date</Checkbox>
                  </div>
                </Checkbox.Group>
              </Col>
            </Row>
          </Card>

          <Spin spinning={loading}>
            <Tabs defaultActiveKey="chart" type="card">
              <Tabs.TabPane tab="Chart" key="chart">
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
                          tickFormatter={(value) =>
                            value > 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value.toFixed(2)}`
                          }
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const primaryCurrency = filters.currencies.includes('usd') ? 'usd' : filters.currencies[0];
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
              </Tabs.TabPane>

              <Tabs.TabPane tab="Table" key="table">
                <Card title="Price Data Table">
                  <Table
                    columns={getTableColumns()}
                    dataSource={tableData}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                    }}
                    scroll={{ x: 800 }}
                  />
                </Card>
              </Tabs.TabPane>
            </Tabs>
          </Spin>
        </div>
      }
    />
  );
};

export default CryptoDashboard;
