import DynamoDB from '@hypermonkcase/repository/DynamoDB';
import PriceDataService, { PriceData } from '../api/services/PriceDataService';

export const handler = async (event: any) => {
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

  if (event.action === 'fetch-historical') {
    const coins = event.coins || ['bitcoin', 'ethereum', 'dogecoin'];
    const currencies = event.currencies || ['usd', 'try'];
    const days = event.days || 30;

    const result = await priceDataService.fetchHistoricalPrices(coins, currencies, days);
    return { success: true, message: `${result.length} historical records stored` };
  }

  const coins = ['bitcoin', 'ethereum'];
  const currencies = ['usd', 'eur', 'try'];

  const items = await priceDataService.fetchAndStorePrices(coins, currencies);

  console.log(`Prices updated: ${items.length}`);
  return { success: true, count: items.length };
};
