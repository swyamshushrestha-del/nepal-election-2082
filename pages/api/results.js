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
    { en: 'Ram', np: 'राम' }, { en: 'Sita', np: 'सीता' }, { en: 'Hari', np: 'हरि' }, { en: 'Gita', np: 'गीता' },
    { en: 'Shyam', np: 'श्याम' }, { en: 'Rita', np: 'रीता' }, { en: 'Krishna', np: 'कृष्ण' }, { en: 'Kamala', np: 'कमला' },
    { en: 'Bishnu', np: 'विष्णु' }, { en: 'Saraswati', np: 'सरस्वती' }, { en: 'Rajesh', np: 'राजेश' }, { en: 'Sunita', np: 'सुनिता' },
    { en: 'Prakash', np: 'प्रकाश' }, { en: 'Bimala', np: 'बिमला' }, { en: 'Suresh', np: 'सुरेश' }, { en: 'Anita', np: 'अनिता' }
  ];
  const nepaliLastNames = [
    { en: 'Sharma', np: 'शर्मा' }, { en: 'Shrestha', np: 'श्रेष्ठ' }, { en: 'Thapa', np: 'थापा' }, { en: 'Karki', np: 'कार्की' },
    { en: 'Kc', np: 'केसी' }, { en: 'Gautam', np: 'गौतम' }, { en: 'Gurung', np: 'गुरुङ' }, { en: 'Magar', np: 'मगर' },
    { en: 'Tamang', np: 'तामाङ' }, { en: 'Rai', np: 'राई' }, { en: 'Limbu', np: 'लिम्बु' }, { en: 'Chaudhary', np: 'चौधरी' }
  ];
  const districts = [
    { en: 'Kathmandu', np: 'काठमाडौं' }, { en: 'Lalitpur', np: 'ललितपुर' }, { en: 'Bhaktapur', np: 'भक्तपुर' },
    { en: 'Kaski', np: 'कास्की' }, { en: 'Chitwan', np: 'चितवन' }, { en: 'Morang', np: 'मोरङ' },
    { en: 'Jhapa', np: 'झापा' }, { en: 'Sunsari', np: 'सुनसरी' }, { en: 'Rupandehi', np: 'रुपन्देही' },
    { en: 'Banke', np: 'बाँके' }, { en: 'Kailali', np: 'कैलाली' }, { en: 'Dang', np: 'दाङ' },
    { en: 'Nawalparasi', np: 'नवलपरासी' }, { en: 'Makwanpur', np: 'मकवानपुर' }, { en: 'Kavre', np: 'काभ्रे' },
    { en: 'Dhanusha', np: 'धनुषा' }, { en: 'Parsa', np: 'पर्सा' }, { en: 'Saptari', np: 'सप्तरी' },
    { en: 'Siraha', np: 'सिराहा' }, { en: 'Mahottari', np: 'महोत्तरी' }, { en: 'Ilam', np: 'इलाम' },
    { en: 'Taplejung', np: 'ताप्लेजुङ' }
  ];
  const provinces = [
    { en: 'Koshi', np: 'कोशी' }, { en: 'Madhesh', np: 'मधेश' }, { en: 'Bagmati', np: 'बागमती' },
    { en: 'Gandaki', np: 'गण्डकी' }, { en: 'Lumbini', np: 'लुम्बिनी' }, { en: 'Karnali', np: 'कर्णाली' },
    { en: 'Sudurpashchim', np: 'सुदूरपश्चिम' }
  ];

  const npNums = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  const toNpNum = (n) => n.toString().split('').map(c => npNums[parseInt(c)] || c).join('');

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

    const voteCap = 15000 + Math.floor(prng(seed + 1) * 20000);
    const progress = Math.min(1, minutes / (2880 + prng(seed + 2) * 1000));

    const jitter = Math.floor(prng(minutes + seed) * 350);
    let votes = Math.floor(voteCap * progress) + jitter;
    if (votes < 0) votes = 0;

    const isDeclared = progress > 0.99;
    if (isDeclared) declaredCount++;

    const fName = nepaliFirstNames[Math.floor(prng(seed + 4) * nepaliFirstNames.length)];
    const lName = nepaliLastNames[Math.floor(prng(seed + 5) * nepaliLastNames.length)];
    const d = districts[Math.floor(prng(seed + 6) * districts.length)];
    const p = provinces[Math.floor(prng(seed + 7) * provinces.length)];
    const conNum = Math.floor(prng(seed + 8) * 3) + 1; // 1 to 3

    mockConstituencies.push({
      id: `con-${i}`,
      name: `${d.en}-${conNum}`,
      nameNp: `${d.np}-${toNpNum(conNum)}`,
      district: d.en,
      districtNp: d.np,
      province: p.en,
      provinceNp: p.np,
      leadingCandidate: `${fName.en} ${lName.en}`,
      leadingCandidateNp: `${fName.np} ${lName.np}`,
      leadingParty: partyAbbr,
      leadingVotes: votes,
      margin: Math.floor(votes * (0.05 + prng(seed + 3) * 0.1)),
      status: isDeclared ? 'declared' : 'counting'
    });
  }

  // Safely inject notable candidates into the top specific constituencies
  const notableOverrides = [
    { con: 'Jhapa-5', nameEn: 'Jhapa-5', nameNp: 'झापा-५', dEn: 'Jhapa', dNp: 'झापा', cEn: 'KP Sharma Oli', cNp: 'केपी शर्मा ओली', p: 'CPN-UML' },
    { con: 'Kathmandu-1', nameEn: 'Kathmandu-1', nameNp: 'काठमाडौं-१', dEn: 'Kathmandu', dNp: 'काठमाडौं', cEn: 'Balendra Shah', cNp: 'बालेन्द्र शाह', p: 'RSP' },
    { con: 'Taplejung-1', nameEn: 'Taplejung-1', nameNp: 'ताप्लेजुङ-१', dEn: 'Taplejung', dNp: 'ताप्लेजुङ', cEn: 'Gajendra Prasad Tumyang Limbu', cNp: 'गजेन्द्र प्रसाद तुम्याङ लिम्बु', p: 'NC' },
    { con: 'Ilam-2', nameEn: 'Ilam-2', nameNp: 'इलाम-२', dEn: 'Ilam', dNp: 'इलाम', cEn: 'Daka Prasad Gautam', cNp: 'डाक प्रसाद गौतम', p: 'IND' },
  ];

  // We simply re-map the first 4 generated random constituencies to perfectly
  // match our 4 notable candidates, so they inherit the ticking "live" algorithm.
  notableOverrides.forEach((override, idx) => {
    if (mockConstituencies[idx]) {
      mockConstituencies[idx].name = override.nameEn;
      mockConstituencies[idx].nameNp = override.nameNp;
      mockConstituencies[idx].district = override.dEn;
      mockConstituencies[idx].districtNp = override.dNp;
      mockConstituencies[idx].leadingCandidate = override.cEn;
      mockConstituencies[idx].leadingCandidateNp = override.cNp;
      mockConstituencies[idx].leadingParty = override.p;
      // Provide a consistent bump so they look successful
      mockConstituencies[idx].leadingVotes += 5000;
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
