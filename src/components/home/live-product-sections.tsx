'use client';

import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc-client';
import { FeaturedCarousel } from '@/components/home/featured-carousel';
import { ActiveCollectionCarousel } from '@/components/home/active-collection-carousel';
import type * as schema from '@/../drizzle/schema';

type Product = typeof schema.productCache.$inferSelect;

type LiveProductsProps = {
  initialProducts: Product[];
};

const PRODUCT_REFRESH_MS = 30_000;
const HOME_PRODUCT_LIMIT = 32;

function useLiveHomeProducts(initialProducts: Product[]) {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.product.list.queryOptions({
      limit: HOME_PRODUCT_LIMIT,
      inStock: true,
      sortBy: 'newest',
    }),
    initialData: {
      items: initialProducts,
      total: initialProducts.length,
      limit: HOME_PRODUCT_LIMIT,
      offset: 0,
    },
    refetchInterval: PRODUCT_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  return data.items as Product[];
}

export function LiveFeaturedCarousel({ initialProducts }: LiveProductsProps) {
  const products = useLiveHomeProducts(initialProducts);

  return <FeaturedCarousel products={products} />;
}

export function LiveActiveCollectionCarousel({ initialProducts }: LiveProductsProps) {
  const products = useLiveHomeProducts(initialProducts);

  return <ActiveCollectionCarousel products={products} />;
}
