// pages/api/results.js
// Server-side proxy: fetches from nepalvotes.live / ECN, parses HTML, returns JSON
// Runs on Vercel edge — no CORS issues

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    // Try nepalvotes.live which mirrors ECN every 30s
    const html = await fetchWithTimeout('https://nepalvotes.live/', 8000);
    const data = parseNepalVotes(html);
    if (data && data.parties && data.parties.length > 0) {
      return res.status(200).json({ source: 'nepalvotes.live', ...data, fetchedAt: new Date().toISOString() });
    }
  } catch (e) {
    console.error('nepalvotes fetch failed:', e.message);
  }

  try {
    // Fallback: try ECN directly
    const html2 = await fetchWithTimeout('https://result.election.gov.np/', 8000);
    const data2 = parseECN(html2);
    if (data2) {
      return res.status(200).json({ source: 'result.election.gov.np', ...data2, fetchedAt: new Date().toISOString() });
    }
  } catch (e2) {
    console.error('ECN fetch failed:', e2.message);
  }

  // Return structured empty response — frontend shows "counting in progress"
  return res.status(200).json({
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
    parties: FALLBACK_PARTIES,
    constituencies: [],
    summary: { declared: 0, counting: 165, totalSeats: 165 },
  });
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  const resp = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Nepal-Election-Dashboard/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  clearTimeout(id);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

function parseNepalVotes(html) {
  // nepalvotes.live is a Next.js SPA — extract __NEXT_DATA__ JSON
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[1]);
    const props = json?.props?.pageProps;
    if (!props) return null;

    // Extract party data
    const parties = (props.parties || props.partySummary || []).map(p => ({
      id: p.id || p.partyId,
      name: p.name || p.partyName,
      seats: parseInt(p.seats || p.seatsWon || p.fptp_seats || 0),
      leading: parseInt(p.leading || p.seatsLeading || 0),
      votes: parseInt(p.totalVotes || p.votes || 0),
      color: p.color || '#888',
    })).filter(p => p.name);

    const constituencies = (props.constituencies || props.results || []).map(c => ({
      id: c.id || c.constituencyId,
      name: c.name || c.constituencyName,
      province: c.province,
      district: c.district,
      leadingCandidate: c.leadingCandidate || c.leading_candidate,
      leadingParty: c.leadingParty || c.leading_party,
      leadingVotes: parseInt(c.leadingVotes || c.votes || 0),
      margin: parseInt(c.margin || 0),
      status: c.status || 'counting',
    }));

    return { parties, constituencies, summary: props.summary || {} };
  } catch (e) {
    return null;
  }
}

function parseECN(html) {
  // ECN is also a JS-rendered page, minimal fallback parse
  return null;
}

const FALLBACK_PARTIES = [
  { id: 2,   name: 'Nepali Congress',               abbr: 'NC',      color: '#0ea5e9', seats: 0, leading: 0 },
  { id: 1,   name: 'Nepal Communist Party (UML)',    abbr: 'CPN-UML', color: '#ef4444', seats: 0, leading: 0 },
  { id: 41,  name: 'Rastriya Swatantra Party',       abbr: 'RSP',     color: '#2563eb', seats: 0, leading: 0 },
  { id: 3,   name: 'CPN (Maoist Centre)',             abbr: 'Maoist',  color: '#b91c1c', seats: 0, leading: 0 },
  { id: 5,   name: 'Rastriya Prajatantra Party',      abbr: 'RPP',     color: '#8b5cf6', seats: 0, leading: 0 },
  { id: 4,   name: 'Janata Samajwadi Party',          abbr: 'JSP',     color: '#f59e0b', seats: 0, leading: 0 },
  { id: 7,   name: 'CPN (Unified Socialist)',         abbr: 'CPN-US',  color: '#f97316', seats: 0, leading: 0 },
  { id: 22,  name: 'Janamat Party',                   abbr: 'Janamat', color: '#ec4899', seats: 0, leading: 0 },
  { id: 32,  name: 'Nagarik Unmukti Party',           abbr: 'NUP',     color: '#06b6d4', seats: 0, leading: 0 },
  { id: 275, name: 'Nepali Communist Party (New)',    abbr: 'NCP',     color: '#dc2626', seats: 0, leading: 0 },
  { id: 200, name: 'Independent',                    abbr: 'IND',     color: '#6b7280', seats: 0, leading: 0 },
];
