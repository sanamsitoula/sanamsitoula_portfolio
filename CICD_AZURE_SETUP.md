# CI/CD Pipeline — Complete Setup Guide

This guide documents the full CI/CD pipeline for the `sanamsitoula_portfolio` project, covering **two separate deployment targets**:

| Pipeline | Trigger | Result |
|---|---|---|
| **Cloudflare Pages** | Push to `master` | Deploys static files to `sanamsitoula-portfolio.pages.dev` |
| **Azure Container Apps** | Push to `master` | Builds Docker image → pushes to ACR → updates live container |

After completing this guide, every `git push` automatically deploys to both platforms. **No manual steps needed.**

---

## How It Works (End to End)

```
Developer pushes code to GitHub (master branch)
                ↓
  ┌─────────────────────────────────────────┐
  │         GitHub Actions Runner           │
  │                                         │
  │  Pipeline A              Pipeline B     │
  │  Cloudflare Pages        Azure          │
  │       ↓                     ↓           │
  │  Deploy static files    az login        │
  │       ↓                     ↓           │
  │  pages.dev updated      docker build    │
  │                              ↓          │
  │                         docker push     │
  │                         → ACR           │
  │                              ↓          │
  │                         containerapp    │
  │                         update          │
  └─────────────────────────────────────────┘
                ↓
  sanamsitoula-portfolio.pages.dev  (Cloudflare)
  sanam-portfolio-app.bluestone-3038c682    (Azure)
  sanamsitoula.com.np  (custom domain → Azure, pending DNS)
```

---

## Prerequisites (Already Done)

Before CI/CD can work, these Azure and Cloudflare resources must exist:

| Resource | Name | Status |
|---|---|---|
| Azure Resource Group | `portofolio` (Korea Central) | ✅ Created |
| Azure Container Registry | `sanamsitoulaacr` | ✅ Created |
| Azure Container Apps Environment | `sanam-portfolio-env` | ✅ Created |
| Azure Container App | `sanam-portfolio-app` | ✅ Created |
| Cloudflare Pages project | `sanamsitoula-portfolio` | ✅ Created |
| GitHub repository | `sanamsitoula/sanamsitoula_portfolio` | ✅ Created |

If any of these are missing, see [DOCKER_AZURE_SETUP.md](DOCKER_AZURE_SETUP.md) first.

---

## Part 1 — GitHub Repository Settings

These must be configured once in your GitHub repository before any workflow can run.

### Step 1.1: Allow all Actions

1. Go to your repo on GitHub
2. Click **Settings** (top menu)
3. Left sidebar → **Actions** → **General**
4. Under **Actions permissions**, select:
   **"Allow all actions and reusable workflows"**
5. Click **Save**

> This allows `azure/login@v2`, `docker/login-action@v3`, and `cloudflare/wrangler-action@v3` to run.

### Step 1.2: Set workflow permissions to Read and Write

Still on the same **Actions → General** page, scroll down to **Workflow permissions**:

1. Select **"Read and write permissions"**
2. Check **"Allow GitHub Actions to create and approve pull requests"**
3. Click **Save**

> Read and write permissions are required for the workflows to push deployment status back to GitHub.

**Status after setup:** Both settings saved ✅ (confirmed via GitHub Settings screenshot)

---

## Part 2 — Secrets Setup

GitHub Secrets store sensitive values (passwords, tokens, credentials) so they are never written in code or committed to the repository.

### Where to add secrets

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### All 5 required secrets

| Secret Name | Used by | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare pipeline | API token with Cloudflare Pages edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare pipeline | Your Cloudflare account ID |
| `ACR_USERNAME` | Azure pipeline | Azure Container Registry username |
| `ACR_PASSWORD` | Azure pipeline | Azure Container Registry password |
| `AZURE_CREDENTIALS` | Azure pipeline | Service principal JSON for `az login` |

**Status:** All 5 secrets added ✅ (confirmed via GitHub Secrets screenshot)

---

### How to get each secret value

#### `CLOUDFLARE_API_TOKEN`

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click your profile icon (top right) → **My Profile**
3. Left sidebar → **API Tokens** → **Create Token**
4. Use the **Edit Cloudflare Workers** template
5. Under Permissions, ensure **Cloudflare Pages: Edit** is included
6. Click **Continue to summary** → **Create Token**
7. Copy the token — it is only shown once

#### `CLOUDFLARE_ACCOUNT_ID`

