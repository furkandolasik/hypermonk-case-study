import express, { Request, Response } from 'express';

import CoinService from '../services/CoinService';

import CoinRouter from './CoinRouter';

interface RestServerServices {
  coinService: CoinService;
}

class RestServer {
  constructor(private readonly services: RestServerServices) {}

  static create(services: RestServerServices): RestServer {
    return new RestServer(services);
  }

  async getRequestHandler(): Promise<express.RequestHandler> {
    const router = express.Router();
    console.log('Setting up routes');
    router.use(async (req: Request, res: Response, next) => {
      return next();
    });

    router.use('/coins', CoinRouter.create(this.services).getRouter());

    return router;
  }
}

export default RestServer;
