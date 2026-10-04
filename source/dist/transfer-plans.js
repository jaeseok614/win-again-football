(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),E=root.Economy||(typeof require==='function'?require('./economy.js'):null),copy=x=>JSON.parse(JSON.stringify(x)),positions=['all','GK','DEF','MID','FW'],sorts=['position','cost','potential','primary'];
 const seasonModule=()=>root.Season||(typeof require==='function'?require('./season.js'):null);
 function validate(s){
  const book=s.transferPlans;if(book===undefined)return s;
  if(!book||typeof book!=='object'||Array.isArray(book)||Object.keys(book).length!==2||book.version!==1||!Array.isArray(book.shortlist)||book.shortlist.length>F.market.length||new Set(book.shortlist).size!==book.shortlist.length||book.shortlist.some(id=>!F.market.some(p=>p.identity===id)))throw Error('저장한 영입 관심 목록을 읽을 수 없어요.');return s;
 }
 function toggle(s,identity){validate(s);if(!F.market.some(p=>p.identity===identity))throw Error('영입 시장의 후보를 선택하세요.');const next=copy(s),old=next.transferPlans?.shortlist||[],shortlist=old.includes(identity)?old.filter(id=>id!==identity):old.concat(identity);if(shortlist.length)next.transferPlans={version:1,shortlist};else delete next.transferPlans;return next;}
 function outgoingSlot(s,p,choices={}){const players=Object.values(s.squad).filter(x=>x.pos===p.pos),chosen=choices[p.identity];return players.some(x=>x.id===chosen)?chosen:[...players].sort((a,b)=>Number(s.match?.lineup.includes(a.id))-Number(s.match?.lineup.includes(b.id))||a[F.roleKey(a)]-b[F.roleKey(b)]||a.id.localeCompare(b.id))[0].id;}
 function search(s,filters={},choices={}){
  validate(s);const position=positions.includes(filters.position)?filters.position:'all',sort=sorts.includes(filters.sort)?filters.sort:'position',query=typeof filters.query==='string'?filters.query.trim().toLocaleLowerCase('ko-KR').slice(0,60):'',shortlistOnly=filters.shortlistOnly===true,affordableOnly=filters.affordableOnly===true,shortlist=s.transferPlans?.shortlist||[];
  const rows=F.market.map(p=>{const slot=outgoingSlot(s,p,choices),registered=Object.values(s.squad).find(x=>x.identity===p.identity),owned=!!registered,actual=registered||p,used=s.finance.marketUsed.includes(p.identity),quote=E.quote(s,p.identity,slot);return {identity:p.identity,name:p.name,pos:p.pos,kind:p.kind,primary:actual[F.roleKey(actual)],potential:actual.potential,slot,shortlisted:shortlist.includes(p.identity),owned,used,quote};}).filter(p=>(position==='all'||p.pos===position)&&(!query||[p.name,p.pos,p.kind].some(x=>x.toLocaleLowerCase('ko-KR').includes(query)))&&(!shortlistOnly||p.shortlisted)&&(!affordableOnly||!p.owned&&!p.used&&p.quote.balanceAfter>=0));
  rows.sort((a,b)=>sort==='cost'?a.quote.cost-b.quote.cost||a.identity.localeCompare(b.identity):sort==='potential'?b.potential-a.potential||a.quote.cost-b.quote.cost:sort==='primary'?b.primary-a.primary||a.quote.cost-b.quote.cost:positions.indexOf(a.pos)-positions.indexOf(b.pos)||F.market.findIndex(p=>p.identity===a.identity)-F.market.findIndex(p=>p.identity===b.identity));
  return {rows,total:F.market.length,shortlistCount:shortlist.length,filters:{position,sort,query,shortlistOnly,affordableOnly}};
 }
 function preview(s,identity,slot){
  const S=seasonModule(),next=S.recruit(s,identity,slot),incoming=F.identityProfile(identity),outgoing=s.squad[slot],quote=E.quote(s,identity,slot),key=F.roleKey(incoming);
  return {identity,slot,fingerprint:JSON.stringify(s),incoming:{identity,name:incoming.name,pos:incoming.pos,primary:incoming[key],potential:incoming.potential,wage:incoming.wage},outgoing:{identity:outgoing.identity,name:outgoing.name,pos:outgoing.pos,primary:outgoing[key],potential:outgoing.potential,xp:outgoing.xp,wage:F.identityProfile(outgoing.identity).wage},quote,starting:!!next.match.lineup.includes(slot),lineupChanged:JSON.stringify(next.match.lineup)!==JSON.stringify(s.match.lineup),academy:!!incoming.academy};
 }
 function confirm(s,identity,slot,fingerprint){if(typeof fingerprint!=='string'||fingerprint!==JSON.stringify(s))throw Error('구단 상태가 바뀌었습니다. 영입 내용을 다시 확인하세요.');return seasonModule().recruit(s,identity,slot);}
 const api={validate,toggle,outgoingSlot,search,preview,confirm};root.TransferPlans=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
