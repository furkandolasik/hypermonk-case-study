import Repository from '@hypermonkcase/repository';
import { Currency } from './entities';

class CurrencyService {
  constructor(private readonly repos: { currency: Repository<{ code: string }, Currency> }) {}

  static create(repos: { currency: Repository<{ code: string }, Currency> }) {
    return new CurrencyService(repos);
  }

  async getAllCurrencies(): Promise<Currency[]> {
    try {
      const result = await this.repos.currency.query({});
      return result.items.map((item) => item.value);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      return [];
    }
  }
}

export default CurrencyService;
export * from './entities';
