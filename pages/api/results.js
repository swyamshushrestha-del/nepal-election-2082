import { PARTIES } from '../../lib/parties';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

  const now = Date.now();
  // Election date: March 5, 2026
  const start = new Date('2026-03-05T00:00:00Z').getTime();
  const elapsed = Math.max(0, now - start);
  const minutes = Math.floor(elapsed / 1000 / 60);

  const mockConstituencies = [];

  // A simple seeded PRNG
  const prng = (seed) => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const nepaliFirstNames = [
    'Ram', 'Sita', 'Hari', 'Gita', 'Shyam', 'Rita', 'Krishna', 'Kamala', 'Bishnu', 'Saraswati',
    'Rajesh', 'Sunita', 'Prakash', 'Bimala', 'Suresh', 'Anita', 'Dinesh', 'Srijana', 'Ramesh', 'Nirmala'
  ];
  const nepaliLastNames = [
    'Sharma', 'Shrestha', 'Thapa', 'Karki', 'Kc', 'Gautam', 'Gurung', 'Magar', 'Tamang', 'Rai',
    'Limbu', 'Chaudhary', 'Maharjan', 'Bhattarai', 'Adhikari', 'Yadav', 'Giri', 'Subedi', 'Poudel', 'Basnet'
  ];
  const districts = [
    'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kaski', 'Chitwan', 'Morang', 'Jhapa', 'Sunsari', 'Rupandehi', 'Banke',
    'Kailali', 'Dang', 'Nawalparasi', 'Makwanpur', 'Kavre', 'Dhanusha', 'Parsa', 'Saptari', 'Siraha', 'Mahottari'
  ];
  const provinces = [
    'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'
  ];

  let declaredCount = 0;
  for (let i = 1; i <= 165; i++) {
    const seed = i * 1337;
    const rParty = prng(seed);

    let partyAbbr = 'IND';
    if (rParty < 0.3) partyAbbr = 'NC';
    else if (rParty < 0.55) partyAbbr = 'CPN-UML';
    else if (rParty < 0.8) partyAbbr = 'RSP';
    else if (rParty < 0.9) partyAbbr = 'Maoist-C';
    else if (rParty < 0.95) partyAbbr = 'RPP';
    else partyAbbr = 'JSP';

    // To make votes increase predictably but slightly randomly over time:
    const voteCap = 15000 + Math.floor(prng(seed + 1) * 20000); // 15k to 35k
    // total time to count = 48 hours = 2880 mins
    const progress = Math.min(1, minutes / (2880 + prng(seed + 2) * 1000));

    // Add jitter that increases with minutes
    // use modulo to change it up every few minutes
    const jitter = Math.floor(prng(minutes + seed) * 350);
    let votes = Math.floor(voteCap * progress) + jitter;
    if (votes < 0) votes = 0;

    const isDeclared = progress > 0.99;
    if (isDeclared) declaredCount++;

    const candName = `${nepaliFirstNames[Math.floor(prng(seed + 4) * nepaliFirstNames.length)]} ${nepaliLastNames[Math.floor(prng(seed + 5) * nepaliLastNames.length)]}`;
    const districtName = districts[Math.floor(prng(seed + 6) * districts.length)];
    const provName = provinces[Math.floor(prng(seed + 7) * provinces.length)];
    const conNum = Math.floor(prng(seed + 8) * 3) + 1; // 1 to 3

    mockConstituencies.push({
      id: `con-${i}`,
      name: `${districtName}-${conNum}`,
      district: districtName,
      province: provName,
      leadingCandidate: candName,
      leadingParty: partyAbbr,
      leadingVotes: votes,
      margin: Math.floor(votes * (0.05 + prng(seed + 3) * 0.1)),
      status: isDeclared ? 'declared' : 'counting'
    });
  }

  // Safely inject notable candidates into the top specific constituencies
  const notableOverrides = [
    { con: 'Jhapa-5', d: 'Jhapa', c: 'KP Sharma Oli', p: 'CPN-UML' },
    { con: 'Kathmandu-1', d: 'Kathmandu', c: 'Balendra Shah', p: 'RSP' },
    { con: 'Taplejung-1', d: 'Taplejung', c: 'Indra Prasad Thapa', p: 'RPP' },
    { con: 'Ilam-2', d: 'Ilam', c: 'Daka Prasad Gautam', p: 'IND' },
  ];

  // We simply re-map the first 4 generated random constituencies to perfectly
  // match our 4 notable candidates, so they inherit the ticking "live" algorithm.
  notableOverrides.forEach((override, idx) => {
    if (mockConstituencies[idx]) {
      mockConstituencies[idx].name = override.con;
      mockConstituencies[idx].district = override.d;
      mockConstituencies[idx].leadingCandidate = override.c;
      mockConstituencies[idx].leadingParty = override.p;
      // Provide a consistent bump so they look successful
      mockConstituencies[idx].leadingVotes += 3000;
    }
  });

  const partiesData = PARTIES.map(p => {
    return {
      id: p.id,
      name: p.name,
      abbr: p.abbr,
      color: p.color,
      seats: mockConstituencies.filter(c => c.status === 'declared' && c.leadingParty === p.abbr).length,
      leading: mockConstituencies.filter(c => c.status === 'counting' && c.leadingParty === p.abbr).length,
    }
  });

  res.status(200).json({
    source: 'Simulated Live 2082',
    fetchedAt: new Date().toISOString(),
    parties: partiesData,
    constituencies: mockConstituencies,
    summary: { declared: declaredCount, counting: 165 - declaredCount, totalSeats: 165 }
  });
}
