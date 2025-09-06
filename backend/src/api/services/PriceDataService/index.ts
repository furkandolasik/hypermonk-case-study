import Repository from '@hypermonkcase/repository';
import IdGenerator from '@hypermonkcase/idgen';
import { PriceData } from './entities';
import axios from 'axios';

type PriceDataRepositories = {
  priceData: Repository<
    { coin_id: string; timestamp_currency: string },
    Omit<PriceData, 'coin_id' | 'timestamp_currency'>
  >;
};

class PriceDataService {
  priceData: Repository<
    { coin_id: string; timestamp_currency: string },
    Omit<PriceData, 'coin_id' | 'timestamp_currency'>
  >;
  idGenerator: IdGenerator;

  constructor(repos: PriceDataRepositories) {
    this.priceData = repos.priceData;
    this.idGenerator = IdGenerator.create();
  }

  static create(repos: PriceDataRepositories) {
    return new PriceDataService(repos);
  }

  async read(coin_id: string, timestamp_currency: string) {
    return await this.priceData.get({ coin_id, timestamp_currency });
  }

  async fetchAndStorePrices(coins: string[], currencies: string[]) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=${currencies.join(
      ','
    )}`;

    const response = await axios.get(url);
    const data = response.data;
    console.log('Fetched data:', data);
    const timestamp = Date.now().toString();

    const items = [];
    for (const coin of coins) {
      for (const currency of currencies) {
        items.push({
          key: {
            coin_id: coin,
            timestamp_currency: `${timestamp}#${currency}`,
          },
          value: {
            coin_id: coin,
            currency,
            timestamp,
            price: data[coin][currency],
          },
        });
      }
    }

    await this.priceData.putMany(items);
    return items;
  }
}

export default PriceDataService;

export * from './entities';
