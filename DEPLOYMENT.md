# Admin Frontend Deployment Guide

## Cloudflare Pages Setup

### 1. Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Pages**
2. Click **Create a project** → **Connect to Git**
3. Select **GitHub** and authorize Cloudflare to access your repos
4. Select repository: `forge-itsm-admin-frontend`

### 2. Configure Build Settings

Use these exact settings:

- **Production branch**: `main`
- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave default)

### 3. Environment Variables (Optional)

No environment variables needed - the API URL is auto-detected based on hostname.

### 4. Deploy

Click **Save and Deploy**. First build takes ~2-3 minutes.

Your admin panel will be live at: `https://forge-itsm-admin-frontend.pages.dev`

### 5. Set Up Custom Domain

1. In Pages project → **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter: `admin.forge-itsm.com`
4. Cloudflare will automatically create DNS records (since your domain is on Cloudflare)
5. SSL certificate provisions automatically (~5 minutes)

## Update Worker Proxy

After Cloudflare Pages is deployed, you need to update the Worker to proxy `admin.forge-itsm.com` to your Pages deployment.

### Current Behavior
The Worker currently serves embedded HTML from `admin-html.js`. We need to switch to proxying the React app.

### Update Worker Code

In `/var/www/src/index.js`, find the admin subdomain check (around line 115) and update it to proxy instead of serving embedded HTML:

```javascript
// Check if this is the admin subdomain
if (hostname === 'admin.forge-itsm.com') {
  // Proxy to Cloudflare Pages admin frontend
  const pagesUrl = new URL(request.url);
  pagesUrl.hostname = 'forge-itsm-admin-frontend.pages.dev';

  return fetch(pagesUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
}
```

Then deploy the Worker:
```bash
cd /var/www
node deploy-worker-api.js
```

## Verify Deployment

1. **Test Pages URL**: Visit https://forge-itsm-admin-frontend.pages.dev
   - Should show login page with Turnstile CAPTCHA

2. **Test Custom Domain**: Visit https://admin.forge-itsm.com
   - Should show same login page (via Worker proxy)

3. **Test Login**: Use your admin credentials from `admin_users` table in master DB

4. **Test APIs**: After login, check:
   - Dashboard loads tenant list
   - Admin Users page loads user list
   - Create/edit/delete operations work

## Automatic Deployments

Every time you push to the `main` branch, Cloudflare Pages automatically:
1. Detects the push via GitHub webhook
2. Runs `npm run build`
3. Deploys the new `dist/` folder
4. Updates live site in ~2 minutes

## Troubleshooting

**Problem: Build fails on Cloudflare Pages**
- Check build logs in Pages dashboard
- Most common: Node.js version mismatch (should use Node 20+)
- Cloudflare Pages uses Node 18 by default - may need to set environment variable `NODE_VERSION=20`

**Problem: Login fails with CORS error**
- Check that Worker proxy is set up correctly
- Verify `admin.forge-itsm.com` DNS points to Worker

**Problem: Can't create admin users**
- Check `admin_users` table exists in master DB
- Verify Worker API endpoints are deployed (test directly at worker URL)

**Problem: Blank page after deployment**
- Check browser console for errors
- Verify `dist/index.html` was generated correctly
- Try hard refresh (Ctrl+Shift+R)

## Architecture Overview

```
User Browser
    ↓
admin.forge-itsm.com (Cloudflare Worker)
    ↓
forge-itsm-admin-frontend.pages.dev (Cloudflare Pages)
    ↓
API calls to admin.forge-itsm.com/api/* (proxied by Worker)
    ↓
Worker handles API requests
    ↓
MASTER_DB (tenants-master database)
```

## Development vs Production

**Development**:
- `npm run dev` at http://localhost:5173
- API calls go to `https://itsm-backend.joshua-r-klimek.workers.dev`

**Production**:
- Deployed at `https://admin.forge-itsm.com`
- API calls go to same domain (no CORS issues)
- Worker handles routing based on subdomain
