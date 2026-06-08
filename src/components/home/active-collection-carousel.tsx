'use client';

import { useState } from 'react';
import { ProductCard } from '@/components/product/product-card';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

type ActiveCollectionCarouselProps = {
  products: Product[];
};

export function ActiveCollectionCarousel({ products }: ActiveCollectionCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(products.length / itemsPerPage);
  
  if (!products.length) return null;

  const currentProducts = products.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-3 xl:grid-cols-4 animate-fade-in">
        {currentProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-between border-t border-white/5 pt-6">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-black uppercase text-zinc-500 tracking-widest">
              Página {currentPage + 1} de {totalPages}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={prevPage}
              className="grid h-10 w-10 place-items-center border border-white/10 text-zinc-400 hover:bg-white hover:text-black hover:border-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 disabled:hover:border-white/10"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex gap-1.5 hidden sm:flex">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={cn(
                    "h-1.5 transition-all duration-300",
                    currentPage === index ? "w-8 bg-brand-primary" : "w-2 bg-zinc-800 hover:bg-zinc-600"
                  )}
                  aria-label={`Ir a la página ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextPage}
              className="grid h-10 w-10 place-items-center border border-white/10 text-zinc-400 hover:bg-white hover:text-black hover:border-white transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 disabled:hover:border-white/10"
              aria-label="Siguiente página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
