import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] bg-black text-white flex flex-col items-center justify-center relative overflow-hidden font-sans rounded-3xl my-8 mx-4 border border-zinc-900 shadow-2xl">
      
      {/* Background abstract elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zinc-900 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-zinc-800 rounded-full blur-[100px] opacity-30 pointer-events-none" />
      
      {/* Street grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="z-10 text-center px-4 max-w-2xl mx-auto flex flex-col items-center">
        {/* Glitchy 404 */}
        <div className="relative group cursor-default">
          <h1 className="text-[10rem] sm:text-[14rem] md:text-[16rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 drop-shadow-2xl">
            404
          </h1>
          
          {/* Subtle hover glitch effect */}
          <h1 className="absolute top-0 left-0 text-[10rem] sm:text-[14rem] md:text-[16rem] font-black leading-none tracking-tighter text-white opacity-0 group-hover:opacity-70 transition-opacity duration-75 mix-blend-screen translate-x-2 text-zinc-300">
            404
          </h1>
          <h1 className="absolute top-0 left-0 text-[10rem] sm:text-[14rem] md:text-[16rem] font-black leading-none tracking-tighter text-white opacity-0 group-hover:opacity-70 transition-opacity duration-75 mix-blend-screen -translate-x-2 text-zinc-500">
            404
          </h1>
        </div>

        <div className="space-y-6 mt-8 sm:mt-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight uppercase">
            Estilo no encontrado
          </h2>
          <p className="text-zinc-400 text-lg sm:text-xl max-w-md mx-auto">
            Parece que te perdiste en las calles. La página que buscas no existe o fue movida a otra colección.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/" 
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold uppercase tracking-widest overflow-hidden transition-transform hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-zinc-200 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Volver al inicio
            </span>
          </Link>
          
          <Link 
            href="/catalog" 
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-black border border-zinc-800 text-white font-bold uppercase tracking-widest hover:border-white transition-colors duration-300"
          >
            <span className="relative flex items-center gap-2">
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Explorar Catálogo
            </span>
          </Link>
        </div>
      </div>
      
      {/* Decorative text */}
      <div className="absolute bottom-8 flex w-full justify-between px-8 sm:px-12 text-xs font-bold text-zinc-800 uppercase tracking-[0.3em] pointer-events-none select-none">
        <span>Clazico</span>
        <span className="hidden sm:inline">Error 404</span>
        <span>Urban</span>
      </div>
    </div>
  )
}
