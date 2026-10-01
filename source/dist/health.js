(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),copy=x=>JSON.parse(JSON.stringify(x));
 const minimum={GK:1,DEF:4,MID:5,FW:3},kinds=['muscle','knock'];
 const kindLabel=kind=>({muscle:'근육 부상',knock:'타박상'}[kind]||'부상');
 const ownCupResults=s=>(Array.isArray(s.cup?.results)?s.cup.results:[]).filter(r=>r.home==='brynwell'||r.away==='brynwell');
 function completed(s,h=s.health){return s.round-h.originRound+ownCupResults(s).length-h.originCupGames;}
 function latestCompetition(s){const result=ownCupResults(s).at(-1);return result&&result.week===s.round?'cup':'league';}
 function canonical(id,identity){const slot=F.roster.find(p=>p.id===id),person=typeof identity==='string'?F.identityProfile(identity):null;if(!slot||!person||slot.pos!==person.pos)throw Error('등록한 선수의 건강 기록을 확인할 수 없어요.');return {id,identity:person.identity,name:person.name};}
 function normalizeInjury(injury){
  if(injury===null)return null;
  if(!injury||typeof injury!=='object'||Array.isArray(injury)||![1,2].includes(injury.remaining)||!kinds.includes(injury.kind)||!Number.isInteger(injury.since)||injury.since<1)throw Error('선수의 부상 기록을 읽을 수 없어요.');
  return {remaining:injury.remaining,kind:injury.kind,since:injury.since};
 }
 function initialize(s,{legacy=false}={}){
  for(const p of Object.values(s.squad))p.injury=null;
  s.health={version:1,year:s.year,originRound:legacy?s.round:0,originCupGames:legacy?ownCupResults(s).length:0,playedGames:0,lastReport:null};return s;
 }
 function riskFor(m,p){
  if(!p||!Number.isFinite(p.minutes)||p.minutes<30||!Number.isFinite(p.energy))return 0;
  const pressMinutes=(Array.isArray(m?.segments)?m.segments:[]).filter(segment=>segment.tactic==='press'&&segment.lineup?.includes(p.id)).reduce((sum,segment)=>sum+Math.max(0,(segment.end??m.minute)-segment.start),0);
  return Math.min(.20,Math.max(0,(.01+Math.max(0,60-p.energy)*.0025+pressMinutes/90*.02)*(p.minutes/90)));
 }
 function randomFor(s,m,identity,game,salt){
  let hash=2166136261;const input=[s.seed,m.seed,m.rng,s.year,game,identity,salt].join('|');for(const ch of input)hash=(Math.imul(hash,16777619)^ch.charCodeAt(0))>>>0;
  hash^=hash>>>16;hash=Math.imul(hash,0x85ebca6b)>>>0;hash^=hash>>>13;hash=Math.imul(hash,0xc2b2ae35)>>>0;hash^=hash>>>16;return (hash>>>0)/4294967296;
 }
 function afterMatch(s,m){
  const h=s.health,game=h?.playedGames+1;if(!h||h.year!==s.year||!Number.isInteger(h.playedGames)||!m||m.phase!=='full'||m.minute!==90||completed(s)!==game||!['league','cup'].includes(s.competition))throw Error('완료한 경기의 건강 기록만 반영할 수 있어요.');
  for(const p of Object.values(s.squad)){const played=m.players?.[p.id];if(!played||played.identity!==p.identity||p.injury&&played.minutes>0)throw Error('출전 선수의 건강 기록을 확인할 수 없어요.');}
  const recovered=[];
  for(const p of Object.values(s.squad))if(p.injury){p.injury.remaining--;if(p.injury.remaining===0){p.injury=null;recovered.push(canonical(p.id,p.identity));}}
  const fit=Object.fromEntries(Object.keys(minimum).map(pos=>[pos,Object.values(s.squad).filter(p=>p.pos===pos&&!p.injury).length]));
  const candidates=Object.values(s.squad).filter(p=>!p.injury&&m.players[p.id].minutes>=30).map(p=>({p,risk:riskFor(m,m.players[p.id])*(root.Staff?.medicalModifier(s)??1)})).filter(({p,risk})=>randomFor(s,m,p.identity,game,'occurrence')<risk).sort((a,b)=>b.risk-a.risk||a.p.id.localeCompare(b.p.id));
  const incidents=[];
  for(const {p,risk} of candidates){if(incidents.length===2)break;if(fit[p.pos]-1<minimum[p.pos])continue;
   const remaining=randomFor(s,m,p.identity,game,'duration')<.85?1:2,kind=randomFor(s,m,p.identity,game,'kind')<.6?'muscle':'knock';p.injury={remaining,kind,since:game};fit[p.pos]--;incidents.push({...canonical(p.id,p.identity),kind,remaining,risk});
  }
  h.playedGames=game;h.lastReport={game,year:s.year,round:s.round,competition:s.competition,incidents,recovered};validate(s);return h.lastReport;
 }
 function rotate(s){
  const m=s.match;if(!m||m.phase!=='prep'||m.minute!==0||!F.formations[m.formation])throw Error('체력순 선발은 경기 준비 때 정할 수 있어요.');
  const before=[...m.lineup],counts={GK:1,...F.formations[m.formation]},after=[];
  for(const [pos,count] of Object.entries(counts)){
   const fit=Object.values(m.players).filter(p=>p.pos===pos&&!s.squad[p.id].injury&&(!F.isAvailable||F.isAvailable(p))).sort((a,b)=>b.energy-a.energy||b[F.roleKey(b)]-a[F.roleKey(a)]||a.id.localeCompare(b.id));
   if(fit.length<count)throw Error('이 포메이션에 필요한 출전 가능 선수가 부족해요.');after.push(...fit.slice(0,count).map(p=>p.id));
  }
  const outgoing=before.filter(id=>!after.includes(id)),incoming=after.filter(id=>!before.includes(id)),changes=outgoing.map(out=>({out,in:incoming.splice(incoming.findIndex(id=>m.players[id].pos===m.players[out].pos),1)[0]}));
  m.lineup=[...after];s.plan={...s.plan,formation:m.formation,lineup:[...after]};return {before,after:[...after],changes};
 }
 function restore(s,rawHealth,rawSquad){
  if(!rawHealth||!rawSquad)throw Error('저장한 선수 건강 기록을 읽을 수 없어요.');
  const health=copy(rawHealth);for(const p of Object.values(s.squad))p.injury=normalizeInjury(rawSquad[p.id]?.injury);
  if(health.lastReport!==null){const report=health.lastReport;if(!report||!Array.isArray(report.incidents)||report.incidents.length>2||!Array.isArray(report.recovered)||report.recovered.length>18)throw Error('경기 뒤 건강 보고서를 읽을 수 없어요.');report.incidents=report.incidents.map(row=>({...row,...canonical(row?.id,row?.identity)}));report.recovered=report.recovered.map(row=>canonical(row?.id,row?.identity));}
  s.health=health;return validate(s);
 }
 function validate(s){
  const fail=()=>{throw Error('저장한 선수 건강 기록을 읽을 수 없어요.');},h=s.health,cupCount=ownCupResults(s).length;
  if(!h||h.version!==1||h.year!==s.year||!Number.isInteger(h.originRound)||h.originRound<0||h.originRound>s.round||!Number.isInteger(h.originCupGames)||h.originCupGames<0||h.originCupGames>cupCount||cupCount>3||!Number.isInteger(h.playedGames)||h.playedGames<0||h.playedGames>17||h.playedGames!==completed(s)||Object.keys(s.squad||{}).length!==18)fail();
  let injured=0;for(const slot of F.roster){const p=s.squad[slot.id];if(!p||p.id!==slot.id||p.pos!==slot.pos)fail();try{canonical(p.id,p.identity);}catch{fail();}let injury;try{injury=normalizeInjury(p.injury);}catch{fail();}if(injury){injured++;if(injury.since>h.playedGames||injury.remaining+h.playedGames-injury.since>2)fail();}}
  if(injured>4||Object.entries(minimum).some(([pos,count])=>Object.values(s.squad).filter(p=>p.pos===pos&&!p.injury).length<count))fail();
  const report=h.lastReport;if(h.playedGames===0){if(report!==null||injured)fail();return s;}
  if(!report||report.game!==h.playedGames||report.year!==s.year||report.round!==s.round||report.competition!==latestCompetition(s)||!Array.isArray(report.incidents)||report.incidents.length>2||!Array.isArray(report.recovered)||report.recovered.length>18)fail();
  const rows=[...report.incidents,...report.recovered];if(new Set(rows.map(row=>row?.id)).size!==rows.length||new Set(rows.map(row=>row?.identity)).size!==rows.length)fail();
  for(const row of rows){let person;try{person=canonical(row?.id,row?.identity);}catch{fail();}if(row.name!==person.name)fail();}
  for(const row of report.incidents){if(!kinds.includes(row.kind)||![1,2].includes(row.remaining)||!Number.isFinite(row.risk)||row.risk<=0||row.risk>.20)fail();const p=s.squad[row.id];if(p.identity===row.identity&&(!p.injury||p.injury.since!==report.game||p.injury.kind!==row.kind||p.injury.remaining!==row.remaining))fail();}
  for(const row of report.recovered){const p=s.squad[row.id];if(p.identity===row.identity&&p.injury!==null)fail();}
  for(const p of Object.values(s.squad))if(p.injury?.since===report.game&&!report.incidents.some(row=>row.id===p.id&&row.identity===p.identity))fail();
  return s;
 }
 const api={kindLabel,riskFor,rotate,initialize,afterMatch,restore,validate};root.Health=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
