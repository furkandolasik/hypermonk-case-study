import { Request, Response, Router } from 'express';
import CoinService from '../../services/CoinService';

interface CoinRouterServices {
  coinService: CoinService;
}

class CoinRouter {
  constructor(private readonly services: CoinRouterServices) {}

  static create(services: CoinRouterServices): CoinRouter {
    return new CoinRouter(services);
  }

  async read(req: Request, res: Response) {
    try {
      const resp = await this.services.coinService.read(req.params.coinId);
      res.status(200).send(resp);
    } catch (err) {
      res.status(500).send(this.handleError(err));
    }
  }

  private handleError(err: any) {
    console.error(err);
    if (err instanceof Error) return err.message;
    return 'Unexpected error';
  }

  getRouter(): Router {
    const router = Router();
    router.get('/:coinId', (req, res) => this.read(req, res));

    return router;
  }
}

export default CoinRouter;
