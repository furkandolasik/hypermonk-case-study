import Repository from '@hypermonkcase/repository';
import axios from 'axios';
import { PriceData } from './entities';

interface ProcessedDataPoint {
  date: string;
  coin?: string;
  currency?: string;
  price: number;
  sourceRecords?: number;
  aggregatedCoins?: string[];
  aggregatedCurrencies?: string[];
}

class PriceDataService {
  constructor(
    private readonly repos: { priceData: Repository<{ coin_id: string; timestamp_currency: string }, PriceData> }
  ) {}

  static create(repos: { priceData: Repository<{ coin_id: string; timestamp_currency: string }, PriceData> }) {
    return new PriceDataService(repos);
  }

  async getPriceHistory(params: {
    coins?: string[];
    currencies?: string[];
    from?: string;
    to?: string;
    breakdownDimensions?: string[];
  }) {
    const { coins, currencies, from, to, breakdownDimensions = ['date'] } = params;

    if (!coins || coins.length === 0) {
      throw new Error('At least one coin must be specified');
    }

    if (!currencies || currencies.length === 0) {
      throw new Error('At least one currency must be specified');
    }

    // Fetch raw data for all coin-currency combinations
    const rawData: PriceData[] = [];

    for (const coin of coins) {
      try {
        const queryResult = await this.repos.priceData.query({
          index: 'coin_id',
          partition: coin,
          filter: this.buildFilterPredicate({ currencies, from, to }),
        });

        rawData.push(...queryResult.items.map((item) => item.value));
      } catch (error) {
        console.error(`Error fetching data for coin ${coin}:`, error);
      }
    }

    if (rawData.length === 0) {
      return [];
    }

    // Process the raw data based on breakdown dimensions
    return this.processDataForAPI(rawData, breakdownDimensions, from, to);
  }

  private processDataForAPI(
    rawData: PriceData[],
    breakdownDimensions: string[],
    fromDate?: string,
    toDate?: string
  ): ProcessedDataPoint[] {
    if (rawData.length === 0) return [];

    const daysDiff =
      fromDate && toDate
        ? Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))
        : 7;
    const useHourly = daysDiff <= 2;

    const groups = new Map<string, PriceData[]>();

    rawData.forEach((item) => {
      const date = new Date(item.timestamp);
      const timeKey = useHourly
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
            2,
            '0'
          )} ${String(date.getHours()).padStart(2, '0')}:00`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
            2,
            '0'
          )}`;

      const keyParts = [timeKey];

      if (breakdownDimensions.includes('coin')) {
        keyParts.push(item.coin_id);
      }
      if (breakdownDimensions.includes('currency')) {
        keyParts.push(item.currency);
      }

      const groupKey = keyParts.join('|');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });

    const processedData: ProcessedDataPoint[] = [];

    groups.forEach((items, groupKey) => {
      const keyParts = groupKey.split('|');
      const timeKey = keyParts[0];

      const avgPrice = items.reduce((sum, item) => sum + item.price, 0) / items.length;

      const dataPoint: ProcessedDataPoint = {
        date: timeKey,
        price: avgPrice,
      };

      let partIndex = 1;
      if (breakdownDimensions.includes('coin')) {
        dataPoint.coin = keyParts[partIndex];
        partIndex++;
      }
      if (breakdownDimensions.includes('currency')) {
        dataPoint.currency = keyParts[partIndex];
        partIndex++;
      }

      dataPoint.sourceRecords = items.length;

      if (!breakdownDimensions.includes('coin')) {
        const uniqueCoins = Array.from(new Set(items.map((i) => i.coin_id)));
        dataPoint.aggregatedCoins = uniqueCoins;
      }
      if (!breakdownDimensions.includes('currency')) {
        const uniqueCurrencies = Array.from(new Set(items.map((i) => i.currency)));
        dataPoint.aggregatedCurrencies = uniqueCurrencies;
      }

      processedData.push(dataPoint);
    });

    processedData.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;

      if (a.coin && b.coin) {
        const coinCompare = a.coin.localeCompare(b.coin);
        if (coinCompare !== 0) return coinCompare;
      }

      if (a.currency && b.currency) {
        return a.currency.localeCompare(b.currency);
      }

      return 0;
    });

    return processedData;
  }

  private buildFilterPredicate(params: { currencies?: string[]; from?: string; to?: string }) {
    const conditions = [];

    if (params.currencies && params.currencies.length > 0) {
      if (params.currencies.length === 1) {
        conditions.push({
          operator: '=' as const,
          lhs: { name: 'currency' },
          rhs: params.currencies[0],
        });
      } else {
        const currencyConditions = params.currencies.map((currency) => ({
          operator: '=' as const,
          lhs: { name: 'currency' },
          rhs: currency,
        }));

        conditions.push({
          operator: 'OR' as const,
          predicates: currencyConditions,
        });
      }
    }

    if (params.from) {
      conditions.push({
        operator: '>=' as const,
        lhs: { name: 'timestamp' },
        rhs: params.from,
      });
    }

    if (params.to) {
      conditions.push({
        operator: '<=' as const,
        lhs: { name: 'timestamp' },
        rhs: params.to,
      });
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];

    return {
      operator: 'AND' as const,
      predicates: conditions,
    };
  }

  async fetchAndStorePrices(coins: string[], currencies: string[]) {
    const items = [];

    for (const currency of currencies) {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: currency,
            ids: coins.join(','),
            order: 'market_cap_desc',
            per_page: 250,
            page: 1,
          },
          headers: {
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY,
          },
        });

        for (const market of response.data) {
          const timestamp = new Date().toISOString();
          const priceData: PriceData = {
            coin_id: market.id,
            timestamp_currency: `${timestamp}#${currency}`,
            currency: currency,
            timestamp: timestamp,
            price: market.current_price,
          };

          await this.repos.priceData.put(
            { coin_id: market.id, timestamp_currency: `${timestamp}#${currency}` },
            priceData
          );

          items.push(priceData);
        }
      } catch (error) {
        console.error(`Error fetching market data for ${currency}:`, error);
      }
    }

    return items;
  }

  async fetchHistoricalPrices(coins: string[], currencies: string[], days: number = 30) {
    const items = [];

    console.log(
      `Fetching ${days} days of historical data for ${coins.length} coins and ${currencies.length} currencies`
    );

    for (const coin of coins) {
      for (const currency of currencies) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart`, {
            params: {
              vs_currency: currency,
              days: days,
            },
            headers: {
              'x-cg-demo-api-key': process.env.COINGECKO_API_KEY,
            },
          });

          const { prices } = response.data;

          for (const [timestamp_ms, price] of prices) {
            const timestamp = new Date(timestamp_ms).toISOString();

            const priceData: PriceData = {
              coin_id: coin,
              timestamp_currency: `${timestamp}#${currency}`,
              currency: currency,
              timestamp: timestamp,
              price: price,
            };

            await this.repos.priceData.put(
              { coin_id: coin, timestamp_currency: `${timestamp}#${currency}` },
              priceData
            );

            items.push(priceData);
          }
        } catch (error) {
          console.error(`Error fetching historical data for ${coin}-${currency}:`, error);
        }
      }
    }

    console.log(`Historical data fetch completed: ${items.length} items stored`);
    return items;
  }
}

export default PriceDataService;
export * from './entities';
