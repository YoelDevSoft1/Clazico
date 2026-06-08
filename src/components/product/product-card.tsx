import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatBsS, formatUSD } from '@/lib/utils';

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  priceUsd: string | number;
  priceBs: string | number | null;
  currentStock: number;
};

export function ProductCard({
  product,
  sizes = '(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw',
}: {
  product: Product;
  sizes?: string;
}) {
  const hasImage = Boolean(product.imageUrl);
  const inStock = product.currentStock > 0;
  const isLastUnits = product.currentStock > 0 && product.currentStock <= 3;

  const badgeText = !inStock
    ? 'Agotado'
    : isLastUnits
    ? 'Últimas unidades'
    : product.category === 'Calzado'
    ? 'Hot Release'
    : 'Nuevo';

  return (
    <Link href={`/catalog/${product.slug}`} className="group block h-full">
      <article className="premium-card flex h-full flex-col">
        <div className="product-image-wrapper border-b border-white/5 bg-zinc-950">
          {hasImage ? (
            <>
              <Image
                src={product.imageUrl!}
                alt={product.name}
                fill
                sizes={sizes}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </>
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
              <span className="font-outfit text-lg font-black tracking-tighter text-white/20 italic uppercase">
                CLAZICO
              </span>
            </div>
          )}

          {/* Stock Badges */}
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
            <span
              className={`nike-badge ${
                !inStock
                  ? 'bg-zinc-800 text-zinc-500'
                  : isLastUnits
                  ? 'nike-badge-primary'
                  : 'bg-white text-black'
              }`}
            >
              {badgeText}
            </span>
          </div>
        </div>

        <div className="premium-card-info">
          <div>
            <p className="athletic-tag text-brand-primary">
              {product.category || 'Clazico'}
            </p>
            <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] font-outfit text-sm font-black uppercase tracking-tight text-white transition-colors group-hover:text-brand-primary">
              {product.name}
            </h3>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/5 pt-3">
            <div>
              <p className="font-mono text-sm font-black text-white">
                {formatUSD(Number(product.priceUsd))}
              </p>
              {product.priceBs && (
                <p className="truncate font-mono text-[10px] text-zinc-500 font-bold">
                  {formatBsS(Number(product.priceBs))}
                </p>
              )}
            </div>
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-white/10 text-zinc-500 transition-all group-hover:border-white group-hover:bg-white group-hover:text-black">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
