export interface PriceData {
  coin_id: string;
  timestamp_currency: string;
  currency: string;
  timestamp: string;
  price: number;
  market_cap?: number;
  volume_24h?: number;
  price_change_24h?: number;
  granularity: 'hourly' | 'daily';
}
