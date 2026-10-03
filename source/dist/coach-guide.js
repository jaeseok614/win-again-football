(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),S=root.Season||(typeof require==='function'?require('./season.js'):null),D=root.PlayerDevelopment||(typeof require==='function'?require('./development.js'):null),B=root.TacticsBoard||(typeof require==='function'?require('./tactics-board.js'):null);
 function focusPlayer(s){
  const squad=Object.values(s.squad||{}),p=s.squad?.f2||squad.find(person=>person.pos==='FW')||squad[0];
  if(!p||!Number.isInteger(p.xp)||p.xp<0)return null;
  const d=D.analyze(s,p.id);if(!d.valid)return null;
  return {slot:p.id,identity:p.identity,name:p.name,pos:p.pos,primaryLabel:d.growth.label,primary:d.growth.current,cap:d.growth.cap,xp:d.experience.confirmedMinutes,xpInStep:d.experience.xpInStep,minutesToGrowth:d.experience.nextPrimaryGrowthMinutes,capped:d.growth.capped};
 }
 function readiness(s){
  const m=s.match;if(!m||m.phase!=='prep')return null;
  const starters=(m.lineup||[]).map(id=>m.players?.[id]||s.squad?.[id]).filter(Boolean),available=starters.filter(p=>!p.injuryRemaining&&!p.injury).length;
  const lowEnergy=starters.filter(p=>Number.isFinite(p.energy)&&p.energy<55).length;
  const trainingLabels={technique:'기술',pace:'스피드',fitness:'지구력',recovery:'회복'},board=B&&B.read(s),suggestion=board?.valid?board.recommendation:null;
  const checks=[
   {id:'lineup',label:'출전 가능한 선발',detail:available+' / 11명',ready:available===11,action:'match'},
   {id:'energy',label:'선발 체력 점검',detail:lowEnergy?lowEnergy+'명 피로 주의':'피로 주의 없음',ready:lowEnergy===0,action:'squad'},
   {id:'training',label:'이번 주 훈련',detail:s.trained?'완료 · '+(trainingLabels[s.trained]||s.trained):'아직 안 함',ready:!!s.trained,optional:true,action:'training'},
   ...(suggestion?[{id:'tactic',label:'상대 맞춤 전술',detail:suggestion.label+(m.tactic===suggestion.tactic?' · 적용 중':' · 분석 보기'),ready:m.tactic===suggestion.tactic,optional:true,action:'analysis'}]:[])
  ];
  const ready=checks.find(item=>item.id==='lineup').ready;
  return {ready,score:checks.filter(item=>item.ready).length,total:checks.length,label:ready?(lowEnergy?'선발 조정 권장':'경기 시작 가능'):'선발 확인 필요',checks};
 }
 function read(s){
  if(!s||!Number.isInteger(s.year)||s.year<1||!Number.isInteger(s.round)||s.round<0||!s.squad)return {valid:false,mode:'unavailable',fresh:false,eyebrow:'감독 안내',title:'구단을 준비하고 있어요.',text:'현재 시즌을 확인한 뒤 안내를 표시합니다.',action:null,steps:[],focus:null};
  const m=s.match,fresh=s.year===1&&s.round===0,focus=focusPlayer(s),eyebrow=fresh?'첫 경기 준비':s.competition==='europe'?'챔피언스리그':'경기 준비';
  if(!m)return {valid:true,mode:'complete',fresh:false,eyebrow,title:'시즌 종료',text:'시즌 기록을 확인하고, 성장한 선수들과 다음 시즌에 도전하세요.',action:{id:'season',label:'다음 시즌 준비 보기'},steps:[],focus};
  const running=F.running(m),mode=m.phase==='prep'?'prep':m.phase==='full'?'full':running?'running':'break',opponent=S.opponentFor(s),name=opponent?.short||opponent?.name||'이번 상대';
  const content=mode==='prep'?{title:fresh?'첫 경기 준비':name+'전 준비',text:fresh?'선발과 전술을 고르면 첫 승부가 시작됩니다. 훈련과 영입은 선택이에요.':s.competition==='europe'?'유럽 대회에 나설 선발과 전술을 정하세요. 훈련과 영입은 다음 리그 경기 준비 때 열립니다.':'선수들의 체력과 상대의 빈틈을 읽고 다음 경기를 준비하세요.',label:fresh?'첫 경기 준비하기':'이번 경기 준비하기'}:
   mode==='full'?{title:'경기 결과 확정',text:s.competition==='europe'?'결과를 확정하면 유럽 대회 성적, 실제 출전 경험과 대회 수입이 반영됩니다.':'결과를 확정하면 승점, 실제 출전 경험과 구단 수입이 반영됩니다.',label:'경기 리뷰 · 결과 확정 보기'}:
   mode==='break'?{title:m.phase==='half'?'하프타임':'65분 작전 타임',text:'체력이 떨어진 선수와 상대를 확인하세요. 전술과 교체를 정한 뒤 직접 경기를 이어갑니다.',label:m.phase==='half'?'하프타임 작전으로':'65분 작전으로'}:
   {title:m.paused?'경기 일시 정지':'경기 진행 중',text:m.minute+'분 진행 중 · 원하는 순간에 멈춰 전술과 교체를 결정하거나 5분씩 빠르게 볼 수 있어요.',label:m.minute+'분 경기로 돌아가기'};
  const stage=mode==='prep'?0:mode==='full'?2:1;
  const steps=['준비','승부','기록'].map((label,index)=>({id:['prepare','play','record'][index],label,status:index<stage?'done':index===stage?'current':'waiting'}));
  return {valid:true,mode,fresh,eyebrow,title:content.title,text:content.text,action:{id:'match',label:content.label},steps,focus,readiness:readiness(s)};
 }
 const api={read};root.CoachGuide=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
