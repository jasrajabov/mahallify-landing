// https://mahallify.us/p/<kind>/<id> — one post's page.
//
// A post shared out of the app travels as this address (the app's
// `src/lib/postLinks.ts`). Three readers ask for it:
//
//   * a link-preview bot (Telegram, WhatsApp, iMessage) — it reads the Open
//     Graph tags and draws the title, a summary line and the photo;
//   * a phone WITHOUT the app — it gets the post's card, "Get Mahallify" for
//     its own store, and an Open button for when the app is installed;
//   * a phone WITH a build that has the Universal / App Link never gets here:
//     the OS opens the post in the app instead.
//
// WHAT IS SHOWN is the post's own facts (price, type, when, where, who posted
// it), the first photo, and an excerpt of its text — EXCEPT for a charity
// campaign, which shows its title, needs, end date, area and cover and never
// its story or ways to give: the story is where an organizer writes their own
// payment link, and nothing here may carry one (the app's CLAUDE.md, Charity).
// Text is printed as plain text, never linkified. The page is `noindex`: it
// exists so a forwarded link previews, not so search engines list people's
// posts. A poster is named by FIRST name only, an anonymous question not at
// all, and a post made as a page by the page.
//
// WHAT IS READ goes through the anon key and RLS, and the page adds its own
// `status = approved` and `is_active` test on top, because several listing
// tables let anyone read pending and rejected rows. A row that fails either
// reads as "no longer available", the same as one that is gone. Who posted it
// is a SEPARATE best-effort read, so a failure there costs a byline, never the
// page.

// PRODUCTION, and the only database mahallify.us ever reads. The key is the
// PUBLISHABLE one — the same one every installed app carries. RLS is the gate,
// never this key.
const PROD = {
  url: 'https://clqvjgvvctxiddygsrdc.supabase.co',
  key: 'sb_publishable_obdgsQkXsclyCmilF1ngKQ_heV0__iu',
  site: 'https://mahallify.us',
  scheme: 'mahallify',
  androidPackage: 'com.mahallify.app',
  storeBanner: true,
};

// The DEV project, read only by the `dev` branch's preview deployment
// (dev.mahallify.us, or its alias dev.mahallify-landing.pages.dev) — where the
// app's dev builds point their
// shared links (EXPO_PUBLIC_SITE_URL in its .env.local) — so a post that
// exists only in dev still previews. Chosen by HOST rather than by a Pages
// variable because the dashboard offers no Preview-only variables; the key is
// the dev project's public anon key, as public as the one above.
//
// Its Open button reaches EXPO GO only (`?exp=`, below): the store app reads
// production and would answer a dev post with "not found", so without an
// Expo Go address there is no Open at all. No Smart App Banner either: that
// names the store app.
const DEV = {
  url: 'https://ysbkniochkmgjpaubxgw.supabase.co',
  key: 'sb_publishable_KDLNjzvuppFO7-u-ZFsagw_nIOAPT0p',
  scheme: null,
  androidPackage: null,
  storeBanner: false,
};

// A link shared from EXPO GO carries the sharer's dev server, `?exp=exp://
// 192.168.1.5:8081` (the app's postLinks.ts): Expo Go answers no app scheme,
// so this is the only way Open can reach it. Honoured on the DEV preview only,
// and only for a bare local-network or Expo-tunnel address — nothing else can
// be smuggled into the button.
const EXPO_GO_SERVER =
  /^exps?:\/\/(localhost|127(\.\d{1,3}){3}|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[a-z0-9-]+(\.[a-z0-9-]+)*\.exp\.direct)(:\d{1,5})?$/i;

const has = (obj, key) => typeof key === 'string' && Object.hasOwn(obj, key);

function expoGoOf(url, db) {
  if (db === PROD) return null;
  const exp = url.searchParams.get('exp');
  return exp && EXPO_GO_SERVER.test(exp) ? exp : null;
}

// The dev site's addresses: its own subdomain (a CNAME to the `dev` branch's
// alias), and that alias itself. Everything else — mahallify.us, www, the
// production pages.dev — is production.
function isDevHost(host) {
  return host === 'dev.mahallify.us' || (host.startsWith('dev.') && host.endsWith('.pages.dev'));
}

function dbOf(url) {
  return isDevHost(url.hostname) ? { ...DEV, site: url.origin } : PROD;
}

const APP_STORE = 'https://apps.apple.com/app/id6762940667';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.mahallify.app';
const APP_STORE_ID = '6762940667';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Each kind's table, the columns its card is drawn from, where its photo
// lives, its accent and the app SCREEN it opens. Mirrors SOURCES in the app's
// src/features/share/sharedPost.ts — the kind words are a public URL format,
// so this set only ever grows. Every column here exists in BOTH databases; one
// that does not is a 400, which reads as "isn't available".
//
// `screen` is the route every installed build already has
// (`mahallify://housing/<id>`), NOT `p/<kind>/<id>`: only builds with the new
// `+native-intent` know `/p/`, and on any other one Open landed on "This
// screen doesn't exist".
const OFFER_COLS =
  'id,title,description,post_type,price,price_type,condition,city,state,travel_direction,travel_destination,travel_destination_city,travel_departure_date,travel_return_date,status,is_active,availability,user_id,business_id,created_at';
