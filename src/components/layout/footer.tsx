import Link from 'next/link';
import { STORE_INFO } from '@/lib/constants';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-zinc-950 text-zinc-400 font-sans mt-10 md:mt-16">
      <div className="store-shell py-8 md:py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-4">
            <span className="font-outfit text-xl font-black tracking-tighter text-white italic uppercase">
              ClaZico<span className="inline-block h-2 w-2 rounded-full bg-brand-primary animate-pulse ml-0.5" />
            </span>
            <div className="flex flex-col gap-2 text-xs uppercase tracking-wider font-bold">
              <Link href="/politicas-de-privacidad" className="text-zinc-400 hover:text-white transition-colors">
                Políticas de Privacidad
              </Link>
              <Link href="/terminos-de-uso" className="text-zinc-400 hover:text-white transition-colors">
                Términos de Uso
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[11px] font-black text-white tracking-[0.2em] uppercase mb-4">Navegación</h3>
            <ul className="space-y-3 text-xs uppercase tracking-wider font-bold">
              <li>
                <Link href="/catalog" className="hover:text-white transition-colors">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/lookbooks" className="hover:text-white transition-colors">
                  Lookbooks
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Calzado" className="hover:text-white transition-colors">
                  Calzado
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Ropa" className="hover:text-white transition-colors">
                  Ropa
                </Link>
              </li>
            </ul>
          </div>

          {/* Payment & Logistics (VE Context) */}
          <div>
            <h3 className="text-[11px] font-black text-white tracking-[0.2em] uppercase mb-4">Servicios Clazico</h3>
            <ul className="space-y-3 text-xs text-zinc-500 uppercase tracking-wider font-bold font-sans">
              <li>Envíos: MRW, ZOOM, TEALCA</li>
              <li>Entregas personales y Delivery</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-black text-white tracking-[0.2em] uppercase mb-4">Contacto</h3>
            <ul className="space-y-3 text-xs uppercase tracking-wider font-bold">
              <li className="text-zinc-500">WhatsApp: <span className="text-zinc-300 font-mono font-black">{STORE_INFO.phone}</span></li>
              <li className="text-zinc-500">WhatsApp Secundario: <span className="text-zinc-300 font-mono font-black">{STORE_INFO.phone1}</span></li>
              <li className="text-zinc-500">Instagram: <a href={`https://instagram.com/${STORE_INFO.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">{STORE_INFO.instagram}</a>
              </li>
              <li className="text-zinc-500">Instagram: <a href={`https://instagram.com/${STORE_INFO.instagramSport.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">{STORE_INFO.instagramSport}</a>
              </li>
              <li className="text-zinc-500 flex flex-col gap-1">
                <span>Ubicación:</span>
                <span className="text-zinc-300 normal-case tracking-normal">{STORE_INFO.address}</span>
              </li>
              <li className="pt-2">
                <Link href="/catalog" className="text-brand-primary hover:underline">Realiza tu Compra</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between border-t border-white/5 pt-8 text-[10px] font-black uppercase tracking-widest text-zinc-600 sm:flex-row">
          <p className="text-center sm:text-left">&copy; {currentYear} Clazico Store. Todos los derechos reservados.</p>
          <div className="mt-4 flex items-center gap-4 sm:mt-0">
            <span>VE | ES</span>
            <span>Desarrollado con Velox POS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
