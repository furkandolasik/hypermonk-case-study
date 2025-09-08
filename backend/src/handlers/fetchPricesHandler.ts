import DynamoDB from '@hypermonkcase/repository/DynamoDB';
import PriceDataService, { PriceData } from '../api/services/PriceDataService';
import CoinService, { Coin } from '../api/services/CoinService';
import CurrencyService, { Currency } from '../api/services/CurrencyService';

export const handler = async (event: any) => {
  console.log('Fetching prices...');

  // Repository setup
  const priceDataRepo = DynamoDB.from<{ coin_id: string; timestamp_currency: string }, PriceData>(
    {
      tableName: process.env.PRICE_DATA_TABLE!,
    },
    (item) => ({
      coin_id: item.coin_id,
      timestamp_currency: item.timestamp_currency,
    })
  );

  const coinRepo = DynamoDB.from<{ id: string }, Coin>(
    {
      tableName: process.env.COIN_TABLE!,
    },
    (item) => ({
      id: item.id,
    })
  );

  const currencyRepo = DynamoDB.from<{ code: string }, Currency>(
    {
      tableName: process.env.CURRENCY_TABLE!,
    },
    (item) => ({
      code: item.code,
    })
  );

  // Service setup
  const priceDataService = PriceDataService.create({
    priceData: priceDataRepo,
  });

  const coinService = CoinService.create({
    coin: coinRepo,
  });

  const currencyService = CurrencyService.create({
    currency: currencyRepo,
  });

  try {
    const [allCoins, allCurrencies] = await Promise.all([
      coinService.getAllCoins(),
      currencyService.getAllCurrencies(),
    ]);

    const coinIds = allCoins.map((coin) => coin.id);
    const currencyCodes = allCurrencies.map((currency) => currency.code);

    if (coinIds.length === 0 || currencyCodes.length === 0) {
      console.warn('No coins or currencies found in database');
      return {
        success: false,
        error: 'No coins or currencies found in database',
      };
    }

    if (event.action === 'fetch-historical') {
      const coins = event.coins || coinIds;
      const currencies = event.currencies || currencyCodes;
      const days = event.days || 30;

      const result = await priceDataService.fetchHistoricalPrices(coins, currencies, days);
      return {
        success: true,
        message: `${result.length} historical records stored`,
        coins: coins.length,
        currencies: currencies.length,
        days,
      };
    }

    const items = await priceDataService.fetchAndStorePrices(coinIds, currencyCodes);

    return {
      success: true,
      count: items.length,
      coins: coinIds.length,
      currencies: currencyCodes.length,
    };
  } catch (error) {
    console.error('Error in price fetching:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
