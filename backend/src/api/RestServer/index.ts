import express, { Request, Response } from 'express';
import PriceDataService from '../services/PriceDataService';
import PriceRouter from './PriceDataRouter';

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
      console.log(`${req.method} ${req.path} - Query:`, req.query);
      return next();
    });

    // API Routes
    router.use('/prices', PriceRouter.create(this.services).getRouter());

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
