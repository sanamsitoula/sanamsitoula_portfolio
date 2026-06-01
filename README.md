# Sanam Sitoula — Portfolio

A static portfolio website built with HTML, CSS, and JavaScript featuring a live 3D interactive cosmic scene.

![Cloudflare Deploy](https://github.com/sanamsitoula/sanamsitoula_portfolio/actions/workflows/deploy.yml/badge.svg)
![Azure Deploy](https://github.com/sanamsitoula/sanamsitoula_portfolio/actions/workflows/azure-deploy.yml/badge.svg)

---

## Live URLs

| Platform | URL | Status |
|---|---|---|
| Cloudflare Pages | [sanamsitoula-portfolio.pages.dev](https://sanamsitoula-portfolio.pages.dev) | ✅ Live (auto-deploys) |
| Azure Container App | [sanam-portfolio-app.bluestone-3038c682.koreacentral.azurecontainerapps.io](https://sanam-portfolio-app.bluestone-3038c682.koreacentral.azurecontainerapps.io) | ✅ Live (auto-deploys) |
| Custom Domain | [sanamsitoula.com.np](https://sanamsitoula.com.np) | 🔄 DNS propagating |

---

## Documentation

All setup guides are in this repository. Read them in order if setting up from scratch.

| Guide | What it covers |
|---|---|
| [DOCKER_AZURE_SETUP.md](DOCKER_AZURE_SETUP.md) | Docker local build, Azure Container Registry, Azure Container Apps, custom domain DNS, all errors encountered |
| [CICD_AZURE_SETUP.md](CICD_AZURE_SETUP.md) | Full CI/CD pipeline setup — GitHub Actions permissions, all 5 secrets, workflow files, troubleshooting, security |
| [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) | Cloudflare Pages deployment (alternative to Azure for static hosting) |

---

## Project Files

### Source files

| File | Type | Description |
|---|---|---|
| `index.html` | Page | Main entry point — all sections, layout, content |
| `styles.css` | Style | All styling — topbar, hero, cards, white panels, responsive |
| `scene.js` | Script | 3D cosmic scene built with Three.js |
| `scene-extras.js` | Script | Additional 3D objects — asteroids, comets, holographic panels |
| `tweaks-panel.jsx` | Script | Dev-only live tweaks panel (palette, density, visibility toggles) |
| `sanamsitoula_profile.jpg` | Image | Profile photo shown in hero section |
| `Profile.pdf` | Asset | Downloadable CV / resume |
| `Sanam Sitoula.pptx` | Asset | Portfolio presentation |
| `Sanam Sitoula_project manager.pdf` | Asset | Project manager CV variant |

### Config files

| File | Description |
|---|---|
| `Dockerfile` | Builds nginx:stable-alpine image serving the static site |
| `.dockerignore` | Excludes `.git`, `.wrangler`, PDFs, markdown from Docker image |
| `wrangler.toml` | Cloudflare Pages project configuration |
| `_headers` | HTTP response headers for Cloudflare Pages |
| `.gitignore` | Files excluded from git |

### Documentation files

| File | Description |
|---|---|
| `README.md` | This file — overview, structure, quick start, task tracker |
| `DOCKER_AZURE_SETUP.md` | Docker + Azure full setup guide (12 sections, 7 errors documented) |
| `CICD_AZURE_SETUP.md` | CI/CD pipeline guide (8 parts, full checklist) |
| `CLOUDFLARE_SETUP.md` | Cloudflare Pages deployment guide |

### GitHub Actions workflows

| File | Trigger | What it does | Time |
|---|---|---|---|
| `.github/workflows/deploy.yml` | Push to `master` | Deploys to Cloudflare Pages | ~30 sec |
| `.github/workflows/azure-deploy.yml` | Push to `master` | Builds Docker → pushes to ACR → updates Container App | ~3-4 min |

---

## Project Build History

Every major task completed in this project, in order:

| # | Task | Status | Guide |
|---|---|---|---|
| 1 | Static portfolio site — HTML, CSS, Three.js 3D scene | ✅ Done | — |
| 2 | Cloudflare Pages deployment + `wrangler.toml` | ✅ Done | [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) |
| 3 | Docker support — `Dockerfile`, `.dockerignore`, local run | ✅ Done | [DOCKER_AZURE_SETUP.md §4–5](DOCKER_AZURE_SETUP.md) |
| 4 | Azure Container Registry — created, image pushed manually | ✅ Done | [DOCKER_AZURE_SETUP.md §6](DOCKER_AZURE_SETUP.md) |
| 5 | Azure Container Apps — environment + app created, live URL | ✅ Done | [DOCKER_AZURE_SETUP.md §7](DOCKER_AZURE_SETUP.md) |
| 6 | Azure DNS Zone for `sanamsitoula.com.np` | ✅ Done | [DOCKER_AZURE_SETUP.md §12](DOCKER_AZURE_SETUP.md) |
| 7 | Nameservers updated at register.com.np to Azure DNS | ✅ Done | [DOCKER_AZURE_SETUP.md §12](DOCKER_AZURE_SETUP.md) |
| 8 | DNS records added (A, CNAME, TXT) in Azure DNS Zone | ✅ Done | [DOCKER_AZURE_SETUP.md §12](DOCKER_AZURE_SETUP.md) |
| 9 | Custom domain bind to Container App | 🔄 Waiting on DNS propagation | [DOCKER_AZURE_SETUP.md §12](DOCKER_AZURE_SETUP.md) |
| 10 | HTTPS managed certificate for custom domain | 🔄 After domain bind | [DOCKER_AZURE_SETUP.md §12](DOCKER_AZURE_SETUP.md) |
| 11 | GitHub Actions — Cloudflare CI/CD pipeline | ✅ Done + Working | [CICD_AZURE_SETUP.md](CICD_AZURE_SETUP.md) |
| 12 | GitHub Actions — Azure CI/CD pipeline | ✅ Done (secrets added, workflow fixed) | [CICD_AZURE_SETUP.md](CICD_AZURE_SETUP.md) |
| 13 | GitHub Actions permissions — Read/Write + Allow all actions | ✅ Done | [CICD_AZURE_SETUP.md §Part 1](CICD_AZURE_SETUP.md) |
| 14 | All 5 GitHub Secrets added | ✅ Done | [CICD_AZURE_SETUP.md §Part 2](CICD_AZURE_SETUP.md) |
| 15 | Portfolio redesign — white panels, hero photo, GitHub repos section, LinkedIn recommendations | ✅ Done | — |
| 16 | Profile photo added to hero section with split layout | ✅ Done | — |

---

## Azure Infrastructure

| Resource | Name | Region |
|---|---|---|
| Resource Group | `portofolio` | Korea Central |
| Container Registry | `sanamsitoulaacr` | Korea Central |
| Container Apps Environment | `sanam-portfolio-env` | Korea Central |
| Container App | `sanam-portfolio-app` | Korea Central |
| DNS Zone | `sanamsitoula.com.np` | Global |
| Service Principal | `sanam-cicd` | — |

> **Azure for Students restriction:** `eastus` region is blocked by subscription policy. All resources use `koreacentral`.

---

## GitHub CI/CD — Secrets Required

These 5 secrets must exist in **GitHub → Settings → Secrets and variables → Actions**:

| Secret Name | Where it is used |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages deployment |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Pages deployment |
| `ACR_USERNAME` | Docker login to Azure Container Registry |
| `ACR_PASSWORD` | Docker login to Azure Container Registry |
| `AZURE_CREDENTIALS` | `az login` via service principal JSON |

**Status: All 5 added ✅**

See [CICD_AZURE_SETUP.md §Part 2](CICD_AZURE_SETUP.md) for how to get each value.

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
docker run --rm -p 8081:80 sanamsitoula-portfolio:latest
```
Open `http://127.0.0.1:8081`

### Deploy (automatic — just push)

```powershell
git add .
git commit -m "describe your change"
git push
```
GitHub Actions deploys to **both Cloudflare and Azure** automatically. Watch progress in the **Actions** tab.

### Deploy to Azure (manual, if CI/CD is not working)

```powershell
docker build -t sanamsitoula-portfolio:latest .
docker tag sanamsitoula-portfolio:latest sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
az acr login --name sanamsitoulaacr
docker push sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
az containerapp update --name sanam-portfolio-app --resource-group portofolio --image sanamsitoulaacr.azurecr.io/sanamsitoula-portfolio:latest
```

---

## Contact Form — Email Setup (EmailJS + Gmail SMTP)

The contact form on the portfolio sends email **without a backend server** using [EmailJS](https://emailjs.com).

- **Sends from:** info.bhrikuty@gmail.com (Gmail SMTP)
- **Receives at:** sanam.ctaula@gmail.com
- **Free tier:** 200 emails/month — no database or server needed

### Step 1: Create EmailJS account

Go to [emailjs.com](https://emailjs.com) and sign up for a free account.

### Step 2: Add Gmail as an Email Service

1. In the EmailJS dashboard, go to **Email Services** → **Add New Service**
2. Select **Gmail**
3. Sign in with `info.bhrikuty@gmail.com`
4. Give it a name (e.g. `portfolio-gmail`)
5. Copy the **Service ID** shown (e.g. `service_abc123`)

### Step 3: Create an Email Template

1. Go to **Email Templates** → **Create New Template**
2. Set the template as follows:

| Field | Value |
|---|---|
| To Email | `sanam.ctaula@gmail.com` |
| From Name | `{{from_name}}` |
| Reply To | `{{from_email}}` |
| Subject | `Portfolio Contact: {{from_name}}` |
| Body | `Name: {{from_name}}`<br>`Mobile: {{from_mobile}}`<br>`Email: {{from_email}}`<br><br>`Message:`<br>`{{message}}` |

3. Save the template and copy the **Template ID** (e.g. `template_xyz789`)

### Step 4: Get your Public Key

1. Go to **Account** → **General**
2. Copy the **Public Key** (e.g. `user_AbCdEfGhIjK`)

### Step 5: Update index.html

Open [index.html](index.html) and find this block (near the bottom):

```javascript
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
```

Replace the placeholder values with your actual IDs:

```javascript
const EMAILJS_PUBLIC_KEY  = 'user_AbCdEfGhIjK';   // your public key
const EMAILJS_SERVICE_ID  = 'service_abc123';       // your service ID
const EMAILJS_TEMPLATE_ID = 'template_xyz789';      // your template ID
```

### Step 6: Commit and push

```powershell
git add index.html
git commit -m "feat: connect EmailJS for contact form"
git push
```

The form will now send emails from `info.bhrikuty@gmail.com` to `sanam.ctaula@gmail.com` whenever a visitor submits it.

### How it works (no backend)

```
Visitor fills form → EmailJS JS SDK → Gmail SMTP (info.bhrikuty@gmail.com) → sanam.ctaula@gmail.com
```

No server, no database, no PHP. EmailJS calls Gmail's SMTP API directly from the browser using your service credentials stored securely on their platform.

---

## Contact Details

| Channel | Value |
|---|---|
| WhatsApp | +977 9860793050 |
| Email | sanam.ctaula@gmail.com |
| LinkedIn | linkedin.com/in/sanam-sitoula-35438a122 |
| GitHub | github.com/sanamsitoula |

---

## Notes

- Static site — no backend, no database, no npm build step
- Docker image uses `nginx:stable-alpine` (~25 MB) to serve files
- Azure Container Apps auto-scales to zero when idle (free tier)
- Cloudflare Pages has a free tier with unlimited requests
- `sanamsitoula_profile.jpg` must not be in `.dockerignore` — it is served as a static asset
- Contact form requires EmailJS setup (see section above) — replace the 3 placeholder values in `index.html`
