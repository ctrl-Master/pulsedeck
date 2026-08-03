export const runtime = 'nodejs';
export const maxDuration = 60;

export default async function handler(req) {
  return new Response(
    JSON.stringify({ ok: true, msg: 'direct-health', now: new Date().toISOString() }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}
