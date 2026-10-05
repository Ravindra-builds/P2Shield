# P2Shield landing page

A static, self-contained site for the P2Shield Chrome extension. It has its own `package.json` and shares no code with the extension, so it can be deployed on its own.

Stack: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide icons. The font (Plus Jakarta Sans) is bundled, so the page makes no third-party requests.

## Run locally

```bash
cd "landing page"
npm install
npm run dev        # http://localhost:3000
```

From the repository root, `npm run landing` does the same.

## Build and deploy

```bash
npm run build      # type-checks, then writes the static site to dist/
npm run preview    # serve dist/ locally
```

`dist/` is plain static files. Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages). Set the project root to `landing page`, the build command to `npm run build` and the output directory to `dist`.

Hosting under a sub-path (for example GitHub Pages at `/repo-name/`)? Build with the base set:

```bash
npx vite build --base=/repo-name/
```

## Edit the content

- Links and the logo path: `src/config.ts` (`REPO_URL`, `NPM_URL`, `NPM_INSTALL`; set `REPO_URL` to the final repository)
- Hero: `src/components/ui/animated-hero.tsx`
- How it works: `src/components/ui/how-it-works.tsx`
- Install: `src/components/installation.tsx`
- Navbar and footer: `src/components/navbar.tsx`, `src/components/footer.tsx`
- Logo and favicon: `public/p2shield-logo.png`, `public/favicon.png`

`features.tsx`, `firewall-simulator.tsx`, `profiles.tsx` and `src/demo.tsx` are not used by the page.
