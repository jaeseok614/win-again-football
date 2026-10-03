(function(root){
 'use strict';
 const own='brynwell',copy=x=>JSON.parse(JSON.stringify(x)),step=n=>(Math.imul(n,1664525)+1013904223)>>>0;
 const gates=Object.freeze([2,4,6,8,10,12,13,14]),stageNames=Object.freeze(['조별리그 1차전','조별리그 2차전','조별리그 3차전','조별리그 4차전','조별리그 5차전','조별리그 6차전','준결승','결승']);
 const clubs=Object.freeze([
  {id:'meridian',name:'메리디안 FC',en:'Meridian FC',short:'메리디안',code:'ME',color:'#e5b9be',country:'스페인',style:'정교한 패스와 빠른 침투가 강한 유럽 강호',attack:92,defense:87,middle:92,speed:83},
  {id:'steinbruck',name:'슈타인브뤼크 04',en:'Steinbruck 04',short:'슈타인브뤼크',code:'ST',color:'#92b8db',country:'독일',style:'견고한 수비와 강한 전방 압박',attack:91,defense:92,middle:88,speed:80},
  {id:'argento',name:'아르젠토 레이싱',en:'Argento Racing',short:'아르젠토',code:'AR',color:'#cdb9eb',country:'프랑스',style:'빠른 측면 돌파로 수비를 흔드는 팀',attack:90,defense:87,middle:89,speed:90},
  {id:'caldera',name:'칼데라 스포르팅',en:'Caldera Sporting',short:'칼데라',code:'CS',color:'#94d1b5',country:'포르투갈',style:'창의적인 중원과 날카로운 역습',attack:87,defense:84,middle:90,speed:86},
  {id:'portovalente',name:'포르토발렌테 칼초',en:'Portovalente Calcio',short:'포르토발렌테',code:'PV',color:'#d4c49a',country:'이탈리아',style:'촘촘한 수비와 침착한 경기 운영',attack:88,defense:94,middle:90,speed:76},
  {id:'northhaven',name:'노스헤이븐 로열',en:'Northhaven Royal',short:'노스헤이븐',code:'NR',color:'#e0a271',country:'네덜란드',style:'중원의 패스로 공격을 이어가는 팀',attack:89,defense:85,middle:94,speed:85},
  {id:'bramwich',name:'브램위치 유나이티드',en:'Bramwich United',short:'브램위치',code:'BU',color:'#d5a9ab',country:'잉글랜드',style:'균형 잡힌 전력과 빠른 경기 전환',attack:93,defense:91,middle:93,speed:88}
 ].map(club=>Object.freeze(club)));
 const overseas=Object.fromEntries(clubs.map(c=>[c.id,c])),clubIds=[own,...clubs.map(c=>c.id)],ownProfile={id:own,name:'브린웰 로버스',en:'Brynwell Rovers',short:'브린웰',code:'BR',color:'#c8f36e',attack:70,defense:70,middle:71,speed:68};
 const fail=()=>{throw Error('저장한 챔피언스리그 대회를 읽을 수 없어요.');},integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
 function club(id){return overseas[id];}
 function profile(id){return overseas[id]||(id===own?(root.Season?.club(own)||ownProfile):null);}
 function qualification(s){const previous=s.history?.find(h=>h.year===s.year-1);return previous?.division===1&&integer(previous.rank,1,2)?{year:previous.year,division:1,rank:previous.rank}:null;}
 function shuffled(s){let rng=(s.seed^Math.imul(s.year,2654435761)^1163219535)>>>0,ids=[...clubIds];for(let i=ids.length-1;i>0;i--){rng=step(rng);const j=Math.floor(rng/4294967296*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return [ids.slice(0,4),ids.slice(4)];}
 function initialize(s,{legacy=false}={}){const proof=qualification(s);s.europe={version:1,legacy:!!legacy,originRound:legacy?s.round:0,enabled:!legacy&&!!proof,qualification:proof,groups:shuffled(s),stage:0,results:[],champion:null};return s;}
 function gateFor(s,stage=s.europe?.stage){return integer(stage,0,7)?gates[stage]:14;}
 function due(s){return !!s.europe?.enabled&&s.europe.stage<8&&s.round>=gateFor(s);}
 function ready(s){return !s.europe?.enabled||s.europe.stage===8;}
 function schedule(ids){const ring=[...ids],first=[];for(let r=0;r<3;r++){const games=[];for(let i=0;i<2;i++){const a=ring[i],b=ring[3-i];games.push((r+i)%2?{home:b,away:a}:{home:a,away:b});}first.push(games);ring.splice(1,0,ring.pop());}return first.concat(first.map(games=>games.map(f=>({home:f.away,away:f.home}))));}
 function standings(s,group=0){
  const index=group==='A'?0:group==='B'?1:group;if(!integer(index,0,1)||!Array.isArray(s.europe?.groups?.[index]))throw Error('챔피언스리그 A조 또는 B조를 선택하세요.');
  const rows=s.europe.groups[index].map(id=>({...profile(id),played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
  for(const r of s.europe.results){if(r.stage>=6||!rows.some(row=>row.id===r.home))continue;const a=rows.find(row=>row.id===r.home),b=rows.find(row=>row.id===r.away),[x,y]=r.goals;a.played++;b.played++;a.gf+=x;a.ga+=y;b.gf+=y;b.ga+=x;if(x>y){a.won++;a.points+=3;b.lost++;}else if(x<y){b.won++;b.points+=3;a.lost++;}else{a.drawn++;b.drawn++;a.points++;b.points++;}}
  return rows.map(c=>({...c,gd:c.gf-c.ga})).sort((a,b)=>b.points-a.points||b.gd-a.gd||b.gf-a.gf||a.en.localeCompare(b.en,'en')).map((c,i)=>({...c,rank:i+1}));
 }
 function fixturesFor(s,stage=s.europe?.stage){
  if(!s.europe||!integer(stage,0,7))return [];
  if(stage<6)return s.europe.groups.flatMap(group=>schedule(group)[stage]).map((f,index)=>({stage,index,...f}));
  if(stage===6){if(s.europe.results.filter(r=>r.stage<6).length!==24)return [];const a=standings(s,0),b=standings(s,1);return [{stage,index:0,home:a[0].id,away:b[1].id},{stage,index:1,home:b[0].id,away:a[1].id}];}
  const semis=s.europe.results.filter(r=>r.stage===6).sort((a,b)=>a.index-b.index);return semis.length===2?[{stage,index:0,home:semis[0].winner,away:semis[1].winner}]:[];
 }
 function fixtureFor(s){return due(s)?fixturesFor(s).find(f=>f.home===own||f.away===own)||null:null;}
 function seedFor(s,f){let n=(s.seed^Math.imul(s.year,2654435761)^Math.imul(f.stage+1,2246822519)^Math.imul(f.index+1,3266489917)^1163219535)>>>0;for(const ch of f.home+f.away)n=(Math.imul(n,16777619)^ch.charCodeAt(0))>>>0;return n;}
 function rngFor(s,f,minute=90){let rng=seedFor(s,f);for(let i=0;i<minute*8;i++)rng=step(rng);return rng;}
 function shootout(seed,rng){let random=(seed^rng^0x4555504b)>>>0,score=[0,0],kicks=[[],[]];for(let round=0;round<20;round++){for(let team=0;team<2;team++){random=step(random);const goal=round===19?team===0:random/4294967296<.75;kicks[team].push(goal);score[team]+=Number(goal);}if(round>=4&&score[0]!==score[1])return {penalties:score,kicks};}throw Error('유럽 대회 승부차기를 결정할 수 없어요.');}
 function resultFor(s,f,goals){const penalties=f.stage>=6&&goals[0]===goals[1]?shootout(seedFor(s,f),rngFor(s,f)):{penalties:null,kicks:[[],[]]},decisive=penalties.penalties||goals,winner=decisive[0]===decisive[1]?null:decisive[0]>decisive[1]?f.home:f.away;return {...f,goals:[...goals],...penalties,winner,week:gateFor(s,f.stage)};}
 function aiResult(s,f){let rng=seedFor(s,f),goals=[0,0];const a=profile(f.home),b=profile(f.away);for(let minute=0;minute<90;minute++){rng=step(rng);if(rng/4294967296<(1.35+(a.attack-b.defense)*.028)/90)goals[0]++;rng=step(rng);if(rng/4294967296<(1.22+(b.attack-a.defense)*.028)/90)goals[1]++;}return resultFor(s,f,goals);}
 function preview(s,m){const f=fixtureFor(s);if(!f||!m||m.phase!=='full'||m.minute!==90||m.seed!==seedFor(s,f)||m.rng!==rngFor(s,f)||!Array.isArray(m.score)||m.score.length!==2||m.score.some(n=>!integer(n,0,90)))throw Error('현재 챔피언스리그 경기를 끝낸 뒤 결과를 확인하세요.');return resultFor(s,f,f.home===own?m.score:[m.score[1],m.score[0]]);}
 function completeStage(s,results){s.europe.results.push(...results);s.europe.stage++;if(s.europe.stage===8)s.europe.champion=results[0].winner;return s;}
 function settle(s,m){const result=preview(s,m),results=fixturesFor(s).map(f=>f.index===result.index?result:aiResult(s,f));return completeStage(s,results);}
 function advanceAI(s){if(!due(s)||fixtureFor(s))throw Error('감독의 챔피언스리그 경기를 먼저 진행하세요.');const fixtures=fixturesFor(s);if(!fixtures.length)throw Error('챔피언스리그 다음 대진을 확인하세요.');return completeStage(s,fixtures.map(f=>aiResult(s,f)));}
 function validate(s){
  const e=s.europe,proof=qualification(s);if(!exact(e,['version','legacy','originRound','enabled','qualification','groups','stage','results','champion'])||e.version!==1||typeof e.legacy!=='boolean'||typeof e.enabled!=='boolean'||!integer(e.originRound,0,s.round)||!integer(e.stage,0,8)||!equal(e.qualification,proof)||!equal(e.groups,shuffled(s))||!Array.isArray(e.results)||e.results.length!==[0,4,8,12,16,20,24,26,27][e.stage])fail();
  if(e.enabled!==(!e.legacy&&!!proof)||!e.legacy&&e.originRound!==0||e.enabled&&s.league?.division!==1||!e.enabled&&(e.stage!==0||e.results.length||e.champion!==null)||due(s)&&s.round!==gateFor(s))fail();
  let offset=0;for(let stage=0;stage<e.stage;stage++){if(gateFor(s,stage)>s.round)fail();for(const fixture of fixturesFor(s,stage)){
   const r=e.results[offset++];if(!exact(r,['stage','index','home','away','goals','penalties','kicks','winner','week'])||r.stage!==stage||r.index!==fixture.index||r.home!==fixture.home||r.away!==fixture.away||r.week!==gateFor(s,stage)||!Array.isArray(r.goals)||r.goals.length!==2||r.goals.some(n=>!integer(n,0,90)))fail();
   const expected=fixture.home===own||fixture.away===own?resultFor(s,fixture,r.goals):aiResult(s,fixture);for(const key of ['penalties','kicks','winner'])if(!equal(r[key],expected[key]))fail();if(fixture.home!==own&&fixture.away!==own&&!equal(r.goals,expected.goals))fail();
  }}
  if(offset!==e.results.length||e.champion!==(e.stage===8?e.results.at(-1).winner:null))fail();return s;
 }
 function restore(s,raw){if(raw===undefined){if(s.finance?.ledger?.some(e=>e.type==='europe'&&e.year===s.year))fail();return initialize(s,{legacy:true});}s.europe=copy(raw);return validate(s);}
 function canonicalReceipt(s,e){
  if(!e||e.type!=='europe'||!integer(e.year,1,s.year)||!integer(e.stage,0,7)||!integer(e.index,0,e.stage<6?3:e.stage===6?1:0)||e.id!=='europe-'+e.year+'-'+e.stage||e.round!==gates[e.stage]||!clubIds.includes(e.home)||!clubIds.includes(e.away)||e.home===e.away||![e.home,e.away].includes(own)||!Array.isArray(e.goals)||e.goals.length!==2||e.goals.some(n=>!integer(n,0,90)))fail();
  const expected=resultFor({seed:s.seed,year:e.year},{stage:e.stage,index:e.index,home:e.home,away:e.away},e.goals);for(const key of ['winner','penalties','kicks'])if(!equal(e[key],expected[key]))fail();return expected;
 }
 function validateReceipt(s,e){
  const expected=canonicalReceipt(s,e);if(e.year===s.year){if(!s.europe?.enabled||e.stage>s.europe.stage||e.round>s.round)fail();const fixture=fixturesFor(s,e.stage).find(f=>f.index===e.index);if(!fixture||fixture.home!==e.home||fixture.away!==e.away)fail();const result=s.europe.results.find(r=>r.stage===e.stage&&r.index===e.index);if(result){for(const key of ['stage','index','home','away','goals','penalties','kicks','winner','week'])if(!equal(result[key],expected[key]))fail();}else if(e.stage!==s.europe.stage||!due(s)||fixtureFor(s)?.index!==e.index)fail();}return true;
 }
 function historicalChampion(s,year,entries){
  if(!entries.length)return null;const past={seed:s.seed,year,round:14,league:{division:1},history:s.history.filter(h=>h.year<year)};initialize(past);if(!past.europe.enabled)fail();let played=0;
  for(let stage=0;stage<8;stage++){const results=fixturesFor(past).map(f=>{if(f.home!==own&&f.away!==own)return aiResult(past,f);const receipt=entries.find(e=>e.stage===stage);if(!receipt||receipt.index!==f.index||receipt.home!==f.home||receipt.away!==f.away)fail();const result=canonicalReceipt(s,receipt);played++;return result;});completeStage(past,results);}
  if(played!==entries.length)fail();validate(past);return past.europe.champion;
 }
 function validateHistory(s){
  const receipts=s.finance?.ledger?.filter(e=>e.type==='europe')||[],years=new Map();for(const e of receipts){canonicalReceipt(s,e);if(!years.has(e.year))years.set(e.year,[]);years.get(e.year).push(e);}
  for(const h of s.history||[])if((h.europeChampion??null)!==historicalChampion(s,h.year,years.get(h.year)||[]))fail();
  const current=years.get(s.year)||[],ownResults=(s.europe?.results||[]).filter(r=>r.home===own||r.away===own);if(current.length!==ownResults.length)fail();for(const e of current)validateReceipt(s,e);return s;
 }
 const api={own,clubs,club,qualification,initialize,restore,due,ready,fixtureFor,fixturesFor,seedFor,rngFor,preview,settle,advanceAI,validate,validateHistory,validateReceipt,standings,stageNames,gates,gateFor};root.Europe=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