Your Account ID is visible in the Cloudflare dashboard URL:
```
dash.cloudflare.com/<ACCOUNT_ID>/pages/view/...
```
For this project: `d71ffffbefbc6ca9727ae6c856d2657b`

#### `ACR_USERNAME` and `ACR_PASSWORD`

Run from your local terminal (Docker Desktop must be running):

```powershell
# Get username
az acr credential show --name sanamsitoulaacr --query username -o tsv

# Get password
az acr credential show --name sanamsitoulaacr --query "passwords[0].value" -o tsv
```

Values for this project:
- Username: `sanamsitoulaacr`
- Password: retrieved via command above (rotate periodically — see Security Notes)

#### `AZURE_CREDENTIALS`

This is a service principal — a bot account GitHub Actions uses to log into Azure.

**Step 1: Get your subscription ID**

```powershell
az account show --query id --output tsv
# Output: eb03b557-73b9-41e2-9571-c154bb87668c
```

**Step 2: Create the service principal**

```powershell
az ad sp create-for-rbac `
  --name "sanam-cicd" `
  --role contributor `
  --scopes /subscriptions/eb03b557-73b9-41e2-9571-c154bb87668c/resourceGroups/portofolio `
  --json-auth
```

**Step 3: Copy the entire JSON output** and paste it as the `AZURE_CREDENTIALS` secret value:

```json
{
  "clientId": "7bec478c-41ea-460b-960e-51a30e124407",
  "clientSecret": "<your-secret>",
  "subscriptionId": "eb03b557-73b9-41e2-9571-c154bb87668c",
  "tenantId": "a44edf86-8712-42e0-a9c2-7821b0ad95de",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

> **Note:** The `--json-auth` flag shows a deprecation warning but still works. The output format is correct.

---

## Part 3 — Workflow Files

Two workflow files live in `.github/workflows/`. They run automatically on every push to `master`.

### File 1: `.github/workflows/deploy.yml` — Cloudflare Pages

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    name: Deploy to Cloudflare Pages
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy . --project-name=sanamsitoula-portfolio --branch=master
```

**What it does:** Uploads the entire project root to Cloudflare Pages.
**Time to complete:** ~30 seconds.
**Live URL:** `sanamsitoula-portfolio.pages.dev`

### File 2: `.github/workflows/azure-deploy.yml` — Azure Container Apps

```yaml
name: Build and Deploy to Azure

on:
  push:
    branches:
      - master

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Install Azure Container Apps extension
        run: az extension add --name containerapp --upgrade

      - name: Log in to Azure Container Registry
        uses: docker/login-action@v3
        with:
          registry: sanamsitoulaacr.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build and push Docker image
        run: |
          docker build -t sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest \
                       -t sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:${{ github.sha }} .
          docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
          docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:${{ github.sha }}

      - name: Deploy to Azure Container Apps
        run: |
          az containerapp update \
            --name sanam-portfolio-app \
            --resource-group portofolio \
            --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:${{ github.sha }}
```

**What it does:** Builds Docker image → pushes to ACR with `latest` + commit SHA tags → updates the running Container App.
**Time to complete:** ~3–4 minutes.
**Live URL:** `sanam-portfolio-app.bluestone-3038c682.koreacentral.azurecontainerapps.io`

> **Why Azure login is FIRST:** If Azure credentials are wrong, the pipeline fails before spending time on the Docker build.
>
> **Why commit SHA tag:** Using `:latest` alone risks a cached/stale image. Tagging with the SHA ensures the exact image built from this commit is deployed.
>
> **Why `az extension add --name containerapp`:** The `ubuntu-latest` runner does not include the Container Apps extension by default. Without this step, `az containerapp update` fails.

---

## Part 4 — Trigger and Verify

### Trigger the pipeline

```powershell
# Option A: push a real change
git add .
git commit -m "your change description"
git push

# Option B: trigger without a code change (for testing)
git commit --allow-empty -m "trigger: test CI/CD pipeline"
git push
```

### Watch the pipeline run

1. Go to your GitHub repo
2. Click the **Actions** tab
3. You will see two workflow runs — one for each pipeline

### Verify Cloudflare deployment

Open: `https://sanamsitoula-portfolio.pages.dev`

### Verify Azure deployment

