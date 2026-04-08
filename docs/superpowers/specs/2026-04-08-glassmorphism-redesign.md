# Production Calendar v2: Glassmorphism Redesign Specification

**Date:** April 8, 2026  
**Status:** Design Review  
**Version:** 1.0  
**Author:** Claude AI Design Team  

---

## 1. Executive Summary

Production Calendar v2 will be completely redesigned using **Glassmorphism** visual paradigm—a premium, modern aesthetic emphasizing transparency, blur effects, and sophisticated depth. This spec outlines the visual language, component architecture, new features, animations, and implementation roadmap.

**Key Design Principles:**
- **Premium aesthetic** — Glassmorphic cards, blur backgrounds, high-end feel
- **Clarity first** — Despite transparency, all content must be legible and scannable
- **Delightful interactions** — Rich animations create WOW moments without being distracting
- **Mobile-first PWA** — App-like experience with offline capability

---

## 2. Visual Identity

### 2.1 Color Palette

**Primary: Fiolet-Blue Gradient**
```
Primary Gradient: #6c63ff → #667eea (left to right, top to bottom)
Secondary Accent: #a78bfa (lighter purple for highlights)
Success: #10b981 (green, unchanged from v1)
Warning: #f59e0b (amber for alerts)
Danger: #ef4444 (red for critical)
```

**Backgrounds:**
```
Dark BG (page): #0a0e27 (almost black, slightly purple-tinted)
Card BG (glassmorphic): rgba(255, 255, 255, 0.1) with backdrop-filter: blur(10px)
Border: rgba(255, 255, 255, 0.15) (thin, barely visible)
Text Primary: #f5f3ff (near white, slightly cool)
Text Secondary: #b0aed0 (muted purple-gray)
```

### 2.2 Typography

**Font Stack:**
- **Headlines (H1-H3):** Sora (700, 600 weight) — premium, smooth, modern
- **Body (p, labels):** Sora (400, 500 weight) — readable at any size
- **Monospace (data, codes):** IBM Plex Mono (400) — technical, clean
- **Numbers (OT hours, dates):** IBM Plex Mono (700) — emphasis on data

**Sizes:**
```
H1 (page title): 32px, 700, line-height 1.2
H2 (section): 24px, 600, line-height 1.25
H3 (cards): 16px, 600, line-height 1.3
Body: 14px, 400, line-height 1.5
Label: 12px, 500, uppercase, letter-spacing 0.5px
Small (hints): 11px, 400, color: text-secondary
```

### 2.3 Border Radius

```
Buttons/Small elements: 8px
Cards/Containers: 14px
Large modals/panels: 16px
Glassmorphic blur: Always 14px+
```

### 2.4 Spacing

```
Base unit: 4px
Gaps: 8px, 12px, 16px, 20px, 24px, 32px
Padding (cards): 16px, 20px
Margin (sections): 24px
```

---

## 3. Layout & Navigation

### 3.1 Desktop Layout: Compact Focus

