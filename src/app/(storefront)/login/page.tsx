'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result =
        mode === 'login'
          ? await signIn.email({ email, password })
          : await signUp.email({ name, email, password });

      if (result.error) {
        setError(result.error.message || 'No pudimos completar la solicitud.');
        return;
      }

      router.push('/profile');
      router.refresh();
    } catch {
      setError('No pudimos completar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-zinc-950 pb-24 text-white md:pb-14">
      <section className="store-shell grid gap-8 pt-6 md:grid-cols-[0.95fr_1.05fr] md:items-center md:pt-14">
        <div>
          <p className="text-xs font-black uppercase text-brand-primary">Cuenta Clazico</p>
          <h1 className="mt-2 font-outfit text-4xl font-black leading-none text-white md:text-6xl">
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </h1>
          <p className="mt-4 max-w-md text-base font-medium leading-7 text-zinc-400">
            Guarda tus datos para checkout mas rapido y seguimiento de compras verificadas.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6"
        >
          <div className="grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`h-10 rounded-full text-sm font-black ${
                mode === 'login' ? 'bg-white text-zinc-950' : 'text-zinc-500'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`h-10 rounded-full text-sm font-black ${
                mode === 'register' ? 'bg-white text-zinc-950' : 'text-zinc-500'
              }`}
            >
              Registro
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="text-xs font-black uppercase text-zinc-500">Nombre</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 text-[16px] font-semibold text-white outline-none focus:border-brand-primary"
                  placeholder="Tu nombre"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 text-[16px] font-semibold text-white outline-none focus:border-brand-primary"
                placeholder="cliente@correo.com"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-zinc-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 text-[16px] font-semibold text-white outline-none focus:border-brand-primary"
                placeholder="Minimo 8 caracteres"
              />
            </label>
          </div>

          {error && <p className="mt-4 text-sm font-black text-brand-primary">{error}</p>}

          <button
            disabled={isSubmitting}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-primary text-sm font-black text-white disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </section>
    </main>
  );
}
