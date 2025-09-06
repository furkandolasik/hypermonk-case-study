import { Request, Response, Router } from 'express';
import PriceDataService from '../../services/PriceDataService';

interface PriceDataRouterServices {
  priceDataService: PriceDataService;
}

class PriceDataRouter {
  constructor(private readonly services: PriceDataRouterServices) {}

  static create(services: PriceDataRouterServices): PriceDataRouter {
    return new PriceDataRouter(services);
  }

  async read(req: Request, res: Response) {
    try {
      const { coinId, timestampCurrency } = req.params;
      const resp = await this.services.priceDataService.read(coinId, timestampCurrency);
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
    router.get('/:coinId/:timestampCurrency', (req, res) => this.read(req, res));

    return router;
  }
}

export default PriceDataRouter;
