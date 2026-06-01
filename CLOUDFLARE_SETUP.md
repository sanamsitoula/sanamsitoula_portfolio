# Cloudflare Pages Deployment Setup

This portfolio is configured to auto-deploy to Cloudflare Pages via GitHub Actions on every push to `master`.

## Prerequisites

1. **Cloudflare Account** with Pages enabled
2. **GitHub Secrets** configured in your repository

## Setup Steps

### 1. Get Your Cloudflare Credentials

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Account Settings** → **API Tokens**
3. Create a new API token with these permissions:
   - **Scope**: Account > Cloudflare Pages (all)
   - Copy the token and save it securely

4. Get your **Account ID**:
   - Go to **Account Settings** → **General**
   - Copy the **Account ID** field

### 2. Add Secrets to GitHub

1. Go to your GitHub repo: `https://github.com/sanamsitoula/sanamsitoula_portfolio`
2. **Settings** → **Secrets and variables** → **Actions**
3. Create two new repository secrets:
   - **`CLOUDFLARE_API_TOKEN`**: Paste your API token from step 1
   - **`CLOUDFLARE_ACCOUNT_ID`**: Paste your account ID from step 1

### 3. Configure Cloudflare Pages (One-Time)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Pages** (left sidebar)
3. **Create a project** → **Connect to Git**
4. Select: `sanamsitoula/sanamsitoula_portfolio`
5. Build settings:
   - **Build command**: (leave empty)
   - **Build output directory**: `/`
   - **Root directory**: `/`
6. **Save and deploy**

## How It Works

Every time you push to `master`:

1. GitHub Actions triggers the `.github/workflows/deploy.yml` workflow
2. It runs `wrangler pages deploy` with your Cloudflare credentials
3. Your site is deployed to Cloudflare's global network
4. Available at: `https://sanamsitoula-portfolio.pages.dev` (or custom domain if configured)

## Local Testing

To test the deployment locally:

```bash
npm install -g wrangler
cd sanamsitoula_portfolio
wrangler pages deploy .
```

## Troubleshooting

**Deployment fails with "API token invalid"**:
- Check that `CLOUDFLARE_API_TOKEN` secret is set correctly
- Regenerate the token if needed

**"Project not found"**:
- Ensure Cloudflare Pages project exists and is named `sanamsitoula-portfolio`
- Check the `--project-name` in `.github/workflows/deploy.yml`

**Repository access issues**:
- Ensure GitHub repo is public or Cloudflare has OAuth access
- Re-authorize the GitHub connection in Cloudflare dashboard

## Next Steps

- Add a custom domain (optional) in Cloudflare Pages settings
- Configure analytics and other Cloudflare features
- Monitor deployments in GitHub Actions tab
