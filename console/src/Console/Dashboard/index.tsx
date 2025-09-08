import React, { useState, useEffect } from 'react';
import { Spin, message, Typography, Tabs } from 'antd';
import dayjs from 'dayjs';
import api from '../../api';
import ConsoleLayout from '../Layout/ConsoleLayout';
import PriceFilters from './PriceFilters';
import PriceChart from './PriceChart';
import PriceTable from './PriceTable';

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

interface Coin {
  id: string;
  name: string;
}

interface Currency {
  code: string;
  name: string;
}

const CryptoDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<TableDataPoint[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const [availableCoins, setAvailableCoins] = useState<Coin[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);

  const [filters, setFilters] = useState<DashboardFilters>({
    coins: [],
    currencies: [],
    dateRange: [dayjs().subtract(7, 'days'), dayjs()],
    breakdownDimensions: ['date'],
  });

  useEffect(() => {
    fetchAvailableOptions();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchAvailableOptions = async () => {
    try {
      const [coinsRes, currenciesRes] = await Promise.all([api.get('/v1/coins'), api.get('/v1/currencies')]);

      if (coinsRes.data.success) {
        setAvailableCoins(coinsRes.data.data);

        const defaultCoins = coinsRes.data.data.slice(0, 2).map((coin: Coin) => coin.id);
        setFilters((prev) => ({
          ...prev,
          coins: defaultCoins,
        }));
      }

      if (currenciesRes.data.success) {
        setAvailableCurrencies(currenciesRes.data.data);

        const allCurrencies = currenciesRes.data.data.map((c: Currency) => c.code);
        const defaultCurrencies = ['usd', 'try'].filter((code) => allCurrencies.includes(code));
        if (defaultCurrencies.length === 0) {
          defaultCurrencies.push(allCurrencies[0]);
        }

        setFilters((prev) => ({
          ...prev,
          currencies: defaultCurrencies,
        }));
      }
    } catch (error) {
      message.error('Failed to fetch available options');
      console.error('Error fetching options:', error);
    }
  };

  const fetchData = async () => {
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
        message.error('Failed to fetch data');
      }
    } catch (error) {
      message.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareTableData = (data: ProcessedDataPoint[]) => {
    if (data.length === 0) {
      setTableData([]);
      return;
    }

    const isDateOnly = filters.breakdownDimensions.length === 1 && filters.breakdownDimensions[0] === 'date';

    if (isDateOnly) {
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
      const tableRows: TableDataPoint[] = data.map((item, index) => {
        const row: TableDataPoint = {
          key: `${item.date}_${item.coin || 'agg'}_${item.currency || 'agg'}_${index}`,
          date: item.date.split(' ')[0],
          price: item.price,
        };

        if (filters.breakdownDimensions.includes('coin')) {
          const coin = availableCoins.find((c) => c.id === item.coin);
          row.coin = coin ? coin.name : item.coin;
        }

        if (filters.breakdownDimensions.includes('currency')) {
          const currency = availableCurrencies.find((c) => c.code === item.currency);
          row.currency = currency ? currency.name : item.currency?.toUpperCase();
        }

        return row;
      });

      setTableData(tableRows);
    }
  };

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

      let lineKey = '';
      if (item.coin) {
        const coin = availableCoins.find((c) => c.id === item.coin);
        lineKey = coin ? coin.name : item.coin;
      } else if (item.aggregatedCoins) {
        const coinNames = item.aggregatedCoins.map((coinId) => {
          const coin = availableCoins.find((c) => c.id === coinId);
          return coin ? coin.name : coinId;
        });
        lineKey = `Avg(${coinNames.join(',')})`;
      }

      if (item.currency) {
        const currency = availableCurrencies.find((c) => c.code === item.currency);
        const currencyName = currency ? currency.name : item.currency.toUpperCase();
        lineKey = lineKey ? `${lineKey}_${currencyName}` : currencyName;
      } else if (item.aggregatedCurrencies) {
        const currencyNames = item.aggregatedCurrencies.map((currencyCode) => {
          const currency = availableCurrencies.find((c) => c.code === currencyCode);
          return currency ? currency.name : currencyCode.toUpperCase();
        });
        const currencyPart = `Avg(${currencyNames.join(',')})`;
        lineKey = lineKey ? `${lineKey}_${currencyPart}` : currencyPart;
      }

      if (!lineKey) {
        lineKey = 'Average Price';
      }

      groupedByDate.get(date)!.set(lineKey, item.price);
    });

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

  const handleDateRangeSelect = (startDate: string, endDate: string) => {
    const newStartDate = dayjs(startDate.split(' ')[0]);
    const newEndDate = dayjs(endDate.split(' ')[0]);

    setFilters((prev) => ({
      ...prev,
      dateRange: [newStartDate, newEndDate],
    }));
  };

  const handleResetZoom = () => {
    const newDateRange: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs().subtract(7, 'days'), dayjs()];

    setFilters((prev) => ({
      ...prev,
      dateRange: newDateRange,
    }));
  };

  return (
    <ConsoleLayout
      content={
        <div style={{ padding: '12px', width: '100%' }}>
          <PriceFilters
            filters={filters}
            availableCoins={availableCoins}
            availableCurrencies={availableCurrencies}
            onFilterChange={handleFilterChange}
          />

          <Spin spinning={loading}>
            <Tabs defaultActiveKey="chart" type="card">
              <Tabs.TabPane tab="Chart" key="chart">
                <PriceChart
                  chartData={chartData}
                  currencies={filters.currencies}
                  onDateRangeSelect={handleDateRangeSelect}
                  onResetZoom={handleResetZoom}
                />
              </Tabs.TabPane>

              <Tabs.TabPane tab="Table" key="table">
                <PriceTable tableData={tableData} breakdownDimensions={filters.breakdownDimensions} />
              </Tabs.TabPane>
            </Tabs>
          </Spin>
        </div>
      }
    />
  );
};

export default CryptoDashboard;
