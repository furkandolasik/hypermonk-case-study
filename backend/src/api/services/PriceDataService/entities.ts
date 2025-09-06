export interface PriceData {
  coin_id: string;
  timestamp_currency: string;
  timestamp: string;
  currency: string;
  price: number;
  market_cap?: number;
  total_volume?: number;
  createdAt?: number;
  updatedAt?: string;
}
