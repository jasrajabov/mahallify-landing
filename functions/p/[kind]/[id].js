// https://mahallify.us/p/<kind>/<id> — one post's page.
//
// A post shared out of the app travels as this address (the app's
// `src/lib/postLinks.ts`). Three readers ask for it:
//
//   * a link-preview bot (Telegram, WhatsApp, iMessage) — it reads the Open
//     Graph tags and draws the title, the price · area line and the photo;
//   * a phone WITHOUT the app — it gets the post's card, "Get Mahallify" for
//     its own store, and an Open button for when the app is installed;
//   * a phone WITH the app never gets here: the path is an iOS Universal Link
//     and a verified Android App Link (/.well-known/), so the OS opens the post
//     in the app instead.
//
// WHAT IS SHOWN is what the app already sends to Telegram as words — the
// title and one details line — plus the first photo. Never a description:
// a charity campaign's story is where an organizer writes their own payment
// link, and nothing here may carry one (the app's CLAUDE.md, Charity). The
// page is `noindex`: it exists so a forwarded link previews, not so search
// engines list people's posts.
//
// WHAT IS READ goes through the anon key and RLS, and the page adds its own
// `status = approved` and `is_active` test on top, because several listing
// tables let anyone read pending and rejected rows. A row that fails either
// reads as "no longer available", the same as one that is gone.

// PRODUCTION, and the only database mahallify.us ever reads. The key is the
// PUBLISHABLE one — the same one every installed app carries. RLS is the gate,
// never this key.
const PROD = {
  url: 'https://clqvjgvvctxiddygsrdc.supabase.co',
  key: 'sb_publishable_obdgsQkXsclyCmilF1ngKQ_heV0__iu',
  site: 'https://mahallify.us',
};

// A PREVIEW deployment (any branch but main — `dev` is
// dev.mahallify-landing.pages.dev) reads the DEV project instead, set as
// SUPABASE_URL and SUPABASE_KEY in the Pages project's Preview variables, so a
// link shared from a dev build (the app's EXPO_PUBLIC_SITE_URL) previews a
// post that exists only there. Both or neither: a URL without its own key, or
// the reverse, falls back to production whole rather than mixing the two.
function dbOf(env, url) {
  if (env && env.SUPABASE_URL && env.SUPABASE_KEY) {
    return { url: env.SUPABASE_URL.replace(/\/+$/, ''), key: env.SUPABASE_KEY, site: url.origin };
  }
  return PROD;
}

const APP_STORE = 'https://apps.apple.com/app/id6762940667';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.mahallify.app';
const APP_STORE_ID = '6762940667';
const ANDROID_PACKAGE = 'com.mahallify.app';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Each kind's table, the columns its card is drawn from, and where its photo
// lives. Mirrors SOURCES in the app's src/features/share/sharedPost.ts — the
// kind words are a public URL format, so this set only ever grows.
const OFFER_COLS =
  'id,title,post_type,price,price_type,city,state,travel_destination,travel_destination_city,travel_departure_date,status,is_active,availability';
const KINDS = {
  housing: { table: 'housing', cols: 'id,title,price,city,state,status,is_active,availability', photos: 'housing' },
  job: { table: 'jobs', cols: 'id,title,pay_min,pay_max,pay_period,city,state,status,is_active,availability', photos: 'job' },
  sale: { table: 'community_offers', cols: OFFER_COLS, photos: 'offer' },
  travel: { table: 'community_offers', cols: OFFER_COLS, photos: 'offer' },
  deal: { table: 'community_offers', cols: OFFER_COLS, photos: 'offer' },
  event: {
    table: 'events',
    cols: 'id,title,start_date,timezone,recurrence,ends_at,city,state,status,is_active',
    photos: 'event',
  },
  // NO `description`, NO `donate_links`: see the note at the top.
  charity: { table: 'charity_campaigns', cols: 'id,title,cover_url,city,state,status,is_active,availability,expires_at' },
  question: { table: 'mahalla_posts', cols: 'id,title,image_urls,comment_count,status' },
  news: { table: 'news_posts', cols: 'id,title,origin,source_url,image_urls,city,state,status,is_active' },
  ride: { table: 'ride_offers', cols: 'id,title,price,price_type,image_urls,city,state,status,is_active,availability' },
};

// ── Copy, in the app's three languages ────────────────────────────────────────

