(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),copy=x=>JSON.parse(JSON.stringify(x)),minimum={GK:1,DEF:4,MID:5,FW:3};
 const fail=()=>{throw Error('누적 경고와 출전 정지 기록을 확인할 수 없어요.');};
 function replay(s){
  const config=s.suspensions,buckets={league:new Map(),cup:new Map(),europe:new Map()};if(!config)return buckets;
  if(config.version!==1||config.year!==s.year||Object.keys(config).length!==3||!Number.isInteger(config.origin)||config.origin<0||config.origin>s.statistics.records.length)fail();
  for(const r of s.statistics.records.slice(config.origin)){
   const bucket=buckets[r.competition];if(!bucket||!Array.isArray(r.cards)||!Array.isArray(r.suspended)||new Set(r.suspended).size!==r.suspended.length)fail();
   for(const identity of r.suspended){const row=bucket.get(identity),p=r.players.find(p=>p.identity===identity);if(!row?.pending||!p||p.minutes!==0)fail();row.pending--;}
   const reds=new Set(r.cards.filter(e=>e.team===0&&e.card==='red').map(e=>e.id));
   for(const e of r.cards.filter(e=>e.team===0)){
    const p=r.players.find(p=>p.id===e.id);if(!p)fail();let row=bucket.get(p.identity);if(!row){row={identity:p.identity,yellows:0,pending:0,reason:'',source:r.id};bucket.set(p.identity,row);}
    // A sending-off costs one match. Its cautions do not also trigger accumulation.
    if(e.card==='red'){row.pending++;row.reason=e.reason==='second-yellow'?'경고 2회 퇴장':'직접 퇴장';row.source=r.id;}
    else if(!reds.has(e.id)){row.yellows++;if(row.yellows===3){row.yellows=0;row.pending++;row.reason='경고 3회 누적';row.source=r.id;}}
   }
  }
  return buckets;
 }
 function assignment(s,competition=s.competition){
  const pending=[...replay(s)[competition].values()].filter(r=>r.pending>0),fit=Object.fromEntries(Object.keys(minimum).map(pos=>[pos,Object.values(s.squad).filter(p=>p.pos===pos&&!p.injury).length])),blocked=[],deferred=[];
  for(const row of pending){const p=Object.values(s.squad).find(p=>p.identity===row.identity);if(!p)continue;if(p.injury||fit[p.pos]>minimum[p.pos]){blocked.push(p.id);if(!p.injury)fit[p.pos]--;}else deferred.push(p.id);}
  return {blocked,deferred};
 }
 function apply(s,m=s.match){if(!s.suspensions||!m)return m;const a=assignment(s);for(const p of Object.values(m.players)){delete p.suspended;if(a.blocked.includes(p.id))p.suspended=true;}m.suspensionRules=1;m.lineup=F.fitLineup(m.players,m.formation,m.lineup);F.syncSetPieces(m);return m;}
 function enable(s){if(s.suspensions)throw Error('출전 정지 규칙을 이미 사용하고 있습니다.');if(s.disciplineRules!==1||s.match?.phase!=='prep'||s.match.minute!==0||s.match.decisions.length)throw Error('카드가 적용된 새 경기 준비에서 팀 대화 전에 켤 수 있습니다.');const next=copy(s);next.suspensions={version:1,year:s.year,origin:s.statistics.records.length};apply(next);return next;}
 function nextYear(s){if(s.suspensions)s.suspensions={version:1,year:s.year,origin:0};return s;}
 function validate(s){
  if(!s.suspensions){if(s.match?.suspensionRules!==undefined||Object.values(s.match?.players||{}).some(p=>p.suspended)||(s.statistics?.records||[]).some(r=>Object.hasOwn(r,'suspended')))fail();return s;}
  if(s.disciplineRules!==1)fail();replay(s);
  if(s.statistics.records.slice(0,s.suspensions.origin).some(r=>Object.hasOwn(r,'suspended')))fail();
  if(s.match){const a=assignment(s);if(s.match.suspensionRules!==1||Object.values(s.match.players).some(p=>!!p.suspended!==a.blocked.includes(p.id)))fail();}
  return s;
 }
 function read(s){
  const enabled=!!s.suspensions,buckets=replay(s),a=enabled&&s.match?assignment(s):{blocked:[],deferred:[]};
  const rows=[];for(const [competition,bucket] of Object.entries(buckets))for(const row of bucket.values()){const p=Object.values(s.squad).find(p=>p.identity===row.identity);if(p&&(row.yellows||row.pending))rows.push({...row,id:p.id,name:p.name,pos:p.pos,competition,blocked:competition===s.competition&&a.blocked.includes(p.id),deferred:competition===s.competition&&a.deferred.includes(p.id)});}
  return {enabled,canEnable:!enabled&&s.disciplineRules===1&&s.match?.phase==='prep'&&s.match.minute===0&&!s.match.decisions.length,rows,blocked:a.blocked,deferred:a.deferred};
 }
 const api={replay,assignment,apply,enable,nextYear,validate,read};root.Suspensions=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
