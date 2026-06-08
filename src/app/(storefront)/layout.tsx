import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { CartDrawer } from '@/components/cart/cart-drawer';

interface StorefrontLayoutProps {
  children: React.ReactNode;
}

export default function StorefrontLayout({ children }: StorefrontLayoutProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-zinc-950 font-sans text-white">
      {/* Navigation bar */}
      <Navbar />

      {/* Main content wrapper */}
      <main className="flex-grow flex flex-col pt-14 sm:pt-16 pb-mobile-nav md:pb-16">
        {children}
      </main>

      {/* Shopping cart drawer */}
      <CartDrawer />

      {/* Footer bar */}
      <Footer />
    </div>
  );
}