const COPY = {
  en: {
    kinds: {
      housing: 'Housing', job: 'Job', sale: 'For sale', travel: 'Travel', deal: 'Deal',
      event: 'Event', charity: 'Charity', question: 'Ask Mahalla', news: 'News', ride: 'Taxi & rides',
    },
    open: 'Open in Mahallify',
    get: 'Get Mahallify',
    appStore: 'App Store',
    playStore: 'Google Play',
    lead: 'This post is on Mahallify, the community app for the Central Asian diaspora in the US and Canada.',
    gone: 'No longer available',
    ended: 'Ended',
    missingTitle: 'This post isn’t available',
    missingBody: 'It may have been removed, or it’s still waiting for review.',
    free: 'Free',
    negotiable: 'Negotiable',
    answers: n => (n === 1 ? '1 answer' : `${n} answers`),
    via: host => `via ${host}`,
    repeats: 'Repeats',
    per: { hourly: '/hr', daily: '/day', weekly: '/wk', monthly: '/mo', yearly: '/yr' },
  },
  ru: {
    kinds: {
      housing: 'Жильё', job: 'Работа', sale: 'Продажа', travel: 'Поездки', deal: 'Скидка',
      event: 'Событие', charity: 'Благотворительность', question: 'Спроси махаллю', news: 'Новости', ride: 'Такси и поездки',
    },
    open: 'Открыть в Mahallify',
    get: 'Скачать Mahallify',
    appStore: 'App Store',
    playStore: 'Google Play',
    lead: 'Этот пост в Mahallify — приложении для центральноазиатской диаспоры в США и Канаде.',
    gone: 'Больше не актуально',
    ended: 'Завершено',
    missingTitle: 'Этот пост недоступен',
    missingBody: 'Возможно, его удалили или он ещё на проверке.',
    free: 'Бесплатно',
    negotiable: 'Договорная',
    answers: n => `Ответов: ${n}`,
    via: host => `источник: ${host}`,
    repeats: 'Повторяется',
    per: { hourly: '/час', daily: '/день', weekly: '/нед', monthly: '/мес', yearly: '/год' },
  },
  uz: {
    kinds: {
      housing: 'Uy-joy', job: 'Ish', sale: 'Sotuv', travel: 'Safar', deal: 'Chegirma',
      event: 'Tadbir', charity: 'Xayriya', question: 'Mahalladan so‘rang', news: 'Yangiliklar', ride: 'Taksi va qatnov',
    },
    open: 'Mahallify’da ochish',
    get: 'Mahallify’ni yuklab oling',
    appStore: 'App Store',
    playStore: 'Google Play',
    lead: 'Bu post Mahallify’da — AQSh va Kanadadagi Markaziy Osiyo diasporasi uchun ilova.',
    gone: 'Endi dolzarb emas',
    ended: 'Tugagan',
    missingTitle: 'Bu post mavjud emas',
    missingBody: 'U o‘chirilgan yoki hali tekshiruvda bo‘lishi mumkin.',
    free: 'Bepul',
    negotiable: 'Kelishiladi',
    answers: n => `${n} ta javob`,
    via: host => `manba: ${host}`,
    repeats: 'Takrorlanadi',
    per: { hourly: '/soat', daily: '/kun', weekly: '/hafta', monthly: '/oy', yearly: '/yil' },
  },
};
const LOCALES = { en: 'en-US', ru: 'ru-RU', uz: 'uz-Latn-UZ' };

function pickLang(request, url) {
  const q = url.searchParams.get('lang');
  if (q && COPY[q]) return q;
  const header = (request.headers.get('accept-language') || '').toLowerCase();
  for (const part of header.split(',')) {
    const code = part.trim().slice(0, 2);
    if (COPY[code]) return code;
  }
  return 'en';
}

// ── Reading the post ─────────────────────────────────────────────────────────

