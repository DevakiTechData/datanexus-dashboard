# DataNexus Dashboard - Project Summary

## ✅ Completed Features

### Project Setup
- ✅ Vite + React 18 project initialized
- ✅ TailwindCSS v3 configured with SLU brand colors
- ✅ All dependencies installed (PapaParse, Recharts, React Router, etc.)
- ✅ CSV files copied to public directory

### Data Loading
- ✅ PapaParse integration for CSV parsing
- ✅ All 6 CSV files loaded on app initialization:
  - dim_contact.csv
  - dim_date.csv
  - dim_employers.csv
  - dim_event.csv
  - Dim_Students.csv
  - fact_alumni_engagement.csv

### Components Created
- ✅ **Navbar**: Navigation with SLU branding
- ✅ **KPICard**: Reusable KPI display component with delta indicators
- ✅ **ChartCard**: Wrapper component for charts with consistent styling
- ✅ **FiltersPanel**: Date filtering (Year and Month)

### Alumni Dashboard 🎓
- ✅ **KPIs**:
  - Total Alumni (distinct student count)
  - % Engaged Alumni
  - Avg Feedback Score (using donations_amount as proxy)
  - Avg Engagement Minutes (from mentorship_hours)

- ✅ **Visualizations**:
  - Bar Chart: Engagement by Event Type
  - Line Chart: Engagement Trend over time
  - Pie Chart: Gender Split
  - Bar Chart: Engaged Alumni by Degree Level
  - Bar Chart: Top 10 Programs by Engagement (horizontal)
  - Area Chart: Feedback Score over Time
  - Donut Chart: Visa Status (F1, OPT, Citizen, etc.)
  - Table: Event Feedback Leaderboard

### Employer Dashboard 💼
- ✅ **KPIs**:
  - Active Employers (distinct employer count)
  - Total Hires
  - Avg Salary (placeholder - not in CSV data)
  - Top Industry by Hires

- ✅ **Visualizations**:
  - Bar Chart: Hires by Industry
  - Bar Chart: Hires by Employer (horizontal)
  - Line Chart: Hiring Trend by Year
  - Bar Chart: Hires by Degree Level
  - Pie Chart: Employment Type
  - Table: Top 10 Employers
  - Table: Employer Locations
  - Donut Chart: Visa Type of Hires
  - Composed Chart: Hiring vs Engagement Trend

### UI/UX
- ✅ Responsive grid layout
- ✅ SLU brand colors (Blue: #002F6C, Gold: #FDB515)
- ✅ Gold highlight bars on cards
- ✅ Navigation between dashboards
- ✅ Loading states
- ✅ Error handling

### Routing
- ✅ React Router setup
- ✅ Routes: `/alumni`, `/employer`
- ✅ Default redirect to `/alumni`

## 📁 Project Structure

```
datanexus-dashboard/
├── public/
│   ├── dim_contact.csv
│   ├── dim_date.csv
│   ├── dim_employers.csv
│   ├── dim_event.csv
│   ├── Dim_Students.csv
│   └── fact_alumni_engagement.csv
├── src/
│   ├── components/
│   │   ├── ChartCard.jsx
│   │   ├── FiltersPanel.jsx
│   │   ├── KPICard.jsx
│   │   └── Navbar.jsx
│   ├── data/
│   │   └── loadData.js
│   ├── pages/
│   │   ├── AlumniDashboard.jsx
│   │   └── EmployerDashboard.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── README.md
```

## 🚀 How to Run

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## 📊 Data Processing Notes

- Data is loaded asynchronously on component mount
- All date filtering uses string conversion for consistency
- Feedback score uses `donations_amount` field (as `feedback_score` doesn't exist in CSV)
- Engagement minutes calculated from `mentorship_hours * 60`
- Hired flag checked as string '1' or number 1 for compatibility

## 🎨 Styling

- TailwindCSS with custom SLU colors
- Responsive design (mobile, tablet, desktop)
- Consistent card-based layout
- SLU blue header with gold accent bars

## 🔄 Future Enhancements (Optional)

- [ ] Export to CSV/PDF functionality
- [ ] Search/filter by college or program
- [ ] Interactive map visualization
- [ ] Additional date range filters
- [ ] Data refresh functionality
- [ ] Real-time data updates
- [ ] User authentication
- [ ] Dashboard customization

## 📝 Notes

- The application successfully builds and runs
- All CSV files are loaded from the public directory
- Charts are interactive and responsive
- Filtering works for both Year and Month
- Data processing handles edge cases and missing values

## Submission Package (Copy to PDF)

### 1) Prototype Links
- Frontend (React): https://<your-5173-url>.app.github.dev
- Backend (API): https://<your-5002-url>.app.github.dev
- Admin login: admin / admin123 | Alumni: alumni/alumni123 | Employer: employer/employer123

### 2) Key Screens to Capture (with notes)
1. Landing Page (/) — hero, mission, nav; navigate via CTAs
2. Alumni Dashboard (/alumni) — KPIs, Funnel, Retention, Momentum + analysis
3. Employer Dashboard (/employer) — Pipeline, Health, Diversity, Predictions
4. Predictive Outlook – Alumni (/predictions/alumni, Admin) — forecasts + narrative
5. Predictive Outlook – Employers (/predictions/employers, Admin) — projections + risk
6. Admin Console (/admin, Admin) — CSV tables CRUD + Image Library
7. Gallery (/gallery) — hero + filterable grid
8. Events & Contact (/events, /contact) — filters + inquiry submission
9. Chatbot (on Predictions) — ask preset questions; concise answers

### 3) Per‑Screen Notes (what, interaction, value)
- Landing: overview & fast access; click CTAs
- Alumni: hover charts; read “What it means”; focus programs
- Employer: hover charts; scan cards; target actions
- Predictions (Alumni/Employers): hover; read narratives; plan forward
- Admin: edit rows, upload images; operate data without DB
- Gallery: filter by program/year; browse
- Events/Contact: filter events; submit; CSV log created
- Chatbot: ask guided questions for analytics explanations

### 4) Data Mapping
| Screen | Data | Source |
| --- | --- | --- |
| Landing | public/assets + static copy | UI Layer |
| Alumni Dashboard | Dim_Students.csv; fact_alumni_engagement.csv; dim_event.csv | Data Layer |
| Employer Dashboard | dim_employers.csv; fact_alumni_engagement.csv; dim_event.csv | Data Layer |
| Predictions (Alumni/Employers) | Derived forecasts from recent CSV metrics | Modeling Layer (frontend) |
| Admin Console | CSV tables via API; public/assets uploads | Admin API (Express) |
| Gallery | public/assets + curated list | UI Layer |
| Events | dim_event.csv | Data Layer |
| Contact | event_inquiries.csv | API write (CSV) |
| Chatbot | KB in AssistantChat.jsx | Assistant Layer |

### 5) Demo Video Script (each 2–4 min)
- A: Admin login; Predictive Outlook (Alumni) — 2 charts + narrative
- B: Predictive Outlook (Employers) — projections + risk; Chatbot Q&A
- C: Alumni Dashboard; Gallery; Events; Contact submit
- D: Admin Console CRUD + upload; show event_inquiries.csv

### 6) Local Run
- Backend (5002):
```
cd datanexus-dashboard/server
npm install
PORT=5002 npm run dev
```
- Frontend (5173):
```
cd datanexus-dashboard
echo "VITE_API_BASE_URL=http://localhost:5002" > .env
npm install
npm run dev -- --port 5173
```

### 7) Security Note
- Inquiries migrated from Excel to CSV; removed xlsx; `npm audit` → 0 vulnerabilities.
