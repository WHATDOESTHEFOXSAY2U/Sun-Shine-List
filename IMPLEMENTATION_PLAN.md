# Ontario Sunshine List Website - Implementation Plan

> **Project Vision**: A production-grade, action-oriented web application that transforms 29 years of Ontario public sector salary data into actionable insights for job seekers, researchers, and citizens.

---

## Executive Summary

The Sunshine List website is designed around **one core principle**: every piece of data should help users **take action**. Whether someone is negotiating a salary, choosing their next employer, or researching public sector compensation trends, this website provides the insights they need to make informed decisions.

### Target Users

| User Type | Primary Goal | Key Features |
|-----------|--------------|--------------|
| **Job Seekers** | Find high-paying, stable employers | "Find Your Next Employer" tool, Employer profiles |
| **Current Employees** | Benchmark salary, plan career | Individual search, Salary distribution |
| **Researchers/Journalists** | Analyze trends, compare sectors | Multi-year analysis, Sector comparison |
| **Citizens** | Transparency in public spending | Top earners, Employer rankings |

---

## Design System

### Color Palette - "Sunshine Theme"

```css
/* Primary - Sunshine Yellow */
--sunshine-50: #FFFBEB;
--sunshine-100: #FEF3C7;
--sunshine-200: #FDE68A;
--sunshine-300: #FCD34D;
--sunshine-400: #FBBF24;  /* Primary accent */
--sunshine-500: #F59E0B;  /* Primary */
--sunshine-600: #D97706;

/* Secondary - Warm Orange */
--orange-400: #FB923C;
--orange-500: #F97316;
--orange-600: #EA580C;

/* Neutral - Warm Grays */
--warm-50: #FAFAF9;
--warm-100: #F5F5F4;
--warm-200: #E7E5E4;
--warm-700: #44403C;
--warm-800: #292524;
--warm-900: #1C1917;

/* Semantic */
--success: #22C55E;
--warning: #EAB308;
--error: #EF4444;
--info: #3B82F6;
```

### Typography

