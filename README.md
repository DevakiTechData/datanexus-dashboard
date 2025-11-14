# DataNexus Dashboard

DataNexus is Saint Louis University’s analytics command center for alumni engagement and employer partnerships. It bundles a modern React experience, a secure Express API, and curated CSV data sources to deliver descriptive, diagnostic, and predictive insights with role-based access.

---

## Table of Contents
- [1. Application Architecture](#1-application-architecture)
  - [1.1 High-Level Stack](#11-high-level-stack)
  - [1.2 Runtime Flow](#12-runtime-flow)
  - [1.3 Authentication & Authorization](#13-authentication--authorization)
  - [1.4 Data Refresh & Storage](#14-data-refresh--storage)
  - [1.5 Security & Hardening](#15-security--hardening)
- [2. Functional Walkthrough](#2-functional-walkthrough)
  - [2.1 Entry & Shared UI](#21-entry--shared-ui)
  - [2.2 Dashboards](#22-dashboards)
  - [2.3 Predictions Hub](#23-predictions-hub)
  - [2.4 Community & Support Pages](#24-community--support-pages)
  - [2.5 Admin Console](#25-admin-console)
  - [2.6 DataNexus Assistant (Chatbot)](#26-datanexus-assistant-chatbot)
  - [2.7 Navigation & Role Visibility](#27-navigation--role-visibility)
- [3. Analytics & Calculations](#3-analytics--calculations)
  - [3.1 Data Sources](#31-data-sources)
  - [3.2 Alumni Dashboard Metrics](#32-alumni-dashboard-metrics)
  - [3.3 Employer Dashboard Metrics](#33-employer-dashboard-metrics)
  - [3.4 Predictive Outlook Models](#34-predictive-outlook-models)
  - [3.5 Visualizations & Libraries](#35-visualizations--libraries)
  - [3.6 Machine Learning & Python Tooling](#36-machine-learning--python-tooling)
  - [3.7 Synthetic Data Generation](#37-synthetic-data-generation)
  - [3.8 Star Schema & ERD](#38-star-schema--erd)
- [4. Repository & Folder Structure](#4-repository--folder-structure)
- [5. Local Development](#5-local-development)
- [6. Deployment Notes](#6-deployment-notes)
- [7. Security, Roles & Credentials](#7-security-roles--credentials)
- [7. Update History](#7-update-history)
- [8. Troubleshooting & FAQ](#8-troubleshooting--faq)

---

## 1. Application Architecture

### 1.1 High-Level Stack
| Layer | Description |
| ----- | ----------- |
| **Frontend** | React 18 + Vite build pipeline, TailwindCSS for theming, Recharts/Plotly for charts, React Router for navigation, and a context-driven auth client. |
| **Backend API** | Express 4 server providing JWT authentication, CSV persistence (admin tables + inquiries), image uploads via Multer, and assistant query logic. |
| **Data Layer** | Source-of-truth CSVs (dimension & fact tables) under `datanexus-dashboard/public/`, uploaded imagery in `public/assets`, event inquiries captured in `server/data/event_inquiries.xlsx`. |
| **Assistant Layer** | Currently a curated Q&A knowledge base in the React app (previous RAG hooks remain ready for future integration with vector search). |

### 1.2 Runtime Flow
1. User hits the React client served from Vite (dev) or static hosting (prod).
2. Authenticated routes request JWT-protected data from the Express API using `fetch` helpers in `src/services/adminApi.js`.
3. Analytics pages load CSVs directly from `public/` and parse them with PapaParse before transforming metrics.
4. Admin uploads or CRUD actions hit `/api/admin/*` routes which persist to CSV files or image directories.
5. The Assistant references the in-memory knowledge base to respond instantly with curated analysis.

### 1.3 Authentication & Authorization
- Login POST `/api/auth/login` verifies credentials stored in `server/data/users.json` and issues an HMAC-signed JWT (`role`, `username`).
- `AuthContext` persists the token in `localStorage` and exposes `role` to `ProtectedRoute` wrappers.
- Roles (`admin`, `alumni`, `employer`) gate routes, navigation groups, and admin mutations.
- `Authorization: Bearer <token>` headers are required for `/api/admin/*` endpoints.

### 1.4 Data Refresh & Storage
- CSVs: Updated via admin table CRUD or by replacing files in `public/`. PapaParse keeps type fidelity when reading/writing.
- Event inquiries append rows to `server/data/event_inquiries.csv`; the file is auto-created with headers.
- Images: Uploads stored under `public/assets/<category>/` with auto-generated safe filenames.
- Assistant KB: Pre-loaded within the React bundle; future-ready for calling `/api/assistant/query` once a RAG pipeline is provisioned.

### 1.5 Security & Hardening
- HTTPS recommended end-to-end; all tokens transmitted over TLS.
- JWTs are signed with `HS256` using `JWT_SECRET`; rotation supported through env vars.
- Tokens expire per `JWT_EXPIRY` (default 2h); frontend auto-clears on invalid token.
- Protected API routes validate bearer token before touching the filesystem.
- Multer upload pipeline sanitizes filenames, enforces category-level directories, and prevents path traversal.
- Inquiry persistence now uses CSV only—removing the vulnerable `xlsx` dependency flagged in GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9.
- CORS defaults to open in dev; restrict origins for production.
- No passwords are stored in plaintext beyond the seeded demo data—replace `users.json` with hashed entries before production.

---

## 2. Functional Walkthrough

### 2.1 Entry & Shared UI
- **Login** – Authenticates users and redirects based on role; errors surface inline.
- **Navbar** – Dynamic link groups (Dashboards, Community, Insights, Connect, Admin). Predictive Outlook is admin-only.
- **Global styling** – Tailwind utility classes tuned to SLU blue/gold color palette with responsive design baked into every page.

### 2.2 Dashboards
- **Alumni Dashboard** (`/dashboards/alumni`)
  - KPI ribbon for engaged alumni, conversion %, satisfaction, mentorship lift.
  - Engaging visuals: Mentorship impact matrix, gender split donut + mini-cards, retention tables with callouts, event performance combo charts, engagement funnel, monthly trend summary.
  - Each visual includes narrative analysis blocks that translate numbers into actions.
- **Employer Dashboard** (`/dashboards/employers`)
  - KPIs for active employers, hires, offer rates, and pipeline health.
  - Conveys pipeline conversion waterfall, employer health score scatter, diversity mixes, talent funnel, industry hiring blend, risk alerts, and more.
  - “Data Scientist Predictions” panel surfaces forward-looking recommendations for partnerships.

### 2.3 Predictions Hub
- **Predictive Outlook** (`/predictions`) – Admin-only tabbed layout splitting Alumni vs Employer forecasts.
- **Alumni Predictions** – Forecast charts (engagement score trajectories, retention outlook, program momentum) with narrative insights and confidence commentary.
- **Employer Predictions** – Quarterly hiring projections, growth potential matrix, risk watchlists pointing to likely churn, plus recommended actions.

### 2.4 Community & Support Pages
- **Gallery** – Hero carousel and filterable grid, driven by `GALLERY_ITEMS`. Admins can upload supporting imagery via the Image Library.
- **Events** – Lists upcoming programming, multi-audience filters, call-to-action to submit inquiries.
- **Contact / Inquiry** – Stores submissions in the CSV-backed inquiry log and surfaces confirmation messaging.

### 2.5 Admin Console
- **Data Tables** – CRUD interface for student, employer, contact, event, date, and alumni engagement tables. Entries persist to CSV with schema validation (primary-key enforcement, column mapping).
- **Image Library** – Category-based upload/delete manager backed by Multer. Generated URLs are ready for use in gallery/dashboards.
- **System Overview** – Summaries of dataset freshness, row counts, and quick links to manage assets.

### 2.6 DataNexus Assistant (Chatbot)
- Inline floating assistant accessible from any page.
- Currently powered by a curated knowledge base of alumni/employer analytics takeaways and predictive summaries (no backend dependency required).
- Handles FAQs such as engagement forecast meaning, retention calculations, program growth expectations, pipeline health, diversity mix, and churn mitigation steps.
- Future-ready: the `/api/assistant/query` endpoint remains implemented for re-enabling a true RAG pipeline once the vector store is connected.

### 2.7 Navigation & Role Visibility
| Nav Group | Route | Visible To | Output Summary |
| --------- | ----- | ---------- | --------------- |
| **Home** | `/` | Public | Landing hero, mission statement, quick links to dashboards and community pages. |
| **Dashboards → Alumni** | `/dashboards/alumni` | Admin, Alumni | Alumni KPIs, engagement funnel, retention analysis, program insights, narrative guidance. |
| **Dashboards → Employers** | `/dashboards/employers` | Admin, Employer | Employer KPIs, pipeline waterfall, hiring trends, diversity mix, churn alerts, predictions panel. |
| **Community → Gallery** | `/gallery` | Admin, Alumni, Employer | Filterable gallery of alumni/employer imagery, event spotlights. |
| **Community → Events** | `/events` | Admin, Alumni, Employer | Upcoming events, RSVP calls-to-action, audience filters. |
| **Community → Contact** | `/contact` | Admin, Alumni, Employer | Inquiry form writing to CSV-backed log; confirmation message on success. |
| **Insights → Predictive Outlook** | `/predictions` | Admin | Tabbed forecasts (Alumni, Employers) with charts and recommended actions. |
| **Connect → Mentorship & Resources** | `/connect` (if enabled) | Authenticated users | Resource cards, mentorship program details, quick contacts. |
| **Admin** | `/admin` | Admin | Data tables CRUD, image library, system overview, analytics operations checklist. |
| **Assistant** | Floating button | Authenticated users | Q&A window surfacing analytics explanations and recommended actions. |

> Navigation items hide automatically when the signed-in role is not authorized. Attempting to hit a restricted route redirects to `/login`.

---

## 3. Analytics, Models & Data

### 3.1 Data Sources
All CSVs reside under `datanexus-dashboard/public/`:
- `Dim_Students.csv` – individual program data (degree, cohort, demographics).
- `dim_employers.csv` – employer profiles with industry, location, size.
- `dim_event.csv` – events with categories, audiences, attendance.
- `fact_alumni_engagement.csv` – engagement facts (touchpoints, scores, conversions).
- `dim_date.csv` – date dimension enabling time-series aggregation.
- `dim_contact.csv` – primary employer contacts.

### 3.2 Alumni Dashboard Metrics
| Insight | Calculation | Notes |
| ------- | ----------- | ----- |
| Engagement Funnel | Counts per stage (awareness → events → mentorship → hiring) and conversion rates between stages. | Percentages derived with safe divide + fallback to 0. |
| Cohort Retention | Aggregates alumni retained per cohort year, Year+1 to Year+3 retention rates. | Uses moving weighted averages to smooth volatility. |
| Program Performance Leaderboard | Scores programs by engagement uplift, mentor participation, and hiring outcomes. | Weighted composite index normalized 0–100. |
| Mentorship Impact | Compares placement success between mentored vs non-mentored alumni. | Delta highlighted in mini-cards. |
| Gender & Degree Mix | Grouped counts with share of total. | Rendered as donut & horizontal bars plus “top degree” callout. |
| Event Effectiveness | Attendance vs engagement score line overlay. | Highlights top performing event types. |
| Engagement Trend | 12-month rolling average of engagement score. | Narrative summary auto-generates with min/max detection. |

### 3.3 Employer Dashboard Metrics
| Insight | Calculation | Notes |
| ------- | ----------- | ----- |
| Pipeline Conversion | Stage outputs from outreach → talent pipeline → interview → offer. | Funnel/service waterfall with cumulative conversion line. |
| Employer Health Scorecard | Weighted blend of hires, satisfaction, engagement touches, and future requisitions. | Plotted as bubble chart sized by headcount. |
| Diversity Mix | Gender, visa, and employment type distributions. | Donut / stacked bars with text summaries. |
| Hires by Industry | Bar + line combo (absolute hires + share of total). | Highlights top growth industry. |
| Hiring Trend | Quarterly hires with textual context (QoQ movement). | Forecast overlay indicates forward expectations. |
| Churn Risk Alert | Flags employers trending down in touchpoints and open requisitions. | Narrative and recommended actions. |
| Predictions Panel | Cards for expected role openings, retention focus, and partnership reminders. | Derived from trend analysis + qualitative inputs. |

### 3.4 Predictive Outlook Models
- **Time-Series Forecasts** – Exponential smoothing / moving average projections created in-code using recent 6–12 month windows.
- **Retention Projections** – Weighted by most recent cohorts, sensitivity to event participation scoring.
- **Program Momentum** – Growth rate = (forecast engagement – current engagement) / current. Flags >=12% as high momentum.
- **Employer Growth Potential** – Combines historic hiring velocity, pipeline volume, and expressed demand to produce low/medium/high tiers.
- **Risk Watchlists** – Score drop triggers when touches fall >15% quarter-over-quarter and requisitions shrink simultaneously.

### 3.5 Visualizations & Libraries
- **Recharts** – Primary charting library for funnels, combo charts, bar/line combos, scatter plots, donuts.
- **Plotly** – Used where advanced interactivity is needed (e.g., predictions heatmaps).
- **Custom Components** – `ChartCard` standardizes layout, titles, heights, and caption areas so every visual stays aligned.
- **Narrative Blocks** – Each card presents a “What it means” summary to make the analytics accessible to new viewers.

### 3.6 Machine Learning & Python Tooling
- Initial modeling notebooks live under `/scripts` and leverage **Python 3.11**, **NumPy**, **Pandas**, and **scikit-learn** for exploratory forecasting.
- Predictive outlook curves use exponential smoothing prototypes authored in Python before being ported to JavaScript.
- Clustering experiments (KMeans, DBSCAN) were run on employer engagement vectors to identify partnership tiers; findings inform the “Growth Potential” categories displayed in the employer predictions page.
- Model artifacts are exported as JSON configuration files that the frontend references for deterministic mock projections while the production ML pipeline matures.

### 3.7 Synthetic Data Generation
- `scripts/seed_data.py` (Python) uses **Faker** to fabricate anonymized student, employer, and contact records while preserving realistic distributions.
- NumPy random generators apply seeded noise across engagement scores, hiring counts, and satisfaction ratings to ensure reproducibility.
- Synthetic CSVs were originally persisted to a **PostgreSQL** staging database; nightly exports generated the flat files committed to `public/`.
- When bootstrapping new cohorts, rerun the Faker pipeline to produce aligned dimension rows before ingesting into the dashboards.

### 3.8 Star Schema & ERD
- DataNexus analytics follow a classic **star schema**:
  - **Fact Table:** `fact_alumni_engagement` capturing `student_key`, `employer_key`, `event_key`, `date_key`, `engagement_score`, `mentorship_flag`, `hiring_outcome`, `applications_submitted`, `hours_engaged`.
  - **Dimension Tables:**
    - `Dim_Students` (student demographics, program, degree level, cohort year)
    - `dim_employers` (industry, size, headquarters, hiring preferences)
    - `dim_event` (event category, audience type, location, modality)
    - `dim_date` (date attributes: day, week, month, quarter, academic term)
    - `dim_contact` (primary employer contacts, titles, relationship stage)
- **Relationships:** all dimensions connect to the fact table via surrogate keys (`*_key`). `dim_event` also references `dim_date` for event start/end.
- **ERD Overview:**
  - Central fact table with one-to-many links out to each dimension.
  - Composed in SQL initially (PostgreSQL schema), later exported to CSV for static hosting.
  - Supports drilldowns by program, cohort, employer industry, event type, and time period.
- The ERD diagram (draw.io) is stored in `docs/erd-star-schema.drawio` and illustrates these relationships for quick onboarding.

---

## 4. Repository & Folder Structure
```
.
├── datanexus-dashboard/
│   ├── public/
│   │   ├── assets/
│   │   │   ├── alumni/
│   │   │   ├── employers/
│   │   │   ├── hero/
│   │   │   └── uploads/         # Admin-uploaded imagery
│   │   └── *.csv                # Dimensional + fact tables consumed by dashboards
│   ├── src/
│   │   ├── components/          # ChartCard, Navbar, AssistantChat, layout pieces
│   │   ├── context/             # AuthContext (JWT storage, hooks)
│   │   ├── pages/               # Dashboards, Predictions, Admin, Gallery, Events, Login, Contact
│   │   ├── services/            # adminApi.js for authenticated fetch helpers
│   │   └── router config        # Defined in App.jsx using React Router
│   ├── scripts/                 # Data seeding utilities
│   └── vite.config.js           # Dev server & proxy config
├── server/
│   ├── data/
│   │   ├── event_inquiries.xlsx # Auto-created workbook of inquiry submissions
│   │   └── users.json           # Demo accounts with roles
│   ├── index.js                 # Express API, JWT auth, CSV CRUD, assistant endpoint
│   └── package.json
├── scripts/                     # Legacy importers/transformers
└── README.md                    # Project documentation
```

---

## 5. Local Development

### Prerequisites
- Node.js 20+
- npm 10+
- Git

### 1. Install Dependencies
```bash
# Root tooling
npm install

# Backend API
cd server
npm install

# Frontend
cd ../datanexus-dashboard
npm install
```

### 2. Configure Environment Variables
Create `.env` files if you need to override defaults:
```
# server/.env
PORT=5002
JWT_SECRET=change-me
JWT_EXPIRY=4h

# datanexus-dashboard/.env
VITE_API_BASE_URL=http://localhost:5002
```
> Ports 5000/5001 can be occupied by macOS Control Center. Port 5002 avoids conflicts.

### 3. Start Servers
```bash
# Terminal 1 – Express API
datanexus-dashboard/server> PORT=5002 npm run dev

# Terminal 2 – Vite frontend
datanexus-dashboard> npm run dev -- --port 5173
```
Visit `http://localhost:5173`. The frontend reads `VITE_API_BASE_URL` for API calls.

### 4. Linting
```bash
cd datanexus-dashboard
npm run lint
```

---

## 6. Deployment Notes

### Frontend (Vite)
```bash
cd datanexus-dashboard
npm run build   # outputs to dist/
```
- Host on Netlify, Vercel, Azure Static Web Apps, etc.
- Build command: `npm run build`
- Publish directory: `datanexus-dashboard/dist`
- Environment: `VITE_API_BASE_URL=https://your-api-domain`

### Backend (Express API)
```bash
cd server
npm run start   # production start (node index.js)
```
- Render/Railway/Fly.io/Heroku friendly.
- Configure environment variables (`PORT`, `JWT_SECRET`, `JWT_EXPIRY`).
- Ensure persistent storage or migrate CSV persistence to a managed database if scaling beyond single instance.

### CORS
Limit allowed origins before going live:
```js
app.use(cors({ origin: ['https://app.datanexus.ai'] }));
```

---

## 7. Security, Roles & Credentials

### 7.1 Role Matrix
| Role | Description | Key Permissions |
| ---- | ----------- | ---------------- |
| **Admin** | DataNexus operations team | Access to all dashboards, predictive outlook, admin console, image uploads, CSV CRUD, assistant. |
| **Alumni** | Engaged alumni users | Alumni dashboard, gallery, events, contact, assistant tailored to alumni data. |
| **Employer** | Employer partners | Employer dashboard, gallery, events, contact, assistant tailored to employer insights. |

### 7.2 Demo Login Accounts
Seeded credentials live in `server/data/users.json` for local testing:
| Role | Username | Password |
| ---- | -------- | -------- |
| Admin | `admin` | `admin123` |
| Alumni | `alumni` | `alumni123` |
| Employer | `employer` | `employer123` |

> Replace demo accounts and enable password hashing before deploying beyond sandbox environments.

---

## 8. Update History
| Date | Area | Summary |
| ---- | ---- | ------- |
| Week 1 | Project recovery | Restored React app styling, re-linked assets, fixed login errors. |
| Week 2 | Auth & API | Added JWT auth, protected routes, role-aware navigation, and initial inquiry persistence. |
| Week 9 | Security hardening | Replaced Excel persistence with CSV to remove the `xlsx` dependency flagged for high-severity vulnerabilities. |
| Week 3 | Dashboards overhaul | Replaced placeholder charts with 10+ descriptive analytics each for alumni/employer dashboards; added narrative analysis. |
| Week 4 | Visual polish | Introduced `ChartCard`, improved responsive layouts, ensured labels and data fit within chart bounds. |
| Week 5 | Predictive Outlook | Built new `/predictions` section with admin-only access and dedicated alumni/employer forecasts. |
| Week 6 | Assistant | Implemented DataNexus Assistant with curated analytics Q&A and future-ready RAG endpoint. |
| Week 7 | Admin enhancements | Expanded image manager, refined gallery content, tuned pipeline analytics, restricted predictions nav to admins. |
| Week 8 | Documentation | Comprehensive README rewrite with architecture, analytics, security, navigation, and operational guidance. |

---

## 9. Troubleshooting & FAQ
| Issue | Resolution |
| ----- | ---------- |
| `EADDRINUSE` on port 5000/5001 | Stop macOS Control Center (`lsof -i :5000`) or switch to port 5002 (update `.env` + Vite proxy). |
| Assistant says “Still learning that query” | Question is outside the curated knowledge base; add an entry in `AssistantChat.jsx` to extend responses. |
| Images not appearing in gallery | Ensure the uploaded file sits in the correct `public/assets/<category>` folder and the gallery item references the `/assets/...` path. |
| CSV edits not persisting | Run the backend with write permissions; confirm the process user can modify files under `datanexus-dashboard/public`. |
| Login loop | Clear localStorage or delete the `datanexus-auth` key; verify the API host matches `VITE_API_BASE_URL`. |

---

## License
Private project. Distribution requires approval from Saint Louis University project stakeholders.