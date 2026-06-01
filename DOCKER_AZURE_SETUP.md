# Docker and Azure Hosting Setup

This guide shows how to run the portfolio locally using Docker and how to publish it into Azure using Azure Container Registry and Azure Container Apps.

> **Note:** This guide was written based on an **Azure for Students** subscription, which has several restrictions. All errors encountered and their solutions are documented in [Section 11](#11-errors-encountered-and-solutions).

---

## What is What?

```
Docker Image  →  ACR (storage)  →  Container App (running live)
(you build it)   (you push it)     (serves your website publicly)
```

- **Docker Image** — a packaged version of your website, like a zip file that includes the web server
- **ACR (Azure Container Registry)** — a private storage place in Azure where your image lives (like a warehouse)
- **Container** — the actual running instance of that image, serving your website live on the internet with a public URL

---

## 0. Quick Start — Minimal Test Page

If you want to test the full Docker + Azure pipeline without your real portfolio files, create a folder with just these two files:

**`index.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sanam Sitoula</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #0f0f0f;
      color: #ffffff;
    }
    h1 { font-size: 2.5rem; }
    p  { color: #aaaaaa; }
  </style>
</head>
<body>
  <div style="text-align:center">
    <h1>Hello, I'm Sanam Sitoula</h1>
    <p>This is a static portfolio page hosted on Azure Container Apps.</p>
  </div>
</body>
</html>
```

**`Dockerfile`**
```dockerfile
FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run locally:
```powershell
docker build -t sanamsitoula-portfolio:latest .
docker run --rm -p 8080:80 sanamsitoula-portfolio:latest
```
Open `http://localhost:8080` — if you see the page, proceed with the full Azure deployment steps.

---

## 1. Prerequisites

### Software to install on your local machine

1. **Docker Desktop** — download from https://www.docker.com/products/docker-desktop
   - After installing, start Docker Desktop and wait until it says "Docker is running"
   - Verify: `docker --version`

2. **Azure CLI** — download from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
   - Verify: `az --version`

### Azure requirements

- A valid Azure subscription (Azure for Students works but has region and feature restrictions — see Section 9)
- Project root contains the static portfolio files (`index.html`, `styles.css`, `scene.js`, etc.)

> **Important:** Run all commands from your **local terminal** (PowerShell or Git Bash), NOT from Azure Cloud Shell. Cloud Shell has no Docker daemon and cannot run `az acr login` or `docker push`.

---

## 2. Git Repository Setup

Setting up a git repo lets you track changes, collaborate, and deploy from anywhere by cloning the repo.

### Step 2.1: Initialize a local git repo

```powershell
cd d:\claude_project\sanamsitoula_portfolio
git init
git add .
git commit -m "initial commit: portfolio static site"
```

### Step 2.2: Create a remote repo on GitHub

1. Go to [github.com](https://github.com) → click **New repository**
2. Name it `sanamsitoula-portfolio`
3. Set it to **Private** (recommended — keeps your source code private)
4. Do NOT initialize with README (you already have files locally)
5. Copy the repo URL shown (e.g. `https://github.com/sanamsitoula/sanamsitoula-portfolio.git`)

### Step 2.3: Link local repo to GitHub and push

```powershell
git remote add origin https://github.com/sanamsitoula/sanamsitoula-portfolio.git
git branch -M master
git push -u origin master
```

### Step 2.4: Clone on another machine (when needed)

```powershell
git clone https://github.com/sanamsitoula/sanamsitoula-portfolio.git
cd sanamsitoula-portfolio
```

### Step 2.5: Push updates after making changes

```powershell
git add .
git commit -m "describe what you changed"
git push
```

> After pushing, rebuild and push the Docker image to ACR to deploy the changes (see Section 8).

---

## 4. Add Docker support to your project

1. Create a `Dockerfile` in the project root:

```dockerfile
FROM nginx:stable-alpine

RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. Create a `.dockerignore` file to exclude unnecessary files:

```text
.git
.wrangler
Dockerfile
.dockerignore
*.pdf
*.pptx
*.md
```

---

## 5. Build and run locally with Docker

1. Open a terminal in the project root:
   ```powershell
   cd d:\claude_project\sanamsitoula_portfolio
   ```

2. Build the Docker image:
   ```powershell
   docker build -t sanamsitoula-portfolio:latest .
   ```

3. Run the container locally:
   ```powershell
   docker run --rm -p 8080:80 sanamsitoula-portfolio:latest
   ```

   > If port 8080 is already in use, try a different port (e.g. 8081):
   > ```powershell
   > docker run --rm -p 8081:80 sanamsitoula-portfolio:latest
   > ```

4. Open in your browser:
   ```
   http://127.0.0.1:8080/
   ```

---

## 6. Publish to Azure Container Registry (ACR)

### Step 4.1: Log in to Azure

```powershell
az login
```

### Step 4.2: Register required Azure providers

Do this once per subscription. Azure for Students subscriptions are not pre-registered for these services.

```powershell
az provider register --namespace Microsoft.ContainerRegistry
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

Check registration status — wait until each shows `"Registered"` (takes 1-2 minutes):

```powershell
az provider show --namespace Microsoft.ContainerRegistry --query registrationState
az provider show --namespace Microsoft.App --query registrationState
az provider show --namespace Microsoft.OperationalInsights --query registrationState
```

### Step 4.3: Create a resource group

> **Azure for Students region restriction:** `eastus` is blocked. Use `koreacentral` instead.

```powershell
az group create --name portofolio --location koreacentral
```

### Step 4.4: Create Azure Container Registry

```powershell
az acr create --resource-group portofolio --name sanamsitoulaacr --sku Basic --location koreacentral
```

### Step 4.5: Log in to ACR from your local machine

```powershell
az acr login --name sanamsitoulaacr
```

### Step 4.6: Tag the local image for ACR

```powershell
docker tag sanamsitoula-portfolio:latest sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

> You must tag before pushing. Pushing without tagging gives: `tag does not exist`.

### Step 4.7: Push the image to ACR

```powershell
docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

> **Why not `az acr build`?** Azure for Students blocks ACR Tasks, which is what `az acr build` uses internally. The `docker build` + `docker tag` + `docker push` approach works around this restriction.

---

## 7. Host in Azure Container Apps

### Step 5.1: Enable ACR admin credentials

Container Apps needs credentials to pull your image from ACR:

```powershell
az acr update --name sanamsitoulaacr --admin-enabled true
az acr credential show --name sanamsitoulaacr --query "[username, passwords[0].value]"
```

Copy the username and password from the output.

### Step 5.2: Create a Container Apps environment

```powershell
az containerapp env create --name sanam-portfolio-env --resource-group portofolio --location koreacentral
```

### Step 5.3: Create the Azure Container App

```powershell
az containerapp create --name sanam-portfolio-app `
  --resource-group portofolio `
  --environment sanam-portfolio-env `
  --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest `
  --target-port 80 `
  --ingress external `
  --registry-server sanamsitoulaacr.azurecr.io `
  --registry-username <paste-username-here> `
  --registry-password <paste-password-here>
```

### Step 5.4: Get the live public URL

```powershell
az containerapp show --name sanam-portfolio-app --resource-group portofolio --query properties.configuration.ingress.fqdn --output tsv
```

Open that URL in your browser — your portfolio is live.

---

## 8. Update the container image after changes

1. Rebuild the image locally:
   ```powershell
   docker build -t sanamsitoula-portfolio:latest .
   ```

2. Tag and push the new image:
   ```powershell
   docker tag sanamsitoula-portfolio:latest sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
   docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
   ```

3. Update the running Container App:
   ```powershell
   az containerapp update --name sanam-portfolio-app --resource-group portofolio --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
   ```

4. Optionally restart if needed:
   ```powershell
   az containerapp restart --name sanam-portfolio-app --resource-group portofolio
   ```

---

## 9. Troubleshooting

- If the container fails to start, inspect logs:
  ```powershell
  az containerapp logs show --name sanam-portfolio-app --resource-group portofolio
  ```
- If you see port or health issues, verify the app is configured to use port `80`.
- If the site is not reachable, confirm the ingress type is `external`.

---

## 10. Notes

- This project is a static site, so `nginx` is sufficient to serve it.
- Azure Container Apps is useful when you want to host the Docker container in Azure without managing VMs.
- If you only need a static site, **Cloudflare Pages** or **Azure Static Web Apps** are simpler and free alternatives that do not require Docker at all.

---

## 11. Errors Encountered and Solutions

All errors below were encountered during actual setup on an **Azure for Students** subscription.

---

### Error 1: Port already in use

**Command:** `docker run --rm -p 8080:80 sanamsitoula-portfolio:latest`

**Error:**
```
ports are not available: exposing port TCP 0.0.0.0:8080 -> 127.0.0.1:0:
bind: Only one usage of each socket address is normally permitted.
```

**Cause:** Something else on the machine is already using port 8080.

**Fix:** Use a different host port:
```powershell
docker run --rm -p 8081:80 sanamsitoula-portfolio:latest
```
To find what is using port 8080:
```powershell
netstat -ano | findstr :8080
tasklist | findstr <PID>
```

---

### Error 2: az acr login fails in Azure Cloud Shell

**Command:** `az acr login --name sanamsitoulaacr`

**Error:**
```
This command requires running the docker daemon, which is not supported in Azure Cloud Shell.
```

**Cause:** Azure Cloud Shell has no Docker daemon.

**Fix:** Run all Docker and ACR commands from your **local terminal** where Docker Desktop is installed and running, not from Cloud Shell.

---

### Error 3: ACR not found

**Command:** `az acr build --registry sanamsitoulaacr ...`

**Error:**
```
The resource with name 'sanamsitoulaacr' and type 'Microsoft.ContainerRegistry/registries'
could not be found in subscription '...'
```

**Cause:** The ACR registry was never created (`az acr list` returned empty).

**Fix:** Create the registry first (see Step 4.4).

---

### Error 4: Region blocked by subscription policy

**Command:** `az acr create --resource-group sanam-portfolio-rg --name sanamsitoulaacr --sku Basic`

**Error:**
```
(RequestDisallowedByAzure) Resource 'sanamsitoulaacr' was disallowed by Azure:
This policy maintains a set of best available regions where your subscription can deploy resources.
```

**Cause:** Azure for Students subscriptions restrict available regions. `eastus` is blocked.

**Fix:** Use `koreacentral` (or check allowed regions first):
```powershell
az account list-locations --query "[].{Name:name, DisplayName:displayName}" --output table
az acr create --resource-group portofolio --name sanamsitoulaacr --sku Basic --location koreacentral
```

---

### Error 5: Subscription not registered for Microsoft.ContainerRegistry

**Command:** `az acr create ...`

**Error:**
```
(MissingSubscriptionRegistration) The subscription is not registered to use namespace
'Microsoft.ContainerRegistry'.
```

**Cause:** Azure for Students subscriptions do not pre-register all resource providers.

**Fix:**
```powershell
az provider register --namespace Microsoft.ContainerRegistry
az provider show --namespace Microsoft.ContainerRegistry --query registrationState
```
Wait until the output shows `"Registered"`, then retry.

---

### Error 6: ACR Tasks blocked

**Command:** `az acr build --registry sanamsitoulaacr --image sanamsitoula-portfolio:latest .`

**Error:**
```
(TasksOperationsNotAllowed) ACR Tasks requests for the registry sanamsitoulaacr are not permitted.
Please file an Azure support request for assistance.
```

**Cause:** Azure for Students subscriptions block ACR Tasks, the remote build feature used by `az acr build`.

**Fix:** Build locally and push manually:
```powershell
docker build -t sanamsitoula-portfolio:latest .
docker tag sanamsitoula-portfolio:latest sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
az acr login --name sanamsitoulaacr
docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

---

### Error 7: Tag does not exist when pushing

**Command:** `docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest`

**Error:**
```
tag does not exist: sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

**Cause:** The image was built with a local name but not yet tagged with the ACR registry prefix required for pushing.

**Fix:** Tag the image before pushing:
```powershell
docker tag sanamsitoula-portfolio:latest sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

---

## 12. Custom Domain Setup (sanamsitoula.com.np)

This section documents how to connect the custom domain `sanamsitoula.com.np` to the Azure Container App using Azure DNS.

### How it works

```
register.com.np (registrar)
    ↓ nameservers point to Azure DNS
Azure DNS Zone (sanamsitoula.com.np)
    ↓ DNS records point to Container App
Container App (sanam-portfolio-app)
    ↓ serves the website
sanamsitoula.com.np  ← user visits this
```

---

### Step 10.1: Create Azure DNS Zone

```powershell
az network dns zone create --resource-group portofolio --name sanamsitoula.com.np
```

### Step 10.2: Get the Azure nameservers

```powershell
az network dns zone show --resource-group portofolio --name sanamsitoula.com.np --query nameServers --output table
```

The 4 nameservers returned look like:
```
ns1-07.azure-dns.com
ns2-07.azure-dns.net
ns3-07.azure-dns.org
ns4-07.azure-dns.info
```

### Step 10.3: Update nameservers at your domain registrar

Log in to [register.com.np](https://register.com.np) and update the nameservers for `sanamsitoula.com.np`:

- Primary name server: `ns1-07.azure-dns.com`
- Secondary name server: `ns2-07.azure-dns.net`

> If the registrar supports more than 2 nameservers, also add `ns3-07.azure-dns.org` and `ns4-07.azure-dns.info` for better redundancy.

**Status as of setup:** Nameservers updated successfully at register.com.np. ✅

---

### Step 10.4: Get domain verification ID and static IP

```powershell
# Verification ID — used in TXT records so Azure can verify domain ownership
az containerapp show --name sanam-portfolio-app --resource-group portofolio --query properties.customDomainVerificationId --output tsv

# Static IP of the Container Apps environment — used for the apex A record
az containerapp env show --name sanam-portfolio-env --resource-group portofolio --query properties.staticIp --output tsv
```

### Step 10.5: Add DNS records in Azure DNS Zone

Actual values used in this setup:
- Verification ID: `EDA40985D409E05A74FE5600323A8814491270D6191F34EF23F3F2D6D89F3691`
- Static IP: `20.249.117.116`

```powershell
# TXT record — verifies ownership of the apex domain
az network dns record-set txt add-record --resource-group portofolio --zone-name sanamsitoula.com.np --record-set-name asuid --value "EDA40985D409E05A74FE5600323A8814491270D6191F34EF23F3F2D6D89F3691"

# TXT record — verifies ownership of the www subdomain
az network dns record-set txt add-record --resource-group portofolio --zone-name sanamsitoula.com.np --record-set-name asuid.www --value "EDA40985D409E05A74FE5600323A8814491270D6191F34EF23F3F2D6D89F3691"

# A record — points apex domain (sanamsitoula.com.np) to the Container App static IP
az network dns record-set a add-record --resource-group portofolio --zone-name sanamsitoula.com.np --record-set-name "@" --ipv4-address "20.249.117.116"

# CNAME record — points www subdomain to the Container App FQDN
az network dns record-set cname set-record --resource-group portofolio --zone-name sanamsitoula.com.np --record-set-name www --cname sanam-portfolio-app.bluestone-3038c682.koreacentral.azurecontainerapps.io
```

> Wait 5-10 minutes after this step before proceeding. Verify propagation with:
> ```powershell
> nslookup sanamsitoula.com.np 8.8.8.8
> ```
> Proceed to Step 10.6 only when `nslookup` returns `20.249.117.116`.

### Step 10.6: Bind custom domains to the Container App

```powershell
az containerapp hostname add --name sanam-portfolio-app --resource-group portofolio --hostname sanamsitoula.com.np

az containerapp hostname add --name sanam-portfolio-app --resource-group portofolio --hostname www.sanamsitoula.com.np
```

### Step 10.7: Verify the setup

```powershell
# Check DNS records are live
nslookup sanamsitoula.com.np
nslookup www.sanamsitoula.com.np

# List bound hostnames on Container App
az containerapp hostname list --name sanam-portfolio-app --resource-group portofolio --output table
```

> DNS propagation can take 10 minutes to 48 hours. The site will be live at `https://sanamsitoula.com.np` once propagation completes.

---

### Step 10.8: Enable managed TLS certificate (HTTPS)

After the domain is verified and bound, enable free HTTPS:

```powershell
az containerapp hostname bind --name sanam-portfolio-app --resource-group portofolio --hostname sanamsitoula.com.np --environment sanam-portfolio-env --validation-method CNAME

az containerapp hostname bind --name sanam-portfolio-app --resource-group portofolio --hostname www.sanamsitoula.com.np --environment sanam-portfolio-env --validation-method CNAME
```
