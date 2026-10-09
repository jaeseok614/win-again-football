(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),T=root.PlayerTraits||(typeof require==='function'?require('./player-traits.js'):null),Plans=root.SquadPlans||(typeof require==='function'?require('./squad-plans.js'):null),copy=x=>JSON.parse(JSON.stringify(x));
 const priorities={fit:{label:'익숙한 위치 우선',fit:70,primary:20,energy:10},strength:{label:'주 능력 우선',fit:20,primary:70,energy:10},fresh:{label:'체력과 로테이션 우선',fit:40,primary:20,energy:40}};
 function canEdit(s){return Plans.canEdit(s);}
 function requirePrep(s){if(!canEdit(s))throw Error('코치 선발 제안은 경기 준비에서 팀 대화 전에 확인할 수 있어요.');}
 function key(s,positions={}){return JSON.stringify([s.year,s.round,s.competition,s.trained,s.plan,s.match,s.statistics?.records?.at(-1),positions]);}
 function slots(formation){if(!Object.hasOwn(F.formations,formation))throw Error('올바른 포메이션을 선택하세요.');return [{pos:'GK',point:[50,88],code:'GK'},...Object.entries(F.formationPositions[formation]).flatMap(([pos,points])=>points.map(point=>({pos,point:[...point],code:F.assignedPosition(...point,pos).code})))];}
 function value(p,code,priority){const w=priorities[priority];return T.suitability(p,code)*w.fit+p[F.roleKey(p)]*w.primary+p.energy*w.energy;}
 // Small, fixed positional pools: dynamic programming selects the best unique
 // assignment across all slots, instead of taking a player before later needs.
 function assign(pool,targets,priority){
  const players=pool.filter(F.isAvailable).sort((a,b)=>a.id.localeCompare(b.id));if(players.length<targets.length)return null;
  const memo=new Map();
  function search(index,mask){
   if(index===targets.length)return {score:0,ids:[]};const cacheKey=index+':'+mask;if(memo.has(cacheKey))return memo.get(cacheKey);
   let best=null;
   for(let i=0;i<players.length;i++){if(mask&(1<<i))continue;const rest=search(index+1,mask|(1<<i)),proposal={score:value(players[i],targets[index].code,priority)+rest.score,ids:[players[i].id,...rest.ids]};if(!best||proposal.score>best.score+1e-9||Math.abs(proposal.score-best.score)<1e-9&&proposal.ids.join('|')<best.ids.join('|'))best=proposal;}
   memo.set(cacheKey,best);return best;
  }
  return search(0,0);
 }
 function describe(s,ids,formation,positions={}){
  const targets=slots(formation),used={GK:0,DEF:0,MID:0,FW:0};
  return ids.map(id=>{const p=s.match.players[id],target=targets.filter(t=>t.pos===p.pos)[used[p.pos]++],point=positions[p.identity]||target.point,code=F.assignedPosition(...point,p.pos).code,condition=T.condition(s,p);return {id,identity:p.identity,name:p.name,pos:p.pos,code,point:[...point],fit:T.suitability(p,code),familiar:T.preferredPositions(p).includes(code),energy:Math.round(p.energy),condition,primary:p[F.roleKey(p)]};});
 }
 function summary(rows){const mean=key=>Math.round(rows.reduce((n,p)=>n+p[key],0)/rows.length);return {fit:mean('fit'),energy:mean('energy'),primary:mean('primary'),unfamiliar:rows.filter(p=>!p.familiar).length,tired:rows.filter(p=>p.energy<65).length};}
 function propose(s,formation,priority){
  const targets=slots(formation),players=Object.values(s.match.players),after=[];let score=0;
  for(const pos of ['GK','DEF','MID','FW']){const result=assign(players.filter(p=>p.pos===pos),targets.filter(t=>t.pos===pos),priority);if(!result)return null;after.push(...result.ids);score+=result.score;}
  const rows=describe(s,after,formation);return {formation,after,players:rows,summary:summary(rows),score:Math.round(score/1100)};
 }
 function read(s,priority='fit',positions={}){
  if(!Object.hasOwn(priorities,priority))priority='fit';if(!canEdit(s))return {canEdit:false,priority,options:[]};
  const before=describe(s,s.match.lineup,s.match.formation,positions),options=Object.keys(F.formations).map(formation=>propose(s,formation,priority)).filter(Boolean).sort((a,b)=>b.score-a.score||a.formation.localeCompare(b.formation));
  return {canEdit:true,priority,label:priorities[priority].label,before:summary(before),currentFormation:s.match.formation,options,recommended:options[0]?.formation||null,note:'코치 비교용 평가입니다. 위치 적합도가 경기 능력에 추가 보너스를 주지는 않습니다. 실제 주 능력·체력과 포메이션은 경기 엔진에 반영됩니다.'};
 }
 function preview(s,formation,priority='fit',positions={}){
  requirePrep(s);if(!Object.hasOwn(priorities,priority))throw Error('선발 기준을 다시 선택하세요.');const proposal=propose(s,formation,priority);if(!proposal)throw Error('이 포메이션에 출전할 선수가 부족해요.');
  const before=describe(s,s.match.lineup,s.match.formation,positions);
  return {...proposal,priority,before:summary(before),previous:before,entering:proposal.players.filter(p=>!s.match.lineup.includes(p.id)),leaving:before.filter(p=>!proposal.after.includes(p.id)),fingerprint:JSON.stringify([key(s,positions),formation,priority]),resetsPositions:Object.keys(positions).length>0,changed:s.match.formation!==formation||JSON.stringify(s.match.lineup)!==JSON.stringify(proposal.after)||Object.keys(positions).length>0};
 }
 function apply(s,formation,priority,fingerprint,positions={}){
  const proposal=preview(s,formation,priority,positions);if(typeof fingerprint!=='string'||fingerprint!==proposal.fingerprint)throw Error('선수나 전술 상태가 바뀌었어요. 선발을 다시 비교해 주세요.');
  const next=copy(s);next.match.formation=formation;next.match.lineup=[...proposal.after];F.syncSetPieces(next.match);next.plan={...next.plan,formation,lineup:[...proposal.after]};const S=root.Season||(typeof require==='function'?require('./season.js'):null);S.applySetPiecePlan(next);return next;
 }
 const api={read,preview,apply,canEdit,key,priorities,slots};root.CoachLineup=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
