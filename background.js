// Fetches game info and stats for the popup. Runs here so the RoTerminal background tab is still closed if the popup closes early.

const json = async (url, opts) => {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json(); // throws on RoTerminal's HTML bot-check page
};

// Roblox: the tab URL only has the place ID. The stats sites key on the universe ID, and CreatorExchange searches by name.
async function roblox({ placeId }) {
  const { universeId } = await json(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
  if (!universeId) throw new Error('Game not found');
  const { data: [game] = [] } = await json(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
  // sourceName is the untranslated name when the API localizes it.
  return { uid: String(universeId), name: game?.sourceName || game?.name || '' };
}

// CreatorExchange: same request its /search page makes; we read the result card, never open the game page.
async function creatorExchange({ uid, name }) {
  const q = name.replace(/\[[^\]]*\]|[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const url = `https://creatorexchange.io/api/v2/roblox/discover?tab=all&q=${encodeURIComponent(q)}&sortBy=ccu&sortDir=desc&limit=24`;
  const { games = [] } = await json(url);
  const game = games.find((g) => String(g.universeId) === uid) ?? games[0] ?? null;
  return { game, exact: String(game?.universeId) === uid, searchUrl: `https://creatorexchange.io/search?search=${encodeURIComponent(q)}` };
}

// RoTerminal sits behind a JS proof-of-work check, and earnings start out locked even when signed in.
// Free accounts get a few "looks" a day: when taste.ready, ?look=1 spends one and unlocks them, as the site does
// once the earnings section scrolls into view. Pro accounts get them unlocked straight away.
async function earnings(get, id) {
  const d = await get(`earnings/${id}`);
  return d.shows === 'locked' && d.taste?.ready ? get(`earnings/${id}?look=1`) : d;
}

// Try a plain fetch with the user's cookies; if blocked, or locked because RoTerminal didn't see the sign-in,
// let a background tab pass the check and fetch from there.
async function roTerminal({ uid }) {
  const get = (path) => json(`https://roterminal.co/api/${path}`, { credentials: 'include' });
  try {
    const [d, playtime, game] = await Promise.all([earnings(get, uid), get(`game/${uid}/playtime`), get(`game/${uid}`)]);
    if (d.shows !== 'locked' || !d.taste?.signin) return { ...d, playtime, history: game.history };
  } catch {}
  return roTerminalViaTab(uid);
}

async function roTerminalViaTab(uid) {
  const tab = await chrome.tabs.create({ url: `https://roterminal.co/g/${uid}`, active: false });
  try {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const [res] = await chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          args: [uid],
          func: async (id) => {
            try {
              const get = async (path) => (await fetch(`/api/${path}`)).json();
              // Same as earnings() above; this function runs in the tab, so it can't call it.
              const earnings = async () => {
                const d = await get(`earnings/${id}`);
                return d.shows === 'locked' && d.taste?.ready ? get(`earnings/${id}?look=1`) : d;
              };
              const [d, playtime, game] = await Promise.all([earnings(), get(`game/${id}/playtime`), get(`game/${id}`)]);
              return { ...d, playtime, history: game.history };
            } catch { return null; }
          },
        })
        .catch(() => [null]); // tab mid-reload after the check passes
      if (res?.result) return res.result;
    }
    throw new Error('Could not get past the RoTerminal browser check');
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// RoTrends is server-rendered (Ant Design markup); no DOMParser in a service worker, so regex the HTML.
async function roTrends({ uid }) {
  const url = `https://www.rotrends.com/game/${uid}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const html = await r.text();
  const tab = (label) => html.match(new RegExp(`>${label}</span><span[^>]*>([^<]+)</span>`))?.[1] ?? null;
  const charts = [];
  const card = /<h3[^>]*>([^<]+)<\/h3><div[^>]*><h4[^>]*>#<!-- -->(\d+)<\/h4>(.*?)<\/div><span[^>]*>([^<]+)<!-- --> - <!-- -->([^<]+)<\/span>/gs;
  for (const m of html.matchAll(card)) {
    const move = m[3].match(/aria-label="(rise|fall)".*?<span>(\d+)<\/span>/s);
    charts.push({ name: m[1], rank: +m[2], dir: move?.[1] ?? null, delta: move ? +move[2] : null, from: m[4], to: m[5] });
  }
  return { url, placements: tab('Charts'), globalRank: tab('Global Rank'), share: tab('Platform Share'), charts };
}

const sources = { roblox, creatorExchange, roTerminal, roTrends };

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!Object.hasOwn(sources, msg.source)) return false;
  sources[msg.source](msg)
    .then((data) => reply({ data }))
    .catch((e) => reply({ error: String(e.message ?? e) }));
  return true;
});
