import { Request, Response, Router } from 'express';
import CurrencyService from '../../services/CurrencyService';

interface CurrenciesRouterServices {
  currencyService: CurrencyService;
}

class CurrenciesRouter {
  constructor(private readonly services: CurrenciesRouterServices) {}

  static create(services: CurrenciesRouterServices): CurrenciesRouter {
    return new CurrenciesRouter(services);
  }

  async getCurrencies(req: Request, res: Response) {
    try {
      const currencies = await this.services.currencyService.getAllCurrencies();

      return res.status(200).json({
        success: true,
        data: currencies.map((currency) => ({
          code: currency.code,
          name: currency.name,
        })),
      });
    } catch (err) {
      return res.status(500).json(this.handleError(err));
    }
  }

  private handleError(err: any) {
    console.error('CurrenciesRouter error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    };
  }

  getRouter(): Router {
    const router = Router();
    router.get('/', (req, res) => this.getCurrencies(req, res));
    return router;
  }
}

export default CurrenciesRouter;
