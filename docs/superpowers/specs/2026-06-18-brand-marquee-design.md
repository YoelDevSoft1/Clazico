# Brand Marquee — Design Spec

**Date:** 2026-06-18
**Status:** Approved
**Scope:** Replace the existing Statistics Grid (`Productos / Disponibles / Tasa Oficial`) on the home page with a horizontally-scrolling brand marquee.

---

## 1. Goal

Replace the current `grid-cols-3` stats block on `src/app/(storefront)/page.tsx` (lines 153-170) with a premium infinite horizontal marquee that displays the wordmarks of the five brands the store carries (Nike, Adidas, New Era, New Balance, 59 Fifty). The marquee replaces the stats block in the same vertical position, conveying "we carry these brands" instead of "we have N products".

---

## 2. Visual Design

- **Style:** Flat infinite marquee with fade gradients on both horizontal edges.
- **Direction:** Right-to-left (logos enter from the right and exit on the left, conventional marquee direction).
- **Logo height:** 36 px desktop, 28 px on screens `< 640px`.
- **Spacing between logos:** `gap: 3rem` (48 px).
- **Logo state:**
  - Resting: `opacity: 0.55`, white (forced via `filter: invert(1) brightness(2)`).
  - Hover: `opacity: 1`, transition 250 ms `var(--ease-smooth)`.
- **Container width:** `max-width: 64rem` (`max-w-5xl`). Wider than the previous `max-w-xl` to give the marquee room to breathe without changing the vertical position in the layout.
- **Edge fade:** 8 % gradient mask on each side (`mask-image: linear-gradient(to right, transparent, black 8 %, black 92 %, transparent)`).

---

## 3. Behavior

- **Auto-scroll:** continuous, no user input required. One full cycle = 20 seconds.
- **Pause on hover:** the animation pauses when the cursor enters the marquee container and resumes when it leaves. Pause uses `animation-play-state: paused` (CSS only).
- **Click → catalog filter:** each logo wraps a `<Link href="/catalog?brand={slug}">`. The catalog page is responsible for honoring the `?brand=` query param (out of scope for this spec; documented as follow-up if not already supported).
- **Accessibility:**
  - `prefers-reduced-motion: reduce` → animation disabled, logos render as a static horizontal row.
  - All `<img>` carry meaningful `alt` attributes.
  - All `<a>` carry meaningful link text (logo + brand name as accessible name).
- **Performance:**
  - `will-change: transform` on the track.
  - `translate3d` to force GPU compositing.
  - No `useState`, no `useEffect`, no client-side JS — the entire animation is CSS-driven.
  - SVG files are tiny (< 2 KB each) and loaded with `loading="lazy"`.

---

## 4. Component Architecture

### Files modified

| Path | Change |
| --- | --- |
| `src/app/(storefront)/page.tsx` | Replace the `<div className="grid max-w-xl grid-cols-3 ...">` stats block (lines 153-170) with `<BrandMarquee />`. |
| `src/app/globals.css` | Add `.brand-marquee`, `.brand-marquee-track`, `.brand-marquee-item`, `.brand-marquee-item img`, `@keyframes marquee-scroll`, reduced-motion override. |

### Files added

| Path | Purpose |
| --- | --- |
| `src/components/home/brand-marquee.tsx` | New server component (no `"use client"`). Renders the 5-brand marquee. |
| `public/brands/nike.svg` | Static SVG, CC0 from simpleicons.org. |
| `public/brands/adidas.svg` | Static SVG, CC0 from simpleicons.org. |
| `public/brands/newera.svg` | Static SVG, CC0 from simpleicons.org. |
| `public/brands/newbalance.svg` | Static SVG, CC0 from simpleicons.org. |
| `public/brands/59fifty.svg` | Static SVG, CC0 from simpleicons.org. |

### Component contract