const KINDS = {
  housing: {
    table: 'housing',
    cols: 'id,title,description,price,listing_type,bedrooms,bathrooms,city,state,status,is_active,availability,user_id,created_at',
    photos: 'housing',
    screen: 'housing',
    accent: '#22d3ee',
  },
  job: {
    table: 'jobs',
    cols: 'id,title,description,pay_min,pay_max,pay_period,job_type,city,state,status,is_active,availability,user_id,business_id,created_at',
    photos: 'job',
    screen: 'job',
    accent: '#f59e0b',
  },
  sale: { table: 'community_offers', cols: OFFER_COLS, photos: 'offer', screen: 'offer', accent: '#a855f7' },
  travel: { table: 'community_offers', cols: OFFER_COLS, photos: 'offer', screen: 'offer', accent: '#38bdf8' },
  deal: { table: 'community_offers', cols: OFFER_COLS, photos: 'offer', screen: 'offer', accent: '#34d399' },
  event: {
    table: 'events',
    cols: 'id,title,description,start_date,end_date,timezone,recurrence,recurrence_interval,recurrence_weekdays,recurrence_until,ends_at,venue,event_format,price,price_type,city,state,status,is_active,user_id,organization_id,created_at',
    photos: 'event',
    screen: 'event',
    accent: '#f472b6',
  },
  // NO `description`, NO `donate_links`, NO `goal_amount`: see the note at the top.
  charity: {
    table: 'charity_campaigns',
    cols: 'id,title,cover_url,needs,deadline,city,state,status,is_active,availability,expires_at,user_id,organization_id,created_at',
    screen: 'charity',
    accent: '#fb7185',
  },
  question: {
    table: 'mahalla_posts',
    cols: 'id,title,body,image_urls,comment_count,is_anonymous,state,status,user_id,created_at',
    screen: 'mahalla',
    accent: '#3b82f6',
  },
  news: {
    table: 'news_posts',
    cols: 'id,title,description,origin,source_url,source_name,published_on,image_urls,city,state,status,is_active,user_id,created_at',
    screen: 'news',
    accent: '#94a3b8',
  },
  ride: {
    table: 'ride_offers',
    cols: 'id,title,description,price,price_type,routes,seats,image_urls,city,state,status,is_active,availability,user_id,created_at',
    screen: 'ride',
    accent: '#facc15',
  },
};

// ── Copy, in the app's three languages ────────────────────────────────────────
//
// The enum words (`jobType` … `format`) are the app's own, copied from its
// src/i18n bundles, so the page says what the app says.

