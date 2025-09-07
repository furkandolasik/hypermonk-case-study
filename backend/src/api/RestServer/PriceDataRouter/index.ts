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
      const { coin, coins, currency, currencies, from, to, breakdownDimensions } = req.query;

      // Parse parameters - support both single and multiple values
      const parsedCoins =
        this.parseMultipleValues(coins as string) || (coin ? [coin as string] : ['bitcoin', 'ethereum']);

      const parsedCurrencies =
        this.parseMultipleValues(currencies as string) || (currency ? [currency as string] : ['usd', 'try']);

      const parsedBreakdownDimensions = this.parseMultipleValues(breakdownDimensions as string) || ['date'];

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

      // Validate breakdown dimensions
      const validDimensions = ['date', 'coin', 'currency'];
      const invalidDimensions = parsedBreakdownDimensions.filter((dim) => !validDimensions.includes(dim));
      if (invalidDimensions.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid breakdown dimensions: ${invalidDimensions.join(', ')}. Valid options: ${validDimensions.join(
            ', '
          )}`,
        });
      }

      // Call the updated service method
      const processedData = await this.services.priceDataService.getPriceHistory({
        coins: parsedCoins,
        currencies: parsedCurrencies,
        from: from as string,
        to: to as string,
        breakdownDimensions: parsedBreakdownDimensions,
      });

      // Sort by date (already sorted in service, but double-check)
      const sortedData = processedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return res.status(200).json({
        success: true,
        data: sortedData,
        metadata: {
          count: sortedData.length,
          requestParams: {
            coins: parsedCoins,
            currencies: parsedCurrencies,
            from,
            to,
            breakdownDimensions: parsedBreakdownDimensions,
          },
        },
      });
    } catch (err) {
      return res.status(500).json(this.handleError(err));
    }
  }

  async getAvailableCoins(req: Request, res: Response) {
    try {
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
      const currencies = ['usd', 'eur', 'try'];

      res.status(200).json({
        success: true,
        data: currencies.map((currency) => ({ code: currency, name: currency.toUpperCase() })),
      });
    } catch (err) {
      res.status(500).json(this.handleError(err));
    }
  }

  // Helper method to parse comma-separated values
  private parseMultipleValues(value: string | undefined): string[] | undefined {
    if (!value) return undefined;
    return value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
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
