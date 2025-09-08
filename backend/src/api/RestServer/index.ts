import express, { Request, Response } from 'express';
import PriceDataService from '../services/PriceDataService';
import CoinService from '../services/CoinService';
import CurrencyService from '../services/CurrencyService';
import PriceRouter from './PriceDataRouter';
import CoinsRouter from './CoinsRouter';
import CurrenciesRouter from './CurrenciesRouter';

interface RestServerServices {
  priceDataService: PriceDataService;
  coinService: CoinService;
  currencyService: CurrencyService;
}

class RestServer {
  constructor(private readonly services: RestServerServices) {}

  static create(services: RestServerServices): RestServer {
    return new RestServer(services);
  }

  async getRequestHandler(): Promise<express.RequestHandler> {
    const router = express.Router();
    router.use(async (req: Request, res: Response, next) => {
      console.log(`${req.method} ${req.path} - Query:`, req.query);
      return next();
    });

    // API Routes
    router.use('/prices', PriceRouter.create(this.services).getRouter());
    router.use('/coins', CoinsRouter.create(this.services).getRouter());
    router.use('/currencies', CurrenciesRouter.create(this.services).getRouter());

    // Health check
    router.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Crypto API is running',
        timestamp: new Date().toISOString(),
      });
    });

    return router;
  }
}

export default RestServer;
