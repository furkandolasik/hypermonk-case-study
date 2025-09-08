# Cryptocurrency Price Dashboard

A real-time cryptocurrency price dashboard with interactive charts and data analytics.

## Quick Setup

### Backend

```bash
cd backend
```

**Add your CoinGecko API key in main.tf Lambda environment variables**

```bash
terraform init && terraform apply
```

**Note the console_url output for frontend access**

### Frontend

Frontend automatically connects to the deployed API - just use the console_url from Terraform output.

## Loading Historical Data

After deployment, populate data using the fetch Lambda:

1. Go to AWS Lambda Console → your-project-fetch-prices
2. Test with this event:

```json
{
  "action": "fetch-historical",
  "coins": ["bitcoin", "ethereum"],
  "currencies": ["usd", "try"],
  "days": 30
}
```

## Features

- Interactive price charts with date range selection
- Filter by 10+ cryptocurrencies and multiple currencies
- Automatic hourly/daily data granularity
- Drag & drop table columns
- Real-time data updates every 5 minutes

## API Endpoints

- `GET /v1/prices` - Price data with filtering
- `GET /v1/coins` - Available cryptocurrencies
- `GET /v1/currencies` - Available currencies

## Architecture

- **Frontend**: React + TypeScript + Ant Design
- **Backend**: AWS Lambda + DynamoDB + EventBridge
- **Data**: CoinGecko API with automated collection

Built for cryptocurrency market analysis and real-time price tracking.
