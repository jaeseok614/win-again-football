(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),copy=x=>JSON.parse(JSON.stringify(x)),ids=['a','b','c'],tactics=['press','balanced','counter'];
 const fail=()=>{throw Error('저장한 선발 계획을 읽을 수 없어요.');};
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 function validate(s){
  if(s.squadPlans===undefined)return s;const book=s.squadPlans;
  if(!exact(book,['version','slots'])||book.version!==1||!Array.isArray(book.slots)||book.slots.length>3||new Set(book.slots.map(p=>p?.id)).size!==book.slots.length)fail();
  for(const p of book.slots){if(!exact(p,['id','name','formation','tactic','identities'])||!ids.includes(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name!==p.name.trim()||p.name.length>24||/[\u0000-\u001f\u007f]/.test(p.name)||!Object.hasOwn(F.formations,p.formation)||!(tactics.includes(p.tactic)||p.tactic==='lowBlock'&&s.startingClub==='tottunham'&&s.league?.rules==='five-tier'&&(!s.match||s.match.version>=7))||!Array.isArray(p.identities)||p.identities.length!==11||new Set(p.identities).size!==11||p.identities.some(id=>typeof id!=='string'||!F.identityProfile(id)))fail();for(const [pos,n] of Object.entries({GK:1,...F.formations[p.formation]}))if(p.identities.filter(id=>F.identityProfile(id).pos===pos).length!==n)fail();}
  return s;
 }
 function canEdit(s){return !!s.match&&s.match.phase==='prep'&&s.match.minute===0&&!s.match.decisions.length;}
 function requirePrep(s){if(!canEdit(s))throw Error('선발 계획은 새 경기 준비에서 팀 대화 전에 저장하거나 적용할 수 있어요.');}
 function save(s,id,name){
  requirePrep(s);validate(s);if(!ids.includes(id))fail();const m=s.match;if(m.tactic==='lowBlock'&&m.version<7)throw Error('로우 블록은 최신 전술 엔진 경기에서 저장할 수 있어요.');const plan={id,name:typeof name==='string'?name.trim():'',formation:m.formation,tactic:m.tactic,identities:m.lineup.map(slot=>m.players[slot].identity)},next=copy(s);next.squadPlans=next.squadPlans||{version:1,slots:[]};next.squadPlans.slots=next.squadPlans.slots.filter(p=>p.id!==id).concat(plan).sort((a,b)=>a.id.localeCompare(b.id));validate(next);return next;
 }
 function remove(s,id){validate(s);if(!ids.includes(id)||!s.squadPlans?.slots.some(p=>p.id===id))throw Error('삭제할 선발 계획이 없습니다.');const next=copy(s);next.squadPlans.slots=next.squadPlans.slots.filter(p=>p.id!==id);if(!next.squadPlans.slots.length)delete next.squadPlans;return next;}
 function preview(s,id){
  requirePrep(s);validate(s);const plan=s.squadPlans?.slots.find(p=>p.id===id);if(!plan)throw Error('먼저 현재 선발을 이 계획에 저장하세요.');
  const m=s.match,players=Object.values(m.players),preferred=plan.identities.map(identity=>players.find(p=>p.identity===identity)?.id).filter(Boolean),after=F.fitLineup(m.players,plan.formation,preferred),unavailable=[];
  for(const identity of plan.identities){const p=players.find(p=>p.identity===identity);if(!p||!F.isAvailable(p))unavailable.push({identity,name:F.identityProfile(identity).name,pos:F.identityProfile(identity).pos,reason:!p?'구단을 떠난 선수':p.suspended?'이번 대회 출전 정지':'부상으로 출전 불가'});}
  const describe=id=>{const p=m.players[id];return {id,identity:p.identity,name:p.name,pos:p.pos,energy:Math.round(p.energy),fallback:!plan.identities.includes(p.identity)};};
  const fingerprint=JSON.stringify([s.year,s.round,s.competition,m.seed,s.trained,m.phase,m.minute,m.decisions,m.formation,m.tactic,m.lineup,plan,players.map(p=>[p.id,p.identity,p.energy,p.injuryRemaining,p.suspended,p[F.roleKey(p)]])]);
  return {id,name:plan.name,formation:plan.formation,tactic:plan.tactic,fingerprint,before:[...m.lineup],after,players:after.map(describe),unavailable,entering:after.filter(id=>!m.lineup.includes(id)).map(describe),leaving:m.lineup.filter(id=>!after.includes(id)).map(describe),tired:after.filter(id=>m.players[id].energy<65).map(describe),changed:m.formation!==plan.formation||m.tactic!==plan.tactic||JSON.stringify(m.lineup)!==JSON.stringify(after)};
 }
 function apply(s,id,fingerprint){const p=preview(s,id);if(typeof fingerprint!=='string'||p.fingerprint!==fingerprint)throw Error('선수 상태나 선발이 바뀌었습니다. 계획을 다시 미리 확인하세요.');const next=copy(s);next.match.formation=p.formation;next.match.lineup=[...p.after];F.syncSetPieces(next.match);F.setTactic(next.match,p.tactic);next.plan={formation:p.formation,tactic:p.tactic,lineup:[...p.after]};return next;}
 function read(s){validate(s);return {canEdit:canEdit(s),slots:ids.map(id=>{const plan=s.squadPlans?.slots.find(p=>p.id===id);return {id,plan:plan?copy(plan):null};})};}
 const api={validate,canEdit,save,remove,preview,apply,read};root.SquadPlans=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
