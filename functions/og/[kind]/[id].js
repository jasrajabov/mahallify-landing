// https://mahallify.us/og/<kind>/<id>.jpg?lang=<l>[&m=<message>]&v=<hash>
// — a shared link's preview image, the address the post page puts in
// og:image (functions/p/[kind]/[id].js, `ogImage`).
//
// The card is DRAWN by the app project's `og-card` edge function (drawing
// takes far more CPU than a request here may use) and KEPT here: Cloudflare's
// cache holds each JPEG for a day under its full address.
//
// Every request reads the post first, as the page does (a few cached REST
// reads, little CPU), so:
//   * a post that is gone or taken down is the icon at once, never a cached
//     picture of it;
//   * `v` must be the hash of the card as it is NOW (`cardVersion`) — an old
//     one is sent to the current address, a made-up one never reaches the
//     drawing function, so the cache cannot be skipped to force draws.
//
// If the function cannot draw it, the preview falls back to what it showed
// before cards: the post's own photo, else the app icon — never cached, so
// the next fetch tries the card again.

import { dbOf, has, KINDS, UUID, loadPost, cardOf, cardVersion } from '../../p/[kind]/[id].js';

const LANGS = new Set(['en', 'ru', 'uz']);

export async function onRequestGet({ request, params, waitUntil }) {
  const url = new URL(request.url);
  const db = dbOf(url);
  const icon = `${db.site}/icon-512.png`;
  const kind = String(params.kind || '');
  const id = String(params.id || '').toLowerCase().replace(/\.(jpg|png)$/, '');
  const lang = url.searchParams.get('lang') || 'en';
  const m = (url.searchParams.get('m') || '').toLowerCase();
  if (!has(KINDS, kind) || !UUID.test(id) || !LANGS.has(lang) || (m && !UUID.test(m))) return redirect(icon);

  const { post } = await loadPost(db, kind, id, kind === 'circle' && m ? m : null);
  if (!post) return redirect(icon);
  const card = cardOf(lang, kind, post);
  const v = await cardVersion(card);
  if (url.searchParams.get('v') !== v) {
    const q = new URLSearchParams({ lang });
    if (m) q.set('m', m);
    q.set('v', v);
    return redirect(`${db.site}/og/${kind}/${id}.jpg?${q}`);
  }

  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  const fq = new URLSearchParams({ site: db.site, kind, id, lang });
  if (m) fq.set('m', m);
  try {
    const res = await fetch(`${db.url}/functions/v1/og-card?${fq}`, { signal: AbortSignal.timeout(15000) });
    if (res.ok && (res.headers.get('content-type') || '').startsWith('image/jpeg')) {
      const out = new Response(res.body, {
        headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'noindex' },
      });
      waitUntil(cache.put(request, out.clone()));
      return out;
    }
  } catch {
    // Fall through to the photo.
  }

  // The post's own photo — `cardOf` only ever names one in our own storage.
  const photo = card.photo;
  return redirect(typeof photo === 'string' && photo.startsWith(`${db.url}/storage/v1/object/public/`) ? photo : icon);
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { location, 'cache-control': 'no-store' } });
}
