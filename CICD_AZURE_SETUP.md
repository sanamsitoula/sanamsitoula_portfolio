# CI/CD Pipeline — GitHub Actions → Azure Container Apps

This guide sets up an automated pipeline so that every push to the `master` branch:
1. Builds a new Docker image
2. Pushes it to Azure Container Registry (ACR)
3. Deploys the updated image to Azure Container Apps automatically

No manual `docker build` or `docker push` needed after the initial setup.

---

## How the Pipeline Works

```
You push code to GitHub (master)
        ↓
GitHub Actions runner starts
        ↓
Build Docker image from your code
        ↓
Push image to ACR (sanamsitoulaacr)
        ↓
Update Azure Container App with new image
        ↓
Live site at sanamsitoula.com.np updated
```

---

## Prerequisites

- GitHub repo connected to Azure (done — see [DOCKER_AZURE_SETUP.md](DOCKER_AZURE_SETUP.md))
- Azure CLI installed locally
- ACR (`sanamsitoulaacr`) and Container App (`sanam-portfolio-app`) already created

---

## Step 1: Create an Azure Service Principal

A service principal is a bot account that GitHub Actions uses to log in to Azure on your behalf.

Run this in your local terminal (replace `<subscription-id>` with your actual subscription ID):

```powershell
# Get your subscription ID first
az account show --query id --output tsv

# Create the service principal with Contributor access to your resource group
az ad sp create-for-rbac `
  --name "sanam-portfolio-cicd" `
  --role contributor `
  --scopes /subscriptions/<subscription-id>/resourceGroups/portofolio `
  --json-auth
```

The output looks like this — **copy the entire JSON block**:

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "...",
  "resourceManagerEndpointUrl": "...",
  "activeDirectoryGraphResourceId": "...",
  "sqlManagementEndpointUrl": "...",
  "galleryEndpointUrl": "...",
  "managementEndpointUrl": "..."
}
```

---

## Step 2: Get ACR Admin Credentials

```powershell
az acr credential show --name sanamsitoulaacr --query "[username, passwords[0].value]" --output tsv
```

Note down the **username** and **password**.

---

## Step 3: Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 3 secrets:

| Secret Name | Value |
|---|---|
| `AZURE_CREDENTIALS` | The entire JSON block from Step 1 |
| `ACR_USERNAME` | Username from Step 2 (usually `sanamsitoulaacr`) |
| `ACR_PASSWORD` | Password from Step 2 |

---

## Step 4: Create the GitHub Actions Workflow

Create the file `.github/workflows/azure-deploy.yml` in your project:

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

      - name: Log in to Azure Container Registry
        uses: docker/login-action@v3
        with:
          registry: sanamsitoulaacr.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build Docker image
        run: docker build -t sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest .

      - name: Push Docker image to ACR
        run: docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure Container Apps
        run: |
          az containerapp update \
            --name sanam-portfolio-app \
            --resource-group portofolio \
            --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

---

## Step 5: Push and Trigger the Pipeline

```powershell
git add .
git commit -m "add: Azure CI/CD pipeline"
git push
```

Go to your GitHub repo → **Actions** tab to watch the pipeline run live.

---

## Step 6: Verify the Deployment

After the workflow completes (usually 2-4 minutes):

```powershell
az containerapp show --name sanam-portfolio-app --resource-group portofolio --query properties.configuration.ingress.fqdn --output tsv
```

Open the URL — your changes should be live.

---

## Pipeline Status Badge

Add this to your README to show live pipeline status:

```markdown
![Deploy](https://github.com/sanamsitoula/sanamsitoula_portfolio/actions/workflows/azure-deploy.yml/badge.svg)
```

---

## How to Update the Site Going Forward

From now on, the full deployment process is:

```powershell
# 1. Make your code changes
# 2. Commit and push
git add .
git commit -m "describe your change"
git push
# 3. GitHub Actions handles everything else automatically
```

---

## Troubleshooting

### Pipeline fails at "Log in to Azure"
- Check that `AZURE_CREDENTIALS` secret contains the full JSON (not just part of it)
- Verify the service principal has Contributor access to the `portofolio` resource group:
  ```powershell
  az role assignment list --assignee <clientId> --output table
  ```

### Pipeline fails at "Push Docker image"
- Check `ACR_USERNAME` and `ACR_PASSWORD` secrets match the output of:
  ```powershell
  az acr credential show --name sanamsitoulaacr
  ```
- Regenerate credentials if needed:
  ```powershell
  az acr credential renew --name sanamsitoulaacr --password-name password
  ```

### Pipeline succeeds but site not updated
- Container App may be caching the old image. Force a restart:
  ```powershell
  az containerapp restart --name sanam-portfolio-app --resource-group portofolio
  ```

### Azure for Students: Service principal creation fails
If `az ad sp create-for-rbac` is blocked, use ACR admin credentials only and update the Container App using a Personal Access Token approach or contact Azure support to enable service principal creation.

---

## Security Notes

- Never commit secrets directly to the repo — always use GitHub Secrets
- The service principal only has `Contributor` access to the `portofolio` resource group, not the entire subscription
- Rotate the ACR password periodically:
  ```powershell
  az acr credential renew --name sanamsitoulaacr --password-name password
  ```
  Then update the `ACR_PASSWORD` GitHub secret with the new value
