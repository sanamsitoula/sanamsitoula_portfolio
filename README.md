# Sanam Sitoula Portfolio

A static portfolio project built with HTML, CSS, and JavaScript.

## Preview
Open `index.html` in your browser, or run a local server for full static site behavior.

## Prerequisites
- A modern web browser
- Python 3 (for local server) or any static web server

## Run locally
1. Open a terminal in the project folder:
   ```powershell
   cd d:\claude_project\sanamsitoula_portfolio
   ```
2. Start a local server:
   ```powershell
   python -m http.server 8000
   ```
3. Open your browser and visit:
   ```text
   http://127.0.0.1:8000/
   ```

## Project files
- `index.html` — main site entry point
- `styles.css` — styling for the site
- `scene.js` — 3D scene and interactive behavior
- `scene-extras.js` — additional scene functionality
- `tweaks-panel.jsx` — controls panel for scene tweaking

## Deploy to Cloudflare Pages
This repository is configured for Cloudflare Pages deployment.

To deploy from the project root, use:
```powershell
npx wrangler pages deploy . --project-name=sanamsitoula-portfolio --branch=master
```

## Run with Docker locally
1. Build the Docker image:
   ```powershell
docker build -t sanamsitoula-portfolio:latest .
```
2. Run the container on port 8080:
   ```powershell
docker run --rm -p 8080:80 sanamsitoula-portfolio:latest
```
3. Open your browser and visit:
   ```text
http://127.0.0.1:8080/
```

## Publish to Azure Container Registry and Azure Container Apps
### 1. Install and sign in
```powershell
az login
```

### 2. Create a resource group
```powershell
az group create --name sanam-portfolio-rg --location eastus
```

### 3. Create Azure Container Registry (ACR)
```powershell
az acr create --resource-group sanam-portfolio-rg --name sanamsitoulaacr --sku Basic
```

### 4. Build and push the Docker image to ACR
```powershell
az acr build --registry sanamsitoulaacr --image sanamsitoula-portfolio:latest .
```

### 5. Create an Azure Container Apps environment
```powershell
az containerapp env create --name sanam-portfolio-env --resource-group sanam-portfolio-rg --location eastus
```

### 6. Create the Azure Container App
```powershell
az containerapp create --name sanam-portfolio-app --resource-group sanam-portfolio-rg --environment sanam-portfolio-env --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest --target-port 80 --ingress 'external'
```

### 7. Get the public URL
```powershell
az containerapp show --name sanam-portfolio-app --resource-group sanam-portfolio-rg --query properties.configuration.ingress.fqdn --output tsv
```

## Notes
- This project is static and does not require npm or build tools.
- Use Docker locally when you want a consistent, production-like environment.
- Use Azure Container Apps to host the site as a containerized static web app.
