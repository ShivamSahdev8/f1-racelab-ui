# 🏎️ F1 RaceLab UI

> A Formula 1 fan application built with a modern **micro-frontend architecture** on Angular 21 and deployed on AWS.

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055?logo=nx&logoColor=white)](https://nx.dev)
[![Module Federation](https://img.shields.io/badge/Module%20Federation-Runtime%20Manifest-1F6FEB)](https://module-federation.io)
[![AWS](https://img.shields.io/badge/AWS-S3%20%7C%20CloudFront%20%7C%20Cognito-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/features/actions)

**🔗 Live demo:** https://d7echn6hj4ca9.cloudfront.net/shell/index.html

**🧠 Backend infrastructure:** [f1-racelab-api](https://github.com/ShivamSahdev8/f1-racelab-api)

> **🚀 Try it instantly — no signup needed**
> Open **Prediction** (the first navigation tab) or choose **"Try a Free Prediction"** on the landing page. Guests can submit one prediction, then sign in to continue. A completed guest result is saved in that browser.

---

## Overview

F1 RaceLab is a Formula 1 companion app where fans can follow live timing, browse championship standings, read the latest news, and explore **illustrative race estimates** with an interactive strategy simulator.

The project is intentionally built as a set of **independently deployable micro-frontends (MFEs)** rather than a single monolithic SPA, to demonstrate how large frontend systems are structured and shipped in production.

---

## Architecture

A **shell** host application loads six remote MFEs at runtime through Webpack Module Federation. Instead of hard-coding remote URLs at build time, the shell reads a **runtime manifest** (`module-federation.manifest.json`), so each MFE can be built and deployed on its own and the environment (local vs. production) is just a different manifest file.

```
┌──────────────────────────────────────────────────────────┐
│                        shell (host)                        │
│   navbar · routing · runtime manifest · shared singletons  │
└───────────────┬──────────────────────────────────────────┘
                │ loadRemoteModule (Module Federation)
   ┌────────────┼─────────────┬─────────────┬───────────────┐
   ▼            ▼             ▼             ▼               ▼
auth-mfe    live-mfe     stats-mfe     news-mfe    fantasy-mfe / predictor-mfe
(Cognito)  (timing)    (standings)    (RSS feed)   (browser simulator)

           shared libraries
   ┌──────────────────────────────────────────────┐
   │  shared-models  · TypeScript interfaces        │
   │  shared-ui      · EventBus, AuthState, config  │
   │  f1-data-client · OpenF1 / Ergast / estimates │
   └──────────────────────────────────────────────┘
```

### Applications

| App | Port | Responsibility |
|-----|------|----------------|
| `shell` | 4200 | Host: navbar, routing, auth state, MFE orchestration |
| `auth-mfe` | 4201 | Login, signup, email verification, forgot password (Cognito) |
| `live-mfe` | 4202 | Live timing board — positions, tyres, gaps |
| `stats-mfe` | 4203 | Driver & constructor championship standings |
| `fantasy-mfe` | 4204 | Fantasy league (guest preview + member view) |
| `predictor-mfe` | 4205 | Browser race estimator + strategy simulator |
| `news-mfe` | 4206 | Latest F1 news feed |

### Shared libraries

| Library | Purpose |
|---------|---------|
| `@f1-racelab/shared-models` | Pure TypeScript domain interfaces (Driver, Race, Standing, etc.) |
| `@f1-racelab/shared-ui` | Cross-MFE `EventBusService`, `AuthStateService`, Cognito config |
| `@f1-racelab/f1-data-client` | Data access for OpenF1, Ergast/Jolpica, news, and local predictions |

---

## Tech Stack

- **Framework:** Angular 21 (standalone components, signals)
- **Monorepo:** Nx
- **Micro-frontends:** Webpack Module Federation (runtime manifest)
- **Auth:** Amazon Cognito (via AWS Amplify)
- **Hosting:** Amazon S3 (static) + CloudFront (HTTPS, CDN, SPA routing)
- **CI/CD:** GitHub Actions
- **Data sources:** OpenF1 (live), Ergast/Jolpica (historical & standings)

---

## Key Features

- 🧩 **True micro-frontend setup** — six remotes loaded at runtime, each independently buildable and deployable
- 🔮 **Race estimator** — illustrative estimates based on current standings and tyre, weather, downforce, and strategy inputs; computation runs in the browser
- 🏁 **Race overview** — auto-generated top contenders for the upcoming Grand Prix
- 📊 **Live timing & standings** — real F1 data
- 🔐 **Full auth flow** — signup with favourite-team selection, email verification, session restore
- 📱 **Mobile-friendly** — served over HTTPS via CloudFront

---

## Prediction access and running costs

- Prediction is the main app entry point. The strategy simulator and 3D car are available before sign-in; opening the page, changing settings, and switching tabs do not generate predictions.
- Guests get one successful estimate per browser. A standings failure leaves the trial available. The completed result and its setup remain available after reload.
- After the trial, visitors can keep exploring the car and must sign in to request another prediction. The old shared guest-account login has been removed.
- Race overviews require sign-in and an explicit **Generate race overview** action. Identical member estimates share work and reuse results for 15 minutes within the app session.
- Web Locks coordinate guest trial claims across tabs where supported. Storage failures require sign-in. The browser allowance is a UX control; clearing storage or using a different browser can bypass it.

Prediction and overview calculations no longer call Amazon Bedrock, Lambda, API Gateway, or DynamoDB. They fetch standings and calendar data directly from Jolpica, then calculate estimates in the browser. The numbers are illustrative and are not calibrated probabilities. The deployed backend has its Bedrock limit set to zero. Existing S3, CloudFront, Cognito, and other AWS resources can still incur charges; this change does not guarantee a zero AWS bill.

## Getting Started

### Prerequisites

- Node.js 22 (LTS)
- npm

### Install

```bash
git clone https://github.com/ShivamSahdev8/f1-racelab-ui.git
cd f1-racelab-ui
npm install
```

### Run all apps locally

```bash
npx nx run-many --target=serve --all --parallel
```

Then open **http://localhost:4200**.

Run a single app:

```bash
npx nx serve predictor-mfe
```

### Build for production

```bash
# each app is built with its own base-href
npx nx build shell --base-href /shell/
npx nx build predictor-mfe --base-href /predictor-mfe/
# ...etc
```

---

## Deployment

Deployment is automated with **GitHub Actions** on every push to `main`:

1. Build each MFE with its `--base-href`
2. Swap in the production Module Federation manifest (CloudFront URLs)
3. Sync each build to its folder in the S3 bucket
4. Invalidate the CloudFront distribution

CloudFront serves everything over HTTPS and rewrites 403/404s to `shell/index.html` so Angular client-side routing works on direct URL access.

> AWS credentials are stored as repository secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and never committed.

---

## Project Structure

```
f1-racelab-ui/
├── apps/
│   ├── shell/              # host application
│   ├── auth-mfe/
│   ├── live-mfe/
│   ├── stats-mfe/
│   ├── fantasy-mfe/
│   ├── predictor-mfe/
│   └── news-mfe/
├── libs/
│   ├── shared-models/
│   ├── shared-ui/
│   └── f1-data-client/
└── .github/workflows/      # CI/CD
```

---

## Roadmap

- [ ] Full fantasy league (driver picker, scoring, leaderboard)
- [ ] Live timing fallback when OpenF1 real-time is unavailable
- [ ] Team-color theming based on the user's favourite team
- [ ] AI chatbot for F1 questions (RAG over historical data)

---

## Acknowledgements

- F1 data from [OpenF1](https://openf1.org) and [Ergast / Jolpica](https://api.jolpi.ca)
- Circuit layouts from open-source SVG collections
- Browser-based estimates use current championship standings from Jolpica

---

*This is an unofficial, personal project built for learning and is not affiliated with Formula 1.*
