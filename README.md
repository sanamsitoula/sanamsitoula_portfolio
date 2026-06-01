# Sanam Sitoula — Portfolio

A static portfolio website built with HTML, CSS, and JavaScript featuring a 3D interactive scene.

**Live site:** [sanamsitoula.com.np](https://sanamsitoula.com.np)
**Azure Container App:** [sanam-portfolio-app.bluestone-3038c682.koreacentral.azurecontainerapps.io](https://sanam-portfolio-app.bluestone-3038c682.koreacentral.azurecontainerapps.io)

![Deploy](https://github.com/sanamsitoula/sanamsitoula_portfolio/actions/workflows/azure-deploy.yml/badge.svg)

---

## Documentation

| Guide | Description |
|---|---|
| [DOCKER_AZURE_SETUP.md](DOCKER_AZURE_SETUP.md) | How to build with Docker, push to ACR, deploy to Azure Container Apps, and set up custom domain |
| [CICD_AZURE_SETUP.md](CICD_AZURE_SETUP.md) | How to set up GitHub Actions CI/CD pipeline for automatic deployment to Azure on every push |
| [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) | How to deploy to Cloudflare Pages (alternative static hosting) |

---

## Project Structure

### Files and folders

| Path | Type | Description |
|---|---|---|
| `index.html` | Page | Main entry point of the portfolio site |
| `styles.css` | Style | All CSS styling for the site |
| `scene.js` | Script | 3D scene setup and interactive behavior (Three.js) |
| `scene-extras.js` | Script | Additional scene helpers and effects |
| `tweaks-panel.jsx` | Script | Development-only controls panel for tweaking the 3D scene |
| `Dockerfile` | Config | Builds an nginx image that serves the static site |
| `.dockerignore` | Config | Excludes unnecessary files from the Docker image |
| `wrangler.toml` | Config | Cloudflare Pages deployment configuration |
| `_headers` | Config | HTTP response headers for Cloudflare Pages |
| `.gitignore` | Config | Files excluded from git tracking |
| `Profile.pdf` | Asset | Downloadable CV/resume |
| `Sanam Sitoula.pptx` | Asset | Portfolio presentation file |
| `Sanam Sitoula_project manager.pdf` | Asset | Project manager CV variant |

### Documentation files

| Path | Description |
|---|---|
| `README.md` | This file — project overview, structure, and quick start |
| `DOCKER_AZURE_SETUP.md` | Full Docker + Azure setup guide with all errors and solutions |
| `CICD_AZURE_SETUP.md` | GitHub Actions CI/CD pipeline guide for Azure |
| `CLOUDFLARE_SETUP.md` | Cloudflare Pages deployment guide |

### GitHub Actions workflows

| Path | Trigger | What it does |
|---|---|---|
| `.github/workflows/azure-deploy.yml` | Push to `master` | Builds Docker image, pushes to ACR, deploys to Azure Container Apps |
| `.github/workflows/deploy.yml` | Push to `master` | Deploys to Cloudflare Pages (original workflow) |

---

## How We Are Building This Project

This project has evolved across multiple tasks in the same repository:

| Task | Status | Guide |
|---|---|---|
| Static portfolio site (HTML/CSS/JS) | ✅ Done | — |
| Local Docker build and run | ✅ Done | [DOCKER_AZURE_SETUP.md §5](DOCKER_AZURE_SETUP.md) |
| Push Docker image to Azure Container Registry | ✅ Done | [DOCKER_AZURE_SETUP.md §6](DOCKER_AZURE_SETUP.md) |
| Deploy to Azure Container Apps | ✅ Done | [DOCKER_AZURE_SETUP.md §7](DOCKER_AZURE_SETUP.md) |
| Custom domain (sanamsitoula.com.np) via Azure DNS | 🔄 In progress (DNS propagating) | [DOCKER_AZURE_SETUP.md §12](DOCKER_AZURE_SETUP.md) |
| GitHub Actions CI/CD pipeline → Azure | ✅ Done | [CICD_AZURE_SETUP.md](CICD_AZURE_SETUP.md) |
| Cloudflare Pages deployment | ✅ Done | [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) |
| HTTPS certificate for custom domain | 🔄 Pending DNS propagation | [DOCKER_AZURE_SETUP.md §12](DOCKER_AZURE_SETUP.md) |

---

## Quick Start

### Run locally (no Docker)

```powershell
cd d:\claude_project\sanamsitoula_portfolio
python -m http.server 8000
```
Open `http://127.0.0.1:8000`

### Run locally with Docker

```powershell
docker build -t sanamsitoula-portfolio:latest .
docker run --rm -p 8080:80 sanamsitoula-portfolio:latest
```
Open `http://127.0.0.1:8080`

### Deploy to Azure (manual)

```powershell
docker build -t sanamsitoula-portfolio:latest .
docker tag sanamsitoula-portfolio:latest sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
az acr login --name sanamsitoulaacr
docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
az containerapp update --name sanam-portfolio-app --resource-group portofolio --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

### Deploy to Azure (automatic via CI/CD)

```powershell
git add .
git commit -m "your change description"
git push
```
GitHub Actions handles the rest automatically. Watch progress in the **Actions** tab on GitHub.

---

## Azure Infrastructure

| Resource | Name | Region |
|---|---|---|
| Resource Group | `portofolio` | Korea Central |
| Container Registry | `sanamsitoulaacr` | Korea Central |
| Container Apps Environment | `sanam-portfolio-env` | Korea Central |
| Container App | `sanam-portfolio-app` | Korea Central |
| DNS Zone | `sanamsitoula.com.np` | (Global) |

> **Subscription:** Azure for Students — uses `koreacentral` region due to policy restrictions on `eastus`.

---

## Notes

- This is a static site — no backend, no database, no build step required
- Docker image uses `nginx:stable-alpine` to serve the static files
- Azure Container Apps auto-scales to zero when idle (free tier)
- The CI/CD pipeline runs on every push to `master` — avoid pushing broken code directly
