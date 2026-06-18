import Link from 'next/link';

type LegalSection = {
  id: string;
  title: string;
  body?: string[];
  bullets?: string[];
  note?: string;
};

export type LegalPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  jurisdiction: string;
  sections: LegalSection[];
  closing: string;
};

export function LegalPage({
  content,
}: {
  content: LegalPageContent;
}) {
  return (
    <article className="min-h-dvh bg-zinc-950 text-white">
      <header className="border-b border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(227,30,36,0.15),transparent_35%),linear-gradient(180deg,rgba(24,24,27,0.7),rgba(9,9,11,0))]">
        <div className="store-shell py-12 md:py-20">
          <p className="athletic-tag text-brand-primary">{content.eyebrow}</p>
          <div className="mt-4 max-w-5xl">
            <h1 className="font-outfit text-4xl font-black uppercase italic leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              {content.title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-zinc-400 md:text-base">
              {content.description}
            </p>
          </div>

          <div className="mt-8 grid gap-3 text-[11px] font-black uppercase tracking-widest text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-white/10 bg-zinc-900/40 p-4">
              <span className="block text-zinc-600">Actualización</span>
              <span className="mt-1 block text-white">{content.updatedAt}</span>
            </div>
            <div className="border border-white/10 bg-zinc-900/40 p-4">
              <span className="block text-zinc-600">Jurisdicción</span>
              <span className="mt-1 block text-white">{content.jurisdiction}</span>
            </div>
            <div className="border border-white/10 bg-zinc-900/40 p-4">
              <span className="block text-zinc-600">Tienda</span>
              <span className="mt-1 block text-white">Clazico Store</span>
            </div>
            <div className="border border-white/10 bg-zinc-900/40 p-4">
              <span className="block text-zinc-600">Soporte</span>
              <Link href="/catalog" className="mt-1 block text-brand-primary transition-colors hover:text-white">
                Comprar con condiciones claras
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="store-shell grid gap-10 py-10 md:grid-cols-[280px_minmax(0,1fr)] md:py-14 lg:gap-16">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="border border-white/10 bg-zinc-900/30 p-5" aria-label="Índice legal">
            <p className="athletic-tag text-zinc-500">Índice</p>
            <ol className="mt-4 space-y-3">
              {content.sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex gap-3 text-xs font-black uppercase tracking-wider text-zinc-400 transition-colors hover:text-white"
                  >
                    <span className="font-mono text-[10px] text-brand-primary">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {content.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28 border border-white/10 bg-zinc-900/25 p-5 sm:p-7 lg:p-8"
            >
              <div className="flex items-start gap-4">
                <span className="mt-1 font-mono text-xs font-black text-brand-primary">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-outfit text-2xl font-black uppercase italic tracking-tight text-white">
                    {section.title}
                  </h2>
                  {section.body?.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-sm font-medium leading-7 text-zinc-300">
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-5 space-y-3">
                      {section.bullets.map((item) => (
                        <li key={item} className="flex gap-3 text-sm font-medium leading-7 text-zinc-300">
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 bg-brand-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.note && (
                    <p className="mt-5 border-l-2 border-brand-primary bg-black/20 p-4 text-xs font-black uppercase leading-6 tracking-wider text-zinc-400">
                      {section.note}
                    </p>
                  )}
                </div>
              </div>
            </section>
          ))}

          <div className="border border-brand-primary/40 bg-brand-primary/10 p-5 text-sm font-bold leading-7 text-zinc-200 sm:p-7">
            {content.closing}
          </div>
        </div>
      </div>
    </article>
  );
}

