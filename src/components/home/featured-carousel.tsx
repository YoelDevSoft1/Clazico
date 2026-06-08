'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { formatUSD, formatBsS } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  priceUsd: string | number;
  priceBs: string | number | null;
  currentStock: number;
  sku: string;
};

type FeaturedCarouselProps = {
  products: Product[];
};

export function FeaturedCarousel({ products }: FeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);

  const activeProduct = products[activeIndex];

  useEffect(() => {
    if (!products.length) return;

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalTime = 4000; // 4 seconds per slide
    const tickTime = 50; // Update progress bar every 50ms
    const progressStep = 100 / (intervalTime / tickTime);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((prevIndex) => (prevIndex + 1) % products.length);
          return 0;
        }
        return prev + progressStep;
      });
    }, tickTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeIndex, isPaused, products.length]);

  if (!products.length) return null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        setProgress(0);
      }}
      className="relative flex flex-col justify-between w-full h-[480px] bg-zinc-900/40 border border-white/5 overflow-hidden group select-none"
    >
      {/* Header Banner */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-baseline">
        <span className="athletic-tag text-zinc-500">Lanzamientos</span>
        <span className="font-mono text-[9px] font-bold text-brand-primary">
          [ {activeIndex + 1} / {products.length} ]
        </span>
      </div>

      {/* Visual Product Display */}
      <Link
        href={`/catalog/${activeProduct.slug}`}
        className="flex-grow w-full flex items-center justify-center bg-zinc-950/60 p-8 relative overflow-hidden"
      >
        {activeProduct.imageUrl ? (
          <div className="relative w-full h-[220px] transition-transform duration-500 ease-out group-hover:scale-103">
            <Image
              src={activeProduct.imageUrl}
              alt={activeProduct.name}
              fill
              priority
              sizes="350px"
              className="object-contain p-2"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-700">
            <ShoppingBag className="h-12 w-12" />
            <span className="font-outfit text-sm font-black italic tracking-tighter">CLAZICO</span>
          </div>
        )}

        {/* Stock Badge */}
        <div className="absolute bottom-4 left-4 z-10">
          <span
            className={cn(
              "nike-badge",
              activeProduct.currentStock > 0 ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"
            )}
          >
            {activeProduct.currentStock > 0 ? `${activeProduct.currentStock} Disponibles` : 'Agotado'}
          </span>
        </div>
      </Link>

      {/* Product Details Section */}
      <div className="bg-zinc-950 border-t border-white/5" style={{ padding: '24px' }}>
        <div className="flex flex-col gap-1.5">
          <span className="athletic-tag text-[9px] text-brand-primary">
            {activeProduct.category || 'Clazico'}
          </span>
          
          <Link
            href={`/catalog/${activeProduct.slug}`}
            className="font-outfit text-base font-black uppercase italic text-white tracking-tight hover:text-brand-primary transition-colors line-clamp-1"
          >
            {activeProduct.name}
          </Link>

          <div className="flex justify-between items-baseline mt-2.5 pt-2.5 border-t border-white/5">
            <div className="flex flex-col">
              <span className="font-mono text-sm font-black text-white">
                {formatUSD(Number(activeProduct.priceUsd))}
              </span>
              {activeProduct.priceBs && (
                <span className="font-mono text-[10px] text-zinc-500 font-bold mt-0.5">
                  {formatBsS(Number(activeProduct.priceBs))}
                </span>
              )}
            </div>

            <Link
              href={`/catalog/${activeProduct.slug}`}
              className="inline-flex h-9 items-center justify-center gap-1.5 border border-white bg-white px-4 text-[10px] font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-transparent hover:text-white"
            >
              <span>Ver Silueta</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex justify-center gap-1.5 mt-5">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveIndex(index);
                setProgress(0);
              }}
              className={cn(
                "h-1 transition-all duration-300 cursor-pointer",
                index === activeIndex ? "w-6 bg-brand-primary" : "w-1.5 bg-zinc-800 hover:bg-zinc-600"
              )}
              aria-label={`Ir al producto ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Auto-play progress line */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-brand-primary transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
    </div>
  );
}
