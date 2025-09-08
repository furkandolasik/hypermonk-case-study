import DynamoDB from '@hypermonkcase/repository/DynamoDB';
import PriceDataService, { PriceData } from './services/PriceDataService';
import CoinService, { Coin } from './services/CoinService';
import CurrencyService, { Currency } from './services/CurrencyService';

interface PriceDataKey {
  coin_id: string;
  timestamp_currency: string;
}

interface CoinKey {
  id: string;
}

interface CurrencyKey {
  code: string;
}

const priceDataKeyExtractor = (item: PriceData): PriceDataKey => {
  return {
    coin_id: item.coin_id!,
    timestamp_currency: item.timestamp_currency!,
  };
};

const coinKeyExtractor = (item: Coin): CoinKey => {
  return {
    id: item.id!,
  };
};

const currencyKeyExtractor = (item: Currency): CurrencyKey => {
  return {
    code: item.code!,
  };
};

// Repository definitions
const repositories = {
  priceData: DynamoDB.from<PriceDataKey, PriceData>(
    {
      tableName: process.env.PRICE_DATA_TABLE || 'hypermonk-PriceData',
      indexes: {
        'currency-timestamp_currency-index': {
          partitionKey: 'currency',
          rangeKey: 'timestamp_currency',
        },
        'timestamp-coin_id-index': {
          partitionKey: 'timestamp',
          rangeKey: 'coin_id',
        },
      },
    },
    priceDataKeyExtractor
  ),
  coin: DynamoDB.from<CoinKey, Coin>(
    {
      tableName: process.env.COIN_TABLE || 'hypermonk-Coin',
    },
    coinKeyExtractor
  ),
  currency: DynamoDB.from<CurrencyKey, Currency>(
    {
      tableName: process.env.CURRENCY_TABLE || 'hypermonk-Currency',
    },
    currencyKeyExtractor
  ),
};

// Service exports
export const priceDataService = PriceDataService.create(repositories);
export const coinService = CoinService.create(repositories);
export const currencyService = CurrencyService.create(repositories);

export { repositories };
