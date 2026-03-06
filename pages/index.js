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
  np: { results: '📊 नतिजा', parties: '🏛 दलहरू', candidates: '👤 उम्मेदवार', news: '📰 समाचार' }
};

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
  const [selectedCand, setSelectedCand] = useState(null);
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
    noData: 'Vote counting in progress — no official data yet.',
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
    noData: 'मत गणना जारी छ — अहिले आधिकारिक डेटा छैन।',
    allNews: 'सबै',
    electionNews: 'निर्वाचन',
  };

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

  const liveParties = results?.parties || [];
  const mergedParties = PARTIES.map(p => {
    const live = liveParties.find(lp => lp.abbr === p.abbr);
    return { ...p, liveSeats: live?.seats || 0, liveLeading: live?.leading || 0, totalCandidates: live?.totalCandidates || 0 };
  }).sort((a, b) => partySortDir === 'asc' ? a.s2079 - b.s2079 : b.s2079 - a.s2079);

  const filteredCands = NOTABLE_CANDIDATES.filter(c => {
    const q = candSearch.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !c.nameNp.includes(q) && !c.constituency.toLowerCase().includes(q)) return false;
    if (candParty && PARTY_BY_ID[c.partyId]?.abbr !== candParty) return false;
    if (candProv && c.province !== candProv) return false;
    return true;
  });

  const [resSort, setResSort] = useState('serial');
  const constituencies = (results?.constituencies || []).sort((a, b) => {
    if (resSort === 'serial') {
      const dCmp = a.district.localeCompare(b.district);
      if (dCmp !== 0) return dCmp;
      const numA = parseInt(a.name.split('-')[1]) || 0;
      const numB = parseInt(b.name.split('-')[1]) || 0;
      return numA - numB;
    }
    if (resSort === 'margin') return b.margin - a.margin;
    return b.leadingVotes - a.leadingVotes;
  });

  const declared = constituencies.filter(c => c.status === 'declared').length;

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
        <meta name="description" content="Live Nepal Election 2082 results." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🇳🇵</text></svg>" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className={`app${lang === 'np' ? ' np' : ''}`}>
        <header className="header">
          <div className="header-inner">
            <div className="header-logo">
              <h1>NEPAL <span className="gold">ELECTION</span> 2082</h1>
              <div className="header-sub">{L.sub}</div>
            </div>
            <div className="live-pill">
              <span className="live-dot" /> {L.live}
            </div>
            <div className="header-right">
              <div className="countdown-wrap">
                <span className="countdown-num">{countdown}s</span>
              </div>
              <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'np' : 'en')}>
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

        <div className="stat-strip">
          <div className="stat-strip-inner">
            <div className="stat-item"><div className="stat-label">NC</div><div className="stat-val blue">{liveParties.find(p => p.abbr === 'NC')?.seats || 0}</div></div>
            <div className="stat-item"><div className="stat-label">UML</div><div className="stat-val red">{liveParties.find(p => p.abbr === 'CPN-UML')?.seats || 0}</div></div>
            <div className="stat-item"><div className="stat-label">RSP</div><div className="stat-val blue">{liveParties.find(p => p.abbr === 'RSP')?.seats || 0}</div></div>
            <div className="stat-item"><div className="stat-label">MAOIST</div><div className="stat-val red">{liveParties.find(p => p.abbr === 'Maoist-C')?.seats || 0}</div></div>
          </div>
        </div>

        <main className="panel">
          <div className="panel-inner">
            {loading ? (
              <div className="loader"><div className="spinner" /></div>
            ) : results && tab === 'results' ? (
              <>
                <div className="results-summary">
                  <div className="rs-card rs-declared"><div className="rs-num">{declared}</div><div className="rs-label">{L.declared}</div></div>
                  <div className="rs-card rs-counting"><div className="rs-num">{165 - declared}</div><div className="rs-label">{lang === 'np' ? 'गणना जारी' : 'Counting'}</div></div>
                  <div className="rs-card rs-total"><div className="rs-num">165</div><div className="rs-label">Total FPTP</div></div>
                </div>

                <div className="section-header">
                  <span className="section-title">{lang === 'np' ? 'मत परिणाम - समूह' : 'Live Results — Grouped View'}</span>
                  <div className="sort-box">
                    <label>{lang === 'np' ? 'क्रम:' : 'Sort:'}</label>
                    <select value={resSort} onChange={e => setResSort(e.target.value)}>
                      <option value="serial">{lang === 'np' ? 'जिल्ला' : 'District/Serial'}</option>
                      <option value="margin">{lang === 'np' ? 'अन्तर' : 'Margin'}</option>
                      <option value="votes">{lang === 'np' ? 'मत' : 'Votes'}</option>
                    </select>
                  </div>
                </div>

                <div className="results-grid">
                  {constituencies.map((c, i) => (
                    <div key={c.id || i} className="res-card" style={{ animationDelay: `${i * 0.02}s` }}>
                      <div className="res-card-header">
                        <div className="res-card-title-wrap">
                          <div className="res-card-title">
                            <h4>{lang === 'np' ? c.nameNp : c.name}</h4>
                            <span className="res-card-sub">{lang === 'np' ? c.districtNp : c.district}, {lang === 'np' ? c.provinceNp : c.province}</span>
                          </div>
                          {['Jhapa-5', 'Kathmandu-1', 'Banke-2', 'Taplejung-1'].includes(c.name) && (
                            <div className="verified-badge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                              <span>VERIFIED</span>
                            </div>
                          )}
                        </div>
                        <span className={`status-badge status-${c.status}`}>
                          {c.status === 'declared' ? '✓' : '⏳'}
                        </span>
                      </div>

                      <div className="res-card-body">
                        <div className="res-cand-list">
                          {(c.candidates || []).map((cand, idx) => {
                            const candParty = PARTIES.find(p => p.abbr === cand.party);
                            return (
                              <div key={idx} className={`res-cand-row ${idx === 0 ? 'winner' : ''}`}>
                                <div className="res-cand-rank">{idx + 1}</div>
                                <div className="res-cand-main">
                                  <div className="res-cand-name-group">
                                    <div className="res-cand-name">{lang === 'np' ? cand.nameNp : cand.name}</div>
                                    <div className="res-cand-party-abbr">{cand.party}</div>
                                  </div>
                                  <div className="res-cand-votes">
                                    <span className="res-vote-num">{fmt(cand.votes)}</span>
                                    <span className="res-vote-lbl">{L.votes}</span>
                                  </div>
                                </div>
                                {candParty && <div className="res-cand-logo"><PartyLogo party={candParty} size={20} /></div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="res-card-footer">
                        <div className="res-margin-box">
                          <span className="label text-muted">{L.margin}:</span>
                          <span className="val text-green">+{fmt(c.margin)}</span>
                        </div>
                        <div className="res-total-box">
                          <span className="val">{fmt((c.candidates || []).reduce((acc, curr) => acc + curr.votes, 0))}</span>
                          <span className="label">{lang === 'np' ? 'कुल मत' : 'Total'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : tab === 'parties' ? (
              <div className="panel-inner">
                <div className="section-header">
                  <span className="section-title">{lang === 'np' ? 'दलहरूको स्थिति' : 'Political Parties Status'}</span>
                  <div className="sort-btns">
                    <button className={`sort-btn${partySortDir === 'asc' ? ' active' : ''}`} onClick={() => setPartySortDir('asc')}>{L.sortAsc}</button>
                    <button className={`sort-btn${partySortDir === 'desc' ? ' active' : ''}`} onClick={() => setPartySortDir('desc')}>{L.sortDesc}</button>
                  </div>
                </div>
                <div className="party-grid">
                  {mergedParties.map((p, i) => (
                    <div key={p.id} className="party-card">
                      <div className="party-card-top">
                        <PartyLogo party={p} size={48} />
                        <div className="party-card-info">
                          <div className="party-card-name">{lang === 'np' ? p.nameNp : p.name}</div>
                          <div className="party-card-abbr">{p.abbr}</div>
                        </div>
                      </div>
                      <div className="seats-block" style={{ background: p.bgColor, borderColor: p.color + '33' }}>
                        <div className="party-stats-grid">
                          <div className="ps-item">
                            <div className="ps-val" style={{ color: p.color }}>{p.totalCandidates}</div>
                            <div className="ps-lbl">{lang === 'np' ? 'उम्मेदवार' : 'Candidates'}</div>
                          </div>
                          <div className="ps-item">
                            <div className="ps-val" style={{ color: p.color }}>{p.liveSeats}</div>
                            <div className="ps-lbl">{lang === 'np' ? 'विजेता' : 'Winners'}</div>
                          </div>
                          <div className="ps-item">
                            <div className="ps-val" style={{ color: p.color }}>{p.liveLeading}</div>
                            <div className="ps-lbl">{lang === 'np' ? 'अग्रता' : 'Leading'}</div>
                          </div>
                        </div>
                        <div className="seats-bar-bg">
                          <div className="seats-bar" style={{ width: `${Math.min(100, ((p.liveSeats + p.liveLeading) / 165) * 100)}%`, background: p.color }} />
                        </div>
                      </div>
                      <div className="party-desc">{lang === 'np' ? '' : p.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : tab === 'candidates' ? (
              <div className="panel-inner">
                <div className="filter-row">
                  <div className="search-wrap">
                    <input type="text" className="search-input" placeholder={L.search} value={candSearch} onChange={e => setCandSearch(e.target.value)} />
                  </div>
                  <select className="filter-select" value={candParty} onChange={e => setCandParty(e.target.value)}>
                    <option value="">{L.allParties}</option>
                    {[...new Set(NOTABLE_CANDIDATES.map(c => PARTY_BY_ID[c.partyId]?.abbr).filter(Boolean))].sort().map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {!candSearch && !candParty && !candProv && (
                  <div className="trending-section">
                    <h3 className="trending-title">🔥 {lang === 'np' ? 'ट्रेन्डिङ उम्मेदवार' : 'Trending Candidates'}</h3>
                    <div className="trending-grid">
                      {NOTABLE_CANDIDATES.map(c => {
                        const p = PARTY_BY_ID[c.partyId];
                        const con = constituencies.find(con => con.name === c.constituency);
                        const candData = con?.candidates?.find(can => can.name === c.name);
                        return (
                          <div key={c.id} className="trending-card" onClick={() => setSelectedCand(c)}>
                            <div className="trending-photo-wrap">
                              <CandidatePhoto candidate={c} party={p} size={70} />
                              <div className="trending-party-small"><PartyLogo party={p} size={20} /></div>
                            </div>
                            <div className="trending-info">
                              <div className="trending-name">{lang === 'np' ? c.nameNp : c.name}</div>
                              <div className="trending-votes">
                                <span className="t-vote-val">{candData ? fmt(candData.votes) : '—'}</span>
                                <span className="t-vote-lbl">{L.votes}</span>
                              </div>
                              <div className="trending-loc">{lang === 'np' ? c.constituencyNp : c.constituency}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <h3 className="section-subtitle">{lang === 'np' ? 'सबै उम्मेदवारहरू' : 'All Notables'}</h3>
                <div className="cand-list">
                  {filteredCands.map((c, i) => {
                    const con = constituencies.find(con => con.name === c.constituency);
                    const candData = con?.candidates?.find(can => can.name === c.name);
                    return (
                      <div key={c.id} className="cand-row-card" onClick={() => setSelectedCand(c)}>
                        <div className="cand-row-main">
                          <CandidatePhoto candidate={c} party={PARTY_BY_ID[c.partyId]} size={48} />
                          <div className="cand-row-names">
                            <div className="cand-name-primary">{lang === 'np' ? c.nameNp : c.name}</div>
                            <div className="cand-row-party">{PARTY_BY_ID[c.partyId]?.abbr} · {lang === 'np' ? c.constituencyNp : c.constituency}</div>
                          </div>
                        </div>
                        <div className="cand-row-votes">
                          <span className="cand-vote-val">{candData ? fmt(candData.votes) : '—'}</span>
                          <span className="cand-vote-lbl">{L.votes}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : tab === 'news' ? (
              <div className="panel-inner">
                <div className="news-layout">
                  <div className="news-col">
                    <h3 className="col-title">📰 {lang === 'np' ? 'ताजा समाचार' : 'Latest Articles'}</h3>
                    <div className="news-stream">
                      {allArticles.slice(0, 10).map((a, i) => (
                        <a key={i} href={a.link} target="_blank" rel="noopener" className="news-card compact">
                          <div className="news-source-tag" style={{ color: a.color }}>{a.source}</div>
                          <div className="news-title">{a.title}</div>
                          <div className="news-meta"><span className="news-time">{ago(a.pubDate)}</span></div>
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="news-col">
                    <h3 className="col-title">📺 {lang === 'np' ? 'भिडियो लाइभ' : 'YouTube Live'}</h3>
                    <div className="yt-embed-wrap">
                      <div className="yt-badge">LIVE</div>
                      <iframe src="https://www.youtube.com/embed/live_stream?channel=UC87bXhqkuaB5SADr0-C95Bw&autoplay=0&mute=1" frameBorder="0" allowFullScreen></iframe>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>

        {selectedCand && (
          <div className="modal-overlay" onClick={() => setSelectedCand(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedCand(null)}>×</button>
              <div className="modal-header-top">
                <CandidatePhoto candidate={selectedCand} party={PARTY_BY_ID[selectedCand.partyId]} size={90} />
                <div className="modal-title-wrap">
                  <h2>{lang === 'np' ? selectedCand.nameNp : selectedCand.name}</h2>
                  <div className="modal-party-row">
                    <PartyLogo party={PARTY_BY_ID[selectedCand.partyId]} size={24} />
                    <span>{PARTY_BY_ID[selectedCand.partyId]?.name}</span>
                  </div>
                </div>
              </div>
              <div className="modal-grid">
                <div className="modal-stat-box"><label>Province</label><div>{selectedCand.province}</div></div>
                <div className="modal-stat-box"><label>Constituency</label><div>{selectedCand.constituency}</div></div>
              </div>
              <div className="modal-description"><label>About</label><p>{selectedCand.notable}</p></div>
              <div className="modal-votes-section">
                <div className="modal-vote-main">
                  <div className="m-vote-val">
                    {(() => {
                      const con = constituencies.find(con => con.name === selectedCand.constituency);
                      const candData = con?.candidates?.find(can => can.name === selectedCand.name);
                      return candData ? fmt(candData.votes) : '—';
                    })()}
                  </div>
                  <label>{L.votes}</label>
                </div>
                <div className="m-status-wrap"><span className="live-dot" /> {L.live}</div>
              </div>
            </div>
          </div>
        )}

        <footer className="footer">
          <span>🛡 result.election.gov.np · Real-time Simulation</span>
          <span>{results?.fetchedAt ? `${L.lastFetch}: ${ago(results.fetchedAt)}` : ''}</span>
        </footer>
      </div>

      <style jsx global>{`
        :root {
          --bg: #f8f9fa; --surface: #ffffff; --border: rgba(0,0,0,0.08); --text: #0f172a; 
          --muted: #64748b; --blue: #003893; --gold: #d97706; --red: #dc143c; --green: #16a34a; --surface2: #f1f5f9;
          --shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); }
        .app.np { font-family: 'Noto Sans Devanagari', sans-serif; }
        .header { background: #fff; border-bottom: 1px solid var(--border); sticky; top: 0; z-index: 100; }
        .header-inner { max-width: 1400px; margin: 0 auto; padding: 15px 20px; display: flex; align-items: center; gap: 15px; }
        h1 { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px; }
        .gold { color: var(--gold); }
        .header-sub { font-size: 0.6rem; color: var(--muted); text-transform: uppercase; margin-top: 2px; }
        .live-pill { display: flex; align-items: center; gap: 6px; background: rgba(220,20,60,0.1); border: 1px solid rgba(220,20,60,0.2); border-radius: 99px; padding: 4px 10px; font-size: 0.6rem; font-weight: 800; color: var(--red); }
        .live-dot { width: 6px; height: 6px; background: var(--red); border-radius: 50%; display: inline-block; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .header-right { margin-left: auto; display: flex; gap: 10px; align-items: center; }
        .lang-btn { background: var(--surface2); border: 1px solid var(--border); padding: 5px 12px; border-radius: 6px; font-weight: 700; font-size: 0.7rem; cursor: pointer; }
        
        .tab-nav { max-width: 1400px; margin: 0 auto; padding: 0 20px; display: flex; gap: 20px; }
        .tab-btn { padding: 10px 0; border: none; background: none; font-weight: 700; font-size: 0.75rem; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; }
        .tab-btn.active { color: var(--blue); border-bottom-color: var(--blue); }

        .stat-strip { background: var(--surface2); border-bottom: 1px solid var(--border); }
        .stat-strip-inner { max-width: 1400px; margin: 0 auto; display: flex; padding: 0 20px; }
        .stat-item { padding: 10px 20px; border-right: 1px solid var(--border); }
        .stat-label { font-size: 0.55rem; font-weight: 800; color: var(--muted); margin-bottom: 2px; }
        .stat-val { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 0.9rem; }

        .panel-inner { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .results-summary { display: flex; gap: 15px; margin-bottom: 20px; }
        .rs-card { background: #fff; border: 1px solid var(--border); padding: 15px; border-radius: 12px; flex: 1; text-align: center; }
        .rs-num { font-size: 1.5rem; font-weight: 800; }
        .rs-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; color: var(--muted); }

        .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .res-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 18px; box-shadow: var(--shadow); }
        .res-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
        .res-card-title h4 { font-size: 1rem; font-weight: 800; }
        .res-card-sub { font-size: 0.7rem; color: var(--muted); font-weight: 600; text-transform: uppercase; }
        .verified-badge { background: var(--blue); color: #fff; font-size: 0.5rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-top: 4px; display: flex; align-items: center; gap: 3px; max-width: fit-content; }
        
        .res-cand-list { display: flex; flex-direction: column; gap: 8px; }
        .res-cand-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: var(--surface2); }
        .res-cand-row.winner { background: rgba(0,56,147,0.05); border: 1px solid rgba(0,56,147,0.1); }
        .res-cand-rank { font-weight: 800; color: var(--muted); width: 15px; font-size: 0.8rem; }
        .res-cand-main { flex: 1; display: flex; justify-content: space-between; align-items: center; }
        .res-cand-name { font-size: 0.85rem; font-weight: 700; }
        .res-cand-party-abbr { font-size: 0.65rem; color: var(--muted); font-weight: 800; }
        .res-vote-num { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 700; display: block; text-align: right; }
        .res-vote-lbl { font-size: 0.55rem; color: var(--muted); text-transform: uppercase; display: block; text-align: right; }
        
        .res-card-footer { border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; }
        .res-margin-box { font-size: 0.65rem; font-weight: 700; }
        .text-green { color: var(--green); }
        .res-total-box { text-align: right; }

        .party-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        .party-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 15px; }
        .party-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }
        .ps-item { text-align: center; }
        .ps-val { font-size: 1.1rem; font-weight: 800; line-height: 1; }
        .ps-lbl { font-size: 0.55rem; font-weight: 700; color: var(--muted); text-transform: uppercase; margin-top: 4px; }
        .party-desc { font-size: 0.7rem; color: var(--muted); border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px; }

        .trending-section { margin-bottom: 30px; }
        .trending-title { font-size: 0.8rem; font-weight: 800; margin-bottom: 15px; text-transform: uppercase; }
        .trending-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; }
        .trending-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; cursor: pointer; }
        .trending-party-small { position: absolute; bottom: 0; right: 0; background: #fff; border-radius: 50%; padding: 2px; }
        .trending-name { font-weight: 800; font-size: 0.9rem; }
        .t-vote-val { font-size: 0.9rem; font-weight: 800; color: var(--blue); }
        .section-subtitle { font-size: 0.7rem; font-weight: 800; color: var(--muted); margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid var(--border); padding-bottom: 5px; }

        .footer { background: var(--surface2); padding: 15px 20px; font-size: 0.65rem; color: var(--muted); display: flex; justify-content: space-between; margin-top: auto; border-top: 1px solid var(--border); }
        
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background: #fff; border-radius: 20px; padding: 30px; max-width: 450px; width: 100%; position: relative; }
        .modal-close { position: absolute; top: 15px; right: 15px; font-size: 24px; border: none; background: none; cursor: pointer; color: var(--muted); }
        .modal-header-top { display: flex; gap: 20px; align-items: center; margin-bottom: 20px; }
        .modal-votes-section { background: var(--blue); border-radius: 12px; padding: 20px; color: #fff; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
      `}</style>
    </>
  );
}
