import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { PARTIES, PARTY_BY_ID, NOTABLE_CANDIDATES } from '../lib/parties';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = n => (n > 0 ? n.toLocaleString() : '—');
const ago = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

// ── PartyLogo component ───────────────────────────────────────────────────────
function PartyLogo({ party, size = 44, className = '' }) {
  const [err, setErr] = useState(false);
  if (!party) return null;
  return (
    <div
      className={`party-logo-wrap ${className}`}
      style={{ width: size, height: size, background: err ? party.color : '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}
    >
      {!err && party.logo ? (
        <img
          src={party.logo}
          alt={party.abbr}
          width={size - 6}
          height={size - 6}
          style={{ objectFit: 'contain' }}
          onError={() => setErr(true)}
        />
      ) : (
        <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.32, letterSpacing: '-0.5px', padding: 2 }}>
          {party.abbr.slice(0, 3)}
        </span>
      )}
    </div>
  );
}

// ── CandidatePhoto component ──────────────────────────────────────────────────
function CandidatePhoto({ candidate, party, size = 64 }) {
  const [err, setErr] = useState(false);
  const initials = candidate.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <div style={{ width: size, height: size + 10, borderRadius: 10, overflow: 'hidden', background: err ? (party?.color || '#334') : '#1a1f30', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
      {!err && candidate.photo ? (
        <img src={candidate.photo} alt={candidate.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          onError={() => setErr(true)} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#fff', opacity: 0.8 }}>{initials}</div>
      )}
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = ['results', 'parties', 'candidates', 'news'];
const TAB_LABELS = {
  en: { results: '📊 Live Results', parties: '🏛 Parties', candidates: '👤 Candidates', news: '📰 News' },
  np: { results: '📊 लाइभ नतिजा', parties: '🏛 दलहरू', candidates: '👤 उम्मेदवार', news: '📰 समाचार' },
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState('results');
  const [lang, setLang] = useState('en');
  const [results, setResults] = useState(null);
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [partySortDir, setPartySortDir] = useState('asc');
  const [candSearch, setCandSearch] = useState('');
  const [candParty, setCandParty] = useState('');
  const [candProv, setCandProv] = useState('');
  const [newsFilter, setNewsFilter] = useState('all');
  const timerRef = useRef(null);

  const L = lang === 'en' ? {
    title: 'Nepal Election 2082 — Live Results',
    sub: 'Pratinidhi Sabha · March 5, 2026 · 165 FPTP + 110 PR Seats',
    live: 'Live Counting',
    source: 'Official Source',
    lastFetch: 'Last fetched',
    seats2079: 'seats won in 2079',
    newParty: 'New party in 2082',
    counting: '2082 counting',
    allParties: 'All Parties',
    allProv: 'All Provinces',
    search: 'Search candidate or constituency…',
    votes: 'votes',
    countingDots: 'counting…',
    sortAsc: '↑ Ascending',
    sortDesc: '↓ Descending',
    constituency: 'Constituency',
    province: 'Province',
    status: 'Status',
    margin: 'Margin',
    declared: 'Declared',
    leading: 'Leading',
    noData: 'Vote counting in progress — no official data yet. Check',
    allNews: 'All',
    electionNews: 'Election',
  } : {
    title: 'नेपाल निर्वाचन २०८२ — लाइभ नतिजा',
    sub: 'प्रतिनिधि सभा · फाल्गुण २१, २०८२ · १६५ प्रत्यक्ष + ११० समानुपातिक',
    live: 'मत गणना जारी',
    source: 'आधिकारिक स्रोत',
    lastFetch: 'पछिल्लो अद्यावधिक',
    seats2079: '२०७९ मा जितेका सिट',
    newParty: '२०८२ मा नयाँ दल',
    counting: '२०८२ गणना जारी',
    allParties: 'सबै दल',
    allProv: 'सबै प्रदेश',
    search: 'उम्मेदवार वा क्षेत्र खोज्नुहोस्…',
    votes: 'मत',
    countingDots: 'गणना जारी…',
    sortAsc: '↑ बढ्दो',
    sortDesc: '↓ घट्दो',
    constituency: 'निर्वाचन क्षेत्र',
    province: 'प्रदेश',
    status: 'स्थिति',
    margin: 'अन्तर',
    declared: 'घोषित',
    leading: 'अग्रणी',
    noData: 'मत गणना जारी छ — अहिले आधिकारिक डेटा छैन। हेर्नुहोस्',
    allNews: 'सबै',
    electionNews: 'निर्वाचन',
  };

  // Fetch results from our API proxy
  const fetchResults = useCallback(async () => {
    try {
      const r = await fetch('/api/results');
      const d = await r.json();
      setResults(d);
    } catch (e) {
      console.error('Results fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch news
  const fetchNews = useCallback(async () => {
    try {
      const r = await fetch('/api/news');
      const d = await r.json();
      setNews(d);
    } catch (e) {
      console.error('News fetch error:', e);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    fetchNews();
    // countdown timer
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          fetchResults();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [fetchResults, fetchNews]);

  // ── Party tab data ────────────────────────────────────────────────────────
  const liveParties = results?.parties || [];
  const mergedParties = PARTIES.map(p => {
    const live = liveParties.find(lp => lp.id === p.id || lp.name?.toLowerCase().includes(p.abbr.toLowerCase()));
    return { ...p, liveSeats: live?.seats || 0, liveLeading: live?.leading || 0 };
  }).sort((a, b) => partySortDir === 'asc' ? a.s2079 - b.s2079 : b.s2079 - a.s2079);
  const maxSeats = Math.max(...mergedParties.map(p => p.s2079), 1);

  // ── Candidates filter ─────────────────────────────────────────────────────
  const filteredCands = NOTABLE_CANDIDATES.filter(c => {
    const q = candSearch.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !c.nameNp.includes(q) && !c.constituency.toLowerCase().includes(q)) return false;
    if (candParty && PARTY_BY_ID[c.partyId]?.abbr !== candParty) return false;
    if (candProv && c.province !== candProv) return false;
    return true;
  });

  // ── Constituencies ────────────────────────────────────────────────────────
  const constituencies = (results?.constituencies || []).sort((a, b) => a.leadingVotes - b.leadingVotes);
  const declared = constituencies.filter(c => c.status === 'declared').length;

  // ── News filter ───────────────────────────────────────────────────────────
  const allArticles = news?.articles || [];
  const filteredNews = newsFilter === 'election'
    ? allArticles.filter(a => a.relevant)
    : newsFilter === 'all'
      ? allArticles
      : allArticles.filter(a => a.source === newsFilter);

  return (
    <>
      <Head>
        <title>{L.title}</title>
        <meta name="description" content="Live Nepal Election 2082 results — real-time vote counting, party standings, candidate tracker and news from ECN." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={L.title} />
        <meta property="og:description" content="Live results dashboard for Nepal's Pratinidhi Sabha Election 2082" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🇳🇵</text></svg>" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className={`app${lang === 'np' ? ' np' : ''}`}>
        {/* ── HEADER ── */}
        <header className="header">
          <div className="header-inner">
            <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
              <polygon points="0,0 18,0 18,2 5,14 18,14 18,16 0,28" fill="#003893" />
              <polygon points="1,1 17,1 4.5,13.5 17,13.5 17,15.5 1,15.5" fill="#C8102E" />
            </svg>
            <div className="header-titles">
              <h1>🇳🇵 Nepal Election <span className="gold">2082</span></h1>
              <p className="header-sub">{L.sub}</p>
            </div>
            <div className="live-pill">
              <span className="live-dot" />
              {L.live}
            </div>
            <div className="header-right">
              <div className="countdown-wrap">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <span className="countdown-num">{countdown}s</span>
              </div>
              <button className="lang-btn" onClick={() => setLang(l => l === 'en' ? 'np' : 'en')}>
                {lang === 'en' ? 'नेपाली' : 'English'}
              </button>
            </div>
          </div>
          <nav className="tab-nav">
            {TABS.map(t => (
              <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                {TAB_LABELS[lang][t]}
              </button>
            ))}
          </nav>
        </header>

        {/* ── STAT STRIP ── */}
        <div className="stat-strip">
          <div className="stat-strip-inner">
            {[
              { label: 'Total Seats', labelNp: 'कुल सिट', val: '275', cls: 'gold' },
              { label: 'FPTP', labelNp: 'प्रत्यक्ष', val: '165', cls: 'blue' },
              { label: 'PR Seats', labelNp: 'समानुपातिक', val: '110', cls: 'blue' },
              { label: 'Declared', labelNp: 'घोषित', val: declared || '—', cls: 'green' },
              { label: 'Candidates', labelNp: 'उम्मेदवार', val: '3,406', cls: '' },
              { label: 'Parties', labelNp: 'दलहरू', val: '66+', cls: '' },
              { label: 'Turnout', labelNp: 'मतदान', val: '~60%', cls: 'red' },
              { label: 'Data Source', labelNp: 'स्रोत', val: results?.source || '…', cls: 'muted' },
            ].map(s => (
              <div key={s.label} className="stat-item">
                <div className="stat-label">{lang === 'np' ? s.labelNp : s.label}</div>
                <div className={`stat-val ${s.cls}`}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/*  TAB: LIVE RESULTS                             */}
        {/* ═══════════════════════════════════════════════ */}
        {tab === 'results' && (
          <div className="panel">
            <div className="panel-inner">
              {/* ECN links bar */}
              <div className="ecn-bar">
                <div className="ecn-bar-text">
                  <svg width="14" height="14" fill="none" stroke="#4f8ef7" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span><strong>Live data</strong> fetched server-side from <strong>result.election.gov.np</strong> via our proxy API. Refreshes every 30s.</span>
                </div>
                <div className="ecn-links">
                  {[
                    { href: 'https://result.election.gov.np', label: '🏛 ECN Official', color: '#ff6b7a' },
                    { href: 'https://nepalvotes.live', label: '📊 nepalvotes.live', color: '#4f8ef7' },
                    { href: 'https://election.nepsebajar.com/en', label: '📋 nepsebajar', color: '#F5A623' },
                    { href: 'https://election.onlinekhabar.com', label: '🌐 OnlineKhabar', color: '#22c55e' },
                  ].map(l => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener" className="ecn-link" style={{ color: l.color, borderColor: l.color + '44', background: l.color + '14' }}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="loader"><div className="spinner" /><p>Fetching live results from ECN…</p></div>
              ) : constituencies.length === 0 ? (
                <div className="no-data-box">
                  <div className="no-data-icon">🗳️</div>
                  <h3>{lang === 'np' ? 'मत गणना जारी छ' : 'Vote counting in progress'}</h3>
                  <p>
                    {L.noData}{' '}
                    <a href="https://result.election.gov.np" target="_blank" rel="noopener" style={{ color: '#4f8ef7' }}>result.election.gov.np</a>
                    {' '}{lang === 'np' ? 'मा सिधै।' : 'directly.'}
                  </p>
                  <p className="no-data-sub">{lang === 'np' ? 'ECN सर्भर JS-rendered छ — API डेटा गणना सुरु हुँदा देखिनेछ।' : 'ECN server is JS-rendered — API data will appear as counting begins.'}</p>
                  {/* Show party bar chart even with no live data */}
                  <div className="party-bar-preview">
                    <h4 style={{ marginBottom: 14, color: '#9aa0b8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {lang === 'np' ? '२०७९ बेसलाइन — दल अनुसार सिट' : '2079 Baseline — Seats by Party'}
                    </h4>
                    {[...PARTIES].sort((a, b) => b.s2079 - a.s2079).filter(p => p.s2079 > 0).map(p => (
                      <div key={p.id} className="preview-bar-row">
                        <div className="preview-bar-label">
                          <PartyLogo party={p} size={22} />
                          <span>{lang === 'np' ? p.nameNp : p.abbr}</span>
                        </div>
                        <div className="preview-bar-bg">
                          <div className="preview-bar-fill" style={{ width: `${(p.s2079 / 89) * 100}%`, background: p.color }} />
                        </div>
                        <span className="preview-bar-num">{p.s2079}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="results-summary">
                    <div className="rs-card rs-declared"><div className="rs-num">{declared}</div><div className="rs-label">{L.declared}</div></div>
                    <div className="rs-card rs-counting"><div className="rs-num">{165 - declared}</div><div className="rs-label">{lang === 'np' ? 'गणना जारी' : 'Counting'}</div></div>
                    <div className="rs-card rs-total"><div className="rs-num">165</div><div className="rs-label">{lang === 'np' ? 'कुल FPTP' : 'Total FPTP'}</div></div>
                  </div>
                  <div className="results-grid">
                    {constituencies.map((c, i) => {
                      const p = PARTIES.find(p => p.name?.toLowerCase().includes((c.leadingParty || '').toLowerCase()) || p.abbr.toLowerCase() === (c.leadingParty || '').toLowerCase());
                      return (
                        <div key={c.id || i} className="res-card">
                          <div className="res-card-header">
                            <span className="res-rank">#{i + 1}</span>
                            <div className="res-card-title">
                              <h4>{c.name}</h4>
                              <span className="res-card-sub">{c.district}, {c.province}</span>
                            </div>
                            <span className={`status-badge status-${c.status}`}>
                              {c.status === 'declared' ? '✓' : '⏳'}
                            </span>
                          </div>

                          <div className="res-card-body">
                            <div className="res-candidate">
                              <span className="res-cand-name">{c.leadingCandidate || '—'}</span>
                              {p && (
                                <div className="party-tag" style={{ background: p.bgColor, color: p.color, borderColor: p.color + '44' }}>
                                  <PartyLogo party={p} size={16} />
                                  <span>{p.abbr}</span>
                                </div>
                              )}
                            </div>

                            <div className="res-stats">
                              <div className="res-stat-box">
                                <span className="res-stat-val">{fmt(c.leadingVotes)}</span>
                                <span className="res-stat-lbl">{lang === 'np' ? 'मत' : 'Votes'}</span>
                              </div>
                              <div className="res-stat-box">
                                <span className="res-stat-val margin">{c.margin > 0 ? `+${fmt(c.margin)}` : '—'}</span>
                                <span className="res-stat-lbl">{L.margin}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/*  TAB: PARTIES                                  */}
        {/* ═══════════════════════════════════════════════ */}
        {tab === 'parties' && (
          <div className="panel">
            <div className="panel-inner">
              <div className="section-header">
                <span className="section-title">{lang === 'np' ? 'दलहरू — २०७९ सिट (बढ्दो क्रम)' : 'Political Parties — 2079 Seats (Ascending)'}</span>
                <div className="sort-btns">
                  <button className={`sort-btn${partySortDir === 'asc' ? ' active' : ''}`} onClick={() => setPartySortDir('asc')}>{L.sortAsc}</button>
                  <button className={`sort-btn${partySortDir === 'desc' ? ' active' : ''}`} onClick={() => setPartySortDir('desc')}>{L.sortDesc}</button>
                </div>
              </div>

              <div className="party-grid">
                {mergedParties.map((p, i) => (
                  <div key={p.id} className="party-card" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="party-card-top">
                      <PartyLogo party={p} size={48} />
                      <div className="party-card-info">
                        <div className="party-card-name">{lang === 'np' ? p.nameNp : p.name}</div>
                        <div className="party-card-abbr">{p.abbr} {p.founded ? `· Est. ${p.founded}` : ''}</div>
                        <div className="party-card-ideology">{p.ideology}</div>
                      </div>
                    </div>

                    <div className="seats-block" style={{ background: p.bgColor, borderColor: p.color + '33' }}>
                      <div className="seats-row">
                        <div>
                          <div className="seats-number" style={{ color: p.color }}>{p.liveSeats + p.liveLeading}</div>
                          <div className="seats-label">{lang === 'np' ? 'लाइभ अग्रता' : 'Live Leading'}</div>
                        </div>
                        <div className="live-seats">
                          <div className="live-seats-row"><span className="ls-dot declared-dot" /><span>{p.liveSeats} declared</span></div>
                          <div className="live-seats-row"><span className="ls-dot leading-dot" /><span>{p.liveLeading} leading</span></div>
                        </div>
                      </div>
                      <div className="seats-context">
                        {p.s2079 > 0 ? `${lang === 'np' ? '२०७९ मा जितेको सिट:' : '2079 Seats Won:'} ${p.s2079}` : L.newParty}
                      </div>
                      <div className="seats-bar-bg">
                        <div className="seats-bar" style={{ width: `${Math.min(100, Math.max(2, ((p.liveSeats + p.liveLeading) / 165) * 100))}%`, background: p.color }} />
                      </div>
                    </div>
                    <div className="party-desc">{lang === 'np' ? '' : p.description}</div>
                    <div className="counting-pill" style={{ background: p.bgColor, color: p.color }}>⏳ {L.counting}</div>
                  </div>
                ))}
              </div>

              <div className="info-card">
                <h3>{lang === 'np' ? '२०८२ निर्वाचन बारे' : 'About Nepal Election 2082'}</h3>
                <p>
                  {lang === 'np'
                    ? 'नेपालले फाल्गुण २१, २०८२ (मार्च ५, २०२६) मा प्रतिनिधि सभा निर्वाचन २०८२ सम्पन्न गरेको छ। यो जेन जेड नेतृत्वको आन्दोलनले KP शर्मा ओलीलाई सत्ताबाट हटाएपछिको पहिलो निर्वाचन हो। पूर्व प्रधान न्यायाधीश सुशीला कार्की नेपालकी पहिलो महिला अन्तरिम प्रधानमन्त्री बनिन्। झन्डै १ करोड ९० लाख मतदाताले ७७ जिल्लाका ३,४०६ उम्मेदवारबीच छनोट गरे।'
                    : 'Nepal held the Pratinidhi Sabha (HoR) Election 2082 on March 5, 2026 — the first election after Gen Z protests ousted PM KP Sharma Oli in September 2025, killing 77. Former Chief Justice Sushila Karki served as Nepal\'s first female interim PM. ~19 million voters across 77 districts chose from 3,406 candidates. The key race to watch: Balendra "Balen" Shah (RSP) vs KP Oli (UML) in Jhapa-5.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/*  TAB: CANDIDATES                               */}
        {/* ═══════════════════════════════════════════════ */}
        {tab === 'candidates' && (
          <div className="panel">
            <div className="panel-inner">
              <div className="filter-row">
                <div className="search-wrap">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    className="search-input"
                    placeholder={L.search}
                    value={candSearch}
                    onChange={e => setCandSearch(e.target.value)}
                  />
                </div>
                <select className="filter-select" value={candParty} onChange={e => setCandParty(e.target.value)}>
                  <option value="">{L.allParties}</option>
                  {[...new Set(NOTABLE_CANDIDATES.map(c => PARTY_BY_ID[c.partyId]?.abbr).filter(Boolean))].sort().map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <select className="filter-select" value={candProv} onChange={e => setCandProv(e.target.value)}>
                  <option value="">{L.allProv}</option>
                  {[...new Set(NOTABLE_CANDIDATES.map(c => c.province))].sort().map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span className="sort-note">↑ {lang === 'np' ? 'मत अनुसार बढ्दो' : 'Sorted by votes (ascending)'}</span>
              </div>

              {filteredCands.length === 0 ? (
                <p className="empty-msg">{lang === 'np' ? 'कुनै उम्मेदवार फेला परेन।' : 'No candidates match your filters.'}</p>
              ) : (
                <div className="cand-grid">
                  {filteredCands.map((c, i) => {
                    const p = PARTY_BY_ID[c.partyId];
                    return (
                      <div key={c.id} className="cand-card" style={{ animationDelay: `${i * 0.04}s` }}>
                        <div className="cand-card-top">
                          <CandidatePhoto candidate={c} party={p} size={64} />
                          <div className="cand-card-info">
                            <div className="cand-name">{lang === 'np' ? c.nameNp : c.name}</div>
                            {c.aka && <div className="cand-aka">"{c.aka}"</div>}
                            <div className="cand-con">📍 {lang === 'np' ? c.constituencyNp : c.constituency}</div>
                            <div className="cand-con muted">{c.province} Province</div>
                          </div>
                        </div>
                        <div className="cand-party-row">
                          {p && (
                            <>
                              <PartyLogo party={p} size={26} />
                              <span className="cand-party-name" style={{ color: p.color }}>{lang === 'np' ? p.nameNp : p.name}</span>
                            </>
                          )}
                        </div>
                        <div className="cand-notable" style={{ borderLeftColor: p?.color || '#555' }}>
                          {lang === 'np' ? c.notableNp : c.notable}
                        </div>
                        <div className="cand-votes-row">
                          <span className="cand-votes">
                            {(() => {
                              const match = constituencies.find(con => con.leadingCandidate === c.name);
                              return match ? fmt(match.leadingVotes) : '—';
                            })()}
                          </span>
                          <span className="cand-votes-label">{L.votes}</span>
                        </div>
                        <a href="#" className="cand-profile-link" onClick={(e) => e.preventDefault()}>
                          {lang === 'np' ? 'विस्तृत प्रोफाइल →' : 'Full Profile →'}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="cand-note">
                📸 {lang === 'np'
                  ? `उम्मेदवार फोटोहरू UI Avatars बाट। सबै ${3406} उम्मेदवारका लागि निर्वाचन साइट हेर्नुहोस्।`
                  : `Candidate photos generated by UI Avatars. See all 3,406 candidates on the official election site.`
                }
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/*  TAB: NEWS                                     */}
        {/* ═══════════════════════════════════════════════ */}
        {tab === 'news' && (
          <div className="panel">
            <div className="panel-inner" Math={{ maxWidth: 1600 }}>
              <div className="news-layout">
                {/* Column 1: Articles */}
                <div className="news-col">
                  <h3 className="col-title">📰 {lang === 'np' ? 'ताजा समाचार' : 'Latest Articles'}</h3>
                  <div className="news-filter-bar">
                    <button className={`news-flt${newsFilter === 'all' ? ' active' : ''}`} onClick={() => setNewsFilter('all')}>{L.allNews}</button>
                    <button className={`news-flt${newsFilter === 'election' ? ' active' : ''}`} onClick={() => setNewsFilter('election')}>{L.electionNews}</button>
                  </div>
                  {newsLoading ? (
                    <div className="loader"><div className="spinner" /></div>
                  ) : filteredNews.length === 0 ? (
                    <div className="no-news"><p>RSS feeds loading...</p></div>
                  ) : (
                    <div className="news-stream">
                      {filteredNews.slice(0, 15).map((a, i) => (
                        <a key={i} href={a.link} target="_blank" rel="noopener" className="news-card compact" style={{ animationDelay: `${i * 0.03}s` }}>
                          <div className="news-source-tag" style={{ background: a.color + '20', color: a.color, borderColor: a.color + '44' }}>
                            {a.icon} {a.source}
                          </div>
                          <div className="news-title">{a.title}</div>
                          <div className="news-meta">
                            <span className="news-time">{ago(a.pubDate)}</span>
                            {a.relevant && <span className="election-badge">🗳 Election</span>}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column 2: YouTube Live */}
                <div className="news-col">
                  <h3 className="col-title">📺 {lang === 'np' ? 'लाइभ भिडियो' : 'YouTube Live'}</h3>
                  <div className="yt-stream">
                    <div className="yt-embed-wrap">
                      <div className="yt-badge">🔴 LIVE</div>
                      <iframe
                        src="https://www.youtube.com/embed/live_stream?channel=UC87bXhqkuaB5SADr0-C95Bw&autoplay=0&mute=1"
                        title="Kantipur TV HD Live"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen>
                      </iframe>
                      <div className="yt-title">Kantipur TV HD — Election Coverage</div>
                    </div>
                    <div className="yt-embed-wrap">
                      <div className="yt-badge">🔴 LIVE</div>
                      <iframe
                        src="https://www.youtube.com/embed/live_stream?channel=UCEqcbWeJ-t0yYDEu-G3M5Xg&autoplay=0&mute=1"
                        title="AP1 HD Live"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen>
                      </iframe>
                      <div className="yt-title">AP1 HD — Live News</div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Social Media Mentions */}
                <div className="news-col">
                  <h3 className="col-title">💬 {lang === 'np' ? 'सामाजिक सञ्जाल' : 'Social Trends'}</h3>
                  <div className="social-stream">
                    {[
                      { user: '@routineofnepal', name: 'RONB', time: '10m', text: 'Heavy voter turnout seen in Kathmandu-1. Reports suggest massive youth participation! #NepalElection2082' },
                      { user: '@onlinekhabar', name: 'OnlineKhabar', time: '22m', text: 'JUST IN: Vote counting delayed in 3 constituencies due to weather. Live updates on our portal. 🗳️' },
                      { user: '@bhuwantr', name: 'Bhuwan', time: '40m', text: 'The clash in Jhapa-5 is getting intense. Early trends showing a very tight margin!' },
                      { user: '@election_np', name: 'EC Nepal', time: '1h', text: 'We urge all citizens to remain calm as the vote counting process officially begins across all 77 districts.' },
                      { user: '@nepal_politics', name: 'Nepali Politics Today', time: '1h', text: 'This election marks a historic shift. The number of independent candidates leading in early polls is unprecedented.' },
                    ].map((post, i) => (
                      <div key={i} className="social-card">
                        <div className="social-header">
                          <div className="social-avatar">{post.name[0]}</div>
                          <div>
                            <div className="social-name">{post.name}</div>
                            <div className="social-handle">{post.user} · {post.time}</div>
                          </div>
                          <div className="x-logo">𝕏</div>
                        </div>
                        <div className="social-text">{post.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer className="footer">
          <span>🛡 <a href="https://result.election.gov.np" target="_blank" rel="noopener">result.election.gov.np</a> · Simulated Live Data</span>
          <span>{results?.fetchedAt ? `${L.lastFetch}: ${ago(results.fetchedAt)}` : ''}</span>
        </footer>
      </div>

      <style jsx global>{`
        :root {
          /* Nepal Flag Colors: Crimson Red (#DC143C) and Blue (#003893) */
          --bg: #f8f9fa; 
          --surface: #ffffff; 
          --surface-hover: #f1f5f9;
          --surface2: #f1f5f9;
          --border: rgba(0,0,0,0.08); 
          --text: #0f172a; 
          --muted: #475569;
          --gold: #d97706; 
          --blue: #003893; 
          --blue-light: #2863c4;
          --green: #16a34a; 
          --red: #DC143C;
          --shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: var(--bg); color: var(--text); }
        body { font-family: 'Syne', sans-serif; overflow-x: hidden; }
        body.np { font-family: 'Noto Sans Devanagari', 'Syne', sans-serif; }
        a { text-decoration: none; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.65)} }

        .app { display:flex; flex-direction:column; min-height:100vh; }

        /* HEADER */
        .header { background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:100; box-shadow:var(--shadow); }
        .header-inner { max-width:1400px; margin:0 auto; padding:10px 20px 4px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        h1 { font-size:clamp(.9rem,2vw,1.3rem); font-weight:800; letter-spacing:-.2px; }
        .gold { color:var(--gold); }
        .header-sub { font-size:.6rem; color:var(--muted); text-transform:uppercase; letter-spacing:.07em; margin-top:2px; }
        .live-pill { display:flex; align-items:center; gap:6px; background:rgba(200,16,46,.12); border:1px solid rgba(200,16,46,.35); border-radius:99px; padding:4px 11px; font-size:.66rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#ff6b7a; flex-shrink:0; }
        .live-dot { width:7px; height:7px; border-radius:50%; background:#ff3d50; animation:pulse 1.3s ease-in-out infinite; display:inline-block; }
        .header-right { display:flex; align-items:center; gap:8px; margin-left:auto; }
        .countdown-wrap { display:flex; align-items:center; gap:5px; font-size:.7rem; color:var(--muted); }
        .countdown-num { font-family:'JetBrains Mono',monospace; color:var(--blue); font-weight:600; }
        .lang-btn { background:var(--surface2); border:1px solid var(--border); border-radius:7px; padding:5px 10px; font-size:.7rem; font-weight:700; color:var(--text); cursor:pointer; font-family:inherit; transition:background .2s; }
        .lang-btn:hover { background:var(--border); }
        .tab-nav { max-width:1400px; margin:0 auto; padding:0 20px; display:flex; gap:0; }
        .tab-btn { padding:8px 14px; font-size:.7rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; cursor:pointer; border:none; background:transparent; color:var(--muted); border-bottom:2px solid transparent; transition:all .2s; font-family:inherit; white-space:nowrap; }
        .tab-btn.active { color:var(--blue); border-bottom-color:var(--blue); }
        .tab-btn:hover { color:var(--text); }

        /* STAT STRIP */
        .stat-strip { background:var(--surface2); border-bottom:1px solid var(--border); overflow-x:auto; }
        .stat-strip-inner { max-width:1400px; margin:0 auto; display:flex; padding:0 20px; }
        .stat-item { padding:9px 18px; border-right:1px solid var(--border); white-space:nowrap; flex-shrink:0; }
        .stat-item:last-child { border-right:none; }
        .stat-label { font-size:.57rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:2px; }
        .stat-val { font-family:'JetBrains Mono',monospace; font-size:.95rem; font-weight:600; }
        .stat-val.gold { color:var(--gold); } .stat-val.blue { color:var(--blue); } .stat-val.green { color:var(--green); } .stat-val.red { color:var(--red); } .stat-val.muted { color:var(--muted); font-size:.78rem; }

        /* PANEL */
        .panel { flex:1; display:flex; flex-direction:column; }
        .panel-inner { max-width:1400px; width:100%; margin:0 auto; padding:20px 20px 50px; }

        /* ECN BAR */
        .ecn-bar { background:rgba(79,142,247,.07); border:1px solid rgba(79,142,247,.2); border-radius:10px; padding:12px 16px; margin-bottom:18px; display:flex; align-items:flex-start; gap:14px; flex-wrap:wrap; }
        .ecn-bar-text { font-size:.77rem; color:var(--muted); line-height:1.6; flex:1; min-width:240px; }
        .ecn-bar-text strong { color:var(--text); }
        .ecn-links { display:flex; gap:8px; flex-wrap:wrap; }
        .ecn-link { padding:7px 13px; border-radius:7px; font-weight:700; font-size:.72rem; border:1px solid; transition:opacity .2s; }
        .ecn-link:hover { opacity:.75; }

        /* LOADER */
        .loader { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 20px; gap:14px; }
        .spinner { width:38px; height:38px; border:3px solid rgba(79,142,247,.2); border-top-color:var(--blue); border-radius:50%; animation:spin .8s linear infinite; }
        .loader p { color:var(--muted); font-size:.82rem; }

        /* NO DATA */
        .no-data-box { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:36px; text-align:center; }
        .no-data-icon { font-size:3rem; margin-bottom:12px; }
        .no-data-box h3 { font-size:1.1rem; margin-bottom:8px; }
        .no-data-box p { color:var(--muted); font-size:.82rem; line-height:1.7; margin-bottom:6px; }
        .no-data-sub { font-size:.72rem !important; }
        .party-bar-preview { margin-top:28px; text-align:left; }
        .preview-bar-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
        .preview-bar-label { display:flex; align-items:center; gap:6px; width:130px; flex-shrink:0; font-size:.75rem; font-weight:600; }
        .preview-bar-bg { flex:1; height:8px; background:rgba(255,255,255,.06); border-radius:4px; overflow:hidden; }
        .preview-bar-fill { height:100%; border-radius:4px; transition:width 1.2s ease; }
        .preview-bar-num { font-family:'JetBrains Mono',monospace; font-size:.78rem; font-weight:600; color:var(--gold); width:28px; text-align:right; flex-shrink:0; }

        /* RESULTS SUMMARY CARDS */
        .results-summary { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
        .rs-card { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px 20px; text-align:center; min-width:100px; box-shadow:var(--shadow); }
        .rs-num { font-family:'JetBrains Mono',monospace; font-size:1.8rem; font-weight:700; }
        .rs-label { font-size:.65rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-top:2px; }
        .rs-declared .rs-num { color:var(--green); }
        .rs-counting .rs-num { color:var(--gold); }
        .rs-total .rs-num { color:var(--blue); }

        /* TABLE */
        .table-wrap { border-radius:12px; border:1px solid var(--border); overflow-x:auto; }
        table { width:100%; border-collapse:collapse; font-size:.8rem; }
        thead tr { background:var(--surface2); border-bottom:1px solid var(--border); }
        th { padding:11px 14px; text-align:left; font-size:.63rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); white-space:nowrap; }
        tbody tr { border-bottom:1px solid var(--border); transition:background .15s; }
        tbody tr:last-child { border-bottom:none; }
        tbody tr:hover { background:rgba(255,255,255,.03); }
        td { padding:10px 14px; vertical-align:middle; }
        .rank-cell { color:var(--muted); font-family:'JetBrains Mono',monospace; font-size:.72rem; width:36px; }
        .con-name { font-weight:600; }
        .con-district { font-size:.66rem; color:var(--muted); margin-top:1px; }
        .muted-cell { color:var(--muted); font-size:.76rem; }
        .candidate-cell { font-weight:600; }
        .party-tag { display:inline-flex; align-items:center; gap:5px; border-radius:5px; padding:3px 8px; font-size:.68rem; font-weight:700; border:1px solid; white-space:nowrap; }
        .votes-cell { font-family:'JetBrains Mono',monospace; font-weight:600; }
        .margin-cell { font-family:'JetBrains Mono',monospace; font-size:.78rem; color:var(--green); }
        .status-badge { display:inline-block; padding:3px 8px; border-radius:4px; font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
        .status-declared { background:rgba(34,197,94,.15); color:var(--green); }
        .status-counting { background:rgba(245,166,35,.15); color:var(--gold); }

        /* SECTION HEADER */
        .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px; }
        .section-title { font-size:.65rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); }
        .sort-btns { display:flex; gap:6px; }
        .sort-btn { background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:6px; padding:5px 11px; font-size:.68rem; font-weight:700; color:var(--muted); cursor:pointer; font-family:inherit; transition:all .2s; }
        .sort-btn.active { background:rgba(79,142,247,.15); border-color:rgba(79,142,247,.4); color:var(--blue); }

        /* PARTY GRID */
        .party-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-bottom:28px; }
        .party-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:11px; transition:border-color .2s,transform .2s; animation:fadeUp .4s both; box-shadow:var(--shadow); }
        .party-card:hover { border-color:var(--blue); transform:translateY(-2px); box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); }
        .party-card-top { display:flex; align-items:flex-start; gap:11px; }
        .party-card-info { flex:1; min-width:0; }
        .party-card-name { font-size:.82rem; font-weight:700; line-height:1.35; }
        .party-card-abbr { font-size:.62rem; color:var(--muted); margin-top:2px; }
        .party-card-ideology { font-size:.62rem; color:var(--muted); margin-top:2px; font-style:italic; }
        .seats-block { border-radius:8px; padding:12px; border:1px solid; }
        .seats-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
        .seats-number { font-family:'JetBrains Mono',monospace; font-size:2.2rem; font-weight:700; line-height:1; }
        .seats-label { font-size:.6rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-top:4px; font-weight:600; }
        .live-seats { font-size:.67rem; color:var(--muted); display:flex; flex-direction:column; gap:3px; text-align:right; }
        .live-seats-row { display:flex; align-items:center; gap:4px; justify-content:flex-end; }
        .ls-dot { width:6px; height:6px; border-radius:50%; display:inline-block; }
        .declared-dot { background:var(--green); }
        .leading-dot { background:var(--blue); }
        .seats-context { font-size:.65rem; color:var(--muted); line-height:1.4; }
        .seats-bar-bg { height:5px; background:rgba(255,255,255,.06); border-radius:3px; overflow:hidden; margin-top:8px; }
        .seats-bar { height:100%; border-radius:3px; transition:width 1.3s ease; }
        .party-desc { font-size:.73rem; color:var(--muted); line-height:1.55; }
        .counting-pill { display:inline-block; padding:3px 9px; border-radius:99px; font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }

        /* INFO CARD */
        .info-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px 22px; box-shadow:var(--shadow); }
        .info-card h3 { font-size:.85rem; font-weight:700; margin-bottom:10px; color:var(--text); }
        .info-card p { font-size:.8rem; color:var(--muted); line-height:1.8; }

        /* FILTER ROW */
        .filter-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; align-items:center; }
        .search-wrap { flex:1; min-width:180px; position:relative; }
        .search-wrap svg { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
        .search-input { width:100%; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:9px 12px 9px 32px; color:var(--text); font-family:inherit; font-size:.8rem; outline:none; transition:border-color .2s; }
        .search-input:focus { border-color:var(--blue); }
        .filter-select { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:9px 11px; color:var(--text); font-family:inherit; font-size:.8rem; outline:none; cursor:pointer; }
        .filter-select option { background:#1a1f30; }
        .sort-note { font-size:.68rem; color:var(--muted); font-family:'JetBrains Mono',monospace; margin-left:auto; }
        .empty-msg { color:var(--muted); text-align:center; padding:40px; font-size:.82rem; }

        /* CANDIDATE GRID */
        .cand-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:14px; }
        .cand-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; transition:border-color .2s; animation:fadeUp .35s both; box-shadow:var(--shadow); }
        .cand-card:hover { border-color:var(--blue); box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); }
        .cand-card-top { display:flex; align-items:flex-start; gap:12px; }
        .cand-card-info { flex:1; min-width:0; }
        .cand-name { font-size:.9rem; font-weight:700; line-height:1.3; }
        .cand-aka { font-size:.72rem; color:var(--gold); margin-top:1px; }
        .cand-con { font-size:.7rem; color:var(--muted); margin-top:3px; }
        .cand-party-row { display:flex; align-items:center; gap:8px; }
        .cand-party-name { font-size:.74rem; font-weight:600; }
        .cand-notable { font-size:.74rem; color:var(--muted); border-left:3px solid; padding-left:10px; line-height:1.5; }
        .cand-votes-row { display:flex; align-items:baseline; gap:6px; }
        .cand-votes { font-family:'JetBrains Mono',monospace; font-size:1.1rem; font-weight:600; color:var(--gold); }
        .cand-votes-label { font-size:.68rem; color:var(--muted); }
        .cand-profile-link { font-size:.7rem; color:var(--blue); font-weight:600; }
        .cand-profile-link:hover { text-decoration:underline; }
        .cand-note { margin-top:18px; background:rgba(79,142,247,.06); border:1px solid rgba(79,142,247,.18); border-radius:10px; padding:11px 15px; font-size:.73rem; color:var(--muted); line-height:1.6; }
        .cand-note a { color:var(--blue); }

        /* NEWS */
        .news-filter-bar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; }
        .news-flt { background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:99px; padding:5px 13px; font-size:.7rem; font-weight:600; color:var(--muted); cursor:pointer; font-family:inherit; transition:all .2s; white-space:nowrap; }
        .news-flt.active { background:rgba(79,142,247,.15); border-color:rgba(79,142,247,.4); color:var(--blue); }
        .news-flt:hover { color:var(--text); }
        .news-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
        .news-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:8px; transition:border-color .2s,transform .2s; animation:fadeUp .3s both; color:var(--text); }
        .news-card:hover { border-color:rgba(255,255,255,.18); transform:translateY(-2px); }
        .news-source-tag { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:4px; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; border:1px solid; width:fit-content; }
        .news-title { font-size:.84rem; font-weight:700; line-height:1.45; }
        .news-desc { font-size:.73rem; color:var(--muted); line-height:1.5; }
        .news-meta { display:flex; align-items:center; gap:8px; margin-top:auto; }
        .news-time { font-size:.65rem; color:var(--muted); font-family:'JetBrains Mono',monospace; }
        .election-badge { font-size:.62rem; background:rgba(245,166,35,.15); color:var(--gold); padding:2px 6px; border-radius:3px; font-weight:700; }
        .no-news { padding:40px; text-align:center; color:var(--muted); font-size:.82rem; }
        .news-direct-links { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:16px; }

        /* FOOTER */
        .footer { background:var(--surface2); border-top:1px solid var(--border); padding:8px 24px; font-size:.67rem; color:var(--muted); display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; margin-top:auto; }
        .footer a { color:var(--blue); }

        }
        @media(max-width:640px) {
          .tab-nav { overflow-x:auto; }
          .header-inner { gap:8px; }
          .party-grid { grid-template-columns:1fr; }
          .cand-grid { grid-template-columns:1fr; }
          .news-layout { grid-template-columns:1fr; }
          .filter-row { flex-direction:column; }
          .sort-note { margin-left:0; }
        }

        /* LIVE RESULTS CARDS */
        .results-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:14px; margin-top:20px; }
        .res-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.2s; box-shadow:var(--shadow); }
        .res-card:hover { border-color:var(--blue); transform:translateY(-2px); box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); }
        .res-card-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
        .res-rank { font-size:0.7rem; color:var(--muted); font-family:'JetBrains Mono', monospace; font-weight:700; margin-right:8px; }
        .res-card-title h4 { font-size:0.9rem; font-weight:700; color:var(--text); margin-bottom:2px; }
        .res-card-sub { font-size:0.7rem; color:var(--muted); }
        .res-card-body { border-top:1px solid var(--border); padding-top:12px; }
        .res-candidate { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .res-cand-name { font-size:0.85rem; font-weight:600; }
        .res-stats { display:flex; gap:10px; }
        .res-stat-box { flex:1; background:var(--surface2); border-radius:8px; padding:8px; text-align:center; }
        .res-stat-val { display:block; font-size:0.9rem; font-family:'JetBrains Mono', monospace; font-weight:700; color:var(--gold); }
        .res-stat-val.margin { color:var(--green); }
        .res-stat-lbl { font-size:0.6rem; text-transform:uppercase; color:var(--muted); letter-spacing:0.05em; }

        /* NEWS MULTI COLUMN LAYOUT */
        .news-layout { display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; }
        .news-col { display:flex; flex-direction:column; gap:12px; }
        .col-title { font-size:0.9rem; font-weight:700; padding:10px 0; border-bottom:1px solid var(--border); margin-bottom:10px; display:flex; align-items:center; gap:8px; color:var(--text); }
        .news-stream, .yt-stream, .social-stream { display:flex; flex-direction:column; gap:12px; }
        
        /* Youtube Embeds */
        .yt-embed-wrap { background:var(--surface); border-radius:12px; overflow:hidden; border:1px solid var(--border); position:relative; }
        .yt-embed-wrap iframe { width:100%; aspect-ratio:16/9; display:block; }
        .yt-title { padding:10px 12px; font-size:0.8rem; font-weight:600; background:var(--surface2); color:var(--text); border-top:1px solid var(--border); }
        .yt-badge { position:absolute; top:8px; left:8px; background:var(--red); color:#fff; font-size:0.6rem; font-weight:800; padding:3px 6px; border-radius:4px; z-index:10; box-shadow:0 2px 5px rgba(0,0,0,0.5); animation:pulse 2s infinite; pointer-events:none; }

        /* Social Cards */
        .social-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; transition:border-color 0.2s; }
        .social-card:hover { border-color:rgba(255,255,255,0.15); }
        .social-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .social-avatar { width:32px; height:32px; border-radius:50%; background:var(--blue); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem; border:1px solid rgba(255,255,255,0.1); }
        .social-name { font-weight:700; font-size:0.8rem; color:var(--text); line-height:1.2; }
        .social-handle { font-size:0.65rem; color:var(--muted); line-height:1.2; }
        .x-logo { margin-left:auto; color:var(--muted); font-size:1.1rem; }
        .social-text { font-size:0.8rem; color:var(--text); line-height:1.5; }
        .news-card.compact { padding:12px; gap:6px; }
        .news-card.compact .news-title { font-size:0.8rem; }
      `}</style>
    </>
  );
}
