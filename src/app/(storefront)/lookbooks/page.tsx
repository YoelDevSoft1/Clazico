'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useTRPC } from '@/lib/trpc-client';

export default function LookbooksPage() {
  const trpc = useTRPC();
  const { data: lookbooks = [], isLoading } = useQuery(trpc.lookbook.list.queryOptions());

  return (
    <main className="min-h-dvh bg-zinc-950 pb-24 text-white md:pb-14">
      <section className="store-shell pt-6 md:pt-12">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase text-brand-primary">Clazico editorial</p>
          <h1 className="mt-2 font-outfit text-4xl font-black leading-none text-white md:text-6xl">
            Lookbooks
          </h1>
          <p className="mt-4 text-base font-medium leading-7 text-zinc-400">
            Colecciones, combinaciones y piezas destacadas para comprar con stock confirmado.
          </p>
        </div>
      </section>

      <section className="store-shell mt-8">
        {isLoading ? (
          <div className="grid min-h-[45dvh] place-items-center">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <Loader2 className="h-9 w-9 animate-spin text-brand-primary" />
              <p className="text-sm font-bold">Cargando lookbooks...</p>
            </div>
          </div>
        ) : lookbooks.length === 0 ? (
          <div className="grid min-h-[45dvh] place-items-center rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="max-w-md">
              <p className="font-outfit text-2xl font-black text-white">Colecciones en preparacion</p>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Mientras cargamos editoriales, puedes explorar el catalogo sincronizado desde Velox.
              </p>
              <Link
                href="/catalog"
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-primary px-6 text-sm font-black text-white"
              >
                Ver catalogo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {lookbooks.map((lookbook) => (
              <Link
                key={lookbook.id}
                href="/catalog"
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                <div className="relative aspect-[4/5] bg-zinc-900">
                  <Image
                    src="/placeholder-shoe.png"
                    alt={lookbook.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-black uppercase text-brand-primary">
                    {lookbook.season || 'Clazico'}
                  </p>
                  <h2 className="mt-2 font-outfit text-2xl font-black text-white">{lookbook.title}</h2>
                  {lookbook.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                      {lookbook.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
