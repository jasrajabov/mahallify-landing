// https://mahallify.us/og/<kind>/<id>.png?lang=<l>[&m=<message>]&v=<hash>
// — a shared link's preview image, the address the post page puts in
// og:image (functions/p/[kind]/[id].js, `ogImage`).
//
// The card is DRAWN by the app project's `og-card` edge function (drawing
// takes far more CPU than a request here may use) and KEPT here: Cloudflare's
// cache holds each PNG for a day under its full address, and `v` changes
// whenever the card's words do, so an edit is never served stale.
//
// If the function cannot draw it, the preview falls back to what it showed
// before cards: the post's own photo, else the app icon — never cached, so
// the next fetch tries the card again.

import { dbOf, has, KINDS, UUID } from '../../p/[kind]/[id].js';

const LANGS = new Set(['en', 'ru', 'uz']);

export async function onRequestGet({ request, params, waitUntil }) {
  const url = new URL(request.url);
  const db = dbOf(url);
  const kind = String(params.kind || '');
  const id = String(params.id || '').toLowerCase().replace(/\.png$/, '');
  const lang = url.searchParams.get('lang') || 'en';
  const m = (url.searchParams.get('m') || '').toLowerCase();
  if (!has(KINDS, kind) || !UUID.test(id) || !LANGS.has(lang) || (m && !UUID.test(m))) {
    return fallback(`${db.site}/icon-512.png`);
  }

  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const q = new URLSearchParams({ site: db.site, kind, id, lang });
  if (m) q.set('m', m);
  try {
    const res = await fetch(`${db.url}/functions/v1/og-card?${q}`, { signal: AbortSignal.timeout(15000) });
    if (res.ok && (res.headers.get('content-type') || '').startsWith('image/png')) {
      const out = new Response(res.body, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'noindex' },
      });
      waitUntil(cache.put(request, out.clone()));
      return out;
    }
  } catch {
    // Fall through to the photo.
  }

  // The post's own photo, read from the same card the function would have
  // drawn — only ever an object in our own public storage.
  try {
    const res = await fetch(`${db.site}/p/${kind}/${id}?format=card&lang=${lang}` + (m ? `&m=${m}` : ''), {
      signal: AbortSignal.timeout(5000),
    });
    const card = res.ok ? await res.json() : null;
    const photo = card?.photo;
    if (typeof photo === 'string' && photo.startsWith(`${db.url}/storage/v1/object/public/`)) return fallback(photo);
  } catch {
    // The icon, then.
  }
  return fallback(`${db.site}/icon-512.png`);
}

function fallback(location) {
  return new Response(null, { status: 302, headers: { location, 'cache-control': 'no-store' } });
}