const COPY = {
  en: {
    kinds: {
      housing: 'Housing', job: 'Job', sale: 'For sale', travel: 'Travel', deal: 'Deal',
      event: 'Event', charity: 'Charity', question: 'Ask Mahalla', news: 'News', ride: 'Taxi & rides',
    },
    open: 'Open in Mahallify',
    get: 'Get Mahallify',
    getShort: 'Get the app',
    appStore: 'App Store',
    playStore: 'Google Play',
    lead: 'Mahallify is the community app for the Central Asian diaspora in the US and Canada.',
    more: 'Photos, full details and replies are in the app.',
    phoneHint: 'Open this link on your phone to see it in the app.',
    gone: 'No longer available',
    ended: 'Ended',
    missingTitle: 'This post isn’t available',
    missingBody: 'It may have been removed, or it’s still waiting for review.',
    free: 'Free',
    negotiable: 'Negotiable',
    answers: n => (n === 1 ? '1 answer' : `${n} answers`),
    repeats: 'Repeats',
    trip: { to: p => `Traveling to ${p}`, from: p => `Traveling from ${p}`, lookingTo: p => `Looking for traveler to ${p}`, lookingFrom: p => `Looking for traveler from ${p}` },
    openExpo: 'Open in Expo Go',
    studio: 'Studio',
    beds: n => (n === 1 ? '1 bedroom' : `${n} bedrooms`),
    baths: n => (n === 1 ? '1 bathroom' : `${n} bathrooms`),
    postedBy: name => `Posted by ${name}`,
    privacy: 'Privacy',
    terms: 'Terms',
    labels: {
      type: 'Type', rooms: 'Rooms', where: 'Where', when: 'When', condition: 'Condition',
      departs: 'Departs', returns: 'Returns', format: 'Format', venue: 'Venue', admission: 'Admission',
      needs: 'Needs', ends: 'Ends', source: 'Source', published: 'Published', routes: 'Routes',
      seats: 'Seats', price: 'Price',
    },
    per: { hourly: '/hr', daily: '/day', weekly: '/wk', monthly: '/mo', yearly: '/yr' },
    jobType: { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', temporary: 'Temporary', gig: 'Gig', seasonal: 'Seasonal', internship: 'Internship', freelance: 'Freelance', live_in: 'Live-in' },
    housingType: { rent: 'Rent', sublet: 'Sublet', roommate: 'Roommate', sale: 'For Sale' },
    condition: { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor' },
    need: { money: 'Funds', volunteers: 'Volunteers', goods: 'Goods', food: 'Food', shelter: 'Place to stay', transport: 'Rides', blood: 'Blood donors', services: 'Professional help' },
    format: { in_person: 'In person', online: 'Online', hybrid: 'In person + online' },
  },
  ru: {
    kinds: {
      housing: 'Жильё', job: 'Работа', sale: 'Продажа', travel: 'Поездки', deal: 'Скидка',
      event: 'Событие', charity: 'Благотворительность', question: 'Спроси махаллю', news: 'Новости', ride: 'Такси и поездки',
    },
    open: 'Открыть в Mahallify',
    get: 'Скачать Mahallify',
    getShort: 'Скачать',
    appStore: 'App Store',
    playStore: 'Google Play',
    lead: 'Mahallify — приложение для центральноазиатской диаспоры в США и Канаде.',
    more: 'Фото, подробности и ответы — в приложении.',
    phoneHint: 'Откройте эту ссылку на телефоне, чтобы посмотреть в приложении.',
    gone: 'Больше не актуально',
    ended: 'Завершено',
    missingTitle: 'Этот пост недоступен',
    missingBody: 'Возможно, его удалили или он ещё на проверке.',
    free: 'Бесплатно',
    negotiable: 'Договорная',
    answers: n => `Ответов: ${n}`,
    repeats: 'Повторяется',
    trip: { to: p => `Едет в ${p}`, from: p => `Едет из ${p}`, lookingTo: p => `Ищу путешественника в ${p}`, lookingFrom: p => `Ищу путешественника из ${p}` },
    openExpo: 'Открыть в Expo Go',
    studio: 'Студия',
    beds: n => `Спален: ${n}`,
    baths: n => `Ванных: ${n}`,
    postedBy: name => `Автор: ${name}`,
    privacy: 'Конфиденциальность',
    terms: 'Условия',
    labels: {
      type: 'Тип', rooms: 'Комнаты', where: 'Где', when: 'Когда', condition: 'Состояние',
      departs: 'Отъезд', returns: 'Возвращение', format: 'Формат', venue: 'Место', admission: 'Вход',
      needs: 'Нужно', ends: 'До', source: 'Источник', published: 'Опубликовано', routes: 'Маршруты',
      seats: 'Места', price: 'Цена',
    },
    per: { hourly: '/час', daily: '/день', weekly: '/нед', monthly: '/мес', yearly: '/год' },
    jobType: { full_time: 'Полная занятость', part_time: 'Частичная занятость', contract: 'Контракт', temporary: 'Временная', gig: 'Подработка', seasonal: 'Сезонная', internship: 'Стажировка', freelance: 'Фриланс', live_in: 'С проживанием' },
    housingType: { rent: 'Аренда', sublet: 'Субаренда', roommate: 'Сосед', sale: 'Продажа' },
    condition: { new: 'Новый', like_new: 'Как новый', good: 'Хорошее', fair: 'Удовлетворительное', poor: 'Плохое' },
    need: { money: 'Деньги', volunteers: 'Волонтёры', goods: 'Вещи', food: 'Еда', shelter: 'Жильё', transport: 'Транспорт', blood: 'Доноры крови', services: 'Помощь специалиста' },
    format: { in_person: 'Очно', online: 'Онлайн', hybrid: 'Очно + онлайн' },
  },
  uz: {
    kinds: {
      housing: 'Uy-joy', job: 'Ish', sale: 'Sotuv', travel: 'Safar', deal: 'Chegirma',
      event: 'Tadbir', charity: 'Xayriya', question: 'Mahalladan so‘rang', news: 'Yangiliklar', ride: 'Taksi va qatnov',
    },
    open: 'Mahallify’da ochish',
    get: 'Mahallify’ni yuklab oling',
    getShort: 'Yuklab olish',
    appStore: 'App Store',
    playStore: 'Google Play',
    lead: 'Mahallify — AQSh va Kanadadagi Markaziy Osiyo diasporasi uchun ilova.',
    more: 'Rasmlar, tafsilotlar va javoblar — ilovada.',
    phoneHint: 'Ilovada ko‘rish uchun havolani telefoningizda oching.',
    gone: 'Endi dolzarb emas',
    ended: 'Tugagan',
    missingTitle: 'Bu post mavjud emas',
    missingBody: 'U o‘chirilgan yoki hali tekshiruvda bo‘lishi mumkin.',
    free: 'Bepul',
    negotiable: 'Kelishiladi',
    answers: n => `${n} ta javob`,
    repeats: 'Takrorlanadi',
    trip: { to: p => `${p} ga ketmoqda`, from: p => `${p} dan kelmoqda`, lookingTo: p => `${p} ga sayohatchi qidirilmoqda`, lookingFrom: p => `${p} dan sayohatchi qidirilmoqda` },
    openExpo: 'Expo Go’da ochish',
    studio: 'Studiya',
    beds: n => `${n} ta yotoqxona`,
    baths: n => `${n} ta hammom`,
    postedBy: name => `Muallif: ${name}`,
    privacy: 'Maxfiylik',
    terms: 'Shartlar',
    labels: {
      type: 'Turi', rooms: 'Xonalar', where: 'Qayerda', when: 'Qachon', condition: 'Holati',
      departs: 'Jo‘nash', returns: 'Qaytish', format: 'Format', venue: 'Joy', admission: 'Kirish',
      needs: 'Kerak', ends: 'Tugaydi', source: 'Manba', published: 'E’lon qilingan', routes: 'Yo‘nalishlar',
      seats: 'O‘rinlar', price: 'Narx',
    },
    per: { hourly: '/soat', daily: '/kun', weekly: '/hafta', monthly: '/oy', yearly: '/yil' },
    jobType: { full_time: "To'liq ish kuni", part_time: 'Yarim stavka', contract: 'Shartnoma', temporary: 'Vaqtinchalik', gig: 'Haltura', seasonal: 'Mavsumiy', internship: 'Amaliyot', freelance: 'Frilans', live_in: 'Yashash joyi bilan' },
    housingType: { rent: 'Ijara', sublet: 'Subijara', roommate: 'Sherik', sale: 'Sotish' },
    condition: { new: 'Yangi', like_new: 'Yangidek', good: 'Yaxshi', fair: 'Qoniqarli', poor: 'Yomon' },
    need: { money: "Mablag'", volunteers: "Ko'ngillilar", goods: 'Buyumlar', food: 'Oziq-ovqat', shelter: 'Turar joy', transport: 'Transport', blood: 'Qon donorlari', services: 'Mutaxassis yordami' },
    format: { in_person: 'Jonli', online: 'Onlayn', hybrid: 'Jonli + onlayn' },
  },
};
const LOCALES = { en: 'en-US', ru: 'ru-RU', uz: 'uz-Latn-UZ' };
const OG_LOCALES = { en: 'en_US', ru: 'ru_RU', uz: 'uz_UZ' };

function pickLang(request, url) {
  const q = url.searchParams.get('lang');
  if (has(COPY, q)) return q;
  const header = (request.headers.get('accept-language') || '').toLowerCase();
  for (const part of header.split(',')) {
    const code = part.trim().slice(0, 2);
    if (has(COPY, code)) return code;
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

/** The byline: the page a post was made as, else the poster's first name.
 *  Best-effort — any failure is no byline, never a broken page. */
async function bylineOf(db, kind, row) {
  if (kind === 'question' && row.is_anonymous) return null;
  const pageTable = row.business_id ? 'businesses' : row.organization_id ? 'organizations' : null;
  if (pageTable) {
    const pageId = row.business_id || row.organization_id;
    const pages = await rest(db, `${pageTable}?select=name&id=eq.${pageId}&status=eq.approved&limit=1`).catch(() => []);
    const name = String(pages[0]?.name || '').trim();
    if (name) return name;
  }
  if (!row.user_id || !UUID.test(row.user_id)) return null;
  const people = await rest(db, `profiles?select=name&id=eq.${row.user_id}&limit=1`).catch(() => []);
  return String(people[0]?.name || '').trim().split(/\s+/)[0] || null;
}

async function readPost(db, kind, id) {
  const src = KINDS[kind];
  const rows = await rest(db, `${src.table}?select=${src.cols}&id=eq.${id}&limit=1`);
  const row = rows[0];
  if (!row || row.status !== 'approved' || row.is_active === false) return null;
  const [photo, byline] = await Promise.all([
    (async () => {
      if (src.photos) {
        const photos = await rest(
          db,
          `listing_photos?select=photo_url&listing_id=eq.${id}&listing_type=eq.${src.photos}&order=sort_order.asc&limit=1`,
        ).catch(() => []);
        return photos[0]?.photo_url ?? null;
      }
      if (kind === 'charity') return row.cover_url;
      return Array.isArray(row.image_urls) ? row.image_urls[0] : null;
    })(),
    bylineOf(db, kind, row),
  ]);
  // Only an object in our own public bucket: a client wrote these columns, and
  // the page must not hotlink whatever address someone typed into one.
  const ours = typeof photo === 'string' && photo.startsWith(`${db.url}/storage/v1/object/public/`);
  return { row, photo: ours ? photo : null, byline };
}

// ── What the card says ───────────────────────────────────────────────────────

const CANADA = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']);

function money(n, lang, state) {
  const sym = CANADA.has(String(state || '').toUpperCase()) ? 'CA$' : '$';
  const v = Number(n);
  // $18.50/hr is not $19/hr: whole amounts print whole, the rest to the cent.
  const digits = Number.isInteger(v) ? 0 : 2;
  return sym + v.toLocaleString(LOCALES[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function placeOf(row) {
  return [row.city, row.state].filter(Boolean).join(', ') || null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** A SQL `date` ("2026-12-25"), printed as that calendar day everywhere —
 *  read as UTC and printed in UTC, so it never slips to the day before. */
function dateOnly(s, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function postedOn(s, lang) {
  const t = Date.parse(s);
  if (!t) return null;
  return new Intl.DateTimeFormat(LOCALES[lang], { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(new Date(t));
}

// ── Event times, on the event's own WALL CLOCK ──
//
// An instant is turned into the event zone's wall-clock time, held as a Date
// whose UTC fields ARE that wall clock. Weekday and day arithmetic on it is
// then the event's own (a Worker runs in UTC, and stepping real instants by
// 7 × 24h drifts an hour across a DST change), and it prints with timeZone
// 'UTC'. The series rules mirror the app's src/lib/eventRecurrence.ts.

const DAY = 86400000;
const DEFAULT_SPAN = 4 * 3600000;
const MAX_OCCURRENCES = 400;

function wallClock(instant, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant)) p[x.type] = x.value;
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second));
}

function isRecurring(row) {
  return (row.recurrence === 'weekly' || row.recurrence === 'monthly') && !!row.recurrence_until;
}

/** The nth weekday of a month at `time`'s clock; nth 5 is the LAST one. */
function nthWeekdayIn(y, m, weekday, nth, time) {
  const at = d => new Date(Date.UTC(y, m, d, time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()));
  if (nth >= 5) {
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const lastDow = new Date(Date.UTC(y, m, last)).getUTCDay();
    return at(last - ((lastDow - weekday + 7) % 7));
  }
  const firstDow = new Date(Date.UTC(y, m, 1)).getUTCDay();
  return at(1 + ((weekday - firstDow + 7) % 7) + (nth - 1) * 7);
}

/** The occurrence on screen: a one-off as it is, a series' current or next
 *  occurrence (its first once the series is over). Wall-clock dates. */
function displayOccurrence(row, tz) {
  const first = wallClock(new Date(row.start_date), tz);
  const span = row.end_date ? Math.max(0, Date.parse(row.end_date) - Date.parse(row.start_date)) : DEFAULT_SPAN;
  const one = start => ({ start, end: row.end_date ? new Date(start.getTime() + span) : null });
  if (!isRecurring(row)) return one(first);
  const now = wallClock(new Date(), tz).getTime();
  const u = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(row.recurrence_until));
  const stop = u ? Date.UTC(+u[1], +u[2] - 1, +u[3] + 1) : first.getTime();
  const live = start => start.getTime() + span > now;
  let produced = 0;
  if (row.recurrence === 'weekly') {
    const interval = Math.max(1, row.recurrence_interval || 1);
    const startDow = first.getUTCDay();
    const offsets = [...new Set((row.recurrence_weekdays || []).map(wd => (wd - startDow + 7) % 7))].sort((a, b) => a - b);
    const firstWeek = offsets.includes(0) ? offsets : [0, ...offsets];
    for (let week = 0; produced < MAX_OCCURRENCES; week += interval) {
      const weekStart = first.getTime() + week * 7 * DAY;
      if (weekStart >= stop) break;
      for (const off of week === 0 ? firstWeek : offsets) {
        const start = new Date(weekStart + off * DAY);
        if (start.getTime() >= stop) break;
        produced++;
        if (live(start)) return one(start);
      }
    }
    return one(first);
  }
  const nth = Math.ceil(first.getUTCDate() / 7);
  const weekday = first.getUTCDay();
  for (let k = 0; produced < MAX_OCCURRENCES; k++) {
    const start = k === 0 ? first : nthWeekdayIn(first.getUTCFullYear(), first.getUTCMonth() + k, weekday, nth, first);
    if (start.getTime() >= stop) break;
    produced++;
    if (live(start)) return one(start);
  }
  return one(first);
}

/** An event's time in ITS OWN zone, as a range when it has an end. A series
 *  shows its current or next occurrence, never a first date long past. */
function eventWhen(row, lang) {
  if (!row.start_date) return null;
  try {
    const { start, end } = displayOccurrence(row, row.timezone || 'America/New_York');
    const fmt = new Intl.DateTimeFormat(LOCALES[lang], {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
    });
    const text = end && end > start && fmt.formatRange ? fmt.formatRange(start, end) : fmt.format(start);
    return isRecurring(row) ? `${COPY[lang].repeats} · ${text}` : text;
  } catch {
    return null;
  }
}

function priceOf(row, lang) {
  const c = COPY[lang];
  if (row.price_type === 'free') return c.free;
  if (row.price) return money(row.price, lang, row.state);
  return row.price_type === 'negotiable' ? c.negotiable : null;
}

/** The headline figure under the title, and the facts list under that. */
function factsOf(kind, row, lang) {
  const c = COPY[lang];
  const L = c.labels;
  const where = placeOf(row);
  let lead = null;
  const facts = [];
  const add = (label, value) => {
    if (value) facts.push([label, value]);
  };
  switch (kind) {
    case 'housing': {
      // 0 is housing's "negotiable"; NULL says nothing.
      const monthly = row.listing_type && row.listing_type !== 'sale';
      lead = row.price == null ? null : row.price ? money(row.price, lang, row.state) + (monthly ? c.per.monthly : '') : c.negotiable;
      add(L.type, c.housingType[row.listing_type]);
      const rooms = [
        row.bedrooms === 0 ? c.studio : row.bedrooms ? c.beds(row.bedrooms) : null,
        row.bathrooms ? c.baths(row.bathrooms) : null,
      ].filter(Boolean);
      add(L.rooms, rooms.join(' · '));
      add(L.where, where);
      break;
    }
    case 'job': {
      const lo = row.pay_min, hi = row.pay_max;
      const range = lo && hi && lo !== hi ? `${money(lo, lang, row.state)}–${money(hi, lang, row.state)}` : lo || hi ? money(lo || hi, lang, row.state) : null;
      lead = range ? range + (c.per[row.pay_period] || '') : null;
      add(L.type, c.jobType[row.job_type]);
      add(L.where, where);
      break;
    }
    case 'sale':
    case 'deal':
      lead = priceOf(row, lang);
      if (kind === 'sale') add(L.condition, c.condition[row.condition]);
      add(L.where, where);
      break;
    case 'travel': {
      // An INBOUND trip comes from abroad to the poster's city: the far end
      // is where it starts.
      const far = row.travel_destination_city || row.travel_destination;
      const ends = row.travel_direction === 'inbound' ? [far, row.city] : [row.city, far];
      lead = far ? ends.filter(Boolean).join(' → ') : null;
      add(L.departs, dateOnly(row.travel_departure_date, lang));
      add(L.returns, dateOnly(row.travel_return_date, lang));
      add(L.where, where);
      break;
    }
    case 'event': {
      add(L.when, eventWhen(row, lang));
      if (row.event_format && row.event_format !== 'in_person') add(L.format, c.format[row.event_format]);
      if (row.event_format !== 'online') add(L.venue, row.venue);
      add(L.where, where);
      add(L.admission, priceOf(row, lang));
      break;
    }
    case 'charity': {
      const needs = Array.isArray(row.needs) ? row.needs.map(n => c.need[n]).filter(Boolean) : [];
      add(L.needs, needs.join(', '));
      add(L.ends, dateOnly(row.deadline, lang));
      add(L.where, where);
      break;
    }
    case 'question':
      lead = c.answers(Number(row.comment_count || 0));
      add(L.where, row.state);
      break;
    case 'news':
      add(L.source, row.source_name || (row.source_url ? hostOf(row.source_url) : null));
      add(L.published, dateOnly(row.published_on, lang));
      add(L.where, where);
      break;
    case 'ride':
      lead = priceOf(row, lang);
      add(L.routes, row.routes);
      add(L.seats, row.seats);
      add(L.where, where);
      break;
  }
  return { lead, facts };
}

/** The post's own words, cut to a readable excerpt. Never a charity story. */
function excerptOf(kind, row, max = 420) {
  if (kind === 'charity') return null;
  const raw = String((kind === 'question' ? row.body : row.description) || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!raw) return null;
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:–—-]+$/, '') + '…';
}

/** A trip with no title of its own is named from its fields, as the app's
 *  `travelTitle` names it (src/utils/travel.ts), in the reader's language. */
function travelTitle(row, lang) {
  const country = String(row.travel_destination || '').trim();
  const city = String(row.travel_destination_city || '').trim();
  const place = city && country ? `${city}, ${country}` : city || country;
  if (!place) return null;
  const looking = row.post_type === 'delivery_wanted';
  const inbound = row.travel_direction === 'inbound';
  const t = COPY[lang].trip;
  return (looking ? (inbound ? t.lookingFrom : t.lookingTo) : inbound ? t.from : t.to)(place);
}

/** Today's calendar date ("2026-10-29") where the continent's day ends LAST,
 *  so a date-only deadline is not called over while it is still that day
 *  for any reader in the US or Canada. */
function todayWest() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

function statusOf(kind, row, lang) {
  const c = COPY[lang];
  if (kind === 'event' && row.ends_at && Date.parse(row.ends_at) <= Date.now()) return c.ended;
  if (kind === 'charity') {
    // `deadline` is the organizer's stated end, the only one a reader sees;
    // `expires_at` is the board's housekeeping window — past it the campaign
    // is off the board, which is "no longer available", not "ended".
    const deadline = /^\d{4}-\d{2}-\d{2}/.exec(String(row.deadline || ''))?.[0];
    if (deadline && deadline < todayWest()) return c.ended;
    if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) return c.gone;
  }
  return row.availability === 'gone' ? c.gone : null;
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

const APPLE_GLYPH =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 12.6c-.02-2.1 1.72-3.12 1.8-3.17-.98-1.43-2.5-1.63-3.05-1.65-1.3-.13-2.53.76-3.19.76-.66 0-1.67-.74-2.75-.72-1.41.02-2.72.82-3.45 2.09-1.47 2.55-.38 6.33 1.06 8.4.7 1.01 1.53 2.15 2.62 2.11 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.05.8-1.17 1.13-2.31 1.15-2.37-.03-.01-2.2-.84-2.22-3.35zM14.3 6.43c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.54.62-1.01 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16z"/></svg>';
const PLAY_GLYPH =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.6 2.9c-.27.28-.43.72-.43 1.29v15.62c0 .57.16 1.01.43 1.29l.07.07 8.75-8.75v-.2L4.67 2.83l-.07.07zm11.73 11.44-2.91-2.92v-.2l2.91-2.92.07.04 3.45 1.96c.99.56.99 1.48 0 2.04l-3.45 1.96-.07.04zm-.07.04-2.98-2.98-8.68 8.68c.32.34.85.38 1.45.04l10.21-5.74m0-5.97L6.05 2.71c-.6-.34-1.13-.3-1.45.04l8.68 8.68 2.98-2.98z"/></svg>';

function page({ lang, kind, id, post, url, db, expoGo, platform }) {
  const c = COPY[lang];
  const found = !!post;
  const src = kind ? KINDS[kind] : null;
  const accent = src?.accent || '#4f7dff';
  const title = found
    ? String(post.row.title || '').trim() || (kind === 'travel' ? travelTitle(post.row, lang) : null) || c.kinds[kind]
    : c.missingTitle;
  const { lead, facts } = found ? factsOf(kind, post.row, lang) : { lead: null, facts: [] };
  const status = found ? statusOf(kind, post.row, lang) : null;
  const excerpt = found ? excerptOf(kind, post.row) : null;
  const photo = found ? post.photo : null;
  const posted = found ? postedOn(post.row.created_at, lang) : null;
  const byline = found && post.byline ? post.byline : null;
  const kindLabel = (kind && c.kinds[kind]) || 'Mahallify';

  // What a preview bot prints under the title: the figures first, then the
  // start of the post's own words.
  const summary = [status, lead, ...facts.slice(0, 2).map(f => f[1])].filter(Boolean).join(' · ');
  const short = excerpt ? excerptOf(kind, post.row, 150).replace(/\s+/g, ' ') : null;
  const ogDescription = found ? [summary, short].filter(Boolean).join(' — ') || c.lead : c.missingBody;
  const image = photo || `${db.site}/icon-512.png`;

  const appPath = src ? `${src.screen}/${id}` : '';
  const appUrl = `${db.scheme}://${appPath}`;
  const openHref = expoGo
    ? `${expoGo}/--/${appPath}`
    : platform === 'android'
      ? `intent://${appPath}#Intent;scheme=${db.scheme};package=${db.androidPackage};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`
      : appUrl;
  const stores =
    platform === 'ios'
      ? [[APP_STORE, c.appStore, APPLE_GLYPH]]
      : platform === 'android'
        ? [[PLAY_STORE, c.playStore, PLAY_GLYPH]]
        : [[APP_STORE, c.appStore, APPLE_GLYPH], [PLAY_STORE, c.playStore, PLAY_GLYPH]];
  const canOpen = found && platform !== 'other' && !!(expoGo || db.scheme);
  const legal = lang === 'en' ? '' : `${lang}/`;

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
${found && db.storeBanner ? `<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}, app-argument=${esc(appUrl)}" />` : ''}
<meta property="og:site_name" content="Mahallify" />
<meta property="og:type" content="article" />
<meta property="og:locale" content="${OG_LOCALES[lang]}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(ogDescription)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:alt" content="${esc(title)}" />
<meta property="og:url" content="${esc(url)}" />
<meta name="twitter:card" content="${photo ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(ogDescription)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg:#04060f; --bg2:#090e1d; --card:#0c1226; --raise:rgba(255,255,255,.045);
    --line:rgba(255,255,255,.09); --line2:rgba(255,255,255,.14);
    --ink:#f3f6ff; --ink2:rgba(223,232,255,.72); --ink3:rgba(186,202,240,.55);
    --brand:#22d3ee; --brandInk:#03222a; --brandMark:#45a8d2; --accent:${accent};
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:var(--bg); color:var(--ink); font-family:Onest,system-ui,-apple-system,sans-serif; -webkit-font-smoothing:antialiased; }
  body { min-height:100vh; background:
    radial-gradient(900px 420px at 50% -120px, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%),
    var(--bg); }
  a { color:inherit; }
  .wrap { max-width:520px; margin:0 auto; padding:max(16px, env(safe-area-inset-top)) 16px calc(28px + env(safe-area-inset-bottom)); }
  .top { display:flex; align-items:center; justify-content:space-between; gap:12px; height:52px; margin-bottom:12px; }
  /* The app's lockup (see assets/base.css): ratios off a 34pt wordmark. */
  .brand { --word:19px; display:flex; align-items:center; gap:calc(var(--word) * 10 / 34); text-decoration:none; }
  .brand img { flex:none; width:calc(var(--word) * 88 / 34); height:calc(var(--word) * 88 / 34); margin:calc(var(--word) * -22 / 34); }
  .brand span { font-weight:700; font-size:var(--word); line-height:1; letter-spacing:-.025em; padding-top:calc(var(--word) * 4 / 34); color:var(--brandMark); }
  .top .get { font-size:14px; font-weight:600; text-decoration:none; color:var(--ink2); padding:8px 12px; border-radius:999px; border:1px solid var(--line); background:var(--raise); }
  .card { background:linear-gradient(180deg, var(--card), var(--bg2)); border:1px solid var(--line); border-radius:24px; overflow:hidden;
    box-shadow:0 1px 0 rgba(255,255,255,.05) inset, 0 30px 70px -36px rgba(0,0,0,.95); }
  .hero { position:relative; background:#111833; aspect-ratio:16/10; }
  .hero img { display:block; width:100%; height:100%; object-fit:cover; }
  .body { padding:20px 20px 22px; }
  .meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .kind { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); }
  .kind::before { content:''; width:7px; height:7px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }
  .status { font-size:12px; font-weight:600; padding:3px 9px; border-radius:999px; background:rgba(255,255,255,.09); color:var(--ink); }
  h1 { margin-top:10px; font-size:clamp(24px, 6.4vw, 30px); line-height:1.18; letter-spacing:-.025em; font-weight:800; overflow-wrap:anywhere; }
  .lead { margin-top:8px; font-size:20px; font-weight:700; letter-spacing:-.01em; color:var(--ink); }
  .facts { margin-top:18px; border-top:1px solid var(--line); }
  .fact { display:grid; grid-template-columns:minmax(88px, 32%) 1fr; gap:12px; padding:12px 0; border-bottom:1px solid var(--line); }
  .fact dt { font-size:13px; color:var(--ink3); padding-top:1px; }
  .fact dd { font-size:15px; font-weight:500; line-height:1.4; overflow-wrap:anywhere; }
  .excerpt { margin-top:18px; font-size:15px; line-height:1.6; color:var(--ink2); white-space:pre-line; overflow-wrap:anywhere; }
  .by { display:flex; align-items:center; gap:10px; margin-top:18px; font-size:14px; color:var(--ink3); }
  .by .av { flex:none; display:grid; place-items:center; width:30px; height:30px; border-radius:50%; font-weight:700; font-size:13px; color:var(--ink);
    background:color-mix(in srgb, var(--accent) 26%, #1a2240); }
  .by b { color:var(--ink); font-weight:600; }
  .more { margin-top:16px; font-size:13px; color:var(--ink3); }
  .missing { padding:36px 22px 30px; text-align:center; }
  .missing .glyph { display:block; width:112px; height:112px; margin:-24px auto -8px; }
  .missing h1 { font-size:24px; margin-top:0; }
  .missing p { margin-top:8px; color:var(--ink2); font-size:15px; line-height:1.5; }
  .actions { display:grid; gap:10px; margin-top:18px; }
  .btn { display:flex; align-items:center; justify-content:center; gap:9px; min-height:52px; border-radius:16px; font-size:16px; font-weight:600; text-decoration:none; }
  .btn svg { width:19px; height:19px; }
  .btn.primary { background:var(--brand); color:var(--brandInk); box-shadow:0 10px 30px -12px rgba(34,211,238,.6); }
  .btn.secondary { background:var(--raise); color:var(--ink); border:1px solid var(--line2); }
  .hint { margin-top:12px; text-align:center; font-size:13px; color:var(--ink3); }
  .foot { margin-top:28px; padding-top:18px; border-top:1px solid var(--line); font-size:13px; line-height:1.55; color:var(--ink3); }
  .foot nav { display:flex; gap:16px; margin-top:10px; }
  .foot nav a { text-decoration:none; color:var(--ink2); }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <a class="brand" href="/"><img src="/assets/brand-mark.png" alt="" width="49" height="49" /><span>mahallify</span></a>
    <a class="get" href="/get">${esc(c.getShort)}</a>
  </header>
  <main>
  ${
    found
      ? `<article class="card">
    ${photo ? `<div class="hero"><img src="${esc(photo)}" alt="" onerror="this.parentNode.remove()" /></div>` : ''}
    <div class="body">
      <div class="meta"><span class="kind">${esc(kindLabel)}</span>${status ? `<span class="status">${esc(status)}</span>` : ''}</div>
      <h1>${esc(title)}</h1>
      ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
      ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${excerpt ? `<p class="excerpt">${esc(excerpt)}</p>` : ''}
      ${
        byline || posted
          ? `<div class="by">${byline ? `<span class="av">${esc(byline.slice(0, 1).toUpperCase())}</span>` : ''}<span>${
              byline ? esc(c.postedBy('\u0000')).replace('\u0000', `<b>${esc(byline)}</b>`) : ''
            }${byline && posted ? ' · ' : ''}${posted ? esc(posted) : ''}</span></div>`
          : ''
      }
      <p class="more">${esc(c.more)}</p>
    </div>
  </article>`
      : `<article class="card missing">
    <img class="glyph" src="/assets/brand-mark.png" alt="" width="112" height="112" />
    <h1>${esc(title)}</h1>
    <p>${esc(c.missingBody)}</p>
  </article>`
  }
  <div class="actions">
    ${canOpen ? `<a class="btn primary" href="${esc(openHref)}">${esc(expoGo ? c.openExpo : c.open)}</a>` : ''}
    ${stores
      .map(([href, label, glyph]) => `<a class="btn ${canOpen ? 'secondary' : 'primary'}" href="${href}">${glyph}${esc(c.get)} · ${esc(label)}</a>`)
      .join('\n    ')}
  </div>
  ${found && platform === 'other' ? `<p class="hint">${esc(c.phoneHint)}</p>` : ''}
  </main>
  <footer class="foot">
    ${esc(c.lead)}
    <nav><a href="/${legal}privacy.html">${esc(c.privacy)}</a><a href="/${legal}terms.html">${esc(c.terms)}</a></nav>
  </footer>
</div>
</body>
</html>`;
}

export async function onRequestGet({ request, params }) {
  const url = new URL(request.url);
  const lang = pickLang(request, url);
  const platform = platformOf(request);
  const kind = String(params.kind || '');
  const id = String(params.id || '').toLowerCase();
  const db = dbOf(url);
  const canonical = `${db.site}/p/${kind}/${id}`;

  let post = null;
  let failed = false;
  if (has(KINDS, kind) && UUID.test(id)) {
    try {
      post = await readPost(db, kind, id);
    } catch {
      failed = true;
    }
  }

  const html = page({ lang, kind: has(KINDS, kind) ? kind : null, id, post, url: canonical, db, expoGo: expoGoOf(url, db), platform });
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
