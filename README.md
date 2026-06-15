# VALLI Backend

Ethnic wear CRM for diaspora boutiques - Backend API (Express + Node.js)

## Quick Start

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Server runs on: http://localhost:3001

## Environment Variables

```
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SHIPPO_API_KEY=
FRONTEND_URL=
NODE_ENV=development
PORT=3001
```

## API Endpoints

- POST /api/shop/:slug/orders - Create order
- GET /api/products - List products
- POST /api/payments/confirm - Confirm payment
- GET /api/shipping/rates - Get shipping rates
- POST /api/shipping/label - Buy shipping label
- GET /api/inventory - Check inventory
- And more...

## Deploy to Railway

See DEPLOYMENT.md for detailed instructions.
