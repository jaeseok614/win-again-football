(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const roles=Object.freeze(['GK','DEF','MID','FW','MED']),roleLabels=Object.freeze({GK:'골키퍼 코치',DEF:'수비 코치',MID:'미드필더 코치',FW:'공격 코치',MED:'의무 코치'}),term=7;
 const names=['이든 브룩스','노아 리드','루카스 베일','올리버 콜','다니엘 쇼','알렉스 우드','테오 밀러','제이미 클라크','레오 워커','오스카 그린'];
 const copy=x=>JSON.parse(JSON.stringify(x)),money=n=>Number.isSafeInteger(n)&&Math.abs(n)<=10000000000;
 const rounds=(s,year=s.year)=>root.Season?.leagueRoundCountForYear?.(s,year)??14;
 const clock=(s,year=s.year,round=s.round)=>{let total=round;for(let y=1;y<year;y++)total+=rounds(s,y);return total;};
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
 const fail=()=>{throw Error('저장한 코치 계약과 비용을 읽을 수 없어요.');};
 function candidates(s){return roles.flatMap((role,index)=>[1,2].map(tier=>{const medical=role==='MED',offset=(s.seed>>>0)%names.length;return {id:'staff-'+(s.seed>>>0)+'-'+role+'-'+tier,role,tier,name:names[(offset+index*2+tier-1)%names.length],label:roleLabels[role],fee:medical?(tier===1?8500:13500):(tier===1?6500:10500),wage:medical?(tier===1?1500:2300):(tier===1?1200:1900),renewFee:medical?(tier===1?4500:7000):(tier===1?3500:5500),term,skillBonus:medical?0:1,energySaving:medical?0:tier,recoveryBonus:medical?(tier===1?3:5):0,injuryMultiplier:medical?(tier===1?.8:.65):1};}));}
 function person(s,id){return candidates(s).find(p=>p.id===id)||null;}
 function initialize(s){s.staff={version:1,origin:{year:s.year,round:s.round},contracts:{},lastPayroll:clock(s),trainingWeek:s.trained?clock(s):null};return s;}
 function active(s,role){const c=s.staff?.contracts?.[role];return c&&c.started<=clock(s)&&c.expires>clock(s)?{...person(s,c.candidate),...c,remaining:c.expires-clock(s)}:null;}
 function wages(s){return roles.reduce((total,role)=>total+(active(s,role)?.wage||0),0);}
 function medicalModifier(s){const c=s.staff?.contracts?.MED,now=clock(s),finishing=s.competition==='league'&&s.match?.phase==='full'&&s.staff?.lastPayroll===now-1;return finishing&&c&&c.started<now&&c.expires>=now?person(s,c.candidate).injuryMultiplier:active(s,'MED')?.injuryMultiplier??1;}
 function openReason(s,role){
  if(s.competition!=='league'||!s.match||s.match.phase!=='prep'||s.match.minute!==0||s.round>=rounds(s))return '코치 계약은 리그 경기 시작 전에 관리할 수 있어요.';
  if(!roles.includes(role))return '코치 역할을 선택하세요.';
  if(!s.staff||!s.finance||!money(s.finance.balance)||!Array.isArray(s.finance.ledger))return '구단 계약과 재정을 먼저 확인하세요.';
  if(s.finance.ledger.some(e=>['staff-hire','staff-renew','staff-release'].includes(e.type)&&e.year===s.year&&e.round===s.round+1&&e.role===role))return '이번 주 이 역할의 계약을 변경했어요. 다음 리그 경기 뒤 다시 관리하세요.';
  return null;
 }
 function quote(s,operation,choice){
  const p=operation==='hire'?person(s,choice):active(s,choice),role=p?.role??choice;
  let reason=openReason(s,role);if(!reason&&!['hire','renew','release'].includes(operation))reason='계약 방법을 선택하세요.';
  if(!reason&&!p)reason=operation==='hire'?'현재 코치 후보를 선택하세요.':'계약한 코치를 선택하세요.';
  if(!reason&&operation==='hire'&&active(s,role))reason='역할마다 코치 한 명만 계약할 수 있어요.';
  if(!reason&&operation==='renew'&&p.remaining+term>14)reason='남은 계약과 연장을 합해 최대 리그 14경기까지 계약할 수 있어요.';
  const cost=p?(operation==='hire'?p.fee:operation==='renew'?p.renewFee:p.wage):0;
  if(!reason&&s.finance.balance<cost)reason='계약 비용을 지불할 구단 자금이 부족합니다.';
  const remaining=p?(operation==='hire'?term:operation==='renew'?p.remaining+term:0):0;
  return {available:!reason,reason,operation,role,candidate:p?.id??p?.candidate??null,cost,wage:p?.wage??0,remaining,balanceAfter:s.finance?s.finance.balance-cost:null};
 }
 function change(s,operation,choice){
  const q=quote(s,operation,choice);if(!q.available)throw Error(q.reason);
  const p=person(s,q.candidate),now=clock(s),old=s.staff.contracts[q.role],contract=operation==='hire'?{role:q.role,candidate:p.id,started:now,expires:now+term,trainingFrom:now+(s.trained?1:0)}:operation==='renew'?{...old,expires:old.expires+term}:old;
  const entry={id:'staff-'+operation+'-'+s.year+'-'+(s.round+1)+'-'+q.role,type:'staff-'+operation,year:s.year,round:s.round+1,...contract,amount:-q.cost};
  s.finance.balance=q.balanceAfter;s.finance.ledger.push(entry);if(operation==='release')delete s.staff.contracts[q.role];else s.staff.contracts[q.role]={...contract};
  return {...q,name:p.name,expires:contract.expires,entry:copy(entry)};
 }
 function hire(s,candidate){return change(s,'hire',candidate);}
 function renew(s,role){return change(s,'renew',role);}
 function release(s,role){return change(s,'release',role);}
 function trainingBonuses(s,slot,focus){
  const zero={skillBonus:0,energySaving:0,recoveryBonus:0},p=s.squad?.[slot],now=clock(s);
  if(!p||!s.staff||s.staff.trainingWeek===now||!['technique','pace','fitness','recovery'].includes(focus))return zero;
  if(focus==='recovery'){const med=active(s,'MED');return med&&med.trainingFrom<=now?{...zero,recoveryBonus:med.recoveryBonus}:zero;}
  const coach=active(s,p.pos);return !p.injury&&coach&&coach.trainingFrom<=now?{skillBonus:focus==='technique'?coach.skillBonus:0,energySaving:coach.energySaving,recoveryBonus:0}:zero;
 }
 function training(s,focus,slot,{alreadyApplied=false}={}){
  if(!s.staff)return [];
  if(s.competition!=='league'||!s.match||s.match.phase!=='prep'||s.match.minute!==0||s.round>=rounds(s)||s.trained!==focus||!['technique','pace','fitness','recovery'].includes(focus))throw Error('완료한 이번 주 훈련에만 코치 효과를 반영할 수 있어요.');
  if(s.staff.trainingWeek===clock(s))throw Error('이번 주 코치 훈련 효과를 이미 반영했어요.');
  const players=slot?[s.squad[slot]]:Object.values(s.squad);if(players.some(p=>!p||!s.match.players[p.id]||s.match.players[p.id].identity!==p.identity))throw Error('훈련 선수 등록을 확인하세요.');
  const updates=players.map(p=>{const b=trainingBonuses(s,p.id,focus),key=focus==='technique'?F.roleKey(p):focus==='pace'?'speed':focus==='fitness'?'endurance':'energy',cap=focus==='recovery'?100:focus==='technique'?p.potential:99;return {p,key,before:p[key],after:Math.min(cap,p[key]+b.skillBonus+b.recoveryBonus),energy:Math.min(100,p.energy+(focus==='recovery'?b.recoveryBonus:p.energy>0?b.energySaving:0)),...b};});
  if(!alreadyApplied)for(const update of updates){const {p,key,after,energy}=update,m=s.match.players[p.id];p[key]=after;p.energy=energy;m[key]=after;m.energy=energy;m.initialEnergy=energy;}
  s.staff.trainingWeek=clock(s);return updates.map(({p,...update})=>({slot:p.id,identity:p.identity,...update}));
 }
 function afterLeagueRound(s){
  if(!s.staff)return null;const now=clock(s);
  if(s.competition!=='league'||s.match?.phase!=='full'||s.match.minute!==90||!Number.isInteger(s.round)||s.round<1||s.round>rounds(s)||s.staff.lastPayroll!==now-1||!s.finance.ledger.some(e=>e.id==='match-'+s.year+'-'+s.round))throw Error('완료한 리그 경기의 코치 주급만 반영할 수 있어요.');
  const contracts=roles.map(role=>s.staff.contracts[role]).filter(c=>c&&c.started<now&&c.expires>=now).map(c=>({role:c.role,candidate:c.candidate,wage:person(s,c.candidate).wage})),amount=-contracts.reduce((sum,c)=>sum+c.wage,0),id='staff-wages-'+s.year+'-'+s.round;
  if(s.finance.ledger.some(e=>e.id===id)||!money(s.finance.balance+amount))throw Error('코치 주급을 이미 반영했거나 재정을 확인할 수 없어요.');
  const entry=contracts.length?{id,type:'staff-wages',year:s.year,round:s.round,contracts,amount}:null;
  if(entry){s.finance.balance+=amount;s.finance.ledger.push(entry);}s.staff.lastPayroll=now;for(const role of roles)if(s.staff.contracts[role]?.expires<=now)delete s.staff.contracts[role];return entry;
 }
 function validateEntry(s,e){
  if(!e||!Number.isInteger(e.year)||e.year<1||!Number.isInteger(e.round)||e.round<1||e.round>rounds(s,e.year)||!money(e.amount))fail();
  if(e.type==='staff-wages'){
   if(!exact(e,['id','type','year','round','contracts','amount'])||e.id!=='staff-wages-'+e.year+'-'+e.round||!Array.isArray(e.contracts)||!e.contracts.length||e.contracts.length>5||new Set(e.contracts.map(c=>c?.role)).size!==e.contracts.length)fail();
   let total=0,previous=-1;for(const c of e.contracts){const p=person(s,c?.candidate),index=roles.indexOf(c?.role);if(!exact(c,['role','candidate','wage'])||!p||p.role!==c.role||c.wage!==p.wage||index<=previous)fail();previous=index;total+=c.wage;}if(e.amount!==-total)fail();return true;
  }
  if(!['staff-hire','staff-renew','staff-release'].includes(e.type)||!exact(e,['id','type','year','round','role','candidate','started','expires','trainingFrom','amount']))fail();
  const p=person(s,e.candidate),now=clock(s,e.year,e.round-1),operation=e.type.slice(6);
  if(!p||p.role!==e.role||e.id!==e.type+'-'+e.year+'-'+e.round+'-'+e.role||!Number.isInteger(e.started)||e.started<0||e.started>now||!Number.isInteger(e.expires)||e.expires<=now||e.expires>now+14||![e.started,e.started+1].includes(e.trainingFrom)||e.amount!==-(operation==='hire'?p.fee:operation==='renew'?p.renewFee:p.wage))fail();
  if(operation==='hire'&&(e.started!==now||e.expires!==now+term))fail();return true;
 }
 function validate(s){
  const h=s.staff,now=clock(s);if(!exact(h,['version','origin','contracts','lastPayroll','trainingWeek'])||h.version!==1||!exact(h.origin,['year','round'])||!Number.isInteger(h.origin.year)||h.origin.year<1||h.origin.year>s.year||!Number.isInteger(h.origin.round)||h.origin.round<0||h.origin.round>rounds(s,h.origin.year)||!s.finance||!Array.isArray(s.finance.ledger))fail();
  const origin=clock(s,h.origin.year,h.origin.round),financeOrigin=clock(s,s.finance.origin.year,s.finance.origin.round);
  if(origin>now||origin<financeOrigin||h.lastPayroll!==now||h.trainingWeek!==null&&(!Number.isInteger(h.trainingWeek)||h.trainingWeek<origin||h.trainingWeek>now||h.trainingWeek===now&&!s.trained)||!h.contracts||typeof h.contracts!=='object'||Array.isArray(h.contracts)||Object.keys(h.contracts).some(role=>!roles.includes(role)))fail();
  let last=origin,pending=null;const expected={},actions=new Set();
  for(const e of s.finance.ledger){
   const staffEntry=typeof e?.type==='string'&&e.type.startsWith('staff-'),entryClock=e&&clock(s,e.year,e.round);
   if(staffEntry){validateEntry(s,e);if(entryClock-(e.type==='staff-wages'?0:1)<origin)fail();}
   if(e.type==='match'&&entryClock>origin){
    if(pending||entryClock!==last+1)fail();last=entryClock;
    const contracts=roles.map(role=>expected[role]).filter(c=>c&&c.started<entryClock&&c.expires>=entryClock).map(c=>({role:c.role,candidate:c.candidate,wage:person(s,c.candidate).wage}));
    if(contracts.length)pending={clock:entryClock,contracts};else for(const role of roles)if(expected[role]?.expires<=entryClock)delete expected[role];
   }else if(staffEntry&&e.type==='staff-wages'){
    if(!pending||entryClock!==pending.clock||e.contracts.length!==pending.contracts.length||e.contracts.some((c,i)=>['role','candidate','wage'].some(key=>c[key]!==pending.contracts[i][key])))fail();for(const role of roles)if(expected[role]?.expires<=entryClock)delete expected[role];pending=null;
   }else if(staffEntry){
    const actionClock=entryClock-1,key=actionClock+'-'+e.role,old=expected[e.role],contract={role:e.role,candidate:e.candidate,started:e.started,expires:e.expires,trainingFrom:e.trainingFrom};
    if(pending||actionClock!==last||actions.has(key))fail();actions.add(key);
    if(e.type==='staff-hire'){if(old)fail();expected[e.role]=contract;}
    else {if(!old||old.candidate!==e.candidate||old.started!==e.started||old.trainingFrom!==e.trainingFrom)fail();if(e.type==='staff-renew'){if(e.expires!==old.expires+term)fail();expected[e.role]=contract;}else {if(e.expires!==old.expires)fail();delete expected[e.role];}}
   }
  }
  if(pending||last!==now||Object.keys(expected).length!==Object.keys(h.contracts).length||roles.some(role=>expected[role]&&(!h.contracts[role]||['role','candidate','started','expires','trainingFrom'].some(key=>expected[role][key]!==h.contracts[role][key]))))fail();
  for(const c of Object.values(h.contracts))if(!exact(c,['role','candidate','started','expires','trainingFrom']))fail();return s;
 }
 function restore(s,raw){
  if(raw===undefined){if(s.finance?.ledger?.some(e=>typeof e?.type==='string'&&e.type.startsWith('staff-')))fail();return initialize(s);}
  s.staff=copy(raw);return validate(s);
 }
 const api={roles,roleLabels,term,candidates,clock,initialize,restore,validate,validateEntry,active,wages,quote,hire,renew,release,trainingBonuses,training,medicalModifier,afterLeagueRound};root.Staff=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
