export const config = {
  schedule: '*/2 * * * *',
};

export default async function handler() {
  return callCronRoute('/api/cron/process-outbox');
}

async function callCronRoute(path: string): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL;

  if (!cronSecret || !appUrl) {
    return new Response('CRON_SECRET and site URL are required', { status: 500 });
  }

  const response = await fetch(`${appUrl.replace(/\/+$/, '')}${path}`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
