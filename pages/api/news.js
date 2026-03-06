// pages/api/news.js
// Fetches RSS feeds from major Nepali media outlets server-side, returns JSON

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=240');

  const feeds = [
    { name: 'Kantipur',     url: 'https://kantipurdaily.com/rss/',                  color: '#e11d48', icon: '📰' },
    { name: 'Setopati',     url: 'https://www.setopati.com/rss.xml',                color: '#0369a1', icon: '📡' },
    { name: 'OnlineKhabar', url: 'https://www.onlinekhabar.com/feed',               color: '#16a34a', icon: '🌐' },
    { name: 'Nepal TV',     url: 'https://nepaltvonline.com/feed/',                  color: '#7c3aed', icon: '📺' },
    { name: 'Ratopati',     url: 'https://ratopati.com/rss/election',               color: '#dc2626', icon: '🔴' },
    { name: 'Nagarik',      url: 'https://nagariknews.nagariknetwork.com/feed/',     color: '#d97706', icon: '🗞️' },
    { name: 'Republica',    url: 'https://myrepublica.nagariknetwork.com/rss/news/', color: '#0891b2', icon: '🌏' },
  ];

  const results = await Promise.allSettled(
    feeds.map(f => fetchRSS(f))
  );

  const articles = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      articles.push(...r.value);
    }
  });

  // Sort by date desc, take top 40
  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const top = articles.slice(0, 40);

  return res.status(200).json({
    articles: top,
    fetchedAt: new Date().toISOString(),
    sources: feeds.map((f, i) => ({
      name: f.name,
      color: f.color,
      icon: f.icon,
      ok: results[i].status === 'fulfilled',
    })),
  });
}

async function fetchRSS({ name, url, color, icon }) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Nepal-Election-Dashboard/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(id);
    if (!resp.ok) return [];
    const xml = await resp.text();

    // Parse RSS items with regex (no DOM parser in Node edge)
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRegex.exec(xml)) !== null && items.length < 8) {
      const block = m[1];
      const title   = stripTags(extract(block, 'title'));
      const link    = extract(block, 'link') || extract(block, 'guid');
      const pubDate = extract(block, 'pubDate') || extract(block, 'dc:date') || new Date().toISOString();
      const desc    = stripTags(extract(block, 'description')).slice(0, 200);
      const imgMatch = block.match(/<media:content[^>]+url="([^"]+)"/i) ||
                       block.match(/<enclosure[^>]+url="([^"]+)"/i) ||
                       desc.match(/src="([^"]+\.(jpg|png|jpeg|webp))"/i);
      const image = imgMatch ? imgMatch[1] : null;

      if (title && link) {
        // Filter for election-related
        const t = title.toLowerCase();
        const electionKeywords = ['election', 'vote', 'result', 'count', 'निर्वाचन', 'मत', 'नतिजा', 'चुनाव', 'ballot', 'party', 'candidate', 'constituency', 'seat', 'parliament', 'balen', 'oli', 'rsp', 'congress', 'uml', 'maoist'];
        const relevant = electionKeywords.some(k => t.includes(k));
        items.push({ title, link: link.trim(), pubDate, desc, image, source: name, color, icon, relevant });
      }
    }
    return items;
  } catch (e) {
    return [];
  }
}

function extract(str, tag) {
  const r = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = str.match(r);
  return m ? (m[1] || m[2] || '').trim() : '';
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}
