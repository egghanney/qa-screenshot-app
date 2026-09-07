# AetherQA — AI Screenshot-to-User-Journey & QA Knowledge Platform

> Transform raw application screenshots and user flows into interactive visual journey graphs, structured 7-pillar clinical QA knowledge bases, and actionable test matrices.

![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Storage-3ecf8e?style=flat-square&logo=supabase)
![React Flow](https://img.shields.io/badge/@xyflow/react-12-purple?style=flat-square)

---

## 🌟 Overview

**AetherQA** solves the disconnect between manual QA testing and technical documentation. By analyzing sequenced screenshots of an application feature, AetherQA generates:

1. **Interactive Visual Journey DAGs**: Directed acyclic graph with explicit `Screen → User Action → System Response → Screen` transitions, decision branching, and error recovery loops using `@xyflow/react` and `@dagrejs/dagre` auto-layout.
2. **7-Pillar Clinical Knowledge Base**: High-confidence structured documentation across Features, User Types, Journeys, Interactions, Business Rules, System States, and Dependencies with strict 4-tier confidence classification (`CONFIRMED`, `INFERRED`, `UNKNOWN`).
3. **AI Gap Discovery & Resolution Deck**: Interactive queue surfacing unresolved unknowns and missing requirements, allowing PMs and QA leads to confirm rules and automatically promote them into verified knowledge.
4. **Comprehensive QA Checkpoint Matrix**: Test cases across Field Validations, Navigation Resilience, Transaction Idempotency, and Security boundaries with 1-click CSV export.
5. **Observation & Defect Tracker**: Log bugs, visual regressions, and UX friction points tied directly to screens and nodes.
6. **Screen Comparison Studio**: Side-by-side visual and structural diffing between UI revisions.
7. **Client-Side Canvas PII Redactor**: Interactive privacy tool allowing testers to black out sensitive data (PAN, phone numbers, balances) before sending images to AI pipelines.
8. **Multi-Format Export Suite**: Export to Executive PDF reports (`jspdf`), Complete Markdown technical specs, or TestRail/Jira CSV suites (`papaparse`).

---

## 🎨 Design Language: Futuristic Clinical Data Workspace

AetherQA implements a high-density, low-fatigue **Futuristic Clinical Data Workspace**:
- **Outer Chassis**: Dark charcoal `#1D1E1C` enclosure with generous `rounded-[32px]` corners and `8–12px` frame padding.
- **Inner Canvas**: Warm ivory `#EDEDEB` and off-white `#F4F3EE` surfaces with `#DCDDD6` hairline dividers.
- **Fluorescent Accent**: Electric Neon Yellow `#F2F52A` reserved strictly for active navigation pills, highlighted edges, and attention anchors (5–10% of visible interface).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+
- **Supabase**: PostgreSQL database and Storage bucket

### 2. Installation
```bash
git clone https://github.com/egghanney/qa-screenshot-app.git
cd qa-screenshot-app
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_DATABASE_URL=postgresql://postgres.your-project:your-password@aws-1-eu-west-1.pooler.supabase.com:5432/postgres

# Optional Gemini API Key (falls back to deterministic simulation if unset)
GEMINI_API_KEY=
```

### 4. Database Setup & Migrations
Run the automated schema migration script to initialize all 11 tables, storage bucket, RLS policies, and sample data:
```bash
node scripts/migrate.js
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/             # Next.js API Routes (chat, journey, knowledge, checkpoints, screens)
│   │   ├── layout.tsx       # Root layout & theme fonts
│   │   └── page.tsx         # Main entry point mounting the Clinical Shell
│   ├── components/
│   │   ├── shell/           # Application chassis, header, navigation, and settings
│   │   ├── wizard/          # 5-step feature intake & AI synthesis wizard
│   │   ├── screens/         # Screen deck manager & Canvas PII redaction modal
│   │   ├── journey/         # React Flow interactive visual journey canvas
│   │   ├── knowledge/       # 7-pillar knowledge table & AI gap discovery deck
│   │   ├── qa/              # QA test matrix and checkpoint manager
│   │   ├── observations/    # Defect and UX friction tracker
│   │   ├── compare/         # Screen comparison & visual diff studio
│   │   ├── chat/            # Ask AI copilot drawer
│   │   └── export/          # Multi-format export dialog (PDF, Markdown, CSV)
│   ├── lib/
│   │   ├── supabase/        # Supabase client and storage helpers
│   │   ├── ai/              # AI service abstractions and deterministic engines
│   │   └── types/           # Core TypeScript definitions & schemas
├── scripts/
│   └── migrate.js           # PostgreSQL DDL, RLS, and seed migration runner
└── public/
```

---

## 📄 License
MIT
