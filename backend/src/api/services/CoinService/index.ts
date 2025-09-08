import Repository from '@hypermonkcase/repository';
import { Coin } from './entities';

class CoinService {
  constructor(private readonly repos: { coin: Repository<{ id: string }, Coin> }) {}

  static create(repos: { coin: Repository<{ id: string }, Coin> }) {
    return new CoinService(repos);
  }

  async getAllCoins(): Promise<Coin[]> {
    try {
      const result = await this.repos.coin.query({});
      return result.items.map((item) => item.value);
    } catch (error) {
      console.error('Error fetching coins:', error);
      return [];
    }
  }
}

export default CoinService;
export * from './entities';