```css
/* Headers - Modern, Bold */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Data/Numbers - Monospace for alignment */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### UI Components Style

- **Cards**: White background, subtle warm-gray border, 8px radius, subtle shadow
- **Buttons**: Primary sunshine-500 with hover to sunshine-600, rounded-lg
- **Charts**: Gradient fills from sunshine-400 to orange-500
- **Tables**: Alternating warm-50/white rows, sticky headers
- **Inputs**: warm-100 background, sunshine-500 focus ring

---

## Site Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER / NAV                             │
│  [Logo] [Distribution] [Top Earners] [Employers] [Jobs] [Search] │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         MAIN CONTENT                             │
│                                                                  │
│  Tab 1: Pay Distribution (Landing)                               │
│  Tab 2: Top Earners                                              │
│  Tab 3: Top Employers                                            │
│  Tab 4: Top Job Titles                                           │
│  Tab 5: Find Your Employer (Weighted Ranking)                    │
│  Tab 6: Sector Analysis                                          │
│  Tab 7: Multi-Year Trends                                        │
│                                                                  │
│  + Modal/Slide-out: Individual Profile                           │
│  + Modal/Slide-out: Employer Profile                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         FOOTER                                   │
│  Data Source | Last Updated | GitHub | Privacy                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Page Specifications

### Tab 1: Pay Distribution Dashboard (Landing Page)

**Purpose**: Answer "What does the Ontario public sector pay?" at a glance.

#### Controls
- **Year Selector**: Dropdown (1996-2024), default to latest year
- **Compare Mode Toggle**: "Compare to Previous Year" checkbox

#### Key Metrics Row (Hero Cards)
| Metric | Display | Action |
|--------|---------|--------|
| Total Disclosures | `287,664` with YoY delta | Click → scroll to trend |
| Median Salary (P50) | `$125,744` with YoY % | Tooltip: "Half earn more, half earn less" |
| Average Salary | `$133,126` | Tooltip: "Skewed by high earners" |
| P90 Salary | `$162,998` | Tooltip: "Top 10% earn this or more" |
| Total Payroll | `$50.3B` | Tooltip: "Total public sector cost" |

#### Percentile Breakdown Card
```
┌────────────────────────────────────────────────────────┐
│  Salary Percentiles for 2024                           │
│                                                        │
│  P50 (Median)  ████████████████░░░░░░  $125,744        │
│  P75           █████████████████████░░  $142,292       │
│  P90           ████████████████████████  $162,998      │
│  P95           █████████████████████████  $179,234     │
│  P99           ██████████████████████████  $228,188    │
│                                                        │
│  [?] What do these mean?                               │
└────────────────────────────────────────────────────────┘
```

#### Salary Distribution Histogram
- **X-axis**: Salary buckets ($100K-$110K, $110K-$120K, ..., $500K+)
- **Y-axis**: Number of employees
- **Interactive**: Hover shows exact count and % of total
- **Highlight**: User can click a bucket to filter other views

#### Compensation Buckets Summary
```
┌─────────────────────────────────────────────────────────────────┐
│  How Many Earn What? (2024)                                      │
│                                                                  │
│  $100K - $125K    ████████████████████████  142,847 (37.8%)     │
│  $125K - $150K    ████████████████░░░░░░░░   98,234 (26.0%)     │
│  $150K - $200K    ████████░░░░░░░░░░░░░░░░   54,123 (14.3%)     │
│  $200K - $300K    ████░░░░░░░░░░░░░░░░░░░░   18,456 (4.9%)      │
│  $300K+           █░░░░░░░░░░░░░░░░░░░░░░░    4,234 (1.1%)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 29-Year Trend Charts (Interactive)
- **Multi-select Toggle**: 
  - [ ] Median Salary
  - [ ] Average Salary
  - [ ] Total Disclosures
  - [ ] P90, P99
- **Chart**: Line chart with selected metrics
- **Zoom**: Brush to select date range
- **Inflation Adjust Toggle**: "$2024 Adjusted" checkbox

---

### Tab 2: Top Earners

**Purpose**: "Who makes the most money in Ontario's public sector?"

#### Controls Row
| Control | Type | Options |
|---------|------|---------|
| Year | Dropdown | 1996-2024 |
| Sort By | Dropdown | Total Comp, Base Salary, Benefits |
| Show | Dropdown | Top 25, 50, 100, 250, 500 |
| Sector Filter | Multi-select | All, Hospitals, Universities, etc. |
| Search | Text | Filter by name |

#### Results Table
| Rank | Name | Employer | Job Title | Salary | Benefits | Total Comp |
|------|------|----------|-----------|--------|----------|------------|
| 1 | Kenneth Hartwick | Ontario Power Generation | CEO | $1,850,000 | $168,435 | $2,018,435 |
| 2 | ... | ... | ... | ... | ... | ... |

**Row Actions**:
- Click Name → Open Individual Profile modal
- Click Employer → Open Employer Profile modal

---

### Tab 3: Top Employers

**Purpose**: "Which employers pay the best?"

#### Controls Row
| Control | Type | Options |
|---------|------|---------|
| Year | Dropdown | 1996-2024 |
| Rank By | Dropdown | Median Pay (P50), P75, P90, P99, Mean, Headcount |
| Min Headcount | Slider | 10 - 1000+ |
| Sector Filter | Multi-select | All sectors |
| Search | Text | Filter by employer name |

#### Results Table
| Rank | Employer | Sector | Headcount | Mean | P50 | P75 | P90 | P99 |
|------|----------|--------|-----------|------|-----|-----|-----|-----|
| 1 | Ontario Power Generation | Crown Agency | 10,267 | $171,372 | $162,626 | $192,109 | $227,662 | $341,693 |
| 2 | ... | ... | ... | ... | ... | ... | ... | ... |

