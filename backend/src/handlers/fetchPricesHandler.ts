import DynamoDB from '@hypermonkcase/repository/DynamoDB';
import PriceDataService, { PriceData } from '../api/services/PriceDataService';

export const handler = async () => {
  console.log('Fetching prices...');

  const priceDataRepo = DynamoDB.from<{ coin_id: string; timestamp_currency: string }, PriceData>(
    {
      tableName: process.env.PRICE_DATA_TABLE!,
    },
    (item) => ({
      coin_id: item.coin_id,
      timestamp_currency: item.timestamp_currency,
    })
  );

  const priceDataService = PriceDataService.create({
    priceData: priceDataRepo,
  });

  const coins = ['bitcoin', 'ethereum'];
  const currencies = ['usd', 'eur', 'try'];

  const items = await priceDataService.fetchAndStorePrices(coins, currencies);

  console.log(`Prices updated: ${items.length}`);
  return { success: true, count: items.length };
};
