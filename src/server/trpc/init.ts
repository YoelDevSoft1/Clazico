import 'server-only';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { db } from '@/server/db';
import { veloxPosService } from '@/server/services/velox-pos.service';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// ─── Context ─────────────────────────────────────────────────────────────────

export async function createTRPCContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    db,
    session,
    veloxService: veloxPosService,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─── tRPC Init ───────────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error && 'issues' in error.cause
            ? (error.cause as { issues: unknown }).issues
            : null,
      },
    };
  },
});

// ─── Exports ─────────────────────────────────────────────────────────────────

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

// ─── Public Procedure ────────────────────────────────────────────────────────

export const publicProcedure = t.procedure;

// ─── Auth Middleware ─────────────────────────────────────────────────────────

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Debes iniciar sesión para realizar esta acción',
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

// ─── Admin Middleware ────────────────────────────────────────────────────────

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Debes iniciar sesión para realizar esta acción',
    });
  }

  if ((ctx.session.user as { role?: string }).role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No tienes permisos para realizar esta acción',
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

export const adminProcedure = t.procedure.use(enforceAdmin);
