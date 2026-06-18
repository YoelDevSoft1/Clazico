import Link from 'next/link'

interface Brand {
  readonly slug: string
  readonly label: string
  readonly src: string
}

// Wordmarks sourced from simpleicons.org (CC0) for nike, adidas, newbalance.
// 59fifty and newera are custom typographic marks because those brands are
// not present in the simpleicons registry.
const BRANDS: readonly Brand[] = [
  { slug: 'nike', label: 'Nike', src: '/brands/nike.svg' },
  { slug: 'adidas', label: 'Adidas', src: '/brands/adidas.svg' },
  { slug: 'new-era', label: 'New Era', src: '/brands/newera.svg' },
  { slug: 'new-balance', label: 'New Balance', src: '/brands/newbalance.svg' },
  { slug: '59fifty', label: '59 Fifty', src: '/brands/59fifty.svg' },
] as const

/**
 * BrandMarquee — Infinite horizontal scroll of brand wordmarks.
 *
 * Replaces the legacy "Productos / Disponibles / Tasa Oficial" stats grid on
 * the home page. Pure CSS animation (no JS), pauses on hover, respects
 * `prefers-reduced-motion`. Clicking a brand navigates to
 * `/catalog?brand=<slug>`.
 *
 * The 5-item list is duplicated so the @keyframes can translate `-50%` and
 * seamlessly loop without a visible jump.
 */
export function BrandMarquee() {
  return (
    <section
      aria-label="Marcas que ofrecemos"
      className="brand-marquee"
    >
      <ul className="brand-marquee-track">
        {[...BRANDS, ...BRANDS].map((brand, index) => (
          <li
            key={`${brand.slug}-${index}`}
            className="brand-marquee-item"
          >
            <Link
              href={`/catalog?brand=${brand.slug}`}
              aria-label={`Ver productos de ${brand.label}`}
              className="brand-marquee-link"
            >
              {/* Plain <img> is intentional — local SVGs don't benefit from
                  Next's image optimization pipeline. See spec section 5. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.src}
                alt={brand.label}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="brand-marquee-logo"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}