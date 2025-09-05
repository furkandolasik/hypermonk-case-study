import DynamoDB from '@hypermonkcase/repository/DynamoDB';
import CoinService, { Coin } from './services/CoinService';

interface K {
  id: string;
}

const keyExtractor = (item: any) => {
  return {
    id: item.id!,
    createdAt: item.createdAt!,
  };
};

const repositories = {
  coins: DynamoDB.from<K, Coin>(
    {
      tableName: 'Coins',
    },
    keyExtractor
  ),
};

export const coinService = CoinService.create(repositories);