**Overall structure:**
```
┌─────────────────────────────────────────┐
│  Header (Logo, Title, User Menu)        │
├─────────────────────────────────────────┤
│  Main Content Area (centered, max 1200px) │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Month Selector (12 cards grid)  │   │
│  │  [Jan] [Feb] [Mar] ...           │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Selected Month (LARGE, focused) │   │
│  │  Full calendar + OT + Absences   │   │
│  │  + Quick actions                 │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Summary Cards (compact)         │   │
│  │  OT Hours | Days Absence | etc   │   │
│  └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

**Rationale:** Single focused month reduces cognitive load, 12 cards act as quick nav, summary always visible for context.

### 3.2 Mobile Layout: Bottom Tab Navigation

**Tabs (sticky bottom):**
1. **📅 Calendar** — Month view, main interaction
2. **📊 Analytics** — Charts, statistics
3. **📝 Notes** — Day notes, comments
4. **⚙️ Settings** — Configuration, integrations

Each tab is its own glassmorphic card-based interface. Swipe between tabs or tap.

---

## 4. Component Library

### 4.1 Glassmorphic Card

```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 48px rgba(31, 38, 135, 0.25);
  transform: translateY(-2px);
}
```

### 4.2 Button States

**Primary Button (gradient):**
```css
.btn-primary {
  background: linear-gradient(135deg, #6c63ff 0%, #667eea 100%);
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  box-shadow: 0 8px 20px rgba(108, 99, 255, 0.4);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}
```

**Secondary Button (glassmorphic):**
```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f5f3ff;
  padding: 10px 20px;
  border-radius: 8px;
}
```

### 4.3 Month Selector Cards

```
┌─────────────┐
│   JANUARY   │  (Header: current month highlighted in gradient)
│  2026       │  (Year)
│             │
│  OT: 12h    │  (Quick stats: OT hours)
│  Absent: 2  │  (Absent days count)
└─────────────┘
```

**Design:**
- Grid: 6 columns desktop, 4 columns tablet, 3 columns mobile
- Size: 140px × 120px (approximately)
- Hover: Glow effect (box-shadow with primary color), slight scale-up (1.05)
- Active: Border changes to primary gradient color

### 4.4 Calendar Month View

**Grid Layout:**
- 7 columns (Mon-Sun)
- Header: Month title + Year + Navigation arrows
- Day cells: 50px × 50px, glassmorphic with border

**Day Cell States:**
```
Normal weekday:     Light text (#b0aed0)
Weekend (Sat):      Red text (#f87171), background tint
Holiday:            Red background, white text
OT marked:          Green background (rgba(16, 185, 129, 0.2))
Absence marked:     Red background (rgba(239, 68, 68, 0.2)), strikethrough
Today:              Primary gradient border (2px inset)
Selected (editing): Light blue background, glow
```

**Interaction:**
- Click to edit/mark OT
- Long-press to open day context menu
- Multi-select mode (toggle with button) for bulk operations

### 4.5 Analytics Dashboard

**Components:**
1. **Summary Cards (3-column grid):**
   - Total OT this month (hours)
   - Total OT this year (hours)
   - Avg OT per week (hours)

2. **Charts:**
   - Line chart: OT hours trend (12 months)
   - Bar chart: Monthly distribution
   - Pie chart: Type breakdown (if needed)

3. **Table:**
   - Monthly breakdown with totals
   - Sortable, with pagination

**Library:** Use lightweight charting (Chart.js or Recharts, TBD).

### 4.6 Notes/Comments Panel

**For each day:**
- Text input field (glassmorphic)
- Timestamp of last edit
- Optional: emoji reactions, mentions

**Layout:**
- When selected day has note, show sidebar (desktop) or tab content (mobile)
- Quick note input always visible

---

## 5. Animations & Interactions

### 5.1 Page Transitions

**Fade + Scale:**
- New page fades in + slight scale-up (1.02) over 300ms
- Previous page fades out
- Easing: cubic-bezier(0.4, 0, 0.2, 1) (Material Motion)

### 5.2 Card Interactions

**Hover (Desktop):**
- Background opacity increases: rgba(255,255,255,0.08) → rgba(255,255,255,0.12)
- Slight glow shadow
- translateY(-2px)
- Duration: 200ms

**Click:**
- Scale-down quickly (0.98) then back
- Shows selection state (border highlight)
- Duration: 150ms

### 5.3 List Item Selection

**Multi-select mode:**
- Checkbox appears with animation (fade + scale)
- Color badge on items
- "Select All" button appears
- Bulk action bar slides up from bottom

### 5.4 Scroll Animations

**Parallax on month grid:**
- Background blur increases slightly as user scrolls (subtle, 0-3% depth change)
- Cards stagger their entrance: offset by 50ms per card

**Scroll indicator:**
- Thin progress bar at top (gradient purple-blue)

### 5.5 Form Interactions

**Input focus:**
- Border: rgba(255,255,255,0.15) → rgba(108, 99, 255, 0.5)
- Glow: box-shadow 0 0 12px rgba(108, 99, 255, 0.3)
- Background: slight opacity increase
- Duration: 150ms

**Form validation:**
- Error state: red glow, shake animation (2px left-right, 100ms)
- Success state: green check, fade out after 2s

---

## 6. New Features

### 6.1 Day Notes (Feature C)

**Database:**
```sql
CREATE TABLE day_notes (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  note TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE(user_id, year, month, day)
);
```

**UI:**
- Read-only view: Display note as italic text below day number in calendar
- Edit mode: Textarea in sidebar or modal
- Character limit: 500
- Markdown support: Bold, italic, links (basic)

### 6.2 Calendar Integration (Feature D)

**Supported:**
- Google Calendar (OAuth via next-auth)
- Outlook/Microsoft Calendar (OAuth)

**Sync logic:**
- **READ:** Pull holidays, company events into Production Calendar as non-editable
- **WRITE:** Optionally push OT days + notes to calendar
- Bi-directional: User configurable

**Implementation:**
- Use `googleapis` npm package for Google
- Use `@microsoft/microsoft-graph-client` for Outlook
- Sync on login + manual refresh button
- Cache events in `calendar_events` table

### 6.3 Analytics Dashboard (Feature E)

**Metrics:**
1. **Current Month:**
   - Total OT hours
   - Days with OT
   - Average per day

2. **Year-to-Date:**
   - Cumulative OT
   - Projection if trend continues
   - Burndown vs. expected (if contract limit exists)

3. **Historical:**
   - 12-month trend line (last year vs. this year)
   - Peak months
   - Slowest months

4. **Patterns:**
   - Most common days (Mon-Fri distribution)
   - Weekly averages
   - Outliers (unusually high days)

**Chart Library:**
- Recharts (React component, lightweight, glassmorphism-friendly theming)

---

## 7. Mobile & PWA

### 7.1 Responsive Breakpoints

```css
Mobile: < 640px (bottom tabs mandatory)
Tablet: 640px - 1024px (partial tabs + content)
Desktop: > 1024px (full layout with month selector visible)
```

### 7.2 Bottom Tab Navigation

**Sticky footer, glassmorphic:**
```
[📅 Calendar] [📊 Analytics] [📝 Notes] [⚙️ Settings]
```

Each tab is a separate view (not overlay). Swipe gestures: Left/right swipe switches tabs.

### 7.3 PWA Installation

**Features:**
- Installable as standalone app (manifest.json)
- Service Worker for offline mode
- Cache strategy: Network-first (OT data), Cache-first (static assets)
- Push notifications: OT reminder, end-of-month summary

**Implementation:**
- Next.js PWA plugin or manual Service Worker
- Web App Manifest in `public/manifest.json`
- Icons at 192px, 512px (match glassmorphism aesthetic)

---

## 8. Technical Specifications for Development

### 8.1 Stack (Unchanged)

- **Frontend:** Next.js 14, React 18, CSS Modules or Tailwind
- **Auth:** next-auth 5 (beta)
- **Database:** SQLite (better-sqlite3)
- **Deployment:** PM2 + Nginx
- **New deps:** Recharts (analytics), googleapis, @microsoft/microsoft-graph-client (calendar sync)

### 8.2 File Structure Changes

```
app/
  dashboard/
    client.js          (refactor: split into components)
    layout.js          (new: mobile-aware layout)
    components/
      MonthSelector.js (new)
      CalendarView.js  (refactor from current)
      NotesPanel.js    (new)
      AnalyticsDash.js (new)
      TabNav.js        (new, mobile only)
  api/
    notes/
      route.js         (new)
    calendar/
      route.js         (new)
    analytics/
      route.js         (new)

lib/
  db.js               (add notes, calendar_events tables)
  calendar-sync.js    (new)

styles/
  globals.css         (new: glassmorphism variables)
  components.css      (new: component library)
```

### 8.3 CSS Strategy

**Option 1: CSS Modules + CSS Variables**
```css
/* styles/vars.css */
:root {
  --color-primary-start: #6c63ff;
  --color-primary-end: #667eea;
  --color-bg-dark: #0a0e27;
  --color-glass: rgba(255, 255, 255, 0.08);
  --blur-glass: blur(10px);
  --border-glass: 1px solid rgba(255, 255, 255, 0.15);
  --shadow-glass: 0 8px 32px rgba(31, 38, 135, 0.15);
  /* ... */
}
```

**Option 2: Tailwind with custom theme**
```js
module.exports = {
  theme: {
    extend: {
      colors: { ... },
      backdropFilter: { glass: 'blur(10px)' },
      boxShadow: { glass: '...' },
    }
  }
}
```

**Recommendation:** CSS Modules for consistency with current codebase.

### 8.4 Migration Path (from v1)

1. **Phase 1:** Update styling (colors, fonts, shadows) → Test v1 with glassmorphism look
2. **Phase 2:** Component refactoring → Extract Month Selector, Calendar View
3. **Phase 3:** Add new features → Notes, Analytics, Calendar Sync
4. **Phase 4:** Mobile PWA → Tab nav, Service Worker, manifest
5. **Phase 5:** Animations → Implement transition/animation specs
6. **Phase 6:** Polish → Performance, accessibility, edge cases

### 8.5 Performance Targets

- **LCP (Largest Contentful Paint):** < 2s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **First Load:** < 200KB (JS + CSS)

**Optimizations:**
- Code-split analytics/calendar features (lazy-load)
- Image optimization (SVG for icons, WebP for backgrounds)
- Service Worker caching strategy
- Minify CSS/JS

---

## 9. Accessibility (WCAG 2.1 AA)

### 9.1 Color Contrast

All text must pass WCAG AA standards:
- Text on glass: #f5f3ff on rgba(255,255,255,0.1) + dark bg → ~5:1 ratio ✓
- Buttons: White on gradient → ~7:1 ratio ✓
- Secondary text: #b0aed0 on dark bg → ~4.5:1 ratio ⚠️ (monitor, increase weight if needed)

### 9.2 Focus States

- Keyboard navigation: Focus state visible (2px outline in primary color)
- Tab order: Logical (left-to-right, top-to-bottom)
- Skip links: Skip to main content

### 9.3 Semantic HTML

- Use `<button>` for buttons (not `<div>` with click handler)
- Calendar as `<table>` with proper `<th>`, `<tr>`, `<td>`
- Form `<label>` tags associated with inputs
- ARIA labels for non-text content (icons)

### 9.4 Motion

- `prefers-reduced-motion` media query: Disable animations for users who prefer
- Flashing: Nothing flashes > 3 times per second

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Components (MonthSelector, CalendarView, etc.)
- Utility functions (date formatting, OT calculations)
- API routes (notes, calendar sync, analytics)

### 10.2 E2E Tests
- User flows: Login → View calendar → Add OT → Add note → Export
- Mobile flows: Bottom tab nav, touch interactions
- PWA: Installation, offline mode

### 10.3 Visual Regression
- Screenshot tests for critical components
- Cross-browser testing (Chrome, Firefox, Safari)

---

## 11. Success Criteria

**Design:**
- ✅ All components follow glassmorphism spec
- ✅ Animations are smooth (60 FPS)
- ✅ Responsive at all breakpoints
- ✅ WCAG AA accessibility

**Features:**
- ✅ Notes fully functional
- ✅ Calendar sync working (Google + Outlook)
- ✅ Analytics dashboard displays correct data
- ✅ PWA installable and works offline

**Performance:**
- ✅ Lighthouse score > 90
- ✅ Accessibility score > 95
- ✅ Page loads in < 2s

---

## 12. Timeline Estimate

- **Design → Code:** 2-3 weeks (components + styling)
- **Features (Notes, Sync, Analytics):** 2-3 weeks
- **Mobile/PWA:** 1 week
- **Testing/Polish:** 1 week

**Total:** 6-8 weeks (if full-time)

---

## Appendix: Color Hex Reference

```
Primary Gradient: #6c63ff → #667eea
Primary Light: #a78bfa
Success: #10b981
Warning: #f59e0b
Danger: #ef4444
Dark BG: #0a0e27
Text Primary: #f5f3ff
Text Secondary: #b0aed0
Glass BG: rgba(255, 255, 255, 0.08)
Glass Border: rgba(255, 255, 255, 0.15)
```

---

**Approval Gates:**
- [ ] Product/UX review
- [ ] Technical architecture review
- [ ] Team sign-off before dev starts
