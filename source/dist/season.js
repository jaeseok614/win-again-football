(function(root){
 'use strict';
 const Story=root.ClubStory||(typeof require==='function'?require('./club-story.js'):null);
 const Discipline=root.Discipline||(typeof require==='function'?require('./discipline.js'):null);
 const Opposition=root.Opposition||(typeof require==='function'?require('./opposition.js'):null);
 const Staff=root.Staff||(typeof require==='function'?require('./staff.js'):null);
 const U=root.Europe||(typeof require==='function'?require('./europe.js'):null);
 const SquadPlans=root.SquadPlans||(typeof require==='function'?require('./squad-plans.js'):null);
 const TransferPlans=root.TransferPlans||(typeof require==='function'?require('./transfer-plans.js'):null);
 const Suspensions=root.Suspensions||(typeof require==='function'?require('./suspensions.js'):null);
 const Board=root.OwnerBoard||(typeof require==='function'?require('./owner-board.js'):null);
 const CL=root.ClubLife||(typeof require==='function'?require('./club-life.js'):null);
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),E=root.Economy||(typeof require==='function'?require('./economy.js'):null),C=root.Career||(typeof require==='function'?require('./career.js'):null),P=root.Cup||(typeof require==='function'?require('./cup.js'):null),H=root.Health||(typeof require==='function'?require('./health.js'):null),ST=root.Statistics||(typeof require==='function'?require('./statistics.js'):null);
 const clubs=[
  {id:'brynwell',name:'브린웰 로버스',en:'Brynwell Rovers',short:'브린웰',code:'BR',color:'#c8f36e',style:'빠른 유망주를 가진 작은 시민 구단',attack:70,defense:70,middle:71,speed:68},
  {id:'aldermere',name:'올더미어 유나이티드',en:'Aldermere United',short:'올더미어',code:'AU',color:'#cf7a8c',style:'견고한 수비와 힘 있는 공격',attack:78,defense:84,middle:76,speed:56},
  {id:'norhaven',name:'노르헤이븐 시티',en:'Norhaven City',short:'노르헤이븐',code:'NC',color:'#7ab3cd',style:'짧은 패스로 점유율을 높이는 항구 구단',attack:84,defense:78,middle:87,speed:60},
  {id:'bellwick',name:'벨윅 애슬레틱',en:'Bellwick Athletic',short:'벨윅',code:'BA',color:'#b197dc',style:'빠른 측면 공격, 수비에는 빈틈',attack:75,defense:68,middle:72,speed:78},
  {id:'redmere',name:'레드미어 FC',en:'Redmere FC',short:'레드미어',code:'RF',color:'#eea060',style:'높은 압박으로 승부하는 공업 도시 구단',attack:79,defense:74,middle:78,speed:70},
  {id:'montevaro',name:'몬테바로 SC',en:'Montevaro SC',short:'몬테바로',code:'MS',color:'#e2858b',style:'기술적인 공격수가 이끄는 우승 후보',attack:87,defense:81,middle:84,speed:66},
  {id:'selcanto',name:'셀칸토 UD',en:'Selcanto UD',short:'셀칸토',code:'SU',color:'#71c4b7',style:'창의적인 중원, 역습에는 흔들리는 수비',attack:77,defense:70,middle:82,speed:53},
  {id:'falkenruh',name:'팔켄루 04',en:'Falkenruh 04',short:'팔켄루',code:'F04',color:'#b8c9ba',style:'강한 중원과 느린 수비진을 가진 전통 구단',attack:79,defense:75,middle:80,speed:48},
  {id:'calderwick',name:'칼더윅 크라운',en:'Calderwick Crown',short:'칼더윅',code:'CC',color:'#d9ac61',style:'정교한 압박과 빠른 마무리의 1부 강호',attack:90,defense:86,middle:88,speed:79},
  {id:'valedoro',name:'발레도로 칼초',en:'Valedoro Calcio',short:'발레도로',code:'VC',color:'#d6c59e',style:'단단한 수비와 노련한 경기 운영',attack:85,defense:93,middle:88,speed:66},
  {id:'estenford',name:'에스텐퍼드 시티',en:'Estenford City',short:'에스텐퍼드',code:'EC',color:'#76bed1',style:'패스로 수비를 흔드는 수도 구단',attack:91,defense:85,middle:95,speed:74},
  {id:'rosenholt',name:'로젠홀트 09',en:'Rosenholt 09',short:'로젠홀트',code:'R09',color:'#e0b97c',style:'높은 압박과 강한 전환 공격',attack:90,defense:88,middle:89,speed:85},
  {id:'azurienne',name:'아쥬리엔 AC',en:'Azurienne AC',short:'아쥬리엔',code:'AAC',color:'#aa91d8',style:'창의적인 공격과 기술적인 중원',attack:95,defense:83,middle:93,speed:78},
  {id:'brackenfort',name:'브래컨포트 알비온',en:'Brackenfort Albion',short:'브래컨포트',code:'BFA',color:'#75bb9d',style:'조직적인 수비와 빠른 역습',attack:86,defense:90,middle:84,speed:87},
  {id:'monteluce',name:'몬테루체 SC',en:'Monteluce SC',short:'몬테루체',code:'MLS',color:'#d77c94',style:'균형 잡힌 전력의 1부 우승 후보',attack:93,defense:92,middle:91,speed:76},
  {id:'eastwick',name:'이스트윅 타운',en:'Eastwick Town',short:'이스트윅',code:'ET',color:'#75a9d6',style:'낮은 위치에서 단단하게 버티는 승격 도전자',attack:74,defense:80,middle:76,speed:63},
  {id:'galdon',name:'갈던 로버스',en:'Galdon Rovers',short:'갈던',code:'GR',color:'#d78e61',style:'힘과 활동량으로 밀어붙이는 지역 라이벌',attack:79,defense:72,middle:73,speed:76},
  {id:'kingsmoor',name:'킹스무어 유나이티드',en:'Kingsmoor United',short:'킹스무어',code:'KU',color:'#9a83c7',style:'중원을 촘촘히 지키는 전통 구단',attack:72,defense:78,middle:80,speed:58},
  {id:'wexford',name:'웩스퍼드 애슬레틱',en:'Wexford Athletic',short:'웩스퍼드',code:'WA',color:'#67b6a0',style:'빠른 측면 전환과 공격적인 압박',attack:81,defense:70,middle:75,speed:82},
  {id:'castermere',name:'캐스터미어 FC',en:'Castermere FC',short:'캐스터미어',code:'CF',color:'#cf6e79',style:'젊은 공격수와 과감한 전진 패스',attack:82,defense:69,middle:77,speed:74},
  {id:'alderwich',name:'올더위치 알비온',en:'Alderwich Albion',short:'올더위치',code:'AA',color:'#8dbd73',style:'조직적인 수비와 효율적인 역습',attack:73,defense:82,middle:74,speed:62},
  {id:'fenwick',name:'펜윅 버러',en:'Fenwick Borough',short:'펜윅',code:'FB',color:'#dbb45f',style:'거친 압박과 강한 세트피스',attack:78,defense:77,middle:72,speed:65},
  {id:'dunmarsh',name:'던마시 시티',en:'Dunmarsh City',short:'던마시',code:'DC',color:'#72a8b5',style:'짧은 패스로 리듬을 만드는 항구 구단',attack:75,defense:74,middle:81,speed:60},
  {id:'redcliff',name:'레드클리프 타운',en:'Redcliff Town',short:'레드클리프',code:'RT',color:'#c96e65',style:'전방 압박과 빠른 공격 전환',attack:81,defense:78,middle:80,speed:82},
  {id:'westmere',name:'웨스트미어 애슬레틱',en:'Westmere Athletic',short:'웨스트미어',code:'WA',color:'#6ba9d0',style:'점유율을 바탕으로 경기를 지배',attack:82,defense:80,middle:86,speed:68},
  {id:'ainsley',name:'포트 에인슬리 FC',en:'Port Ainsley FC',short:'에인슬리',code:'PA',color:'#d4ad69',style:'빠른 윙어와 강한 홈 분위기',attack:85,defense:76,middle:79,speed:87},
  {id:'kingsford',name:'킹스퍼드 로버스',en:'Kingsford Rovers',short:'킹스퍼드',code:'KR',color:'#957ab9',style:'기술적인 중원과 날카로운 침투',attack:84,defense:77,middle:85,speed:73},
  {id:'moorhaven',name:'무어헤이븐 유나이티드',en:'Moorhaven United',short:'무어헤이븐',code:'MU',color:'#75b78b',style:'수비 간격을 좁히는 실리 축구',attack:78,defense:85,middle:81,speed:64},
  {id:'elmswick',name:'엘름윅 시티',en:'Elmswick City',short:'엘름윅',code:'EC',color:'#d17c9a',style:'패스와 움직임으로 공간을 만드는 팀',attack:86,defense:75,middle:83,speed:77},
  {id:'southport',name:'사우스포트 베일',en:'Southport Vale',short:'사우스포트',code:'SV',color:'#75a7be',style:'강한 전방 압박과 직선적인 공격',attack:83,defense:79,middle:78,speed:85},
  {id:'newcombe',name:'뉴컴 알비온',en:'Newcombe Albion',short:'뉴컴',code:'NA',color:'#b0a56b',style:'밸런스와 세트피스로 승부하는 구단',attack:80,defense:83,middle:82,speed:70},
  {id:'ashford',name:'애시퍼드 애슬레틱',en:'Ashford Athletic',short:'애시퍼드',code:'AA',color:'#c88a55',style:'노련한 수비와 빠른 측면 공격',attack:84,defense:84,middle:85,speed:78},
  {id:'highgate',name:'하이게이트 로버스',en:'Highgate Rovers',short:'하이게이트',code:'HR',color:'#7f9dc8',style:'높은 점유율과 정교한 빌드업',attack:87,defense:81,middle:89,speed:74},
  {id:'stonemill',name:'스톤밀 FC',en:'Stonemill FC',short:'스톤밀',code:'SM',color:'#8eb180',style:'피지컬과 압박 강도가 뛰어난 팀',attack:82,defense:88,middle:82,speed:72},
  {id:'northcastle',name:'노스캐슬 유나이티드',en:'Northcastle United',short:'노스캐슬',code:'NU',color:'#73afc0',style:'빠른 역습과 견고한 수비 조직',attack:86,defense:85,middle:83,speed:88},
  {id:'ravenhurst',name:'레이븐허스트 타운',en:'Ravenhurst Town',short:'레이븐허스트',code:'RH',color:'#9a84b1',style:'창의적인 공격 전개와 기술적 우위',attack:89,defense:79,middle:87,speed:80},
  {id:'fairbridge',name:'페어브리지 시티',en:'Fairbridge City',short:'페어브리지',code:'FC',color:'#c88976',style:'안정적인 점유와 세밀한 마무리',attack:85,defense:86,middle:88,speed:75},
  {id:'wyndale',name:'윈데일 알비온',en:'Wyndale Albion',short:'윈데일',code:'WY',color:'#72b4a4',style:'공수 전환이 빠른 승격 후보',attack:88,defense:83,middle:84,speed:86},
  {id:'brookchester',name:'브룩체스터 FC',en:'Brookchester FC',short:'브룩체스터',code:'BC',color:'#d2b966',style:'정교한 패스와 노련한 경기 운영',attack:83,defense:87,middle:90,speed:71},
  {id:'kingsbridge',name:'킹스브리지 1887',en:'Kingsbridge 1887',short:'킹스브리지',code:'K88',color:'#c4a05f',style:'압박과 창의성을 겸비한 최상위 강호',attack:94,defense:91,middle:95,speed:88}
 ];
 const clubReferences=Object.freeze({
  brynwell:{division:5,competition:'Premier League',reference:'Tottenham Hotspur',display:['토투넘 핫스퍼','토투넘','TT']},
  aldermere:{division:5,competition:'National League',reference:'Carlisle United',display:['칼스턴 유나이티드','칼스턴','CU']},
  norhaven:{division:5,competition:'National League',reference:'Gateshead',display:['게이츠힐 FC','게이츠힐','GH']},
  bellwick:{division:5,competition:'National League',reference:'Scunthorpe United',display:['스컨손 아이언','스컨손','SI']},
  redmere:{division:5,competition:'National League',reference:'Southend United',display:['사우스엔더스 FC','사우스엔더스','SE']},
  montevaro:{division:5,competition:'National League',reference:'Forest Green Rovers',display:['포리스트 그린 로버스','포리스트 그린','FGR']},
  selcanto:{division:5,competition:'National League',reference:'Hartlepool United',display:['하트풀 유나이티드','하트풀','HU']},
  falkenruh:{division:5,competition:'National League',reference:'Boreham Wood',display:['보러햄 우드 FC','보러햄 우드','BW']},
  calderwick:{division:1,competition:'Premier League',reference:'Arsenal',display:['아스널드 FC','아스널드','AF']},
  valedoro:{division:1,competition:'Premier League',reference:'Newcastle United',display:['뉴캐슬턴 나이츠','뉴캐슬턴','NK']},
  estenford:{division:1,competition:'Premier League',reference:'Manchester United',display:['몬치스타 유나이티드','몬치스타 U','MU']},
  rosenholt:{division:1,competition:'Premier League',reference:'Manchester City',display:['몬치스타 시티','몬치스타 시티','MC']},
  azurienne:{division:1,competition:'Premier League',reference:'Aston Villa',display:['아스톤 빌라지','아스톤','AV']},
  brackenfort:{division:1,competition:'Premier League',reference:'Crystal Palace',display:['크리스털 팰리스톤','팰리스톤','CP']},
  monteluce:{division:1,competition:'Premier League',reference:'Chelsea',display:['첼시온 FC','첼시온','CF']},
  eastwick:{division:4,competition:'League Two',reference:'York City',display:['요크스타 시티','요크스타','YC']},
  galdon:{division:4,competition:'League Two',reference:'Bristol Rovers',display:['브리스톨 로버','브리스톨','BR']},
  kingsmoor:{division:4,competition:'League Two',reference:'Oldham Athletic',display:['올덤 타운','올덤','OA']},
  wexford:{division:4,competition:'League Two',reference:'Rochdale',display:['로치데일 AFC','로치데일','RD']},
  castermere:{division:4,competition:'League Two',reference:'Port Vale',display:['포트베일 유나이티드','포트베일','PV']},
  alderwich:{division:4,competition:'League Two',reference:'Swindon Town',display:['스윈던 시티','스윈던','SW']},
  fenwick:{division:4,competition:'League Two',reference:'Shrewsbury Town',display:['슈루즈베리 FC','슈루즈베리','SB']},
  dunmarsh:{division:4,competition:'League Two',reference:'Walsall',display:['월솔 FC','월솔','WS']},
  redcliff:{division:3,competition:'League One',reference:'Leicester City',display:['레스터 시티온','레스터','LC']},
  westmere:{division:3,competition:'League One',reference:'Stockport County',display:['스톡필드 카운티','스톡필드','SK']},
  ainsley:{division:3,competition:'League One',reference:'Barnsley',display:['반슬리 타운','반슬리','BA']},
  kingsford:{division:3,competition:'League One',reference:'Blackpool',display:['블랙풀 파도 FC','블랙풀 파도','BP']},
  moorhaven:{division:3,competition:'League One',reference:'Bradford City',display:['브래드포드 시티온','브래드포드','BD']},
  elmswick:{division:3,competition:'League One',reference:'Wigan Athletic',display:['위건 애슬레틱스','위건','WG']},
  southport:{division:3,competition:'League One',reference:'Wycombe Wanderers',display:['와이컴 원더스','와이컴','WY']},
  newcombe:{division:3,competition:'League One',reference:'Notts County',display:['노츠 카운티','노츠','NO']},
  ashford:{division:2,competition:'Championship',reference:'Wolverhampton Wanderers',display:['울버포드 원더스','울버포드','WW']},
  highgate:{division:2,competition:'Championship',reference:'Sheffield United',display:['셰필턴 레즈','셰필턴','SU']},
  stonemill:{division:2,competition:'Championship',reference:'Burnley',display:['번리 타운','번리','BU']},
  northcastle:{division:2,competition:'Championship',reference:'West Ham United',display:['웨스트햄머 유나이티드','웨스트햄머','WH']},
  ravenhurst:{division:2,competition:'Championship',reference:'Southampton',display:['사우스햄턴 FC','사우스햄턴','SH']},
  fairbridge:{division:2,competition:'Championship',reference:'Norwich City',display:['노리치 타운','노리치','NC']},
  wyndale:{division:2,competition:'Championship',reference:'Middlesbrough',display:['미들즈브러 타이즈','미들즈브러','MB']},
  brookchester:{division:2,competition:'Championship',reference:'Wrexham',display:['웩스턴 AFC','웩스턴','WX']},
  kingsbridge:{division:1,competition:'Premier League',reference:'Liverpool',display:['리버포든 FC','리버포든','LF']}
 });
 const brands=Object.freeze(Object.fromEntries(Object.entries(clubReferences).map(([id,reference])=>[id,reference.display])));
 const own='brynwell',rawClub=id=>clubs.find(c=>c.id===id)||U?.rawClub?.(id)||U?.club(id),presentClub=value=>{if(!value)return value;const brand=brands[value.id];return brand?{...value,name:brand[0],short:brand[1],code:brand[2]}:U?.presentClub?U.presentClub(value):{...value};},club=id=>presentClub(rawClub(id)),copy=x=>JSON.parse(JSON.stringify(x)),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function displayText(value){
  let text=String(value??'');
  const aliases=[...clubs,...(U?.clubs||[])].flatMap(raw=>{const shown=presentClub(raw);return [[raw.name,shown.name],[raw.short,shown.short]];}).filter(([raw,shown])=>raw&&shown&&raw!==shown).sort((a,b)=>b[0].length-a[0].length);
  for(const [raw,shown] of aliases)text=text.split(raw).join(shown);
  return text;
 }
 const primaryKey=p=>({GK:'keeping',DEF:'defense',MID:'passing',FW:'attack'}[p.pos]);
 const pools={2:clubs.slice(0,8),1:[clubs[0],...clubs.slice(8,15)]};
 const fiveTierPools={5:clubs.slice(0,8),4:clubs.slice(15,23),3:clubs.slice(23,31),2:clubs.slice(31,39),1:[...clubs.slice(8,15),clubs[39]]};
 const divisionNames={1:['프리미어 리그','PREMIER LEAGUE','프리미어 컵','PREMIER CUP'],2:['챔피언십','CHAMPIONSHIP','챔피언십 컵','CHAMPIONSHIP CUP'],3:['리그 원','LEAGUE ONE','리그 원 컵','LEAGUE ONE CUP'],4:['리그 투','LEAGUE TWO','리그 투 컵','LEAGUE TWO CUP'],5:['내셔널 리그','NATIONAL LEAGUE','내셔널 컵','NATIONAL CUP']};
 const leagueOf=s=>s?.league||s||{},rulesOf=s=>leagueOf(s).rules||'legacy',clubById=id=>clubs.find(c=>c.id===id),allClubIds=new Set(clubs.map(c=>c.id)),scheduleCache=new Map();
 function poolFor(rules,division){return rules==='five-tier'?fiveTierPools[division]:pools[division];}
 function divisionInfo(value){const league=typeof value==='number'?{division:value}:leagueOf(value),division=Number.isInteger(league.division)?league.division:2,rules=league.rules||(division>2?'five-tier':'legacy'),names=divisionNames[division]||divisionNames[2];return {division,rules,name:rules==='five-tier'?names[0]:division===1?'하이랜드 프리미어':'로우랜드 리그',en:rules==='five-tier'?names[1]:division===1?'HIGHLAND PREMIER':'LOWLAND LEAGUE',cupName:rules==='five-tier'?names[2]:division===1?'하이랜드 컵':'로우랜드 컵',cupEn:rules==='five-tier'?names[3]:division===1?'HIGHLAND CUP':'LOWLAND CUP'};}
 function leagueClubs(s){const league=leagueOf(s),p=poolFor(league.rules||'legacy',league.division===1?1:league.division===2?2:league.division),ids=Array.isArray(league.clubIds)?league.clubIds:(p||[]).map(c=>c.id);return ids.map(id=>presentClub(clubById(id)||rawClub(id))).filter(Boolean);}
 function leagueForYear(s,year=s.year){const league=year===s.year?s.league:s.history.find(h=>h.year===year);return {division:league?.division??2,rules:league?.rules??'legacy',...(Array.isArray(league?.clubIds)?{clubIds:[...league.clubIds]}:{})};}
 function schedule(ids){const ring=[...ids],first=[];for(let r=0;r<7;r++){const games=[];for(let i=0;i<4;i++){const a=ring[i],b=ring[7-i];games.push((r+i)%2?{home:b,away:a}:{home:a,away:b});}first.push(games);ring.splice(1,0,ring.pop());}return first.concat(first.map(games=>games.map(g=>({home:g.away,away:g.home}))));}
 const schedules={1:schedule(pools[1].map(c=>c.id)),2:schedule(pools[2].map(c=>c.id))},fiveTierSchedules=Object.fromEntries(Object.entries(fiveTierPools).map(([d,p])=>[d,schedule(p.map(c=>c.id))])),fixtures=schedules[2];
 function fixturesFor(s){const league=leagueOf(s),division=league.division===1?1:league.division===2?2:league.division;if(league.rules!=='five-tier')return schedules[division===1?1:2];const ids=Array.isArray(league.clubIds)?league.clubIds:fiveTierPools[division].map(c=>c.id),key=ids.join('|');if(!scheduleCache.has(key))scheduleCache.set(key,schedule(ids));return scheduleCache.get(key);}
 function promotedPool(division){const base=fiveTierPools[division].map(c=>c.id);if(base.includes(own))return base;const replace=base.map(id=>({id,level:clubById(id).attack+clubById(id).defense+clubById(id).middle})).sort((a,b)=>a.level-b.level||a.id.localeCompare(b.id))[0].id;return base.map(id=>id===replace?own:id);}
 function destination(division,rank,rules='pyramid'){if(rules==='legacy')return 2;if(rules==='five-tier')return division>1&&rank<=2?division-1:division<5&&rank>=7?division+1:division;return division===2&&rank<=2?1:division===1&&rank>=7?2:division;}
 function movement(s){const from=s.league.division,rank=standings(s).find(c=>c.id===own).rank,to=destination(from,rank,s.league.rules),kind=to<from?'promotion':to>from?'relegation':'stay';return {from,to,kind,rank,label:kind==='promotion'?divisionInfo({division:to,rules:s.league.rules}).name+' 승격':kind==='relegation'?divisionInfo({division:to,rules:s.league.rules}).name+' 강등':from+'부 잔류'};}
 function seedFor(s,r,fixture){let n=(s.seed^Math.imul(s.year,2654435761)^Math.imul(r+1,2246822519))>>>0;for(const ch of fixture.home+fixture.away)n=(Math.imul(n,16777619)^ch.charCodeAt(0))>>>0;return n;}
 function leagueFixture(s){return s.round<14?fixturesFor(s)[s.round].find(g=>g.home===own||g.away===own):null;}
 function fixtureFor(s){return s.competition==='cup'?P.fixtureFor(s):s.competition==='europe'?U?.fixtureFor(s):leagueFixture(s);}
 function opponentFor(s){const f=fixtureFor(s);return f?club(f.home===own?f.away:f.home):null;}
 function rawOpponentFor(s){const f=fixtureFor(s);return f?rawClub(f.home===own?f.away:f.home):null;}
 function makeMatch(s){const f=fixtureFor(s),opp=rawOpponentFor(s);const matchSeed=s.competition==='cup'?P.seedFor(s,f):s.competition==='europe'?U.seedFor(s,f):seedFor(s,s.round,f);const m=F.create(matchSeed,{players:s.squad,homeName:rawClub(own).name,opponentName:opp.name,opponent:Opposition.profile(opp),isHome:f.home===own});if(s.disciplineRules===1)Discipline.initialize(m);m.lineup=F.fitLineup(m.players,s.plan.formation,s.plan.lineup);m.formation=s.plan.formation;F.setTactic(m,s.plan.tactic);Suspensions?.apply(s,m);return m;}
 function selectNextMatch(s){for(;;){if(P.due(s)){if(P.fixtureFor(s)){s.competition='cup';s.match=makeMatch(s);return s;}P.advanceAI(s);continue;}if(U?.due(s)){if(U.fixtureFor(s)){s.competition='europe';s.match=makeMatch(s);return s;}U.advanceAI(s);continue;}s.competition='league';s.match=s.round<14?makeMatch(s):null;return s;}}
 function ready(s){return s.round===14&&!s.match&&P.ready(s)&&(U?.ready(s)??true);}
 function create(seed=20260930,{suspensions=false,startingClub=false}={}){const squad=Object.fromEntries((startingClub?F.startingRoster:F.roster).map(p=>[p.id,{...p,xp:0}])),initialLineup=startingClub?['g1','d4','d1','d2','d3','m2','m1','m4','m3','f1','f2']:F.create().lineup,s={version:9,...(startingClub?{startingClub:'tottunham'}:{}),disciplineRules:1,league:{version:1,division:startingClub?5:2,rules:startingClub?'five-tier':'pyramid',...(startingClub?{clubIds:fiveTierPools[5].map(c=>c.id)}:{})},competition:'league',seed:seed>>>0,year:1,round:0,squad,results:[],history:[],trained:null,lastReport:null,plan:{formation:'442',tactic:'balanced',lineup:initialLineup},match:null};E.initialize(s);Staff?.initialize(s);C.initialize(s);P.initialize(s);U?.initialize(s);H.initialize(s);ST.initialize(s);CL?.initialize(s);selectNextMatch(s);return suspensions?Suspensions.enable(s):s;}
 function standings(s){const rows=leagueClubs(s).map(c=>({...c,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));for(const result of s.results){const a=rows.find(c=>c.id===result.home),b=rows.find(c=>c.id===result.away),[x,y]=result.goals;a.played++;b.played++;a.gf+=x;a.ga+=y;b.gf+=y;b.ga+=x;if(x>y){a.won++;a.points+=3;b.lost++;}else if(x<y){b.won++;b.points+=3;a.lost++;}else{a.drawn++;b.drawn++;a.points++;b.points++;}}return rows.map(c=>({...c,gd:c.gf-c.ga})).sort((a,b)=>b.points-a.points||b.gd-a.gd||b.gf-a.gf||a.en.localeCompare(b.en,'en')).map((c,i)=>({...c,rank:i+1}));}
 function aiResult(s,r,f){let rng=seedFor(s,r,f),draw=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},a=club(f.home),b=club(f.away),goals=[0,0];for(let m=0;m<90;m++){if(draw()<(1.22+(a.attack-b.defense)*.028+.13)/90)goals[0]++;if(draw()<(1.22+(b.attack-a.defense)*.028)/90)goals[1]++;}return {round:r,home:f.home,away:f.away,goals};}
 function train(s,focus){
  if(s.competition!=='league'||!s.match||s.match.phase!=='prep'||s.trained)throw Error('훈련은 리그 경기 전, 주마다 한 번 할 수 있어요.');
  if(!['technique','pace','fitness','recovery'].includes(focus))throw Error('훈련 종류를 선택하세요.');
  for(const p of Object.values(s.squad)){
   const m=s.match.players[p.id],coaching=Staff?.trainingBonuses(s,p.id,focus)??{skillBonus:0,energySaving:0,recoveryBonus:0};
   if(focus==='recovery')p.energy=clamp(p.energy+15+coaching.recoveryBonus,0,100);
   else if(!p.injury){
    const key=focus==='technique'?primaryKey(p):focus==='pace'?'speed':'endurance';
    p[key]=clamp(p[key]+1+coaching.skillBonus,0,key===primaryKey(p)?p.potential:99);
    const cost=Math.max(0,({technique:5,pace:6,fitness:3}[focus])-coaching.energySaving);
    p.energy=clamp(p.energy-cost,0,100);m[key]=p[key];
   }
   m.energy=p.energy;m.initialEnergy=p.energy;
  }
  s.trained=focus;Staff?.training(s,focus,undefined,{alreadyApplied:true});return s;
 }
 function participation(s,m,recovery){const changes=[];for(const p of Object.values(s.squad)){const played=m.players[p.id];p.energy=clamp(played.energy+recovery,0,100);const beforeXp=Math.floor(p.xp/270);p.xp+=played.minutes;const growth=Math.floor(p.xp/270)-beforeXp,key=primaryKey(p),before=p[key];p[key]=clamp(p[key]+growth,0,p.potential);const gained=p[key]-before;if(gained)changes.push({id:p.id,identity:p.identity,name:p.name,key,gained});}s.plan={formation:m.formation,tactic:m.tactic,lineup:[...m.lineup]};return changes;}
 function orient(result,key){return result.home===own?copy(result[key]):[copy(result[key][1]),copy(result[key][0])];}
 function settle(s){
  if(!s.match||s.match.phase!=='full'||s.match.minute!==90||s.results.length!==s.round*4||!['league','cup','europe'].includes(s.competition)||s.competition==='league'&&s.round>=14)throw Error('현재 경기를 끝낸 뒤 결과를 확정하세요.');
  const next=copy(s),m=next.match,f=fixtureFor(next);
  if(next.competition==='cup'||next.competition==='europe'){
   const competition=next.competition,tournament=competition==='cup'?P:U,result=tournament.preview(next,m),cashflow=competition==='cup'?E.applyCup(next,result):E.applyEurope(next,result),changes=participation(next,m,20);tournament.settle(next,m);ST.afterMatch(next,m,{competition,round:next.round,stage:result.stage});C.advance(next,m,{cup:true});H.afterMatch(next,m);const rank=standings(next).find(c=>c.id===own);
   next.lastReport={competition,round:next.round,stage:result.stage,title:tournament.stageNames[result.stage],fixturehome:result.home,opponent:f.home===own?f.away:f.home,score:[...m.score],penalties:result.penalties?orient(result,'penalties'):null,kicks:orient(result,'kicks'),winner:result.winner,changes,rank:rank.rank,points:rank.points,cashflow:copy(cashflow)};CL?.afterMatch(next);return selectNextMatch(next);
  }
  const cashflow=E.applyRound(next,f,m.score);
  for(const fixture of fixturesFor(next)[next.round]){const result=fixture===f?{round:next.round,...fixture,goals:f.home===own?[...m.score]:[m.score[1],m.score[0]]}:aiResult(next,next.round,fixture);next.results.push(result);}
  const changes=participation(next,m,32),table=standings(next),rank=table.find(c=>c.id===own);
  const report={competition:'league',round:next.round+1,fixturehome:f.home,opponent:opponentFor(next).id,score:[...m.score],penalties:null,kicks:[[],[]],winner:m.score[0]===m.score[1]?null:m.score[0]>m.score[1]?own:opponentFor(next).id,changes,rank:rank.rank,points:rank.points,cashflow:copy(cashflow)};
  next.round++;next.trained=null;ST.afterMatch(next,m,{competition:'league',round:next.round});C.advance(next,m,{cup:false});H.afterMatch(next,m);Staff?.afterLeagueRound(next);next.lastReport=report;if(next.round===14)E.finishSeason(next,table);CL?.afterMatch(next);return selectNextMatch(next);
 }
 function nextSeason(s){if(!ready(s))throw Error('리그와 컵, 국제대회 시즌을 끝낸 뒤 새 시즌을 시작할 수 있어요.');const next=copy(s),table=standings(s),me=table.find(c=>c.id===own),to=movement(s).to,nextRules=s.league.rules==='legacy'?'pyramid':s.league.rules;const history={year:s.year,division:s.league.division,rules:s.league.rules,nextDivision:to,rank:me.rank,points:me.points,champion:table[0].id,cupChampion:s.cup.champion};if(s.league.rules==='five-tier')history.clubIds=leagueClubs(s).map(c=>c.id);if(U)history.europeChampion=s.europe?.champion??null;next.history.push(history);next.league={version:1,division:to,rules:nextRules,...(nextRules==='five-tier'?{clubIds:to===s.league.division?leagueClubs(s).map(c=>c.id):promotedPool(to)}:{})};next.year++;ST.nextYear(next);next.round=0;next.results=[];next.trained=null;next.lastReport=null;for(const p of Object.values(next.squad))p.energy=100;E.nextYear(next);C.nextYear(next);P.initialize(next);U?.initialize(next);H.initialize(next);CL?.nextYear(next);Suspensions?.nextYear(next);return selectNextMatch(next);}
 function restore(raw){
  const fail=()=>{throw Error('저장한 시즌을 읽을 수 없어요.');};
  if(!raw||![2,3,4,5,6,7,8,9].includes(raw.version)||!Number.isInteger(raw.seed)||raw.seed<0||raw.seed>4294967295||!Number.isInteger(raw.year)||raw.year<1||raw.year>10000||!Number.isInteger(raw.round)||raw.round<0||raw.round>14||!Array.isArray(raw.results)||raw.results.length!==raw.round*4||!Array.isArray(raw.history)||raw.history.length!==raw.year-1)fail();
  if(Object.hasOwn(raw,'startingClub')&&raw.startingClub!=='tottunham')fail();
  if(Object.hasOwn(raw,'disciplineRules')&&raw.disciplineRules!==1)fail();
  const legacy=raw.version===2,s=copy(raw);if(Object.keys(s.squad||{}).length!==18)fail();
  // The unpublished home handoff enabled cards before introducing the campaign flag.
  if(!Object.hasOwn(s,'disciplineRules')&&(s.match?.discipline||Array.isArray(s.statistics?.records)&&s.statistics.records.some(r=>Object.hasOwn(r,'cards'))))s.disciplineRules=1;
  if(raw.version<7){s.league={version:1,division:2,rules:'legacy'};for(const h of s.history){if(!h||typeof h!=='object')fail();Object.assign(h,{division:2,rules:'legacy',nextDivision:2});}}
  const divisionValid=(division,rules)=>['legacy','pyramid','five-tier'].includes(rules)&&(rules==='five-tier'?[1,2,3,4,5].includes(division):[1,2].includes(division))&&(rules!=='legacy'||division===2),clubIdsValid=ids=>Array.isArray(ids)&&ids.length===8&&new Set(ids).size===8&&ids.includes(own)&&ids.every(id=>allClubIds.has(id)),leagueValid=l=>l&&l.version===1&&divisionValid(l.division,l.rules)&&(l.rules==='five-tier'?clubIdsValid(l.clubIds):!Object.hasOwn(l,'clubIds'));
  if(!leagueValid(s.league)||s.year===1&&s.league.division!==(s.league.rules==='five-tier'?5:2)||s.year>1&&s.league.rules!==s.history[0]?.rules&&!(s.history[0]?.rules==='legacy'&&s.league.rules==='pyramid'))fail();
  for(const slot of F.roster){
   const saved=s.squad[slot.id];if(!legacy&&(typeof saved?.identity!=='string'||!F.identityProfile(saved.identity)))fail();let person;try{person=F.profileForSlot(slot.id,legacy?slot.id:saved.identity);}catch{fail();}
   if(!saved||!Number.isFinite(saved.energy)||saved.energy<0||saved.energy>100||!Number.isInteger(saved.xp)||saved.xp<0||saved.xp>100000000)fail();
   const stats={};for(const key of ['attack','defense','passing','speed','endurance','keeping']){if(!Number.isInteger(saved[key])||saved[key]<0||saved[key]>99)fail();stats[key]=saved[key];}
   const potential=legacy?Math.max(person.potential,stats[primaryKey(person)]):saved.potential;if(!Number.isInteger(potential)||potential<person.potential||potential>99||stats[primaryKey(person)]>potential)fail();
   s.squad[slot.id]={...person,...stats,potential,energy:saved.energy,xp:saved.xp};
  }
  if(new Set(Object.values(s.squad).map(p=>p.identity)).size!==18)fail();
  s.results.forEach((x,i)=>{const r=Math.floor(i/4),f=fixturesFor(s)[r][i%4];if(!x||x.round!==r||x.home!==f.home||x.away!==f.away||!Array.isArray(x.goals)||x.goals.length!==2||x.goals.some(g=>!Number.isInteger(g)||g<0||g>90))fail();});
  if(!s.plan||!F.formations[s.plan.formation]||!['press','balanced','counter'].includes(s.plan.tactic)||!Array.isArray(s.plan.lineup)||s.plan.lineup.length!==11||new Set(s.plan.lineup).size!==11||s.plan.lineup.some(id=>!s.squad[id]))fail();
  for(const [pos,n] of Object.entries({GK:1,...F.formations[s.plan.formation]}))if(s.plan.lineup.filter(id=>s.squad[id].pos===pos).length!==n)fail();
  if(s.trained!==null&&!['technique','pace','fitness','recovery'].includes(s.trained))fail();
  for(let i=0;i<s.history.length;i++){const h=s.history[i],following=s.history[i+1]||s.league,firstDivision=h?.rules==='five-tier'?5:2,ids=h?.rules==='five-tier'?h.clubIds:poolFor(h?.rules,h?.division)?.map(c=>c.id);if(!h||h.year!==i+1||!Number.isInteger(h.rank)||h.rank<1||h.rank>8||!Number.isInteger(h.points)||h.points<0||h.points>42||!divisionValid(h.division,h.rules)||!divisionValid(h.nextDivision,h.rules)||h.rules==='five-tier'&&!clubIdsValid(h.clubIds)||h.rules!=='five-tier'&&Object.hasOwn(h,'clubIds')||h.rules!==following.rules&&!(h.rules==='legacy'&&following.rules==='pyramid')||h.division!==(i?s.history[i-1].nextDivision:firstDivision)||h.nextDivision!==following.division||!ids?.includes(h.champion))fail();const expected=destination(h.division,h.rank,h.rules);if(h.nextDivision!==expected)fail();if(raw.version<5)h.cupChampion=null;else if(h.cupChampion!==null&&!ids?.includes(h.cupChampion))fail();}
  if(raw.version<5){s.competition='league';P.initialize(s,{legacy:true});}else if(!['league','cup','europe'].includes(s.competition)||s.competition==='europe'&&!U)fail();try{P.validate(s);if(U){if(raw.version<8)U.initialize(s,{legacy:true});else U.restore(s,raw.europe);U.validate(s);}}catch{fail();}
  try{if(raw.version<6)H.initialize(s,{legacy:true});else H.restore(s,raw.health,raw.squad);}catch{fail();}
  if(s.competition==='cup'){if(!P.due(s)||!P.fixtureFor(s))fail();}else if(P.due(s))fail();
  if(s.competition==='europe'){if(!U?.due(s)||!U.fixtureFor(s))fail();}else if(s.competition!=='cup'&&U?.due(s))fail();
  if(s.competition==='league'&&s.round===14){if(s.match!==null||!P.ready(s)||!(U?.ready(s)??true))fail();}else{
   if(raw.version>=8&&s.match?.version!==5)fail();try{s.match=F.restore(s.match);}catch{fail();}const expected=makeMatch(s),m=s.match;if(!!m.discipline!==(s.disciplineRules===1)||m.seed!==expected.seed||m.isHome!==expected.isHome||JSON.stringify(m.opponent)!==JSON.stringify(expected.opponent)||s.competition==='cup'&&m.rng!==P.rngFor(s,P.fixtureFor(s),m.minute)||s.competition==='europe'&&m.rng!==U.rngFor(s,U.fixtureFor(s),m.minute))fail();m.homeName=expected.homeName;m.opponentName=expected.opponentName;
   for(const p of Object.values(m.players)){const squad=s.squad[p.id];if(p.initialEnergy!==squad.energy||p.identity!==squad.identity||p.potential!==squad.potential||p.injuryRemaining!==(squad.injury?.remaining||0))fail();for(const key of ['attack','defense','passing','speed','endurance','keeping'])if(p[key]!==squad[key])fail();}
  }
  const table=standings(s);if(legacy){E.initialize(s);if(s.round===14)s.finance.outcome=E.goal(s,table);}if(raw.version<4)C.initialize(s);s.version=9;try{Staff?.restore(s,raw.staff);E.validate(s,table);P.validateHistory(s);U?.validateHistory(s);H.validate(s);if(raw.version<8)ST.initialize(s,{legacy:true});else ST.restore(s,raw.statistics);C.validate(s);}catch{fail();}
  if(s.round===0)s.lastReport=null;else{
   const lastEntry=s.finance.ledger.filter(e=>e.year===s.year&&['match','cup','europe'].includes(e.type)).at(-1),lastCup=lastEntry?.type==='cup'?s.cup.results.find(r=>r.stage===lastEntry.stage&&(r.home===own||r.away===own)):null,lastEurope=lastEntry?.type==='europe'?s.europe.results.find(r=>r.stage===lastEntry.stage&&(r.home===own||r.away===own)):null,last=lastEurope||lastCup||s.results.slice(-4).find(f=>f.home===own||f.away===own),me=table.find(c=>c.id===own),changes=[];
   if(Array.isArray(raw.lastReport?.changes))for(const c of raw.lastReport.changes){let person;try{person=!legacy&&typeof c?.identity!=='string'?null:F.profileForSlot(c?.id,legacy?c?.id:c?.identity);}catch{person=null;}if(!person||!s.squad[c.id]||c.key!==primaryKey(person)||!Number.isInteger(c.gained)||c.gained!==1){changes.length=0;break;}changes.push({id:c.id,identity:person.identity,name:person.name,key:c.key,gained:c.gained});}
   const cashflow=lastEntry||s.finance.ledger.find(e=>e.id==='match-'+s.year+'-'+s.round);
   const nonLeague=lastEurope||lastCup;s.lastReport={competition:lastEurope?'europe':lastCup?'cup':'league',round:nonLeague?nonLeague.week:s.round,fixturehome:last.home,opponent:last.home===own?last.away:last.home,score:orient(last,'goals'),penalties:nonLeague?.penalties?orient(nonLeague,'penalties'):null,kicks:nonLeague?orient(nonLeague,'kicks'):[[],[]],winner:nonLeague?nonLeague.winner:last.goals[0]===last.goals[1]?null:last.goals[0]>last.goals[1]?last.home:last.away,changes,rank:me.rank,points:me.points,cashflow:cashflow?copy(cashflow):null};if(nonLeague){s.lastReport.stage=nonLeague.stage;s.lastReport.title=(lastEurope?U:P).stageNames[nonLeague.stage];}
  }
  try{CL?.restore(s,raw.clubLife);Board?.restore(s,raw.ownerBoard);Suspensions?.validate(s);SquadPlans?.validate(s);TransferPlans?.validate(s);Story?.validate(s);}catch{fail();}
  return s;
 }
 function recruit(s,identity,slot){if(s.match?.decisions?.some(d=>d.type==='talk'&&d.lineup.includes(slot)))throw Error('팀 대화를 마친 선수의 영입 교체는 다음 경기 전에 할 수 있어요. 영입 뒤 팀 대화를 진행하세요.');const next=E.recruit(s,identity,slot);C.register(next,slot);if(next.suspensions){if(next.match.decisions.some(d=>d.type==='talk'))throw Error('출전 정지 적용 중에는 팀 대화 전에 영입을 마쳐 주세요.');Suspensions.apply(next);}return next;}
 const api={clubs,clubReferences,fiveTierPools,own,club,rawClub,presentClub,displayText,fixtures,leagueClubs,fixturesFor,divisionInfo,leagueForYear,movement,leagueFixture,fixtureFor,opponentFor,create,standings,train,settle,nextSeason,restore,primaryKey,recruit,scout:C.scout,rotate:H.rotate,selectNextMatch,ready};root.Season=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
