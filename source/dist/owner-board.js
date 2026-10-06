(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),copy=x=>JSON.parse(JSON.stringify(x));
 const labels={results:'승점으로 증명하겠습니다',youth:'유소년에게 기회를 주겠습니다',protect:'선수들을 보호하겠습니다',investment:'구단 투자를 요청합니다'};
 const exact=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
 const fail=()=>{throw Error('저장한 구단주 면담과 투자 기록을 읽을 수 없어요.');};
 const rounds=(s,year=s.year)=>root.Season?.roundCountForYear?.(s,year)||14,week=(s,year,round)=>root.Season?.calendarClock?.(s,year,round)??((year-1)*14+round),clamp=n=>Math.max(0,Math.min(100,n));
 function context(s){const years=new Map();for(const a of s.statistics?.archive||[])years.set(a.year,a.records.filter(r=>r.competition==='league'));years.set(s.year,(s.statistics?.records||[]).filter(r=>r.competition==='league'));return years;}
 function promise(m,s){const games=Math.min(3,rounds(s,m.year)-m.round+1);return {end:m.round+games-1,games,target:m.choice==='results'?(games===3?4:games===2?3:1):games*30,unit:m.choice==='results'?'점':'분'};}
 function progress(ctx,m,through,s){return (ctx.get(m.year)||[]).filter(r=>r.round>=m.round&&r.round<=Math.min(promise(m,s).end,through)).reduce((n,r)=>n+(m.choice==='results'?(r.score[0]>r.score[1]?3:r.score[0]===r.score[1]?1:0):r.players.filter(p=>p.identity===m.identity).reduce((v,p)=>v+p.minutes,0)),0);}
 function replay(s){
  const ctx=context(s),rows=[],invested=new Set();let trust=50,active=null;
  function resolve(year,round){if(!active||!(active.year<year||active.year===year&&active.end<=round))return;active.progress=progress(ctx,active,active.end,s);active.status=active.progress>=active.target?'fulfilled':'missed';active.delta=active.status==='fulfilled'?(active.choice==='youth'?10:8):-5;trust=clamp(trust+active.delta);active=null;}
  for(const m of s.ownerBoard?.meetings||[]){
   resolve(m.year,m.round-1);
   const row={...m,label:labels[m.choice],status:'reported',delta:0};
   if(['results','youth'].includes(m.choice)){if(active)fail();Object.assign(row,promise(m,s),{status:'pending',progress:0});active=row;}
   if(m.choice==='investment'){if(active||trust<60||invested.has(m.year))fail();invested.add(m.year);trust=clamp(trust-10);row.status='invested';row.delta=-10;}
   rows.push(row);
  }
  resolve(s.year,s.round);if(active)active.progress=progress(ctx,active,s.year===active.year?s.round:rounds(s,active.year),s);
  return {trust,active,rows,invested};
 }
 function confidence(s,trust){const table=root.Season?.standings?.(s)||[],me=table.find(c=>c.id==='brynwell'),target=root.Economy?.target?.(s)??Math.min(2,table.length||2),played=me?.played||0,gap=played&&me?.rank?target-me.rank:0,pressure=played?Math.round(Math.max(-30,Math.min(15,gap*3))*Math.min(1,played/5)):0,score=clamp(Math.round(50+(trust-50)*.5+pressure)),status=score>=82?'전폭적 신임':score>=65?'든든한 지지':score>=42?'관망':score>=26?'성과 개선 요구':'강한 압박';return {score,status,rank:played?me.rank:null,target,played};}
 function read(s){
  const r=replay(s),meetings=s.ownerBoard?.meetings||[],done=meetings.some(m=>m.year===s.year&&m.round===s.round+1),prep=s.competition==='league'&&s.round<rounds(s)&&s.match?.phase==='prep'&&s.match.minute===0;
  const reason=done?'이번 리그 주간의 면담을 마쳤습니다.':!prep?'리그 경기 시작 전에 면담할 수 있습니다.':null;
  const youth=Object.values(s.squad).filter(p=>F.identityProfile(p.identity)?.academy).map(p=>({identity:p.identity,name:p.name}));
  const rules=promise({year:s.year,round:s.round+1,choice:'results'},s),minutes=promise({year:s.year,round:s.round+1,choice:'youth'},s);
  const options=Object.entries(labels).map(([id,label])=>{
   let blocked=reason;if(!blocked&&r.active&&id!=='protect')blocked='진행 중인 약속을 마친 뒤 선택할 수 있습니다.';
   if(!blocked&&id==='youth'&&!youth.length)blocked='유소년 센터 출신 선수를 먼저 1군에 등록하세요.';
   if(!blocked&&id==='investment')blocked=r.invested.has(s.year)?'이번 시즌 투자를 이미 받았습니다.':r.trust<60?'신뢰 60 이상이 필요합니다.':null;
   const descriptions={results:'다음 리그 '+rules.games+'경기에서 '+rules.target+'점 · 달성 신뢰 +8 / 미달성 −5',youth:'선택한 유소년에게 다음 리그 '+minutes.games+'경기 합계 '+minutes.target+'분 · 달성 +10 / 미달성 −5',protect:'무리한 약속 대신 선수 보호 방침을 보고합니다. 신뢰 변화 없음.',investment:'신뢰 60 이상 · £20,000 즉시 투자 · 신뢰 −10 · 시즌당 한 번'};
   return {id,label,description:s.round===rounds(s)&&['results','youth'].includes(id)?'다음 시즌의 리그 준비 때 새 약속을 시작할 수 있습니다.':descriptions[id],available:!blocked,reason:blocked};
  });
  return {trust:r.trust,confidence:confidence(s,r.trust),relationship:r.trust>=60?'신뢰를 쌓고 있습니다':r.trust<40?'성과로 답할 때입니다':'서로를 알아가는 중',active:r.active?copy(r.active):null,recent:copy(r.rows.slice(-5).reverse()),youth,options,reason,available:!reason};
 }
 function meet(s,choice,identity=null){
  const status=read(s),option=status.options.find(o=>o.id===choice);if(!option?.available)throw Error(option?.reason||'면담 주제를 선택하세요.');
  if(choice==='youth'&&!status.youth.some(p=>p.identity===identity))throw Error('약속할 유소년 선수를 선택하세요.');
  const next=copy(s);next.ownerBoard??={version:1,meetings:[]};const m={year:s.year,round:s.round+1,choice,identity:choice==='youth'?identity:null,ledgerIndex:s.finance.ledger.length};next.ownerBoard.meetings.push(m);
  if(choice==='investment'){const amount=20000;if(!Number.isSafeInteger(next.finance.balance+amount)||Math.abs(next.finance.balance+amount)>10000000000)throw Error('구단 재정을 반영할 수 없어요.');next.finance.balance+=amount;next.finance.ledger.push({id:'owner-investment-'+s.year,type:'owner-investment',year:m.year,round:m.round,amount});}
  validate(next);return next;
 }
 function validate(s){
  const b=s.ownerBoard,ledger=s.finance.ledger,grants=ledger.filter(e=>e.type==='owner-investment');if(b===undefined){if(grants.length)fail();return s;}
  if(!exact(b,['version','meetings'])||b.version!==1||!Array.isArray(b.meetings)||!b.meetings.length||b.meetings.length>s.year*46)fail();
  const receipts=new Map(ledger.map((e,i)=>[e.id,i])),contracts=new Set(F.roster.map(p=>p.identity)),ctx=context(s);let last=-1,cursor=0;
  for(const m of b.meetings){
   if(!exact(m,['year','round','choice','identity','ledgerIndex'])||!Number.isInteger(m.year)||m.year<1||m.year>s.year||!Number.isInteger(m.round)||m.round<1||m.round>rounds(s,m.year)||m.year===s.year&&m.round>s.round+1||week(s,m.year,m.round)<=last||!Object.hasOwn(labels,m.choice)||!Number.isInteger(m.ledgerIndex)||m.ledgerIndex<cursor||m.ledgerIndex>ledger.length)fail();last=week(s,m.year,m.round);
   const stat=s.statistics;if(!stat||m.year<stat.originYear||m.year===stat.originYear&&m.round<=stat.originRound)fail();
   const previous=receipts.get('match-'+m.year+'-'+(m.round-1)),following=receipts.get('match-'+m.year+'-'+m.round);
   if(previous!==undefined&&previous>=m.ledgerIndex||following!==undefined&&following<m.ledgerIndex)fail();
   // Replay ownership up to the exact meeting, including same-week transfers.
   for(;cursor<m.ledgerIndex;cursor++){const e=ledger[cursor];if(e.year>m.year||e.year===m.year&&e.round>m.round)fail();if(e.type==='transfer'){contracts.delete(e.outgoing);contracts.add(e.incoming);}}
   if(m.choice==='youth'){if(!F.identityProfile(m.identity)?.academy||!contracts.has(m.identity))fail();}else if(m.identity!==null)fail();
   if(['results','youth'].includes(m.choice)){const end=Math.min(promise(m,s).end,m.year<s.year?rounds(s,m.year):s.round),records=ctx.get(m.year)||[];for(let round=m.round;round<=end;round++)if(!records.some(r=>r.round===round))fail();}
   if(m.choice==='investment'){const e=ledger[m.ledgerIndex];if(!exact(e,['id','type','year','round','amount'])||e.id!=='owner-investment-'+m.year||e.type!=='owner-investment'||e.year!==m.year||e.round!==m.round||e.amount!==20000)fail();}
  }
  if(grants.length!==b.meetings.filter(m=>m.choice==='investment').length)fail();replay(s);return s;
 }
 function restore(s,raw){if(raw!==undefined)s.ownerBoard=copy(raw);validate(s);return s;}
 const api={read,confidence,meet,validate,restore};root.OwnerBoard=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