async function rest(db, path) {
  const res = await fetch(`${db.url}/rest/v1/${path}`, {
    headers: { apikey: db.key, authorization: `Bearer ${db.key}` },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`rest ${res.status}`);
  return res.json();
}

async function readPost(db, kind, id) {
  const src = KINDS[kind];
  const rows = await rest(db, `${src.table}?select=${src.cols}&id=eq.${id}&limit=1`);
  const row = rows[0];
  if (!row || row.status !== 'approved' || row.is_active === false) return null;
  let photo = null;
  if (src.photos) {
    const photos = await rest(
      db,
      `listing_photos?select=photo_url&listing_id=eq.${id}&listing_type=eq.${src.photos}&order=sort_order.asc&limit=1`,
    ).catch(() => []);
    photo = photos[0]?.photo_url ?? null;
  } else if (kind === 'charity') {
    photo = row.cover_url;
  } else if (Array.isArray(row.image_urls)) {
    photo = row.image_urls[0];
  }
  // Only an object in our own public bucket: a client wrote these columns, and
  // the page must not hotlink whatever address someone typed into one.
  if (typeof photo !== 'string' || !photo.startsWith(`${db.url}/storage/v1/object/public/`)) photo = null;
  return { row, photo };
}

// ── The details line ─────────────────────────────────────────────────────────

function money(n, lang) {
  return '$' + Math.round(Number(n)).toLocaleString(LOCALES[lang]);
}

function areaOf(row) {
  return row.city || row.state || null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function eventDate(row, lang) {
  if (row.recurrence) return COPY[lang].repeats;
  if (!row.start_date) return null;
  const opts = {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: row.timezone || 'America/New_York',
  };
  try {
    return new Intl.DateTimeFormat(LOCALES[lang], opts).format(new Date(row.start_date));
  } catch {
    return null;
  }
}

function detailsOf(kind, row, lang) {
  const c = COPY[lang];
  let lead = null;
  switch (kind) {
    case 'housing':
      // 0 is housing's "negotiable"; NULL says nothing.
      lead = row.price == null ? null : row.price ? money(row.price, lang) : c.negotiable;
      break;
    case 'job': {
      const lo = row.pay_min, hi = row.pay_max;
      const range = lo && hi && lo !== hi ? `${money(lo, lang)}–${money(hi, lang)}` : lo || hi ? money(lo || hi, lang) : null;
      lead = range ? range + (c.per[row.pay_period] || '') : null;
      break;
    }
    case 'sale':
    case 'deal':
    case 'ride':
      lead = row.price_type === 'free' ? c.free : row.price ? money(row.price, lang) : row.price_type === 'negotiable' ? c.negotiable : null;
      break;
    case 'travel':
      lead = row.travel_destination_city || row.travel_destination || null;
      break;
    case 'event':
      lead = eventDate(row, lang);
      break;
    case 'question':
      return c.answers(Number(row.comment_count || 0));
    case 'news': {
      const host = row.source_url ? hostOf(row.source_url) : null;
      return [host ? c.via(host) : null, areaOf(row)].filter(Boolean).join(' · ') || null;
    }
  }
  return [lead, areaOf(row)].filter(Boolean).join(' · ') || null;
}

function statusOf(kind, row, lang) {
  const over = kind === 'event' ? row.ends_at : kind === 'charity' ? row.expires_at : null;
  if (over && Date.parse(over) <= Date.now()) return COPY[lang].ended;
  return row.availability === 'gone' ? COPY[lang].gone : null;
}

// ── The page ─────────────────────────────────────────────────────────────────

const esc = s =>
  String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function platformOf(request) {
  const ua = request.headers.get('user-agent') || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

function page({ lang, kind, id, post, url, site, platform }) {
  const c = COPY[lang];
  const found = !!post;
  const title = found ? String(post.row.title || '').trim() || c.kinds[kind] : c.missingTitle;
  const details = found ? detailsOf(kind, post.row, lang) : c.missingBody;
  const status = found ? statusOf(kind, post.row, lang) : null;
  const photo = found ? post.photo : null;
  const kindLabel = c.kinds[kind] || 'Mahallify';
  const ogDescription = [status, details].filter(Boolean).join(' · ') || c.lead;
  const image = photo || `${site}/icon-512.png`;

  const appPath = `p/${kind}/${id}`;
  const openHref =
    platform === 'android'
      ? `intent://${appPath}#Intent;scheme=mahallify;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`
      : `mahallify://${appPath}`;
  const stores =
    platform === 'ios'
      ? [[APP_STORE, c.appStore]]
      : platform === 'android'
        ? [[PLAY_STORE, c.playStore]]
        : [[APP_STORE, c.appStore], [PLAY_STORE, c.playStore]];

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)} · Mahallify</title>
<meta name="robots" content="noindex, nofollow" />
<meta name="description" content="${esc(ogDescription)}" />
<meta name="theme-color" content="#04060f" />
<meta name="color-scheme" content="dark" />
${found ? `<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${esc(url)}" />` : ''}
<meta property="og:site_name" content="Mahallify" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(ogDescription)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:url" content="${esc(url)}" />
<meta name="twitter:card" content="${photo ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(ogDescription)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root { --bg:#04060f; --card:#0d1220; --line:rgba(255,255,255,.08); --ink:#f4f6fb; --ink2:#a7b0c2; --brand:#22d3ee; --brandInk:#03222a; }
  * { box-sizing:border-box; }
  html,body { margin:0; background:var(--bg); color:var(--ink); font-family:Inter,system-ui,-apple-system,sans-serif; -webkit-font-smoothing:antialiased; }
  main { max-width:480px; margin:0 auto; padding:24px 16px calc(32px + env(safe-area-inset-bottom)); }
  .brand { display:flex; align-items:center; gap:10px; color:var(--ink); text-decoration:none; font-weight:700; font-size:18px; letter-spacing:-.01em; margin-bottom:20px; }
  .brand img { width:32px; height:32px; border-radius:9px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; overflow:hidden; }
  .photo { display:block; width:100%; aspect-ratio:4/3; object-fit:cover; background:#151b2c; }
  .body { padding:18px 18px 20px; }
  .kind { font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--brand); }
  h1 { margin:8px 0 6px; font-size:24px; line-height:1.25; letter-spacing:-.02em; font-weight:700; overflow-wrap:anywhere; }
  .details { margin:0; font-size:15px; line-height:1.45; color:var(--ink2); overflow-wrap:anywhere; }
  .status { display:inline-block; margin-top:12px; padding:4px 10px; border-radius:999px; font-size:13px; font-weight:600; background:rgba(255,255,255,.08); color:var(--ink); }
  .actions { display:grid; gap:10px; margin-top:20px; }
  .btn { display:flex; align-items:center; justify-content:center; min-height:50px; border-radius:14px; font-size:16px; font-weight:600; text-decoration:none; }
  .btn.primary { background:var(--brand); color:var(--brandInk); }
  .btn.secondary { background:rgba(255,255,255,.07); color:var(--ink); border:1px solid var(--line); }
  .lead { margin:20px 2px 0; font-size:14px; line-height:1.5; color:var(--ink2); }
</style>
</head>
<body>
<main>
  <a class="brand" href="/"><img src="/icon-192.png" alt="" width="32" height="32" />mahallify</a>
  <article class="card">
    ${photo ? `<img class="photo" src="${esc(photo)}" alt="" />` : ''}
    <div class="body">
      ${found ? `<div class="kind">${esc(kindLabel)}</div>` : ''}
      <h1>${esc(title)}</h1>
      ${details ? `<p class="details">${esc(details)}</p>` : ''}
      ${status ? `<span class="status">${esc(status)}</span>` : ''}
    </div>
  </article>
  <div class="actions">
    ${found && platform !== 'other' ? `<a class="btn primary" href="${esc(openHref)}">${esc(c.open)}</a>` : ''}
    ${stores
      .map(([href, label]) => `<a class="btn ${found && platform !== 'other' ? 'secondary' : 'primary'}" href="${href}">${esc(c.get)} · ${esc(label)}</a>`)
      .join('\n    ')}
  </div>
  <p class="lead">${esc(c.lead)}</p>
</main>
</body>
</html>`;
}

export async function onRequestGet({ request, params, env }) {
  const url = new URL(request.url);
  const lang = pickLang(request, url);
  const platform = platformOf(request);
  const kind = String(params.kind || '');
  const id = String(params.id || '').toLowerCase();
  const db = dbOf(env, url);
  const canonical = `${db.site}/p/${kind}/${id}`;

  let post = null;
  let failed = false;
  if (KINDS[kind] && UUID.test(id)) {
    try {
      post = await readPost(db, kind, id);
    } catch {
      failed = true;
    }
  }

  const html = page({ lang, kind: KINDS[kind] ? kind : null, id, post, url: canonical, site: db.site, platform });
  return new Response(html, {
    status: post ? 200 : failed ? 503 : 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short: a "Sold" or a removal should reach a fresh preview soon. The
      // page varies by language and platform, so shared caches key on both.
      'cache-control': post ? 'public, max-age=300' : 'public, max-age=60',
      vary: 'accept-language, user-agent',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
