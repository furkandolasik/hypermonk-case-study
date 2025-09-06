import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, DatePicker, Checkbox, Table, Spin, message, Typography } from 'antd';
import type { ColumnsType } from 'antd/lib/table';
import dayjs from 'dayjs';
import api from '../../api';
import ConsoleLayout from '../Layout/ConsoleLayout';

const { RangePicker } = DatePicker;
const { Title } = Typography;

interface PriceData {
  coin_id: string;
  currency: string;
  timestamp: string;
  price: number;
}

interface DashboardFilters {
  coins: string[];
  currencies: string[];
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  breakdownDimensions: string[];
}

interface TableDataPoint {
  key: string;
  coin?: string;
  currency?: string;
  date: string;
  price: number;
}

const CryptoDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [tableData, setTableData] = useState<TableDataPoint[]>([]);

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
      const promises = [];

      for (const coin of filters.coins) {
        for (const currency of filters.currencies) {
          const params = new URLSearchParams({
            coin,
            currency,
            from: filters.dateRange[0].toISOString(),
            to: filters.dateRange[1].toISOString(),
          });

          promises.push(api.get(`/v1/prices?${params}`));
        }
      }

      const responses = await Promise.all(promises);
      const allData: PriceData[] = [];

      responses.forEach((response) => {
        if (response.data.success) {
          allData.push(...response.data.data);
        }
      });

      setPriceData(allData);
      processDataForVisualization(allData);
    } catch (error) {
      message.error('Failed to fetch price data');
      console.error('Error fetching price data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDataForVisualization = (data: PriceData[]) => {
    if (data.length === 0) {
      setTableData([]);
      return;
    }

    console.log('Raw data:', data);
    console.log('Breakdown dimensions:', filters.breakdownDimensions);

    const daysDiff = filters.dateRange ? filters.dateRange[1].diff(filters.dateRange[0], 'days') : 0;
    const useHourly = daysDiff <= 2;

    // Check if "Date only" case
    const isDateOnly = filters.breakdownDimensions.length === 1 && filters.breakdownDimensions[0] === 'date';

    if (isDateOnly) {
      // Special handling for "Date only" - create rows with dynamic currency columns
      const groupedByDateAndCoin = new Map<string, Map<string, PriceData>>();

      data.forEach((item) => {
        const date = useHourly
          ? dayjs(item.timestamp).format('YYYY-MM-DD HH:mm')
          : dayjs(item.timestamp).format('YYYY-MM-DD');

        const key = `${date}_${item.coin_id}`;

        if (!groupedByDateAndCoin.has(key)) {
          groupedByDateAndCoin.set(key, new Map());
        }

        groupedByDateAndCoin.get(key)!.set(item.currency, item);
      });

      const tableRows: any[] = [];

      groupedByDateAndCoin.forEach((currencyMap, dateAndCoin) => {
        const [date, coin] = dateAndCoin.split('_');

        const row: any = {
          key: dateAndCoin,
          date,
          coin,
        };

        // Add only price columns for each currency
        filters.currencies.forEach((currency) => {
          const currencyData = currencyMap.get(currency);
          if (currencyData) {
            row[`price_${currency}`] = currencyData.price;
          } else {
            row[`price_${currency}`] = null;
          }
        });

        tableRows.push(row);
      });

      // Sort by date, then by coin
      tableRows.sort((a, b) => {
        const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (a.coin || '').localeCompare(b.coin || '');
      });

      console.log('Date-only table data:', tableRows);
      setTableData(tableRows);
      return;
    }

    // Standard grouping for other cases
    const groupedData = new Map<string, PriceData[]>();

    data.forEach((item) => {
      const date = useHourly
        ? dayjs(item.timestamp).format('YYYY-MM-DD HH:mm')
        : dayjs(item.timestamp).format('YYYY-MM-DD');

      let groupKey = date; // Always include date

      // Add dimensions to group key
      if (filters.breakdownDimensions.includes('coin')) {
        groupKey += `_${item.coin_id}`;
      }

      if (filters.breakdownDimensions.includes('currency')) {
        groupKey += `_${item.currency}`;
      }

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, []);
      }

      groupedData.get(groupKey)!.push(item);
    });

    // Convert grouped data to table rows
    const tableRows: TableDataPoint[] = [];

    groupedData.forEach((items, groupKey) => {
      const firstItem = items[0];
      const date = useHourly
        ? dayjs(firstItem.timestamp).format('YYYY-MM-DD HH:mm')
        : dayjs(firstItem.timestamp).format('YYYY-MM-DD');

      // Calculate average price for the group
      const avgPrice = items.reduce((sum, item) => sum + item.price, 0) / items.length;

      // Determine what to show in coin and currency columns
      let coinDisplay: string | undefined;
      let currencyDisplay: string | undefined;

      if (filters.breakdownDimensions.includes('coin') && filters.breakdownDimensions.includes('currency')) {
        // Show specific coin and currency
        coinDisplay = firstItem.coin_id;
        currencyDisplay = firstItem.currency;
      } else if (filters.breakdownDimensions.includes('coin')) {
        // Show specific coin, aggregate currencies
        coinDisplay = firstItem.coin_id;
        const uniqueCurrencies = Array.from(new Set(items.map((i) => i.currency)));
        currencyDisplay = `Average (${uniqueCurrencies.join(', ')})`;
      } else if (filters.breakdownDimensions.includes('currency')) {
        // Show specific currency, aggregate coins
        const uniqueCoins = Array.from(new Set(items.map((i) => i.coin_id)));
        coinDisplay = `Average (${uniqueCoins.join(', ')})`;
        currencyDisplay = firstItem.currency;
      }

      tableRows.push({
        key: groupKey,
        coin: coinDisplay,
        currency: currencyDisplay,
        date,
        price: avgPrice,
      });
    });

    // Sort by date, then by coin
    tableRows.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.coin || '').localeCompare(b.coin || '');
    });

    console.log('Grouped table data:', tableRows);
    setTableData(tableRows);
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
      {
        title: 'Coin',
        dataIndex: 'coin',
        key: 'coin',
        sorter: (a: any, b: any) => (a.coin || '').localeCompare(b.coin || ''),
      },
    ];

    // For "Date only" breakdown, add dynamic currency price columns
    if (filters.breakdownDimensions.length === 1 && filters.breakdownDimensions[0] === 'date') {
      filters.currencies.forEach((currency) => {
        columns.push({
          title: `${currency.toUpperCase()} Price`,
          dataIndex: `price_${currency}`,
          key: `price_${currency}`,
          sorter: (a: any, b: any) => (a[`price_${currency}`] || 0) - (b[`price_${currency}`] || 0),
          render: (value: number) => (value !== null && value !== undefined ? value.toLocaleString() : 'N/A'),
        });
      });
    } else {
      // Standard columns for other breakdown combinations - only price
      columns.push(
        {
          title: 'Currency',
          dataIndex: 'currency',
          key: 'currency',
          sorter: (a: any, b: any) => (a.currency || '').localeCompare(b.currency || ''),
        },
        {
          title: 'Price',
          dataIndex: 'price',
          key: 'price',
          sorter: (a: any, b: any) => a.price - b.price,
          render: (value: number) => value?.toLocaleString(),
        }
      );
    }

    return columns;
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
            <Row gutter={[24, 24]}>
              <Col span={24}>
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
              </Col>
            </Row>
          </Spin>
        </div>
      }
    />
  );
};

export default CryptoDashboard;
