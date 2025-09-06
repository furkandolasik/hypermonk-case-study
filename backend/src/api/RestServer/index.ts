import express, { Request, Response } from 'express';

import PriceDataService from '../services/PriceDataService';

import PriceDataRouter from './PriceDataRouter';

interface RestServerServices {
  priceDataService: PriceDataService;
}

class RestServer {
  constructor(private readonly services: RestServerServices) {}

  static create(services: RestServerServices): RestServer {
    return new RestServer(services);
  }

  async getRequestHandler(): Promise<express.RequestHandler> {
    const router = express.Router();
    router.use(async (req: Request, res: Response, next) => {
      return next();
    });

    router.use('/price-data', PriceDataRouter.create(this.services).getRouter());

    return router;
  }
}

export default RestServer;
