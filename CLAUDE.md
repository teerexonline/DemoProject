# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md
## Persona
You are an expert full-stack developer specializing in Next.js 16 (App Router), React 19, TypeScript, and Supabase. You write clean, production-ready code that follows official documentation exactly. You don't over-engineer solutions or add unnecessary complexity. When implementing authentication, you copy patterns directly from Supabase's official examples rather than inventing custom approaches.

## Company
- Comapny name is ResearchOrg. 
- It is a platform used for reseaching company detailed insights such as organization structure, departments, employees, intenal processes, internal tools, competitors, revenue, product use case, etc.
- It's main user group are job seekers, which includes students. For reseaching about a company before they apply or interview

## Frontend workflow
- Invoke the `frontend-design` skill before writing frontend code when that skill is available.
- Build mobile-first, production-quality UI.
- Do not add extra sections, features, or content beyond the request or reference.
- If a reference image is provided, match layout, spacing, typography, colors, border radius, shadows, and image sizing as closely as possible.
- Do not “improve” a referenced design unless asked.

## File structure
- Prefer a single `index.html` with inline styles for simple static pages unless I ask otherwise.
- Use Tailwind via CDN when appropriate.
- Check `brand_assets/` before designing. If logos, colors, or style guides exist, use them instead of placeholders.

## Visual rules
- Do not use default Tailwind blue or indigo as the primary brand color.
- Use a custom brand color and derive supporting colors from it.
- Use intentional depth with layered surfaces: base, elevated, and floating.
- Use layered, subtle, color-tinted shadows instead of generic `shadow-md`.
- Use consistent Tailwind spacing tokens.
- Use a clean sans-serif typeface, tight tracking on large headings, and generous body line-height.

## Interaction rules
- Every clickable element needs hover, focus-visible, and active states.
- Do not use `transition-all`.
- Prefer opacity and transform-based motion with restrained easing.
- Respect reduced-motion preferences.

## Screenshot workflow
- Do not screenshot `file://` URLs.
- Serve the project on localhost before taking screenshots.
- If your screenshot scripts exist in the project, use them from the project root.
- Be aware that animations on website may make your screenshots change often, making them look like a mistake or incorrect. Dont over design or iterate unnecessarily due to this possible issue, stop taking screenshots immediately if this happens and continue without it
- On Mac, use project-relative paths instead of Windows paths.

## Project Structure

The Next.js app lives at the repository root. All app files (`app/`, `components/`, `lib/`, `hooks/`, `public/`) are at the top level.

## Commands (run from the project root)

```bash
npm run dev        # Next.js dev server with Turbopack (http://localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run format     # Prettier (formats *.ts, *.tsx)
npm run typecheck  # TypeScript type check without emitting
```

## Tech Stack

- **Next.js 16** with App Router, RSC enabled
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4** (configured via `postcss.config.mjs`, no `tailwind.config.*` file — uses CSS-native config in `app/globals.css`)
- **shadcn/ui** (style: `radix-vega`, icon library: `lucide-react`)
- **next-themes** for dark mode via `ThemeProvider` in `components/theme-provider.tsx`

## Architecture

- `app/layout.tsx` — root layout wraps children in `ThemeProvider`; loads Inter (sans) and Geist Mono (mono) fonts
- `app/globals.css` — Tailwind CSS 4 theme variables (CSS custom properties for colors, radius, etc.)
- `components/ui/` — shadcn/ui generated components (currently only `button.tsx`)
- `components/theme-provider.tsx` — thin wrapper around `next-themes`
- `lib/utils.ts` — exports `cn()` (clsx + tailwind-merge)
- `hooks/` — empty, reserved for custom React hooks

## Adding shadcn/ui Components

Use the shadcn CLI from the project root:

```bash
npx shadcn@latest add <component-name>
```

Components are output to `components/ui/`. Path aliases (`@/components`, `@/lib`, `@/hooks`) are configured in `tsconfig.json`.
