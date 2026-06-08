'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home,
  LayoutDashboard,
  LogOut,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { signOut, useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type SessionUserWithRole = {
  role?: string;
};

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, isPending } = useSession();
  const cartItems = useCartStore((state) => state.items);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const isAdmin = (session?.user as SessionUserWithRole | undefined)?.role === 'admin';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/catalog', label: 'Catalogo' },
    { href: '/lookbooks', label: 'Lookbooks' },
  ];

  const mobileLinks = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/catalog', label: 'Catalogo', icon: Search },
    { href: '/profile', label: 'Cuenta', icon: User },
  ];

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[100] border-b transition-all duration-300 safe-area-top',
          isScrolled
            ? 'border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-glass'
            : 'border-transparent bg-gradient-to-b from-zinc-950/80 to-transparent',
        )}
      >
        <div className="store-shell flex h-14 items-center justify-between sm:h-16">
          <Link href="/" className="flex min-w-0 items-center">
            <span className="font-outfit text-xl font-black tracking-tighter text-white sm:text-2xl italic uppercase">
              CLAZICO<span className="inline-block h-2 w-2 rounded-full bg-brand-primary animate-pulse ml-0.5" />
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 transition-all hover:text-white',
                    isActive && 'text-white border-b-2 border-brand-primary pb-1',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={toggleCart}
              className="relative grid h-10 w-10 place-items-center rounded-full text-zinc-300 transition-all active:scale-95 hover:bg-white/10 hover:text-white"
              aria-label="Abrir carrito"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-primary px-1 text-[9px] font-black leading-none text-white">
                  {cartItemCount}
                </span>
              )}
            </button>

            <div className="hidden sm:block">
              {isPending ? (
                <div className="h-9 w-9 rounded-full bg-white/10" />
              ) : session?.user ? (
                <div className="flex items-center gap-1">
                  <Link
                    href="/profile"
                    className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                    title={session.user.name}
                  >
                    <User className="h-5 w-5" />
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="grid h-10 w-10 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                      title="Panel administrativo"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                    </Link>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="grid h-10 w-10 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-brand-primary"
                    title="Cerrar sesion"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="nav-login-button border border-white bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-zinc-950 transition-all hover:bg-transparent hover:text-white"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-[120] border-t border-white/5 bg-zinc-950/95 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-2.5 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobileLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex h-12 flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-500 transition-all active:scale-95',
                  isActive ? 'text-white bg-white/5' : 'hover:text-zinc-300',
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "text-brand-primary scale-110")} />
                <span className={cn(isActive ? "text-white" : "text-zinc-500")}>{link.label}</span>
              </Link>
            );
          })}

          <button
            onClick={toggleCart}
            className="relative flex h-12 flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-500 transition-all active:scale-95"
          >
            <ShoppingBag className="h-5 w-5 hover:text-zinc-300" />
            <span>Carrito</span>
            {cartItemCount > 0 && (
              <span className="absolute right-4 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-primary px-1 text-[9px] font-black leading-none text-white border border-black">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
