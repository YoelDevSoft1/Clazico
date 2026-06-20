'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Layers3,
  Loader2,
  Radio,
  ScanLine,
} from 'lucide-react';
import { useTRPC } from '@/lib/trpc-client';
import { DEFAULT_LOOKBOOKS } from '@/lib/lookbook-definitions';
import { useCartStore, type CartItem } from '@/stores/cart.store';
import { cn, formatUSD } from '@/lib/utils';

type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  priceUsd: string | number;
  currentStock: number;
  sku: string;
};

type EditorialLook = {
  id: string;
  databaseId?: string | null;
  source?: 'database' | 'fallback';
  title: string;
  slug: string;
  season: string;
  description: string;
  thesis: string;
  tempo: string;
  palette: string;
  tags: string[];
  image: string;
  recipeItems?: LookbookRecipeItem[];
  isSellable?: boolean;
};

type LookbookRecipeItem = {
  id: string;
  source: 'database' | 'fallback';
  role: string;
  label: string | null;
  isRequired: boolean;
  minQuantity: number;
  maxQuantity: number;
  productId: string;
  productSlug: string;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  variantId: string | null;
  variantSku: string | null;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  priceUsd: number;
  priceBs: number;
  currentStock: number;
};

type StorefrontLookbook = EditorialLook & {
  databaseId: string | null;
  source: 'database' | 'fallback';
  recipeItems: LookbookRecipeItem[];
  isSellable: boolean;
};

const FALLBACK_LOOKS = DEFAULT_LOOKBOOKS satisfies EditorialLook[];

