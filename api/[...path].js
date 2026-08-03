export const runtime = 'nodejs';
export const maxDuration = 60;

export default async function handler(req) {
  const u = (req && req.url) || '/';
  return new Response(
    JSON.stringify({ ok: true, msg: 'trivial', url: u, now: new Date().toISOString() }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}