```powershell
az containerapp show \
  --name sanam-portfolio-app \
  --resource-group portofolio \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

Open the returned URL in your browser.

---

## Part 5 — Day-to-Day Usage

After the one-time setup above, deploying is just:

```powershell
# Make code changes, then:
git add .
git commit -m "describe your change"
git push
# Done — GitHub Actions deploys automatically to both platforms
```

**No manual `docker build`, `docker push`, or `az containerapp update` needed.**

---

## Part 6 — Errors Encountered During Setup

### Error 1: Command uses `<your-sub-id>` literally

**Command run:** `az ad sp create-for-rbac ... --scopes /subscriptions/<your-sub-id>/...`

**Error:** `The system cannot find the file specified.`

**Cause:** The placeholder `<your-sub-id>` was not replaced with the actual subscription ID.

**Fix:**
```powershell
# First get the real ID:
az account show --query id --output tsv
# Then use it in the command:
az ad sp create-for-rbac --name sanam-cicd --role contributor `
  --scopes /subscriptions/eb03b557-73b9-41e2-9571-c154bb87668c/resourceGroups/portofolio `
  --json-auth
```

---

### Error 2: `az containerapp update` fails — extension not installed

**Error:** `The command requires the extension containerapp. Unable to prompt for extension install.`

**Cause:** The `ubuntu-latest` GitHub Actions runner does not have the `containerapp` CLI extension pre-installed.

**Fix:** Add this step before the deploy step in the workflow:
```yaml
- name: Install Azure Container Apps extension
  run: az extension add --name containerapp --upgrade
```

---

### Error 3: Pipeline fails silently — missing secrets

**Symptom:** Workflow shows ❌ with authentication errors on `azure/login` or `cloudflare/wrangler-action`.

**Cause:** GitHub Secrets not added or misspelled (names are case-sensitive).

**Fix:** Verify all 5 secrets exist in **Settings → Secrets and variables → Actions**:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `AZURE_CREDENTIALS`

---

### Error 4: Workflow permission denied

**Symptom:** Workflow fails with `Resource not accessible by integration` or similar.

**Cause:** GitHub Actions default token has read-only permission.

**Fix:** Go to **Settings → Actions → General → Workflow permissions** → select **Read and write permissions** → Save.

---

## Part 7 — Troubleshooting

### Pipeline fails at "Log in to Azure"
```powershell
# Verify service principal still has access:
az role assignment list --assignee 7bec478c-41ea-460b-960e-51a30e124407 --output table
```
If no results, re-run the `az ad sp create-for-rbac` command and update the `AZURE_CREDENTIALS` secret.

### Pipeline fails at "Push Docker image"
```powershell
# Regenerate ACR password and update the GitHub secret:
az acr credential renew --name sanamsitoulaacr --password-name password
az acr credential show --name sanamsitoulaacr --query "passwords[0].value" -o tsv
```

### Pipeline succeeds but site not updated
```powershell
# Force Container App to restart and pull the new image:
az containerapp restart --name sanam-portfolio-app --resource-group portofolio
```

### Check pipeline logs
GitHub repo → **Actions** tab → click the failed run → click the failed step to see full error output.

---

## Part 8 — Security Notes

- **Never commit secrets** to the repo — always use GitHub Secrets
- The `sanam-cicd` service principal only has `Contributor` access to the `portofolio` resource group, not the entire Azure subscription
- **Rotate ACR password** periodically:
  ```powershell
  az acr credential renew --name sanamsitoulaacr --password-name password
  ```
  Then update `ACR_PASSWORD` in GitHub Secrets with the new value
- **Rotate service principal secret** if compromised:
  ```powershell
  az ad sp credential reset --id 7bec478c-41ea-460b-960e-51a30e124407
  ```
  Then update `AZURE_CREDENTIALS` in GitHub Secrets with the new JSON

---

## Summary Checklist

Use this checklist when setting up CI/CD from scratch on a new machine or new repo:

- [ ] Azure resources exist (Resource Group, ACR, Container Apps Environment, Container App)
- [ ] Cloudflare Pages project exists
- [ ] GitHub repo exists and code is pushed
- [ ] GitHub Actions permissions → **Allow all actions and reusable workflows** → Saved
- [ ] GitHub Workflow permissions → **Read and write permissions** → Saved
- [ ] `CLOUDFLARE_API_TOKEN` secret added
- [ ] `CLOUDFLARE_ACCOUNT_ID` secret added
- [ ] `ACR_USERNAME` secret added
- [ ] `ACR_PASSWORD` secret added
- [ ] `AZURE_CREDENTIALS` secret added (full JSON from `az ad sp create-for-rbac`)
- [ ] `.github/workflows/deploy.yml` file exists in repo
- [ ] `.github/workflows/azure-deploy.yml` file exists in repo
- [ ] Pushed a commit to `master` and confirmed both pipelines turn green in Actions tab
