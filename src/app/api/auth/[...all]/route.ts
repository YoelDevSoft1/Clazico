import { auth } from '@/lib/auth';

const handler = async (request: Request) => {
  return auth.handler(request);
};

export { handler as GET, handler as POST };