export default function LookbooksPage() {
  const trpc = useTRPC();
  const addItem = useCartStore((state) => state.addItem);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: lookbooks = [], isLoading: isLoadingLookbooks } = useQuery(
    trpc.lookbook.listForStorefront.queryOptions(),
  );
  const { data: productsData, isLoading: isLoadingProducts } = useQuery(
    trpc.product.list.queryOptions({
      limit: 16,
      inStock: true,
      sortBy: 'newest',
    }),
  );

  const products = (productsData?.items ?? []) as CatalogProduct[];
  const looks = useMemo<EditorialLook[]>(() => {
    if (lookbooks.length === 0) return FALLBACK_LOOKS;

    return (lookbooks as StorefrontLookbook[]).map((lookbook, index) => {
      const fallback = FALLBACK_LOOKS[index % FALLBACK_LOOKS.length]!;

      return {
        id: lookbook.id,
        databaseId: lookbook.databaseId,
        source: lookbook.source,
        title: lookbook.title,
        slug: lookbook.slug,
        season: lookbook.season || fallback.season,
        description: lookbook.description || fallback.description,
        thesis: fallback.thesis,
        tempo: fallback.tempo,
        palette: fallback.palette,
        tags: fallback.tags,
        image: fallback.image,
        recipeItems: lookbook.recipeItems,
        isSellable: lookbook.isSellable,
      };
    });
  }, [lookbooks]);

  const activeLook = looks[activeIndex % looks.length] ?? FALLBACK_LOOKS[0]!;
  const heroLooks = [0, 1, 2, 3].map((offset) => getLook(looks, activeIndex + offset));
  const heroProducts = [0, 1, 2, 3].map((offset) =>
    getProduct(products, activeIndex + offset),
  );
  const activeProducts = [0, 1, 2, 3].map((offset) =>
    getProduct(products, activeIndex * 3 + offset),
  );
  const isLoading = isLoadingLookbooks || isLoadingProducts;
  const handleBuyDrop = (look: EditorialLook) => {
    const items = look.recipeItems?.filter((item) => item.currentStock > 0) ?? [];
    if (items.length === 0) return;

    for (const item of items) {
      addItem({
        ...toCartItem(item, look),
        quantity: Math.max(1, item.minQuantity),
      });
    }
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-zinc-950 pb-24 text-white md:pb-16">
      <section className="relative border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(227,30,36,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)]" />
        <div className="store-shell relative grid min-h-[calc(100dvh-4rem)] gap-8 pt-12 pb-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pt-18">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="athletic-tag text-brand-primary">Clazico Editorial</span>
              <span className="h-px w-12 bg-white/20" />
              <span className="athletic-tag text-zinc-500">Powered by Velox POS</span>
            </div>

            <h1 className="font-outfit text-[4.6rem] font-black uppercase italic leading-[0.76] tracking-[-0.08em] text-white sm:text-[6.5rem] md:text-[8rem] xl:text-[10rem]">
              Look
              <br />
              books
            </h1>

            <p className="mt-6 max-w-xl text-sm font-bold uppercase leading-7 tracking-wider text-zinc-400 md:text-base">
              Outfits curados con inventario real sincronizado desde Velox. Entra por la historia, compra desde el stock.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#shop-the-look"
                className="inline-flex h-13 items-center justify-center gap-3 border border-white bg-white px-7 text-xs font-black uppercase tracking-widest text-zinc-950 transition-colors hover:bg-transparent hover:text-white"
              >
                Comprar el look
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/catalog"
                className="inline-flex h-13 items-center justify-center gap-3 border border-white/10 px-7 text-xs font-black uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white/5"
              >
                Ver catalogo
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl border-y border-white/5 sm:grid-cols-3">
              <SignalCell icon={Radio} label="Velox activo" value="Stock vivo" />
              <SignalCell icon={ScanLine} label="Curaduria" value="Looks reales" />
              <SignalCell icon={CheckCircle2} label="Compra" value="Directo al catalogo" />
            </div>
          </div>

          <HeroEditorialBoard
            activeLook={activeLook}
            looks={heroLooks}
            products={heroProducts}
            isLoading={isLoading}
          />
        </div>
      </section>

      <section className="store-shell py-10 md:py-14">
        <div className="flex flex-col gap-4 border-b border-white/5 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="athletic-tag text-brand-primary">Drops editoriales</p>
            <h2 className="mt-2 font-outfit text-3xl font-black uppercase italic tracking-tight text-white md:text-5xl">
              Elige tu energia
            </h2>
          </div>
          <p className="max-w-xl text-xs font-bold uppercase leading-6 tracking-wider text-zinc-500">
            Cada drop mezcla imagen, producto y disponibilidad para que el lookbook no sea inspiracion vacia: es compra accionable.
          </p>
        </div>

        <div className="-mx-5 mt-7 flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-4 md:px-0">
          {looks.map((look, index) => (
            <button
              key={look.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                'group min-w-[250px] border p-4 text-left transition-all md:min-w-0',
                index === activeIndex
                  ? 'border-white bg-white text-zinc-950'
                  : 'border-white/10 bg-white/[0.03] text-white hover:border-white/30',
              )}
            >
              <span className={cn('font-mono text-[10px] font-black uppercase tracking-widest', index === activeIndex ? 'text-zinc-500' : 'text-brand-primary')}>
                {look.season}
              </span>
              <span className="mt-4 block font-outfit text-xl font-black uppercase italic leading-none tracking-tight">
                {look.title}
              </span>
              <span className={cn('mt-3 block text-[10px] font-bold uppercase leading-5 tracking-wider', index === activeIndex ? 'text-zinc-600' : 'text-zinc-500')}>
                {look.tempo}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="store-shell pb-12 md:pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <ActiveLookPanel
            activeLook={activeLook}
            products={activeProducts}
            onBuyDrop={handleBuyDrop}
          />
          <VeloxStockPanel products={products} looks={looks} />
        </div>
      </section>

      <section id="shop-the-look" className="border-y border-white/5 bg-zinc-900/20 py-12 md:py-16">
        <div className="store-shell">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="athletic-tag text-brand-primary">Shop the look</p>
              <h2 className="mt-2 font-outfit text-3xl font-black uppercase italic tracking-tight text-white md:text-5xl">
                Piezas con stock real
              </h2>
            </div>
            <Link
              href="/catalog"
              className="inline-flex h-11 w-fit items-center justify-center gap-2 border border-white/10 px-5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:border-white hover:bg-white hover:text-zinc-950"
            >
              Ver catalogo completo
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid min-h-[32dvh] place-items-center">
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <Loader2 className="h-9 w-9 animate-spin text-brand-primary" />
                <p className="athletic-tag">Cargando stock Velox...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <EditorialFallbackGrid looks={looks} />
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
              {products.slice(0, 8).map((product) => (
                <LookProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="store-shell py-12 md:py-16">
        <div className="grid gap-6 border border-white/5 bg-black p-5 md:grid-cols-[0.8fr_1.2fr] md:p-8">
          <div>
            <p className="athletic-tag text-brand-primary">Stock vivo Velox</p>
            <h2 className="mt-3 font-outfit text-3xl font-black uppercase italic leading-none tracking-tight md:text-5xl">
              Editorial que no se queda en moodboard.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ProofBlock title="Sin promesas vacias" text="Las piezas salen del catalogo activo, no de una maqueta desconectada." />
            <ProofBlock title="Compra rapida" text="Cada producto lleva al PDP o al catalogo para cerrar el outfit." />
            <ProofBlock title="Ritmo Clazico" text="La direccion visual respeta la base premium actual de la tienda." />
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroEditorialBoard({
  activeLook,
  looks,
  products,
  isLoading,
}: {
  activeLook: EditorialLook;
  looks: EditorialLook[];
  products: Array<CatalogProduct | undefined>;
  isLoading: boolean;
}) {
  const [primary, secondary, tertiary, quaternary] = products;
  const [, secondaryLook, tertiaryLook, quaternaryLook] = looks;

  return (
    <div className="relative h-[560px] lg:h-[680px]">
      <div className="absolute -right-8 top-4 hidden h-44 w-44 border border-brand-primary/30 md:block" />
      <div className="absolute bottom-20 left-2 hidden h-28 w-28 border border-white/10 md:block" />

      <div className="grid h-full grid-cols-[0.72fr_1fr] grid-rows-[1fr_0.72fr] gap-3 md:gap-4">
        <EditorialImageFrame
          look={secondaryLook}
          product={secondary}
          label="Layer"
          className="translate-y-12"
        />
        <div className="relative row-span-2 overflow-hidden border border-white/10 bg-zinc-900">
          <EditorialArtImage src={activeLook.image} alt={activeLook.title} preload />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
            <p className="athletic-tag text-brand-primary">{activeLook.season}</p>
            <h2 className="mt-2 font-outfit text-4xl font-black uppercase italic leading-none tracking-tight md:text-6xl">
              {activeLook.title}
            </h2>
            <p className="mt-4 max-w-md text-xs font-bold uppercase leading-6 tracking-wider text-zinc-300">
              {activeLook.thesis}
            </p>
          </div>
          <div className="absolute right-4 top-4 border border-white/10 bg-black/80 px-3 py-2 backdrop-blur">
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-white">
              {isLoading ? 'Sync...' : primary ? `${primary.currentStock} en stock` : 'Curado'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <EditorialImageFrame look={tertiaryLook} product={tertiary} label="Fit" />
          <EditorialImageFrame look={quaternaryLook} product={quaternary} label="Detail" />
        </div>
      </div>

      <div className="absolute left-1/2 top-10 hidden -translate-x-1/2 border border-white bg-white px-4 py-3 text-zinc-950 shadow-2xl md:block">
        <p className="font-mono text-[10px] font-black uppercase tracking-widest">
          Live Velox / Clazico drop
        </p>
      </div>
    </div>
  );
}

function EditorialImageFrame({
  look,
  product,
  label,
  className,
}: {
  look?: EditorialLook;
  product?: CatalogProduct;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden border border-white/10 bg-zinc-900', className)}>
      {look ? (
        <EditorialArtImage src={look.image} alt={look.title} className="opacity-90" />
      ) : (
        <ProductImage product={product} className="object-cover opacity-90" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <p className="absolute bottom-3 left-3 font-mono text-[10px] font-black uppercase tracking-widest text-white">
        {label}
      </p>
    </div>
  );
}

function ActiveLookPanel({
  activeLook,
  products,
  onBuyDrop,
}: {
  activeLook: EditorialLook;
  products: Array<CatalogProduct | undefined>;
  onBuyDrop: (look: EditorialLook) => void;
}) {
  const featured = products.filter(Boolean) as CatalogProduct[];
  const recipeItems = activeLook.recipeItems ?? [];
  const canBuyDrop = recipeItems.length > 0 && recipeItems.every((item) => item.currentStock > 0);

  return (
    <article className="border border-white/5 bg-zinc-900/30">
      <div className="grid gap-0 md:grid-cols-[0.78fr_1fr]">
        <div className="relative min-h-[420px] border-b border-white/5 bg-zinc-900 md:border-b-0 md:border-r">
          <EditorialArtImage src={activeLook.image} alt={activeLook.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <p className="athletic-tag text-brand-primary">{activeLook.palette}</p>
            <p className="mt-2 font-outfit text-3xl font-black uppercase italic leading-none">
              {activeLook.tempo}
            </p>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <p className="athletic-tag text-brand-primary">{activeLook.season}</p>
          <h2 className="mt-2 font-outfit text-4xl font-black uppercase italic leading-none tracking-tight md:text-6xl">
            {activeLook.title}
          </h2>
          <p className="mt-5 text-sm font-bold uppercase leading-7 tracking-wider text-zinc-400">
            {activeLook.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {activeLook.tags.map((tag) => (
              <span
                key={tag}
                className="border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {recipeItems.length > 0 ? recipeItems.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={`/catalog/${item.productSlug}`}
                className="group flex items-center gap-3 border border-white/5 bg-zinc-950 p-3 transition-colors hover:border-white/20"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-zinc-900">
                  <ProductImage
                    product={toCatalogProduct(item)}
                    fallbackSrc={activeLook.image}
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-black uppercase tracking-tight text-white group-hover:text-brand-primary">
                    {item.productName}
                  </p>
                  <p className="mt-1 font-mono text-[10px] font-bold text-zinc-500">
                    {item.currentStock} disponibles / {item.role}
                  </p>
                </div>
              </Link>
            )) : featured.slice(0, 4).map((product) => (
              <Link
                key={product.id}
                href={`/catalog/${product.slug}`}
                className="group flex items-center gap-3 border border-white/5 bg-zinc-950 p-3 transition-colors hover:border-white/20"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-zinc-900">
                  <ProductImage product={product} className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-black uppercase tracking-tight text-white group-hover:text-brand-primary">
                    {product.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] font-bold text-zinc-500">
                    {product.currentStock} disponibles / {formatUSD(Number(product.priceUsd))}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onBuyDrop(activeLook)}
            disabled={!canBuyDrop}
            className="mt-8 inline-flex h-12 items-center justify-center gap-3 border border-white bg-white px-7 text-xs font-black uppercase tracking-widest text-zinc-950 transition-colors hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-zinc-500"
          >
            {canBuyDrop ? 'Comprar este drop' : 'Drop no disponible'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function VeloxStockPanel({
  products,
  looks,
}: {
  products: CatalogProduct[];
  looks: EditorialLook[];
}) {
  const liveProducts = products.slice(0, 6);

  return (
    <aside className="border border-white/5 bg-black p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <p className="athletic-tag text-brand-primary">Stock vivo Velox</p>
          <h2 className="mt-2 font-outfit text-2xl font-black uppercase italic tracking-tight">
            Lo que se puede comprar ahora
          </h2>
        </div>
        <div className="grid h-12 w-12 place-items-center border border-brand-primary/30 bg-brand-primary/10 text-brand-primary">
          <Radio className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {liveProducts.length === 0
          ? looks.slice(0, 5).map((look, index) => (
              <Link
                key={look.id}
                href="/catalog"
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-white/5 bg-zinc-950 p-3 transition-colors hover:border-white/20"
              >
                <span className="font-mono text-[10px] font-black text-zinc-600">
                  0{index + 1}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-1 text-xs font-black uppercase tracking-tight text-white group-hover:text-brand-primary">
                    {look.title}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                    {look.tempo}
                  </span>
                </span>
                <span className="border border-brand-primary/25 bg-brand-primary/10 px-2 py-1 font-mono text-[10px] font-black text-brand-primary">
                  Drop
                </span>
              </Link>
            ))
          : liveProducts.map((product, index) => (
              <Link
                key={product.id}
                href={`/catalog/${product.slug}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-white/5 bg-zinc-950 p-3 transition-colors hover:border-white/20"
              >
                <span className="font-mono text-[10px] font-black text-zinc-600">
                  0{index + 1}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-1 text-xs font-black uppercase tracking-tight text-white group-hover:text-brand-primary">
                    {product.name}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                    SKU {product.sku}
                  </span>
                </span>
                <span className="border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] font-black text-emerald-300">
                  {product.currentStock}
                </span>
              </Link>
            ))}
      </div>
    </aside>
  );
}

function EditorialFallbackGrid({ looks }: { looks: EditorialLook[] }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
      {looks.slice(0, 4).map((look) => (
        <Link key={look.id} href="/catalog" className="group block">
          <article className="premium-card h-full">
            <div className="relative aspect-[4/5] overflow-hidden border-b border-white/5 bg-zinc-900">
              <EditorialArtImage src={look.image} alt={look.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute left-3 top-3 nike-badge nike-badge-primary">
                {look.season}
              </div>
              <p className="absolute bottom-3 left-3 right-3 font-outfit text-xl font-black uppercase italic leading-none tracking-tight text-white">
                {look.title}
              </p>
            </div>
            <div className="p-4">
              <p className="athletic-tag text-brand-primary">{look.tempo}</p>
              <p className="mt-2 line-clamp-3 text-[10px] font-bold uppercase leading-5 tracking-wider text-zinc-500">
                {look.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  Ver piezas
                </span>
                <span className="grid h-8 w-8 place-items-center border border-white/10 text-zinc-400 group-hover:border-white group-hover:bg-white group-hover:text-zinc-950">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}

function LookProductCard({ product }: { product: CatalogProduct }) {
  return (
    <Link href={`/catalog/${product.slug}`} className="group block">
      <article className="premium-card h-full">
        <div className="relative aspect-[4/5] overflow-hidden border-b border-white/5 bg-zinc-900">
          <ProductImage product={product} className="object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute left-3 top-3 nike-badge nike-badge-primary">
            {product.currentStock > 0 ? 'Stock Velox' : 'Agotado'}
          </div>
        </div>
        <div className="p-4">
          <p className="athletic-tag text-brand-primary">{product.category || 'Clazico'}</p>
          <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] font-outfit text-sm font-black uppercase tracking-tight text-white group-hover:text-brand-primary">
            {product.name}
          </h3>
          <div className="mt-4 flex items-end justify-between border-t border-white/5 pt-3">
            <p className="font-mono text-sm font-black text-white">
              {formatUSD(Number(product.priceUsd))}
            </p>
            <span className="grid h-8 w-8 place-items-center border border-white/10 text-zinc-400 group-hover:border-white group-hover:bg-white group-hover:text-zinc-950">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ProductImage({
  product,
  className,
  fallbackSrc = '/lookbooks/asfalto-rojo.png',
}: {
  product?: CatalogProduct;
  className?: string;
  fallbackSrc?: string;
}) {
  return (
    <Image
      src={product?.imageUrl || fallbackSrc}
      alt={product?.name || 'Lookbook Clazico'}
      fill
      sizes="(max-width: 768px) 100vw, 50vw"
      className={cn('h-full w-full', className)}
    />
  );
}

function EditorialArtImage({
  src,
  alt,
  className,
  preload,
}: {
  src: string;
  alt: string;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      preload={preload}
      sizes="(max-width: 768px) 100vw, 50vw"
      className={cn('h-full w-full object-cover', className)}
    />
  );
}

function SignalCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Radio;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 border-white/5 py-4 sm:border-r sm:px-4 first:pl-0 last:border-r-0">
      <Icon className="h-5 w-5 shrink-0 text-brand-primary" />
      <div>
        <p className="font-mono text-[10px] font-black uppercase tracking-widest text-zinc-600">
          {label}
        </p>
        <p className="mt-1 text-xs font-black uppercase tracking-wider text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function ProofBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-white/5 bg-zinc-950 p-4">
      <Layers3 className="h-5 w-5 text-brand-primary" />
      <p className="mt-4 text-xs font-black uppercase tracking-wider text-white">{title}</p>
      <p className="mt-2 text-[10px] font-bold uppercase leading-5 tracking-wider text-zinc-500">
        {text}
      </p>
    </div>
  );
}

function getProduct(products: CatalogProduct[], index: number): CatalogProduct | undefined {
  if (products.length === 0) return undefined;
  return products[index % products.length];
}

function getLook(looks: EditorialLook[], index: number): EditorialLook {
  return looks[index % looks.length] ?? FALLBACK_LOOKS[index % FALLBACK_LOOKS.length]!;
}

function toCartItem(item: LookbookRecipeItem, look: EditorialLook): Omit<CartItem, 'quantity'> {
  return {
    variantId: item.variantId ?? `product::${item.productId}`,
    productId: item.productId,
    name: item.productName,
    sku: item.variantSku ?? item.productSku,
    size: item.size,
    color: item.color,
    colorHex: item.colorHex,
    imageUrl: item.imageUrl ?? item.productImageUrl ?? look.image,
    priceUsd: item.priceUsd,
    priceBs: item.priceBs,
    availableStock: item.currentStock,
    slug: item.productSlug,
    lookbookSlug: look.slug,
    lookbookTitle: look.title,
    lookbookItemId: item.source === 'database' ? item.id : undefined,
    lookbookRole: item.role,
  };
}

function toCatalogProduct(item: LookbookRecipeItem): CatalogProduct {
  return {
    id: item.productId,
    slug: item.productSlug,
    name: item.productName,
    category: item.role,
    imageUrl: item.imageUrl ?? item.productImageUrl,
    priceUsd: item.priceUsd,
    currentStock: item.currentStock,
    sku: item.variantSku ?? item.productSku,
  };
}
