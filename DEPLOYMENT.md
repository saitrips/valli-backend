# VALLI Backend - Deployment to Railway

## Prerequisites
- GitHub repo (valli-backend)
- Railway account
- Supabase database created
- Vercel frontend URL (for FRONTEND_URL env var)

## Deploy Steps

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select valli-backend repo
5. Click "Deploy Now"
6. Wait 2-3 minutes for initial deployment

## Add Environment Variables

After deployment:
1. Click "server" service
2. Go to "Variables" tab
3. Add these environment variables:

```
DATABASE_URL = postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ0eXAi...
SHIPPO_API_KEY = shippo_test_xxxxx
NODE_ENV = production
FRONTEND_URL = https://valli-production.vercel.app
```

4. Click "Deploy"

## Get Your API URL

1. Click "server" service
2. Go to "Settings"
3. Find "Domains"
4. Copy the domain (looks like: zoko-backend-production.up.railway.app)

## Update Frontend

Go to Vercel and update:
- NEXT_PUBLIC_API_URL = [your Railway URL]

## Auto-Deploy

Every git push to main auto-deploys in 2-3 minutes.

```bash
git push origin main
```
