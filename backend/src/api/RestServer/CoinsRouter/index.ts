import { Request, Response, Router } from 'express';
import CoinService from '../../services/CoinService';

interface CoinsRouterServices {
  coinService: CoinService;
}

class CoinsRouter {
  constructor(private readonly services: CoinsRouterServices) {}

  static create(services: CoinsRouterServices): CoinsRouter {
    return new CoinsRouter(services);
  }

  async getCoins(req: Request, res: Response) {
    try {
      const coins = await this.services.coinService.getAllCoins();

      return res.status(200).json({
        success: true,
        data: coins.map((coin) => ({
          id: coin.id,
          name: coin.name,
        })),
      });
    } catch (err) {
      return res.status(500).json(this.handleError(err));
    }
  }

  private handleError(err: any) {
    console.error('CoinsRouter error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    };
  }

  getRouter(): Router {
    const router = Router();
    router.get('/', (req, res) => this.getCoins(req, res));
    return router;
  }
}

export default CoinsRouter;
