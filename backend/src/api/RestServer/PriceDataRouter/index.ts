import { Request, Response, Router } from 'express';
import PriceDataService from '../../services/PriceDataService';

interface PriceRouterServices {
  priceDataService: PriceDataService;
}

class PriceRouter {
  constructor(private readonly services: PriceRouterServices) {}

  static create(services: PriceRouterServices): PriceRouter {
    return new PriceRouter(services);
  }

  async getPrices(req: Request, res: Response) {
    try {
      const { coin, currency, from, to } = req.query;

      // Validate at least one parameter
      if (!coin && !currency && !from && !to) {
        return res.status(400).json({
          success: false,
          error: 'At least one filter parameter is required (coin, currency, from, to)',
        });
      }

      // Validate date format if provided
      if (from && !this.isValidDate(from as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid "from" date format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }

      if (to && !this.isValidDate(to as string)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid "to" date format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }

      const priceData = await this.services.priceDataService.getPriceHistory({
        coin: coin as string,
        currency: currency as string,
        from: from as string,
        to: to as string,
      });

      // Sort by timestamp
      const sortedData = priceData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return res.status(200).json({
        success: true,
        data: sortedData,
        meta: {
          count: sortedData.length,
          filters: { coin, currency, from, to },
        },
      });
    } catch (err) {
      return res.status(500).json(this.handleError(err));
    }
  }

  async getAvailableCoins(req: Request, res: Response) {
    try {
      // Hardcoded for now - matches what's in fetchPricesHandler
      const coins = ['bitcoin', 'ethereum'];

      res.status(200).json({
        success: true,
        data: coins.map((coin) => ({ id: coin, name: coin })),
      });
    } catch (err) {
      res.status(500).json(this.handleError(err));
    }
  }

  async getAvailableCurrencies(req: Request, res: Response) {
    try {
      // Hardcoded for now - matches what's in fetchPricesHandler
      const currencies = ['usd', 'eur', 'try'];

      res.status(200).json({
        success: true,
        data: currencies.map((currency) => ({ code: currency, name: currency.toUpperCase() })),
      });
    } catch (err) {
      res.status(500).json(this.handleError(err));
    }
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private handleError(err: any) {
    console.error('PriceRouter error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    };
  }

  getRouter(): Router {
    const router = Router();
    router.get('/', (req, res) => this.getPrices(req, res));
    router.get('/coins', (req, res) => this.getAvailableCoins(req, res));
    router.get('/currencies', (req, res) => this.getAvailableCurrencies(req, res));
    return router;
  }
}

export default PriceRouter;
