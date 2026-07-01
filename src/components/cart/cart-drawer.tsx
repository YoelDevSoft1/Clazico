'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { STORE_INFO } from '@/lib/constants';
import { formatUSD, formatBsS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/lib/trpc-client';
import { useQuery } from '@tanstack/react-query';

export function CartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const subtotalUsd = useCartStore((state) => state.getSubtotalUsd());
  const subtotalBs = useCartStore((state) => state.getSubtotalBs());

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const shippingThreshold = 100;
  const progressPercent = Math.min((subtotalUsd / shippingThreshold) * 100, 100);
  const remainingForFreeShipping = Math.max(shippingThreshold - subtotalUsd, 0);

  const trpc = useTRPC();
  const { data: shippingData } = useQuery({
    ...trpc.order.getShippingCost.queryOptions({
      state: null,
      city: null,
      lat: null,
      lng: null,
      itemsTotalUsd: subtotalUsd,
      totalQuantity: totalItems,
    }),
    enabled: isOpen && items.length > 0,
  });

  const isFreeBaseShipping = subtotalUsd >= shippingThreshold;
  const hasVolumeSurcharge = (shippingData?.volumeSurcharge ?? 0) > 0;

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={closeCart}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 border-l border-white/10 shadow-2xl flex flex-col z-10 animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20" style={{ padding: '20px 24px' }}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-5 w-5 text-brand-primary" />
              <h2 className="font-outfit text-xl font-black uppercase italic text-white tracking-tight">
                Tu Carrito
              </h2>
              {totalItems > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                </span>
              )}
            </div>
            {totalItems > 0 && (
              <span className="font-mono text-[9px] font-black text-brand-primary uppercase tracking-widest mt-1">
                [ {totalItems} {totalItems === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'} EN ORDEN ]
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="border border-white/10 rounded-full p-2 text-zinc-400 hover:text-white hover:border-white transition-all active:scale-95 cursor-pointer"
            aria-label="Cerrar carrito"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col" style={{ padding: '16px 24px' }}>
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand-primary/10 rounded-full blur-xl scale-125 animate-pulse-glow" />
                <div className="relative border border-white/10 bg-zinc-900/60 p-6 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-10 w-10 text-zinc-400" />
                </div>
              </div>
              <div className="space-y-3 mb-8">
                <h3 className="font-outfit text-xl font-black uppercase italic text-white tracking-tight">Tu carrito está vacío</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                  Equípate con lo mejor del calzado y ropa exclusiva. Contamos con stock confirmado físicamente en {STORE_INFO.address}
                </p>
              </div>
              <Link
                href="/catalog"
                onClick={closeCart}
                className="inline-flex h-12 items-center justify-center gap-2 border border-white bg-white px-8 text-xs font-black uppercase tracking-widest text-zinc-950 hover:bg-transparent hover:text-white transition-all cursor-pointer group rounded-none"
              >
                Explorar catálogo
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-5 pt-2">
              {/* Shipping Progress bar */}
              <div className="bg-zinc-900/30 border border-white/5 flex flex-col gap-3 rounded-none relative" style={{ padding: '20px' }}>
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Truck className={cn("h-4 w-4", isFreeBaseShipping ? "text-emerald-400 animate-bounce" : "text-brand-primary")} />
                    {isFreeBaseShipping ? (
                      <span className="text-emerald-400">
                        ¡Calificas para Envío Base Gratis!
                        {hasVolumeSurcharge && <span className="text-amber-400 block text-[8px] mt-0.5">*Aplica recargo extra por gran volumen</span>}
                      </span>
                    ) : (
                      <span className="text-zinc-400">
                        Faltan <strong className="text-white font-mono text-[10px]">{formatUSD(remainingForFreeShipping)}</strong> para Envío Base Gratis
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-500 font-mono">{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 border border-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-700 ease-out",
                      isFreeBaseShipping ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-brand-primary"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items list */}
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <div
                    key={item.variantId}
                    className="flex gap-4 items-center bg-zinc-900/20 border border-white/5 hover:border-white/15 hover:bg-zinc-900/40 transition-all duration-300 relative group rounded-none"
                    style={{ padding: '20px' }}
                  >
                    
                    {/* Image */}
                    <div className="relative h-24 w-20 flex-shrink-0 bg-zinc-950 border border-white/5 rounded-none flex items-center justify-center group-hover:border-white/10 transition-colors duration-200" style={{ padding: '8px' }}>
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-contain p-1 transition-transform duration-350 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-zinc-600">
                          <ShoppingBag className="h-5 w-5" />
                          <span className="text-[8px] font-mono font-black uppercase text-zinc-700">CLAZICO</span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full min-h-[96px] pt-1 px-1">
                      <div>
                        {/* Title & Price Row */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-outfit text-xs font-black uppercase tracking-tight text-white hover:text-brand-primary transition-colors line-clamp-1 flex-1">
                            <Link href={`/catalog/${item.slug}`} onClick={closeCart}>
                              {item.name}
                            </Link>
                          </h4>
                          <span className="text-xs font-mono font-black text-white shrink-0">
                            {formatUSD(item.priceUsd * item.quantity)}
                          </span>
                        </div>
                        
                        {/* SKU & Bs Price Row */}
                        <div className="flex justify-between items-baseline mt-0.5">
                          <p className="font-mono text-[8px] font-bold text-zinc-600">SKU: {item.sku}</p>
                          <span className="text-[9px] font-mono text-zinc-500 font-bold">
                            {formatBsS(item.priceBs * item.quantity)}
                          </span>
                        </div>
                        
                        {/* Size & Color Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          <span className="inline-flex items-center bg-zinc-950 border border-white/5 text-[8px] font-black uppercase text-zinc-400 font-outfit tracking-wider rounded-none" style={{ padding: '2px 10px' }}>
                            TALLA: <strong className="text-white font-mono ml-0.5">{item.size ?? 'ÚNICA'}</strong>
                          </span>
                          
                          {item.color && (
                            <span className="inline-flex items-center bg-zinc-950 border border-white/5 text-[8px] font-black uppercase text-zinc-400 font-outfit tracking-wider gap-1.5 rounded-none" style={{ padding: '2px 10px' }}>
                              COLOR: <strong className="text-white ml-0.5">{item.color}</strong>
                              {item.colorHex && (
                                <span
                                  className="h-1.5 w-1.5 rounded-full border border-white/20"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controls and unit price */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2.5">
                          {/* Quantity Selector Pill */}
                          <div className="flex items-center bg-zinc-950 border border-white/10 rounded-full h-8" style={{ padding: '0 4px' }}>
                            <button
                              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                              className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                              aria-label="Disminuir cantidad"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-mono font-black text-white w-7 text-center select-none">
                              {item.quantity}
                            </span>
                            <button
                              disabled={item.quantity >= item.availableStock}
                              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                              className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                              aria-label="Aumentar cantidad"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => removeItem(item.variantId)}
                            className="h-8 w-8 rounded-full border border-white/5 hover:border-brand-primary/20 flex items-center justify-center text-zinc-500 hover:text-brand-primary hover:bg-brand-primary/5 transition-all cursor-pointer active:scale-90"
                            title="Eliminar producto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {item.quantity > 1 && (
                          <span className="text-[9px] font-mono text-zinc-500 font-bold">
                            {formatUSD(item.priceUsd)} c/u
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Invoice ticket */}
        {items.length > 0 && (
          <div className="border-t border-white/10 bg-zinc-950 flex flex-col gap-4" style={{ padding: '24px' }}>
            
            {/* Breakdowns */}
            <div className="bg-zinc-900/30 border border-white/5 flex flex-col gap-3.5 relative rounded-none overflow-hidden" style={{ padding: '24px' }}>
              {/* Ticket Jagged top decoration */}
              <div className="absolute top-0 inset-x-0 h-1 flex justify-between overflow-hidden -translate-y-[1.5px] opacity-10">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="h-2 w-2 bg-white rotate-45 transform shrink-0" />
                ))}
              </div>

              <div className="flex items-center justify-between text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <span>Subtotal USD</span>
                <span className="text-white font-mono font-bold">{formatUSD(subtotalUsd)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                <span>Subtotal Bs.</span>
                <span className="text-zinc-400 font-mono">{formatBsS(subtotalBs)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-500 text-[10px] font-black uppercase tracking-widest border-t border-white/5 pt-2.5">
                <span>Costo de Envío (Est.)</span>
                {shippingData ? (
                  <div className="flex flex-col items-end">
                    {shippingData.baseFee === 0 ? (
                       <span className="text-emerald-400 font-black tracking-wider text-[9px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-none mb-1">BASE GRATIS</span>
                    ) : null}
                    <span className="text-zinc-400 font-mono">
                      {shippingData.totalFee > 0 ? formatUSD(shippingData.totalFee) : 'GRATIS'}
                    </span>
                  </div>
                ) : (
                  <span className="text-zinc-400 text-[9px]">CALCULANDO...</span>
                )}
              </div>
              
              <div className="flex items-baseline justify-between border-t border-dashed border-white/10 pt-4 mt-2">
                <span className="text-white text-xs font-black uppercase tracking-widest italic font-outfit">TOTAL ESTIMADO</span>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-mono font-black text-white">{formatUSD(subtotalUsd + (shippingData?.totalFee ?? 0))}</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col gap-3 pt-1">
              <Link
                href="/checkout"
                onClick={closeCart}
                className="group relative flex w-full items-center justify-center bg-white text-zinc-950 font-outfit text-sm font-black uppercase italic tracking-wider transition-all duration-300 hover:bg-brand-primary hover:text-white cursor-pointer active:scale-[0.99] overflow-hidden rounded-none"
                style={{ height: '56px' }}
              >
                <span className="flex items-center gap-2 z-10 transition-transform duration-300 group-hover:translate-x-1">
                  Proceder al checkout
                  <ArrowRight className="h-4 w-4" />
                </span>
                
                {/* Underline hover effect */}
                <span className="absolute bottom-0 left-0 h-1 w-full bg-brand-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </Link>
              
              <div className="flex items-center justify-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" />
                Compra 100% Protegida en Venezuela
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
