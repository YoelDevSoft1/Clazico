'use client';

import Link from 'next/link';
import { PackageCheck, ShieldCheck, UserRound } from 'lucide-react';
import { signOut, useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { data: session, isPending } = useSession();

  return (
    <div className="min-h-dvh bg-zinc-950 pb-28 text-white md:pb-44">
      <section className="store-shell pt-12 md:pt-20">
        <p className="athletic-tag text-brand-primary">Cuenta Clazico</p>
        <h1 className="mt-2 font-outfit text-4xl font-black uppercase italic leading-none text-white md:text-6xl tracking-tight">
          Mi Cuenta
        </h1>

        {isPending ? (
          <div className="mt-8 border border-white/5 bg-zinc-900/30 p-6">
            <div className="h-6 w-40 rounded-full bg-white/10 animate-pulse" />
            <div className="mt-4 h-4 w-64 max-w-full rounded-full bg-white/10 animate-pulse" />
          </div>
        ) : session?.user ? (
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_0.8fr]">
            
            {/* Club Card / User Details */}
            <section className="border border-white/5 bg-zinc-900/30 p-5 md:p-8">
              <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="grid h-16 w-16 place-items-center rounded-none bg-brand-primary text-white font-outfit font-black italic text-xl">
                  {session.user.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <div className="min-w-0">
                  <p className="font-outfit text-xl font-black uppercase italic tracking-tight text-white">
                    {session.user.name || 'Cliente Clazico'}
                  </p>
                  <p className="truncate text-xs font-semibold text-zinc-500 font-mono mt-1">{session.user.email}</p>
                  
                  {/* Status Badge */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                      Miembro Club Activo
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoTile icon={ShieldCheck} title="Pago Verificado" text="Tus comprobantes se validan manualmente con el banco de origen en Venezuela." />
                <InfoTile icon={PackageCheck} title="Tus Pedidos" text="Historial y estado de tus compras vinculadas a Velox POS próximamente." />
              </div>

              <button
                onClick={() => signOut()}
                className="mt-8 h-12 w-full border border-white/10 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-white transition-all cursor-pointer rounded-none"
              >
                Cerrar Sesión
              </button>
            </section>

            {/* Support / Purchases Sidebar */}
            <aside className="border border-white/5 bg-zinc-900/30 p-5 md:p-8 flex flex-col justify-between">
              <div>
                <h2 className="font-outfit text-lg font-black uppercase italic tracking-wider text-white border-b border-white/5 pb-3">
                  Pedidos
                </h2>
                <p className="mt-4 text-xs leading-6 text-zinc-400 uppercase tracking-wider font-bold">
                  Para reportar un pago de un pedido activo o consultar el estado de tu entrega, por favor escríbenos directamente por WhatsApp indicando tu código de referencia.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <Link
                  href="/catalog"
                  className="flex h-12 w-full items-center justify-center border border-white bg-white text-xs font-black uppercase tracking-widest text-zinc-950 hover:bg-transparent hover:text-white transition-colors"
                >
                  Seguir Comprando
                </Link>
                <a
                  href="https://wa.me/584120000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center border border-white/10 bg-transparent text-xs font-black uppercase tracking-widest text-white hover:bg-white/5 transition-colors"
                >
                  Soporte WhatsApp
                </a>
              </div>
            </aside>
          </div>
        ) : (
          <div className="mt-8 border border-white/5 bg-zinc-900/30 p-6 text-center max-w-xl mx-auto">
            <div className="mx-auto grid h-16 w-16 place-items-center bg-zinc-950 border border-white/5">
              <UserRound className="h-6 w-6 text-brand-primary" />
            </div>
            <h2 className="mt-5 font-outfit text-xl font-black uppercase italic">Ingresa a tu Cuenta</h2>
            <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-zinc-500 uppercase tracking-wider font-bold">
              Inicia sesión para guardar tus datos, agilizar el checkout y asociar tus pagos directamente en el POS.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-12 items-center justify-center border border-white bg-white px-8 text-xs font-black uppercase tracking-widest text-zinc-950 hover:bg-transparent hover:text-white transition-colors"
            >
              Entrar
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

type InfoTileProps = {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
};

function InfoTile({ icon: Icon, title, text }: InfoTileProps) {
  return (
    <div className="border border-white/5 bg-zinc-950 p-4">
      <Icon className="h-5 w-5 text-brand-primary animate-pulse" />
      <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-white">{title}</p>
      <p className="mt-1.5 text-[10px] leading-5 font-bold uppercase tracking-wider text-zinc-500">{text}</p>
    </div>
  );
}
