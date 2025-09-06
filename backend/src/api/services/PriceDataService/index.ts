import Repository from '@hypermonkcase/repository';
import axios from 'axios';
import { PriceData } from './entities';

class PriceDataService {
  constructor(
    private readonly repos: { priceData: Repository<{ coin_id: string; timestamp_currency: string }, PriceData> }
  ) {}

  static create(repos: { priceData: Repository<{ coin_id: string; timestamp_currency: string }, PriceData> }) {
    return new PriceDataService(repos);
  }

  // Get price history for frontend API
  async getPriceHistory(params: { coin?: string; currency?: string; from?: string; to?: string }) {
    const { coin, currency, from, to } = params;
    // If coin is specified, use primary key query
    if (coin) {
      const queryResult = await this.repos.priceData.query({
        index: 'coin_id', // primary partition key
        partition: coin,
        filter: this.buildFilterPredicate({ currency, from, to }),
      });

      return queryResult.items.map((item) => item.value);
    }

    // If currency is specified but not coin, use GSI
    if (currency && !coin) {
      const queryResult = await this.repos.priceData.query({
        index: 'currency-timestamp_currency-index',
        partition: currency,
        filter: this.buildFilterPredicate({ from, to }),
      });

      return queryResult.items.map((item) => item.value);
    }

    // If no primary filters, scan with filter
    const scanResult = await this.repos.priceData.query({
      filter: this.buildFilterPredicate({ currency, from, to }),
    });

    return scanResult.items.map((item) => item.value);
  }

  // Build filter predicate using the adapter's filter system
  private buildFilterPredicate(params: { currency?: string; from?: string; to?: string }) {
    const conditions = [];

    if (params.currency) {
      conditions.push({
        operator: '=' as const,
        lhs: { name: 'currency' },
        rhs: params.currency,
      });
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

    // Combine multiple conditions with AND
    return {
      operator: 'AND' as const,
      predicates: conditions,
    };
  }

  // Existing method for fetching and storing from CoinGecko
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
            sparkline: false,
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
            market_cap: market.market_cap,
            volume_24h: market.total_volume,
            price_change_24h: market.price_change_percentage_24h,
            granularity: 'hourly',
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
}

export default PriceDataService;

export * from './entities';
