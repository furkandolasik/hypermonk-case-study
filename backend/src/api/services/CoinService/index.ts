import Repository from '@hypermonkcase/repository';
import IdGenerator from '@hypermonkcase/idgen';
import { Coin } from './entities';

type CoinRepositories = {
  coins: Repository<{ id: string }, Omit<Coin, 'id'>>;
};

class CoinService {
  coins: Repository<{ id: string }, Omit<Coin, 'id'>>;
  idGenerator: IdGenerator;

  constructor(repos: CoinRepositories) {
    this.coins = repos.coins;
    this.idGenerator = IdGenerator.create();
  }

  static create(repos: CoinRepositories) {
    return new CoinService(repos);
  }

  async read(id: string) {
    return await this.coins.get({ id });
  }
}

export default CoinService;

export * from './entities';