**Row Actions**:
- Click Employer → Open Employer Profile with full details
- Sparkline column showing 5-year pay trend

---

### Tab 4: Top Job Titles

**Purpose**: "What jobs pay the most?"

#### Controls Row
| Control | Type | Options |
|---------|------|---------|
| Year | Dropdown | 1996-2024 |
| Rank By | Dropdown | Median Pay (P50), P75, P90, Mean |
| Min Headcount | Slider | 5 - 500+ |
| Job Family Filter | Multi-select | Medical, Academic, Police, Legal, Admin, etc. |
| Search | Text | Filter by job title |

#### Results Table
| Rank | Job Title | Family | Headcount | Mean | P50 | P75 | P90 |
|------|-----------|--------|-----------|------|-----|-----|-----|
| 1 | JUDGE | Legal | 675 | $254,585 | $179,322 | $362,871 | $362,871 |
| 2 | PHYSICIAN | Medical | 1,234 | $245,000 | $220,000 | $280,000 | $350,000 |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Row Expansion**: Click to see employers hiring this role with their pay ranges.

---

### Tab 5: Find Your Next Employer ⭐ (Key Differentiator)

**Purpose**: "Based on what matters to YOU, which employer should you work for?"

> [!IMPORTANT]
> This is the **signature feature** that makes the website actionable. Users adjust three weighted factors to get personalized employer rankings.

#### The Three Factors

| Factor | Description | Data Source |
|--------|-------------|-------------|
| **💰 Pay** | Higher percentile salaries = better | P50, P75, P90 from `employer_metrics.json` |
| **🏠 Stay** | Higher retention rate = better | % employees returning next year |
| **📈 Grow** | Higher salary growth for stayers = better | Median % increase for retained employees |

#### UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Find Your Ideal Employer                                     │
│                                                                  │
│  Adjust what matters to you:                           Total: 100│
│                                                                  │
│  💰 Pay ──────────●────────────────────  40%                     │
│  🏠 Stay ────────●──────────────────────  30%                    │
│  📈 Grow ────────●──────────────────────  30%                    │
│                                                                  │
│  [Filter: Min 50 employees] [Sector: All ▾] [Year: 2024 ▾]      │
│                                                                  │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  #1  Ontario Power Generation                    Score: 87.3     │
│      💰 P50: $162,626  🏠 Retention: 94%  📈 Growth: +4.2%       │
│      Crown Agency | 10,267 employees                             │
│                                                        [View →]  │
│                                                                  │
│  #2  Hydro One Networks                          Score: 85.1     │
│      💰 P50: $148,000  🏠 Retention: 91%  📈 Growth: +3.8%       │
│      Crown Agency | 6,234 employees                              │
│                                                        [View →]  │
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

#### Scoring Algorithm

```javascript
// Normalize each factor to 0-100 scale
payScore = normalize(employer.p75, minP75, maxP75) * 100;
stayScore = (employer.retentionRate || 0) * 100;
growScore = normalize(employer.medianGrowth, minGrowth, maxGrowth) * 100;

// Weighted composite
finalScore = (payScore * payWeight) + (stayScore * stayWeight) + (growScore * growWeight);
```

---

### Tab 6: Sector Analysis

**Purpose**: "How do different sectors compare?"

#### Sector Comparison Table
| Sector | Headcount | Median | P90 | YoY Headcount | YoY Pay |
|--------|-----------|--------|-----|---------------|---------|
| Hospitals & Health | 67,492 | $117,009 | $149,388 | +15.0% | -0.6% |
| School Boards | 118,048 | $129,629 | $141,026 | +47.0% | +19.3% |
| Universities | 29,163 | $151,252 | $232,367 | +11.2% | +1.1% |
| Municipalities | 76,456 | $124,162 | $162,998 | +16.2% | +1.6% |
| Crown Agencies | 18,725 | $121,916 | $179,019 | +37.8% | +0.1% |
| Ontario Power Gen | 10,267 | $162,626 | $227,662 | +8.2% | +1.3% |
| Government Ministries | 31,507 | $123,425 | $164,591 | +36.4% | +0.4% |

