# Docker and Azure Hosting Setup

This guide shows how to run the portfolio locally using Docker and how to publish it into Azure using Azure Container Registry and Azure Container Apps.

---

## 1. Prerequisites

- Docker Desktop installed and running
- Azure CLI installed
- Logged in to Azure via CLI
- A valid Azure subscription
- Project root contains the static portfolio files (`index.html`, `styles.css`, `scene.js`, etc.)

---

## 2. Add Docker support to your project

1. Create a `Dockerfile` in the project root with the following content:

```dockerfile
# Use a lightweight nginx image to serve static files
FROM nginx:stable-alpine

# Remove default nginx content and copy the project files
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. Add a `.dockerignore` file to exclude unnecessary files from the image:

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

## 3. Build and run locally with Docker

1. Open a terminal in the project root:
   ```powershell
   cd d:\claude_project\sanamsitoula_portfolio
   ```

2. Build the Docker image:
   ```powershell
   docker build -t sanamsitoula-portfolio:latest .
   ```

3. Run the container:
   ```powershell
   docker run --rm -p 8080:80 sanamsitoula-portfolio:latest
   ```

4. Open this URL in your browser:
   ```text
   http://127.0.0.1:8080/
   ```

---

## 4. Publish to Azure Container Registry (ACR)

### Step 4.1: Log in to Azure

```powershell
az login
```

### Step 4.2: Create a resource group

```powershell
az group create --name sanam-portfolio-rg --location eastus
```

### Step 4.3: Create Azure Container Registry

```powershell
az acr create --resource-group sanam-portfolio-rg --name sanamsitoulaacr --sku Basic
```

### Step 4.4: Log in to ACR

```powershell
az acr login --name sanamsitoulaacr
```

### Step 4.5: Build and push the Docker image to ACR

```powershell
az acr build --registry sanamsitoulaacr --image sanamsitoula-portfolio:latest .
```

---

## 5. Host in Azure Container Apps

### Step 5.1: Create a Container Apps environment

```powershell
az containerapp env create --name sanam-portfolio-env --resource-group sanam-portfolio-rg --location eastus
```

### Step 5.2: Create the Azure Container App

```powershell
az containerapp create --name sanam-portfolio-app \
  --resource-group sanam-portfolio-rg \
  --environment sanam-portfolio-env \
  --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest \
  --target-port 80 \
  --ingress 'external'
```

### Step 5.3: Get the app URL

```powershell
az containerapp show --name sanam-portfolio-app --resource-group sanam-portfolio-rg --query properties.configuration.ingress.fqdn --output tsv
```


---

## 6. Update the container image after changes

1. Rebuild and push a new image:
   ```powershell
   az acr build --registry sanamsitoulaacr --image sanamsitoula-portfolio:latest .
   ```

2. Update the Container App to use the latest image:
   ```powershell
   az containerapp update --name sanam-portfolio-app --resource-group sanam-portfolio-rg --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
   ```

3. Optionally, restart the app if needed:
   ```powershell
   az containerapp restart --name sanam-portfolio-app --resource-group sanam-portfolio-rg
   ```

---

## 7. Troubleshooting

- If the container fails to start, inspect logs:
  ```powershell
  az containerapp logs show --name sanam-portfolio-app --resource-group sanam-portfolio-rg
  ```

- If you see port or health issues, verify the app is configured to use port `80`.
- If the site is not reachable, confirm the ingress type is `external`.

---

## 8. Notes

- This project is a static site, so `nginx` is sufficient to serve it.
- Azure Container Apps is useful when you want to host the Docker container in Azure without managing VMs.
- If you only need a static site, Cloudflare Pages or Azure Static Web Apps are simpler alternatives.
