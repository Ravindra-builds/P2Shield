# TechKnights Privacy Firewall — Landing Page

Modern, interactive landing page for **TechKnights Privacy Firewall** (Pre-LLM Sensitive Data Protection Chrome Extension), built with:
- **React 18** + **TypeScript**
- **Tailwind CSS** (dark mode cyber security aesthetic + custom tokens)
- **shadcn/ui** architecture
- **Framer Motion** & **Lucide React**

---

## Quick Start

### 1. From root directory
```bash
npm run landing
```

### 2. Or from inside `landing page/`
```bash
cd "landing page"
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the landing page.

To create a production build:
```bash
npm run build
```

---

## Project Structure & shadcn/ui

```
landing page/
├── components.json              # shadcn CLI configuration
├── index.html                   # HTML entry point with dark theme
├── package.json                 # Dependencies and build scripts
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # Tailwind theme tokens & spektr-cyan-50
├── tsconfig.json                # TypeScript compiler & path alias configs
├── vite.config.ts               # Vite configuration with @/ path alias
├── components/                  # Root mirror for standard /components/ui
│   └── ui/
│       ├── animated-hero.tsx
│       ├── button.tsx
│       └── how-it-works.tsx
└── src/
    ├── App.tsx                  # Main landing page application
    ├── main.tsx                 # React DOM mount point
    ├── index.css                # Tailwind directives & CSS variables
    ├── demo.tsx                 # Demo showcase
    ├── lib/
    │   └── utils.ts             # cn helper (clsx + tailwind-merge)
    └── components/
        ├── navbar.tsx           # Sticky navigation with download triggers
        ├── firewall-simulator.tsx # Interactive sandbox testing real redactions
        ├── features.tsx         # Hackathon requirements feature matrix
        ├── profiles.tsx         # Personal, Healthcare, Finance, Enterprise
        ├── installation.tsx     # Step-by-step Chrome load unpacked guide
        ├── footer.tsx           # Footer with license and links
        └── ui/                  # Primary shadcn component library
            ├── animated-hero.tsx# Animated hero with text replacements
            ├── button.tsx       # shadcn button component with CVA
            └── how-it-works.tsx # 3-step pipeline component
```

---

## Component Updates & Customizations

1. **`components/ui/animated-hero.tsx`**:
   - Replaced *"Jump on a call"* with **"Download package"**
   - Replaced *"Book a call"* / *"Sign up here"* with **"Download extension"**
   - Implemented spring-animated rotating titles (`safe`, `private`, `air-gapped`, `leak-proof`, `compliant`)
   - Configured custom `text-spektr-cyan-50` color token in `tailwind.config.js`

2. **`components/ui/how-it-works.tsx`**:
   - Features the 3-step pipeline architecture:
     1. *Attach to Any Chatbox*
     2. *Inspect & Sanitize Locally*
     3. *Send Safe Prompt to LLM*
   - Includes connecting line indicators and benefit bullet points.

3. **`components/ui/button.tsx`**:
   - Standard shadcn button built with `@radix-ui/react-slot` and `class-variance-authority`.