#### Sector Trend Chart
- Select up to 5 sectors to compare
- Line chart showing median salary over time
- Toggle: Headcount or Pay

---

### Tab 7: Multi-Year Trends

**Purpose**: "How has the public sector evolved over 29 years?"

#### Global Trends Dashboard

**Headline Stats Since 1996**:
- Total disclosures: 4,501 → 377,664 (8,290% increase)
- Median salary: $114,792 → $125,744 (+9.5% nominal, -XX% inflation-adjusted)
- Total payroll: $556M → $50.3B

#### Interactive Trend Explorer
- **Primary Metric Selector**: Median, Mean, P90, P99, Headcount, Payroll
- **Secondary Metric (optional)**: Compare two metrics on dual-axis
- **Annotations**: Key events (e.g., "2020 COVID Impact")

#### Insight Cards
```
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  📈 Fastest Growing Sector          │  │  💰 Highest Paying Job             │
│                                     │  │                                     │
│  School Boards                      │  │  Judge                              │
│  +47% headcount in 2024             │  │  Median: $254,585 in 2024          │
│                                     │  │                                     │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
```

---

### Search & Profile Pages

#### Global Search (Header)

- **Unified Search Bar**: "Search employers or individuals..."
- **Auto-complete**: Shows top 10 matches as user types
- **Categories**: Tab between "Employers" and "Individuals"

#### Employer Profile (Modal/Page)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏢 ONTARIO POWER GENERATION                                                 │
│  Crown Agency | 10,267 employees in 2024                                    │
│                                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Median Pay  │ │ Retention   │ │ Growth      │ │ Rank        │            │
│  │ $162,626    │ │ 93.5%       │ │ +4.2%       │ │ #3 of 1,388 │            │
│  │ Top 5%      │ │ Excellent   │ │ Above Avg   │ │ by P50      │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                              │
│  📊 Salary Distribution                                                      │
│  [Histogram showing distribution of 10,267 salaries]                        │
│                                                                              │
│  📈 Historical Trends (2015-2024)                                           │
│  [Line chart: Headcount + Median Pay over time]                             │
│                                                                              │
│  👔 Top Job Titles                                  💰 Top Earners           │
│  1. Nuclear Operator (1,234)                       1. Kenneth Hartwick $2M  │
│  2. Senior Engineer (890)                          2. Dominique Minière $1.6M│
│  3. Mechanical Technician (567)                    3. Chris Lenz $897K       │
│                                                                              │
│  🔄 Similar Employers (by sector & size)                                    │
│  - Hydro One Networks                                                        │
│  - Independent Electricity System Operator                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Individual Profile (Modal)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👤 KENNETH HARTWICK                                                         │
│  President and CEO | Ontario Power Generation                               │
│                                                                              │
│  📅 Career Timeline                                                          │
│  ├─ 2024: $2,018,436 (President and CEO @ OPG)                              │
│  ├─ 2023: $1,932,912 (+4.4%)                                                │
│  ├─ 2022: $1,733,608 (+11.5%)                                               │
│  └─ ... (more years)                                                        │
│                                                                              │
│  💵 Lifetime Earnings (on Sunshine List): $12.4M                            │
│  📈 Total Growth Since First Appearance: +156%                              │
│  🏆 Rank: #4 Highest Paid in 2024                                           │
│                                                                              │
│  [Compare to Similar Roles] [View Employer Profile]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Vanilla HTML/CSS/JS or Vite + React | Keep it simple, fast-loading |
| **Styling** | CSS Variables + Custom CSS | Full control, no framework bloat |
| **Charts** | Chart.js or ECharts | Interactive, responsive, well-documented |
| **Data** | Static JSON files from API/ | No backend needed, CDN-cacheable |
| **Search** | Fuse.js | Client-side fuzzy search |
| **Build** | Vite (optional) | Fast dev, optimized production |

