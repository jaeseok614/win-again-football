(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),E=root.Economy||(typeof require==='function'?require('./economy.js'):null);
 const clubs=[
  {id:'brynwell',name:'브린웰 로버스',en:'Brynwell Rovers',short:'브린웰',code:'BR',color:'#c8f36e',style:'빠른 유망주를 가진 작은 시민 구단',attack:70,defense:70,middle:71,speed:68},
  {id:'aldermere',name:'올더미어 유나이티드',en:'Aldermere United',short:'올더미어',code:'AU',color:'#cf7a8c',style:'견고한 수비와 힘 있는 공격',attack:78,defense:84,middle:76,speed:56},
  {id:'norhaven',name:'노르헤이븐 시티',en:'Norhaven City',short:'노르헤이븐',code:'NC',color:'#7ab3cd',style:'짧은 패스로 점유율을 높이는 항구 구단',attack:84,defense:78,middle:87,speed:60},
  {id:'bellwick',name:'벨윅 애슬레틱',en:'Bellwick Athletic',short:'벨윅',code:'BA',color:'#b197dc',style:'빠른 측면 공격, 수비에는 빈틈',attack:75,defense:68,middle:72,speed:78},
  {id:'redmere',name:'레드미어 FC',en:'Redmere FC',short:'레드미어',code:'RF',color:'#eea060',style:'높은 압박으로 승부하는 공업 도시 구단',attack:79,defense:74,middle:78,speed:70},
  {id:'montevaro',name:'몬테바로 SC',en:'Montevaro SC',short:'몬테바로',code:'MS',color:'#e2858b',style:'기술적인 공격수가 이끄는 우승 후보',attack:87,defense:81,middle:84,speed:66},
  {id:'selcanto',name:'셀칸토 UD',en:'Selcanto UD',short:'셀칸토',code:'SU',color:'#71c4b7',style:'창의적인 중원, 역습에는 흔들리는 수비',attack:77,defense:70,middle:82,speed:53},
  {id:'falkenruh',name:'팔켄루 04',en:'Falkenruh 04',short:'팔켄루',code:'F04',color:'#b8c9ba',style:'강한 중원과 느린 수비진을 가진 전통 구단',attack:79,defense:75,middle:80,speed:48}
 ];
 const own='brynwell',club=id=>clubs.find(c=>c.id===id),copy=x=>JSON.parse(JSON.stringify(x)),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const primaryKey=p=>({GK:'keeping',DEF:'defense',MID:'passing',FW:'attack'}[p.pos]);
 function schedule(){const ring=clubs.map(c=>c.id),first=[];for(let r=0;r<7;r++){const games=[];for(let i=0;i<4;i++){const a=ring[i],b=ring[7-i];games.push((r+i)%2?{home:b,away:a}:{home:a,away:b});}first.push(games);ring.splice(1,0,ring.pop());}return first.concat(first.map(games=>games.map(g=>({home:g.away,away:g.home}))));}
 const fixtures=schedule();
 function seedFor(s,r,fixture){let n=(s.seed^Math.imul(s.year,2654435761)^Math.imul(r+1,2246822519))>>>0;for(const ch of fixture.home+fixture.away)n=(Math.imul(n,16777619)^ch.charCodeAt(0))>>>0;return n;}
 function fixtureFor(s){return s.round<14?fixtures[s.round].find(g=>g.home===own||g.away===own):null;}
 function opponentFor(s){const f=fixtureFor(s);return f?club(f.home===own?f.away:f.home):null;}
 function makeMatch(s){const f=fixtureFor(s),opp=opponentFor(s);const m=F.create(seedFor(s,s.round,f),{players:s.squad,homeName:club(own).name,opponentName:opp.name,opponent:{attack:opp.attack,defense:opp.defense,middle:opp.middle,speed:opp.speed,energy:94},isHome:f.home===own});F.setFormation(m,s.plan.formation);if(s.plan.lineup.length===11){const expected={GK:1,...F.formations[s.plan.formation]};if(Object.entries(expected).every(([pos,n])=>s.plan.lineup.filter(id=>m.players[id]?.pos===pos).length===n))m.lineup=[...s.plan.lineup];}F.setTactic(m,s.plan.tactic);return m;}
 function create(seed=20260930){const squad=Object.fromEntries(F.roster.map(p=>[p.id,{...p,xp:0}])),s={version:3,seed:seed>>>0,year:1,round:0,squad,results:[],history:[],trained:null,lastReport:null,plan:{formation:'442',tactic:'balanced',lineup:F.create().lineup},match:null};E.initialize(s);s.match=makeMatch(s);return s;}
 function standings(s){const rows=clubs.map(c=>({...c,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));for(const result of s.results){const a=rows.find(c=>c.id===result.home),b=rows.find(c=>c.id===result.away),[x,y]=result.goals;a.played++;b.played++;a.gf+=x;a.ga+=y;b.gf+=y;b.ga+=x;if(x>y){a.won++;a.points+=3;b.lost++;}else if(x<y){b.won++;b.points+=3;a.lost++;}else{a.drawn++;b.drawn++;a.points++;b.points++;}}return rows.map(c=>({...c,gd:c.gf-c.ga})).sort((a,b)=>b.points-a.points||b.gd-a.gd||b.gf-a.gf||a.en.localeCompare(b.en,'en')).map((c,i)=>({...c,rank:i+1}));}
 function aiResult(s,r,f){let rng=seedFor(s,r,f),draw=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},a=club(f.home),b=club(f.away),goals=[0,0];for(let m=0;m<90;m++){if(draw()<(1.22+(a.attack-b.defense)*.028+.13)/90)goals[0]++;if(draw()<(1.22+(b.attack-a.defense)*.028)/90)goals[1]++;}return {round:r,home:f.home,away:f.away,goals};}
 function train(s,focus){if(!s.match||s.match.phase!=='prep'||s.trained)throw Error('훈련은 경기 전, 주마다 한 번 할 수 있어요.');if(!['technique','pace','fitness','recovery'].includes(focus))throw Error('훈련 종류를 선택하세요.');for(const p of Object.values(s.squad)){const m=s.match.players[p.id];if(focus==='recovery'){p.energy=clamp(p.energy+15,0,100);}else{const key=focus==='technique'?primaryKey(p):focus==='pace'?'speed':'endurance';p[key]=clamp(p[key]+1,0,key===primaryKey(p)?p.potential:99);p.energy=clamp(p.energy-({technique:5,pace:6,fitness:3}[focus]),0,100);m[key]=p[key];}m.energy=p.energy;m.initialEnergy=p.energy;}s.trained=focus;return s;}
 function settle(s){
  if(!s.match||s.match.phase!=='full'||s.match.minute!==90||s.round>=14||s.results.length!==s.round*4)throw Error('현재 경기를 끝낸 뒤 결과를 확정하세요.');
  const next=copy(s),m=next.match,f=fixtureFor(next),changes=[],cashflow=E.applyRound(next,f,m.score);
  for(const fixture of fixtures[next.round]){const result=fixture===f?{round:next.round,...fixture,goals:f.home===own?[...m.score]:[m.score[1],m.score[0]]}:aiResult(next,next.round,fixture);next.results.push(result);}
  for(const p of Object.values(next.squad)){const played=m.players[p.id];p.energy=clamp(played.energy+32,0,100);const beforeXp=Math.floor(p.xp/270);p.xp+=played.minutes;const growth=Math.floor(p.xp/270)-beforeXp,key=primaryKey(p),before=p[key];p[key]=clamp(p[key]+growth,0,p.potential);const gained=p[key]-before;if(gained)changes.push({id:p.id,identity:p.identity,name:p.name,key,gained});}
  next.plan={formation:m.formation,tactic:m.tactic,lineup:[...m.lineup]};const table=standings(next),rank=table.find(c=>c.id===own);
  next.lastReport={round:next.round+1,opponent:opponentFor(next).id,score:[...m.score],changes,rank:rank.rank,points:rank.points,cashflow:copy(cashflow)};
  next.round++;next.trained=null;if(next.round===14)E.finishSeason(next,table);next.match=next.round<14?makeMatch(next):null;return next;
 }
 function nextSeason(s){if(s.round!==14||s.match)throw Error('시즌을 끝낸 뒤 새 시즌을 시작할 수 있어요.');const next=copy(s),table=standings(s),me=table.find(c=>c.id===own);next.history.push({year:s.year,rank:me.rank,points:me.points,champion:table[0].id});next.year++;next.round=0;next.results=[];next.trained=null;next.lastReport=null;for(const p of Object.values(next.squad))p.energy=100;E.nextYear(next);next.match=makeMatch(next);return next;}
 function restore(raw){
  const fail=()=>{throw Error('저장한 시즌을 읽을 수 없어요.');};
  if(!raw||![2,3].includes(raw.version)||!Number.isInteger(raw.seed)||raw.seed<0||raw.seed>4294967295||!Number.isInteger(raw.year)||raw.year<1||raw.year>10000||!Number.isInteger(raw.round)||raw.round<0||raw.round>14||!Array.isArray(raw.results)||raw.results.length!==raw.round*4||!Array.isArray(raw.history)||raw.history.length!==raw.year-1)fail();
  const legacy=raw.version===2,s=copy(raw);if(Object.keys(s.squad||{}).length!==18)fail();
  for(const slot of F.roster){
   const saved=s.squad[slot.id];if(!legacy&&(typeof saved?.identity!=='string'||!F.identityProfile(saved.identity)))fail();let person;try{person=F.profileForSlot(slot.id,legacy?slot.id:saved.identity);}catch{fail();}
   if(!saved||!Number.isFinite(saved.energy)||saved.energy<0||saved.energy>100||!Number.isInteger(saved.xp)||saved.xp<0||saved.xp>100000000)fail();
   const stats={};for(const key of ['attack','defense','passing','speed','endurance','keeping']){if(!Number.isInteger(saved[key])||saved[key]<0||saved[key]>99)fail();stats[key]=saved[key];}
   const potential=legacy?Math.max(person.potential,stats[primaryKey(person)]):saved.potential;if(!Number.isInteger(potential)||potential<person.potential||potential>99||stats[primaryKey(person)]>potential)fail();
   s.squad[slot.id]={...person,...stats,potential,energy:saved.energy,xp:saved.xp};
  }
  if(new Set(Object.values(s.squad).map(p=>p.identity)).size!==18)fail();
  s.results.forEach((x,i)=>{const r=Math.floor(i/4),f=fixtures[r][i%4];if(!x||x.round!==r||x.home!==f.home||x.away!==f.away||!Array.isArray(x.goals)||x.goals.length!==2||x.goals.some(g=>!Number.isInteger(g)||g<0||g>90))fail();});
  if(!s.plan||!F.formations[s.plan.formation]||!['press','balanced','counter'].includes(s.plan.tactic)||!Array.isArray(s.plan.lineup)||s.plan.lineup.length!==11||new Set(s.plan.lineup).size!==11||s.plan.lineup.some(id=>!s.squad[id]))fail();
  for(const [pos,n] of Object.entries({GK:1,...F.formations[s.plan.formation]}))if(s.plan.lineup.filter(id=>s.squad[id].pos===pos).length!==n)fail();
  if(s.trained!==null&&!['technique','pace','fitness','recovery'].includes(s.trained))fail();
  if(s.history.some((h,i)=>!h||h.year!==i+1||!Number.isInteger(h.rank)||h.rank<1||h.rank>8||!Number.isInteger(h.points)||h.points<0||h.points>42||!club(h.champion)))fail();
  if(s.round===14){if(s.match!==null)fail();}else{
   try{s.match=F.restore(s.match);}catch{fail();}const expected=makeMatch(s),m=s.match;if(m.seed!==expected.seed||m.isHome!==expected.isHome||JSON.stringify(m.opponent)!==JSON.stringify(expected.opponent))fail();m.homeName=expected.homeName;m.opponentName=expected.opponentName;
   for(const p of Object.values(m.players)){const squad=s.squad[p.id];if(p.initialEnergy!==squad.energy||p.identity!==squad.identity||p.potential!==squad.potential)fail();for(const key of ['attack','defense','passing','speed','endurance','keeping'])if(p[key]!==squad[key])fail();}
  }
  const table=standings(s);if(legacy){E.initialize(s);if(s.round===14)s.finance.outcome=E.goal(s,table);}s.version=3;try{E.validate(s,table);}catch{fail();}
  if(s.round===0)s.lastReport=null;else{
   const last=s.results.slice(-4).find(f=>f.home===own||f.away===own),me=table.find(c=>c.id===own),changes=[];
   if(Array.isArray(raw.lastReport?.changes))for(const c of raw.lastReport.changes){let person;try{person=!legacy&&typeof c?.identity!=='string'?null:F.profileForSlot(c?.id,legacy?c?.id:c?.identity);}catch{person=null;}if(!person||!s.squad[c.id]||c.key!==primaryKey(person)||!Number.isInteger(c.gained)||c.gained!==1){changes.length=0;break;}changes.push({id:c.id,identity:person.identity,name:person.name,key:c.key,gained:c.gained});}
   const cashflow=s.finance.ledger.find(e=>e.id==='match-'+s.year+'-'+s.round);
   s.lastReport={round:s.round,opponent:last.home===own?last.away:last.home,score:last.home===own?[...last.goals]:[last.goals[1],last.goals[0]],changes,rank:me.rank,points:me.points,cashflow:cashflow?copy(cashflow):null};
  }
  return s;
 }
 const api={clubs,own,club,fixtures,fixtureFor,opponentFor,create,standings,train,settle,nextSeason,restore,primaryKey,recruit:E.recruit};root.Season=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
