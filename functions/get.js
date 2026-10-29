// https://mahallify.us/get — the one "get the app" link the app shares.
//
// A share used to carry both store links, or only the sender's own, so an
// iPhone forwarding to an Android group handed everyone an App Store link.
// This sends each phone to its own store, and anything else to the home
// page, which offers both.

const APP_STORE = 'https://apps.apple.com/app/id6762940667';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.mahallify.app';

export function onRequestGet({ request }) {
  const ua = request.headers.get('user-agent') || '';
  const to = /iPhone|iPad|iPod/i.test(ua)
    ? APP_STORE
    : /Android/i.test(ua)
      ? PLAY_STORE
      : new URL('/', request.url).toString();
  return new Response(null, {
    status: 302,
    headers: { location: to, 'cache-control': 'no-store', vary: 'user-agent' },
  });
}