```tsx
// src/components/home/brand-marquee.tsx
import Image from 'next/image';
import Link from 'next/link';

const BRANDS = [
  { slug: 'nike',        label: 'Nike',        src: '/brands/nike.svg' },
  { slug: 'adidas',      label: 'Adidas',      src: '/brands/adidas.svg' },
  { slug: 'new-era',     label: 'New Era',     src: '/brands/newera.svg' },
  { slug: 'new-balance', label: 'New Balance', src: '/brands/newbalance.svg' },
  { slug: '59fifty',     label: '59 Fifty',    src: '/brands/59fifty.svg' },
] as const;

export function BrandMarquee() {
  return (
    <section
      aria-label="Marcas que ofrecemos"
      className="brand-marquee"
    >
      <ul className="brand-marquee-track">
        {[...BRANDS, ...BRANDS].map((brand, index) => (
          <li key={`${brand.slug}-${index}`} className="brand-marquee-item">
            <Link
              href={`/catalog?brand=${brand.slug}`}
              aria-label={`Ver productos de ${brand.label}`}
              className="block"
            >
              <img
                src={brand.src}
                alt={brand.label}
                loading="lazy"
                width={120}
                height={36}
                className="h-9 w-auto sm:h-9"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

### CSS contract

```css
@keyframes marquee-scroll {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}

.brand-marquee {
  position: relative;
  width: 100%;
  max-width: 64rem;
  margin-inline: auto;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    black 8%,
    black 92%,
    transparent 100%
  );
          mask-image: linear-gradient(
    to right,
    transparent 0,
    black 8%,
    black 92%,
    transparent 100%
  );
}

.brand-marquee-track {
  display: flex;
  width: max-content;
  gap: 3rem;
  align-items: center;
  animation: marquee-scroll 20s linear infinite;
  will-change: transform;
  list-style: none;
  margin: 0;
  padding: 0.5rem 0;
}

.brand-marquee:hover .brand-marquee-track {
  animation-play-state: paused;
}

.brand-marquee-item img {
  height: 36px;
  width: auto;
  opacity: 0.55;
  filter: grayscale(1) invert(1) brightness(2);
  transition: opacity 250ms var(--ease-smooth);
}

.brand-marquee-item:hover img {
  opacity: 1;
}

@media (max-width: 640px) {
  .brand-marquee-item img {
    height: 28px;
  }
  .brand-marquee-track {
    gap: 2.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-marquee-track {
    animation: none;
    transform: none;
  }
}
```

---

## 5. SVG Source Policy

SVGs are sourced from `https://simpleicons.org` (CC0 1.0, public domain). Each is a single-path monochrome SVG that uses `fill="currentColor"` or a path with no fill — the CSS `filter: invert(1) brightness(2)` forces it to white over the dark hero background. Path data is NOT modified. Files are stored at `public/brands/{slug}.svg` and loaded via plain `<img>` (not Next `<Image>`) because SVG optimization is not relevant and Next's image pipeline doesn't apply to local SVGs by default.

**Why not `simple-icons` npm package:** the package ships > 2 800 icons (~ 3 MB). The store only needs 5. Hand-picking 5 CC0 files is smaller, faster, and removes a dependency.

---

## 6. What is NOT in scope

- Catalog filtering by `?brand=` query param. The marquee emits the link; whether the catalog page honors it is a follow-up task owned by whoever maintains `/catalog`.
- Drag-to-scroll interaction. YAGNI — pause-on-hover + click covers the use cases.
- Parallax / 3D perspective. Rejected in clarification.
- A reusable `<Marquee>` primitive. YAGNI — only one consumer.

---

## 7. Testing

- **Visual:** manually load the home page in dev, confirm:
  1. Marquee scrolls continuously left.
  2. Hover pauses; leaving resumes.
  3. Logos fade in/out at edges (no hard cut).
  4. Clicking a logo navigates to `/catalog?brand=...`.
- **Reduced motion:** toggle OS-level "reduce motion" → confirm static row, no animation.
- **Mobile:** load at 375 px width → confirm logos shrink to 28 px and the row still scrolls.
- **Lighthouse:** run after implementation; aim for no regression in CLS / LCP from the swap.

---

## 8. Acceptance Criteria

- [ ] `src/components/home/brand-marquee.tsx` exists and exports `<BrandMarquee />`.
- [ ] `src/app/(storefront)/page.tsx` imports and renders `<BrandMarquee />` in place of the stats grid.
- [ ] `src/app/globals.css` contains `.brand-marquee`, `.brand-marquee-track`, `.brand-marquee-item`, and `@keyframes marquee-scroll`.
- [ ] All 5 SVG files exist in `public/brands/`.
- [ ] No `"use client"` directive is added.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` succeeds.
- [ ] Manual verification in browser matches sections 2 and 3.