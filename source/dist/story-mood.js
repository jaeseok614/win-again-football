(function(root){
 'use strict';
 const clamp=n=>Math.max(-2,Math.min(2,n)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),football=()=>root.Football||require('./engine.js'),story=()=>root.ClubStory||require('./club-story.js');
 const relations=['board','fans','coach','captain','rookie'];
 function sources(s,cutoff=(s.clubStory?.records||[]).length){
  const records=(s.clubStory?.records||[]).slice(0,cutoff),events=story().events(s),latest=new Map();
  for(const r of records){if(r.step!==1||!r.event.startsWith(s.year+':')||s.round-r.atRound<0||s.round-r.atRound>=2)continue;const e=events.find(e=>e.id===r.event),first=records.find(a=>a.event===r.event&&a.step===0);if(!e||!first)continue;latest.set(e.relation,{event:r.event,relation:e.relation,actor:r.actor,first:first.choice,last:r.choice,atRound:r.atRound});}
  return [...latest.values()].sort((a,b)=>relations.indexOf(a.relation)-relations.indexOf(b.relation));
 }
 function snapshot(s,cutoff=(s.clubStory?.records||[]).length){const rows=sources(s,cutoff);return rows.length?{version:1,year:s.year,round:s.round,cutoff,sources:rows}:null;}
 function apply(s,m=s.match){if(!m||m.phase!=='prep')return;const next=snapshot(s);if(next)m.storyMood=next;else delete m.storyMood;}
 function contribution(source,player){
  if(['captain','rookie'].includes(source.relation)&&source.actor!==player.identity)return 0;
  const t=football().mentalProfile(player);let n=source.first==='listen'?(t.loyalty>=14||t.pressure<=9?1:0):source.first==='bold'?(t.professionalism>=15&&t.pressure>=12?1:t.pressure<=10?-1:0):t.professionalism>=12?1:0;
  if(source.last==='commit'){if(t.pressure<=9)n--;else if(t.determination>=15)n++;}else if(t.pressure<=9)n++;
  return clamp(n);
 }
 function value(m,p){return clamp((m.storyMood?.sources||[]).reduce((n,r)=>n+contribution(r,p),0));}
 function validateMatch(m){if(!Object.hasOwn(m,'storyMood'))return;const c=m.storyMood,fail=()=>{throw Error('서사 경기 준비 기록을 확인할 수 없어요.');};if(!c||Object.keys(c).length!==5||c.version!==1||!Number.isInteger(c.year)||c.year<1||!Number.isInteger(c.round)||c.round<0||c.round>46||!Number.isInteger(c.cutoff)||c.cutoff<2||!Array.isArray(c.sources)||!c.sources.length||c.sources.length>5)fail();const seen=new Set();for(const r of c.sources){if(!r||Object.keys(r).length!==6||!relations.includes(r.relation)||seen.has(r.relation)||typeof r.event!=='string'||!r.event.startsWith(c.year+':')||!Number.isInteger(r.atRound)||r.atRound<0||r.atRound>c.round||c.round-r.atRound>=2||!['listen','bold','practical'].includes(r.first)||!['commit','honest'].includes(r.last)||typeof r.actor!=='string'||(['captain','rookie'].includes(r.relation)?!football().identityProfile(r.actor):r.actor!==r.relation))fail();seen.add(r.relation);}}
 function validateSeason(s){const c=s.match?.storyMood;if(!c)return;validateMatch(s.match);if(c.cutoff>(s.clubStory?.records||[]).length||!same(c,snapshot(s,c.cutoff)))throw Error('대화와 경기 준비 기록이 일치하지 않아요.');}
 function summary(m){const rows=Object.values(m?.players||{}).map(p=>({identity:p.identity,name:p.name,value:value(m,p)})),values=rows.map(p=>p.value);return {active:!!m?.storyMood,rows,min:values.length?Math.min(...values):0,max:values.length?Math.max(...values):0,positive:rows.filter(p=>p.value>0).length,negative:rows.filter(p=>p.value<0).length};}
 function describe(s,event){const records=s.clubStory?.records||[],done=records.find(r=>r.event===event&&r.step===1);if(!done)return null;const first=records.find(r=>r.event===event&&r.step===0),year=Number(event.split(':')[0]),e=story().events(s,year).find(e=>e.id===event);if(!e)return null;const source={relation:e.relation,actor:done.actor,first:first.choice,last:done.choice},players=Object.values(s.match?.players||s.squad),reactions=players.map(p=>contribution(source,p)),current=s.match?.storyMood?.sources.some(r=>r.event===event),remaining=year===s.year?Math.max(0,2-(s.round-done.atRound)):0;
  if(!remaining)return '이 대화의 경기력 적용 기간은 끝났습니다. 영구 능력치는 바뀌지 않았습니다.';
  return '현재 선수단의 반응: 집중 상승 '+reactions.filter(n=>n>0).length+'명 · 부담 '+reactions.filter(n=>n<0).length+'명.\n'+(current?'현재 경기 준비에 반영 중.':s.match?.phase!=='prep'?'진행 중인 경기는 유지하고 다음 경기부터 반영합니다.':sources(s).some(r=>r.event===event)?'다음 경기 준비부터 반영됩니다.':'같은 관계의 더 최근 대화가 우선 반영됩니다.')+'\n경기 집중도는 서사 전체 합계 최대 ±2%. 두 리그 경기가 지나면 사라지며, 그 사이 컵 경기에도 적용됩니다. 영구 능력치는 바뀌지 않습니다.';
 }
 const api={sources,snapshot,apply,contribution,value,validateMatch,validateSeason,summary,describe};root.StoryMood=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