### File Structure

```
website/
├── index.html              # Main SPA entry
├── css/
│   ├── main.css           # Core styles
│   ├── variables.css      # Design tokens
│   ├── components.css     # Reusable components
│   └── pages.css          # Page-specific styles
├── js/
│   ├── app.js             # Main application logic
│   ├── router.js          # Tab navigation
│   ├── data.js            # Data loading & caching
│   ├── charts.js          # Chart configurations
│   ├── search.js          # Search functionality
│   ├── utils.js           # Helpers (formatting, calculations)
│   └── components/
│       ├── distribution.js
│       ├── topEarners.js
│       ├── topEmployers.js
│       ├── topJobs.js
│       ├── findEmployer.js
│       ├── sectorAnalysis.js
│       ├── multiYear.js
│       ├── employerProfile.js
│       └── individualProfile.js
├── assets/
│   ├── logo.svg
│   └── favicon.ico
└── data/                   # Symlink or copy from API/analytics
    ├── year_summary.json
    ├── top_earners.json
    ├── employer_metrics.json
    ├── job_metrics.json
    ├── sector_metrics.json
    └── search_index.json
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      Data Pipeline (API/)                     │
│  raw CSV → ingest → normalize → link → analytics → JSON      │
└──────────────────────────────────────────────────────────────┘
                              ↓
                    Copy/Symlink JSON files
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                     Website (website/)                        │
│  Load JSON → Parse → Render Charts/Tables → User Interaction │
└──────────────────────────────────────────────────────────────┘
```

### Performance Requirements

| Metric | Target | Strategy |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | Inline critical CSS, defer non-essential |
| Time to Interactive | < 3s | Lazy load charts, stream data |
| Lighthouse Score | > 90 | Optimize images, minimize JS |
| Data Load | < 2s | Compress JSON, use CDN |

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Project setup (Vite or vanilla)
- [ ] Design system implementation (CSS variables, typography)
- [ ] Layout scaffolding (header, nav, content area, footer)
- [ ] Tab navigation system
- [ ] Data loading utilities

### Phase 2: Core Pages (Days 3-5)
- [ ] Pay Distribution dashboard (landing page)
- [ ] Interactive charts (histogram, line charts)
- [ ] Top Earners table with sorting/filtering
- [ ] Top Employers table with sorting/filtering
- [ ] Top Job Titles table

### Phase 3: Search & Profiles (Days 6-7)
- [ ] Global search with autocomplete
- [ ] Employer profile modal
- [ ] Individual profile modal
- [ ] Link navigation between entities

### Phase 4: Advanced Features (Days 8-9)
- [ ] "Find Your Next Employer" weighted ranking tool
- [ ] Sector comparison
- [ ] Multi-year trends explorer
- [ ] Inflation-adjusted calculations

### Phase 5: Polish & Launch (Day 10)
- [ ] Responsive design (mobile, tablet)
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] SEO metadata
- [ ] Final testing

---

## Data Requirements from API

### Required JSON Files

| File | Used By | Notes |
|------|---------|-------|
| `year_summary.json` | Distribution, Trends | Already exists |
| `top_earners.json` | Top Earners tab | Already exists |
| `employer_metrics.json` | Top Employers, Find Employer, Profiles | Already exists |
| `job_metrics.json` | Top Jobs tab | Already exists |
| `sector_metrics.json` | Sector Analysis | Already exists ✅ |
| `search_index.json` | Global search | Already exists |
| `data_quality_report.json` | Footer "Data Quality" link | Already exists ✅ |

### Potential New Data Needed

| Data | Purpose | Suggested File |
|------|---------|----------------|
| Individual profiles | Career timeline | `individual_profiles.json` (new) |
| Employer details | Top earners per employer | Add to `employer_metrics.json` |
| Salary buckets | Distribution histogram | Add to `year_summary.json` |

---

