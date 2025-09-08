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

      const parsedCoins = this.parseMultipleValues(coins as string) || (coin ? [coin as string] : undefined);
      const parsedCurrencies =
        this.parseMultipleValues(currencies as string) || (currency ? [currency as string] : undefined);
      const parsedBreakdownDimensions = this.parseMultipleValues(breakdownDimensions as string) || ['date'];

      // Validation - coins and currencies are now required
      if (!parsedCoins || parsedCoins.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one coin must be specified (coins parameter required)',
        });
      }

      if (!parsedCurrencies || parsedCurrencies.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one currency must be specified (currencies parameter required)',
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

      const data = await this.services.priceDataService.getPriceHistory({
        coins: parsedCoins,
        currencies: parsedCurrencies,
        from: from as string,
        to: to as string,
        breakdownDimensions: parsedBreakdownDimensions,
      });

      return res.status(200).json({
        success: true,
        data,
        metadata: {
          count: data.length,
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
    return router;
  }
}

export default PriceRouter;
