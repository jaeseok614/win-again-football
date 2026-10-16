(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine'):null),names={goal:'득점',save:'선방',parry:'쳐냄',blocked:'수비 차단',woodwork:'골대',wide:'빗나감',invalid:'판정 무효'};
 function read(m,{team='all',selected=null}={}){
  if(!m||m.continuousSetup?.version<11||!m.continuousSetup||!['all','ours','theirs'].includes(team)||!Array.isArray(m.logs))return {valid:false};
  const outcomes=new Map();for(const e of m.logs)if(['goal','shot'].includes(e.type)&&Number.isInteger(e.shotTick))outcomes.set(e.team+':'+e.shotTick,e);
  const rows=[];for(const e of m.logs){const at=e.shotPosition,out=outcomes.get(e.team+':'+e.tick);if(e.type!=='attempt'||![0,1].includes(e.team)||!Number.isInteger(e.tick)||!at||!Number.isFinite(at.x)||!Number.isFinite(at.y)||at.x<0||at.x>68||at.y<0||at.y>105||!out)continue;
   const p=e.team===0?m.players?.[e.actorId]:m.continuousSetup.opponentPlayers?.[Number(e.actorId?.replace('opp',''))],outcome=out.type==='goal'?'goal':out.outcome;
   rows.push({key:e.team+':'+e.tick,team:e.team,tick:e.tick,minute:F.clockLabel(m,e.minute),identity:e.actorIdentity,name:p?.name||'선수 미확인',x:at.x,y:at.y,xg:Number.isFinite(e.xg)?e.xg:null,range:Math.round(Math.hypot(at.x-34,at.y)*10)/10,inBox:at.y<=16.5&&Math.abs(at.x-34)<=20.16,outcome,label:names[outcome]||'결과 미확인',onTarget:['goal','save','parry'].includes(outcome),setPiece:e.setPiece||null});
  }
  const shown=rows.filter(r=>team==='all'||r.team===(team==='ours'?0:1)),choice=shown.find(r=>r.key===selected)||shown.at(-1)||null;
  const totals=[0,1].map(t=>{const a=rows.filter(r=>r.team===t);return {shots:a.length,goals:a.filter(r=>r.outcome==='goal').length,onTarget:a.filter(r=>r.onTarget).length,inBox:a.filter(r=>r.inBox).length,xg:a.reduce((v,r)=>v+(r.xg||0),0)};});
  const recorded=Array.isArray(m.shots)&&m.shots.length===2&&m.shots.every(Number.isInteger)?Math.max(rows.length,m.shots[0]+m.shots[1]):rows.length;
  return {valid:true,rows:shown.map(r=>({...r})),selected:choice?{...choice}:null,team,totals,tracked:rows.length,recorded,waiting:!rows.length,pending:!!m.presentationPending,note:'완료 위치 '+rows.length+'/'+recorded+' · 공격 ↑ · 미등록·자책골 제외'};
 }
 const api={read};root.ShotReport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