## Accessibility & UX

### Accessibility Checklist
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation for all interactions
- [ ] Screen reader friendly (ARIA labels)
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Focus indicators visible
- [ ] Alt text for all images/charts

### UX Best Practices
- [ ] Loading states for all data fetches
- [ ] Error states with retry actions
- [ ] Empty states with helpful guidance
- [ ] Tooltips for complex metrics
- [ ] "What does this mean?" explainers
- [ ] Shareable URLs for filtered views

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Engagement | > 3 min avg session | Analytics |
| Bounce Rate | < 40% | Analytics |
| Search Usage | > 30% of sessions | Event tracking |
| "Find Employer" Tool Usage | > 20% of sessions | Event tracking |
| Mobile Usage | 50%+ responsive | Device analytics |

---

## Open Questions for Engineering Team

1. **Hosting**: Static hosting (GitHub Pages, Vercel, Netlify) or existing infrastructure?
2. **Analytics**: Google Analytics, Plausible, or custom?
3. **Build System**: Keep it simple with vanilla JS, or use React/Vue for components?
4. **Individual Profiles**: Generate full individual profiles (~1M people) or compute on-demand?
5. **Update Frequency**: How often will new data be added (annually)?

---

## Appendix A: Sample Component Code

### Weighted Score Calculation

```javascript
function calculateEmployerScore(employer, weights) {
  const { pay, stay, grow } = weights; // Sum to 100
  
  // Normalize pay (P75) to 0-100 using min-max across all employers
  const payScore = normalize(employer.p75, allEmployers.minP75, allEmployers.maxP75);
  
  // Retention is already 0-1
  const stayScore = (employer.retention || 0) * 100;
  
  // Normalize growth
  const growScore = normalize(employer.medianGrowth, allEmployers.minGrowth, allEmployers.maxGrowth);
  
  return (payScore * pay / 100) + (stayScore * stay / 100) + (growScore * grow / 100);
}

function normalize(value, min, max) {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
```

### Salary Bucket Distribution

```javascript
function calculateBuckets(salaries) {
  const buckets = [
    { min: 100000, max: 125000, label: '$100K-$125K' },
    { min: 125000, max: 150000, label: '$125K-$150K' },
    { min: 150000, max: 200000, label: '$150K-$200K' },
    { min: 200000, max: 300000, label: '$200K-$300K' },
    { min: 300000, max: Infinity, label: '$300K+' }
  ];
  
  return buckets.map(bucket => ({
    ...bucket,
    count: salaries.filter(s => s >= bucket.min && s < bucket.max).length
  }));
}
```

---

## Appendix B: Chart Configurations

### Distribution Histogram (Chart.js)

```javascript
const histogramConfig = {
  type: 'bar',
  data: {
    labels: bucketLabels,
    datasets: [{
      data: bucketCounts,
      backgroundColor: 'rgba(245, 158, 11, 0.8)',
      borderColor: 'rgb(245, 158, 11)',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw.toLocaleString()} employees (${percent}%)`
        }
      }
    },
    scales: {
      y: { title: { display: true, text: 'Number of Employees' } },
      x: { title: { display: true, text: 'Salary Range' } }
    }
  }
};
```

### Trend Line Chart

```javascript
const trendConfig = {
  type: 'line',
  data: {
    labels: years,
    datasets: [
      {
        label: 'Median Salary',
        data: medianValues,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.2
      },
      {
        label: 'Total Disclosures',
        data: headcounts,
        borderColor: '#F97316',
        backgroundColor: 'transparent',
        yAxisID: 'y1'
      }
    ]
  },
  options: {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { position: 'left', title: { text: 'Salary ($)' } },
      y1: { position: 'right', title: { text: 'Headcount' }, grid: { drawOnChartArea: false } }
    }
  }
};
```

---

> **Ready for Implementation!** This document provides all specifications needed for engineers to build the Ontario Sunshine List website. Proceed to Phase 1.
