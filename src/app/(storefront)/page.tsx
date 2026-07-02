import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck, Truck } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import * as schema from '@/../drizzle/schema';
import {
  LiveActiveCollectionCarousel,
  LiveFeaturedCarousel,
} from '@/components/home/live-product-sections';
import { BrandMarquee } from '@/components/home/brand-marquee';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type FeaturedProduct = typeof schema.productCache.$inferSelect;

async function getHomeProducts(): Promise<FeaturedProduct[]> {
  try {
    return await db
      .select()
      .from(schema.productCache)
      .where(eq(schema.productCache.isActive, true))
      .orderBy(desc(schema.productCache.currentStock), desc(schema.productCache.createdAt))
      .limit(32);
  } catch {
    return [];
  }
}


export default async function HomePage() {
  const featuredProducts = await getHomeProducts();

  return (
    <div className="min-h-dvh bg-zinc-950 pb-mobile-nav text-white">
      {/* Hero / Billboard Section */}
      <section className="-mt-14 sm:-mt-16 border-b border-white/5 relative overflow-hidden bg-zinc-950">
        {/* Background Video Layer */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover opacity-30 grayscale transition-opacity duration-1000"
            poster="/hero-fallback.jpg"
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
          {/* Darkening & Color gradients for perfect text contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/40 to-zinc-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(227,30,36,0.2),rgba(255,255,255,0))]" />
        </div>
        
        <div className="store-shell relative z-10 pt-14 sm:pt-16">
          <div className="grid grid-cols-1 gap-10 py-8 md:grid-cols-[minmax(0,1fr)_420px] md:gap-12 md:py-12 xl:gap-16">
            
            {/* Hero Left */}
            <div className="flex min-w-0 flex-col justify-center gap-7 md:gap-8">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-primary" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary italic">
                  Inventario en Tiempo Real
                </span>
              </div>

              <div>
                <h1 className="font-outfit text-[3.8rem] font-black leading-[0.85] tracking-wider text-white sm:text-[5.5rem] lg:text-[6.5rem] xl:text-[7.2rem] italic uppercase">
                  CLA<span className="text-brand-primary animate-pulse">Z</span>ICO
                </h1>
                <p className="athletic-tag text-zinc-500 mt-2 text-xs">EXCLUSIVE STORE. REAL STOCK.</p>
                <p className="mt-5 max-w-[28rem] text-sm font-bold uppercase tracking-wider leading-relaxed text-zinc-400">
                  Calzado y colecciones deportivas de la más alta gama con disponibilidad verificada e importación directa.
                </p>
              </div>

              <div className="flex flex-col items-start gap-6 sm:flex-row">
                {/* Button 1: Explorar catálogo */}
                <div className="relative group/btn-wrapper">
                  {/* 3D offset border */}
                  <div className="absolute inset-0 border border-brand-primary translate-x-1.5 translate-y-1.5 transition-transform duration-300 ease-out group-hover/btn-wrapper:translate-x-0 group-hover/btn-wrapper:translate-y-0" />
                  
                  <Link
                    href="/catalog"
                    className="hero-btn-premium hero-btn-premium-primary group/btn"
                  >
                    {/* Shine sweep */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-primary/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-out" />
                    
                    {/* Content with text rolling */}
                    <span className="relative z-10 flex items-center gap-3">
                      <span className="relative block h-5 overflow-hidden leading-5">
                        <span className="block leading-5 transition-transform duration-500 ease-out group-hover/btn:-translate-y-full">
                          Explorar catálogo
                        </span>
                        <span className="absolute top-full left-0 block leading-5 transition-transform duration-500 ease-out group-hover/btn:-translate-y-full text-brand-primary">
                          Explorar catálogo
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out group-hover/btn:translate-x-1 text-zinc-950 group-hover/btn:text-brand-primary" />
                    </span>
                  </Link>
                </div>

                {/* Button 2: Métodos de pago */}
                <div className="relative group/btn-wrapper">
                  {/* 3D offset border */}
                  <div className="absolute inset-0 border border-white/10 translate-x-1.5 translate-y-1.5 transition-transform duration-300 ease-out group-hover/btn-wrapper:translate-x-0 group-hover/btn-wrapper:translate-y-0" />
                  
                  <Link
                    href="/checkout"
                    className="hero-btn-premium hero-btn-premium-secondary group/btn"
                  >
                    {/* Shine sweep */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-out" />
                    
                    {/* Content with text rolling */}
                    <span className="relative z-10">
                      <span className="relative block h-5 overflow-hidden leading-5">
                        <span className="block leading-5 transition-transform duration-500 ease-out group-hover/btn:-translate-y-full">
                          Métodos de pago
                        </span>
                        <span className="absolute top-full left-0 block leading-5 transition-transform duration-500 ease-out group-hover/btn:-translate-y-full text-brand-primary">
                          Métodos de pago
                        </span>
                      </span>
                    </span>
                  </Link>
                </div>
              </div>

              {/* Brand Marquee (replaces the legacy stats grid) */}
              <BrandMarquee />

              {/* Trust Badges */}
              <div className="flex max-w-3xl flex-wrap gap-x-6 gap-y-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <span className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-brand-primary" /> Sistema POS Velox
                </span>
                <span className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-brand-primary" /> Envíos Nacionales
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" /> Pago Seguro
                </span>
              </div>
            </div>

            {/* Hero Right: Sidebar Featured Carousel */}
            <aside className="hidden min-w-0 md:block">
              <LiveFeaturedCarousel initialProducts={featuredProducts} />
            </aside>
          </div>
        </div>
      </section>

      {/* Grid Display Section */}
      <section className="store-shell pt-10 pb-12 md:pt-14 md:pb-16">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="font-outfit text-3xl font-black uppercase tracking-tight text-white italic">
              Colección Activa
            </h2>
            <p className="athletic-tag text-zinc-500 mt-1">Nuestros productos en almacén</p>
          </div>
          <Link
            href="/catalog"
            className="text-xs font-black uppercase tracking-widest text-brand-primary hover:text-white transition-colors"
          >
            Ver catálogo completo
          </Link>
        </div>

        <LiveActiveCollectionCarousel initialProducts={featuredProducts} />
      </section>
    </div>
  );
}
