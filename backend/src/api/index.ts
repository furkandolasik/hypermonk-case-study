import DynamoDB from '@hypermonkcase/repository/DynamoDB';
import PriceDataService, { PriceData } from './services/PriceDataService';

interface PriceDataKey {
  coin_id: string;
  timestamp_currency: string; // Format: "2024-01-01T12:00:00Z_USD"
}

const priceDataKeyExtractor = (item: PriceData): PriceDataKey => {
  return {
    coin_id: item.coin_id!,
    timestamp_currency: item.timestamp_currency!, // This combines timestamp + currency
  };
};

// Repository definitions
const repositories = {
  priceData: DynamoDB.from<PriceDataKey, PriceData>(
    {
      tableName: process.env.PRICE_DATA_TABLE || 'hypermonk-PriceData',
      indexes: {
        // GSI for querying by currency
        'currency-timestamp_currency-index': {
          partitionKey: 'currency',
          rangeKey: 'timestamp_currency',
        },
        // GSI for querying by timestamp across all coins
        'timestamp-coin_id-index': {
          partitionKey: 'timestamp',
          rangeKey: 'coin_id',
        },
      },
    },
    priceDataKeyExtractor
  ),
};

// Service exports
export const priceDataService = PriceDataService.create(repositories);

export { repositories };
