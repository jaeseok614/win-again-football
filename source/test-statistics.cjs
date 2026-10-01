'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),ST=require('./dist/statistics.js');
const copy=x=>JSON.parse(JSON.stringify(x));let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
function finish(m,engine=F){while(m.phase!=='full'){if(!engine.running(m))engine.begin(m);engine.finishSegment(m);}return m;}
function settle(s){finish(s.match);return S.settle(s);}
function finishCups(s){while(s.competition==='cup')s=settle(s);return s;}
function round(s){return finishCups(settle(finishCups(s)));}
function complete(s){while(s.match)s=settle(s);return s;}
function oldV7(){const c=vm.createContext({});for(const name of ['engine','economy','career','cup','health','season'])vm.runInContext(fs.readFileSync(path.join(__dirname,'legacy-v7',name+'.js'),'utf8'),c);return {F:c.Football,S:c.Season};}
function boosted(seed){const s=S.create(seed);for(const p of Object.values(s.squad)){for(const k of ['attack','defense','passing','speed','endurance','keeping']){p[k]=99;s.match.players[p.id][k]=99;}p.potential=99;s.match.players[p.id].potential=99;p.energy=100;s.match.players[p.id].energy=100;s.match.players[p.id].initialEnergy=100;s.career.baselines[p.identity]=99;}return s;}

test('fresh records show the current squad without invented appearances or old goals',()=>{
 const s=S.create(),sum=ST.summary(s);assert.equal(s.version,8);assert.equal(sum.players.length,18);assert.equal(sum.matches,0);assert.equal(sum.goals,0);assert.equal(sum.assists,0);assert.equal(sum.minutes,0);assert.equal(sum.partial,false);assert.ok(sum.players.every(p=>p.apps===0&&p.starts===0&&p.goals===0));assert.equal(ST.lastMatch(s),null);assert.deepEqual(ST.history(s),[]);assert.throws(()=>ST.summary(s,'friendly'));assert.throws(()=>ST.summary(s,'all',2));assert.deepEqual(S.restore(copy(s)).statistics,s.statistics);
});

test('only confirmation records a completed match and duplicate statistics cannot be settled',()=>{
 let s=S.create(121);F.begin(s.match);F.finishSegment(s.match);assert.equal(ST.summary(s).matches,0);finish(s.match);const score=[...s.match.score];assert.equal(ST.summary(s).matches,0);s=S.settle(s);const sum=ST.summary(s),record=ST.lastMatch(s);assert.equal(sum.matches,1);assert.equal(sum.minutes,990);assert.equal(sum.goals,score[0]);assert.deepEqual(record.score,score);assert.equal(record.id,'match-1-1');assert.equal(record.players.reduce((n,p)=>n+p.minutes,0),990);assert.equal(record.players.reduce((n,p)=>n+p.starts,0),11);assert.throws(()=>ST.afterMatch(s,s.match,{competition:'league',round:1}));assert.deepEqual(S.restore(copy(s)).statistics,s.statistics);
});

test('known goals and assists belong to actual on-field identities and canonical names',()=>{
 let s=S.create(121);finish(s.match);const events=copy(F.goalAttributions(s.match));assert.ok(events.length>0);s=S.settle(s);const sum=ST.summary(s),r=ST.lastMatch(s);assert.equal(sum.unassignedGoals,0);assert.equal(sum.players.reduce((n,p)=>n+p.goals,0),sum.goals);assert.equal(sum.players.reduce((n,p)=>n+p.assists,0),sum.assists);assert.equal(sum.assists,events.filter(e=>e.assistIdentity!==null).length);
 for(const e of r.events){const seg=r.segments.find(x=>e.minute>x.start&&e.minute<=x.end);assert.ok(seg.lineup.includes(e.scorerId));assert.equal(e.scorerName,F.identityProfile(e.scorerIdentity).name);if(e.assistId!==null){assert.notEqual(e.scorerId,e.assistId);assert.ok(seg.lineup.includes(e.assistId));assert.equal(e.assistName,F.identityProfile(e.assistIdentity).name);}}
 const raw=copy(s);raw.statistics.records[0].players[0].name='바꾼 이름';const restored=S.restore(raw);assert.equal(ST.summary(restored).players.find(p=>p.identity==='g1').name,F.identityProfile('g1').name);assert.equal(ST.lastMatch(restored).players[0].name,F.identityProfile('g1').name);
});

test('starts and exact minutes survive three substitutions including a goalkeeper change',()=>{
 let s=S.create(128);F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'f1','f3');F.begin(s.match);F.finishSegment(s.match);F.swap(s.match,'m4','m5');F.swap(s.match,'g1','g2');finish(s.match);s=S.settle(s);const rows=ST.summary(s).players,player=id=>rows.find(p=>p.identity===id);
 for(const [id,minutes,starts] of [['f1',45,1],['f3',45,0],['m4',65,1],['m5',25,0],['g1',65,1],['g2',25,0]]){assert.equal(player(id).minutes,minutes);assert.equal(player(id).starts,starts);assert.equal(player(id).apps,1);}assert.equal(player('g1').cleanSheets,0);assert.equal(player('g2').cleanSheets,0);assert.equal(rows.reduce((n,p)=>n+p.minutes,0),990);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('full-match goalkeeper clean sheets require ninety minutes without conceding',()=>{
 let s=S.create(123);finish(s.match);const conceded=s.match.score[1];s=S.settle(s);const g=ST.summary(s).players.find(p=>p.identity==='g1');assert.equal(g.cleanSheets,conceded===0?1:0);assert.ok(ST.summary(s).players.filter(p=>p.pos!=='GK').every(p=>p.cleanSheets===0));assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('a replacement does not inherit appearances while sold identities remain in current records',()=>{
 let s=round(S.create(121));const old=ST.summary(s).players.find(p=>p.identity==='f1');s=S.recruit(s,'t_f2','f1');let rows=ST.summary(s).players;assert.equal(rows.find(p=>p.identity==='t_f2').minutes,0);assert.equal(rows.find(p=>p.identity==='f1').minutes,old.minutes);s=round(s);rows=ST.summary(s).players;assert.equal(rows.find(p=>p.identity==='f1').minutes,old.minutes);assert.ok(rows.find(p=>p.identity==='t_f2').minutes>0);assert.equal(rows.find(p=>p.identity==='t_f2').apps,1);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('league and Cup filters add up and a real shootout adds no player goals or appearances',()=>{
 let s=S.create(549);while(s.round<4)s=round(s);assert.equal(s.competition,'league','round helper resolves the Cup automatically');const cup=ST.summary(s,'cup'),league=ST.summary(s,'league'),all=ST.summary(s);assert.equal(cup.matches,1);assert.equal(league.matches,4);assert.equal(all.matches,cup.matches+league.matches);assert.equal(all.minutes,cup.minutes+league.minutes);assert.equal(all.goals,cup.goals+league.goals);const result=s.cup.results.find(r=>r.home===S.own||r.away===S.own);assert.deepEqual(result.goals,[1,1]);assert.ok(result.penalties);assert.equal(cup.goals,1);assert.equal(cup.players.reduce((n,p)=>n+p.goals,0),1);assert.equal(cup.players.reduce((n,p)=>n+p.minutes,0),990);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('new seasons archive complete identity records and keep their old league after promotion',()=>{
 const completed=complete(boosted(556)),before=ST.summary(completed);assert.equal(completed.cup.champion,S.own);const next=S.nextSeason(completed);assert.equal(next.league.division,1);assert.equal(ST.summary(next).matches,0);assert.equal(ST.summary(next).players.length,18);assert.equal(next.statistics.archive.length,1);const history=ST.history(next);assert.equal(history.length,1);assert.equal(history[0].year,1);assert.equal(history[0].division,2);assert.equal(history[0].goals,before.goals);assert.equal(history[0].minutes,before.minutes);assert.deepEqual(ST.summary(next,'cup',1).matches,3);assert.doesNotThrow(()=>S.restore(copy(next)));assert.equal(ST.lastMatch(next),null);
});

test('v7 halftime migration leaves old goal names unknown and tracks all actual match minutes',()=>{
 const old=oldV7();let raw=old.S.create(121);old.F.begin(raw.match);old.F.finishSegment(raw.match);const already=raw.match.score[0],rng=raw.match.rng;let s=S.restore(copy(raw));assert.equal(s.statistics.originMatchMinute,45);assert.equal(s.statistics.originLedger,raw.finance.ledger.length);assert.equal(s.match.rng,rng);assert.equal(ST.summary(s).matches,0);finish(s.match);const assigned=F.goalAttributions(s.match).length,finalScore=[...s.match.score];s=S.settle(s);const sum=ST.summary(s);assert.equal(sum.unassignedGoals,already);assert.equal(sum.goals,finalScore[0]);assert.equal(sum.players.reduce((n,p)=>n+p.goals,0),assigned);assert.equal(sum.minutes,990);assert.equal(sum.partial,true);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('v7 mid-season and completed-year migration never backfills prior receipts',()=>{
 const old=oldV7();let raw=old.S.create(132);for(let i=0;i<3;i++){finish(raw.match,old.F);raw=old.S.settle(raw);}let s=S.restore(copy(raw));assert.equal(ST.summary(s).matches,0);assert.equal(ST.summary(s).partial,true);assert.equal(ST.summary(s).trackedSinceRound,4);s=round(s);assert.equal(ST.summary(s,'league').matches,1);assert.doesNotThrow(()=>S.restore(copy(s)));
 while(raw.match){finish(raw.match,old.F);raw=old.S.settle(raw);}const ended=S.restore(copy(raw)),next=S.nextSeason(ended);assert.equal(ST.summary(next).matches,0);assert.equal(ST.history(next)[0].matches,0);assert.equal(ST.history(next)[0].partial,true);assert.doesNotThrow(()=>S.restore(copy(next)));
});

test('corrupt receipts, identity contracts, participation, goals and goalkeeper records reject atomically',()=>{
 const s=round(S.create(121)),corrupt=fn=>{const raw=copy(s);fn(raw);assert.throws(()=>S.restore(raw));};corrupt(x=>delete x.statistics);corrupt(x=>x.statistics.year++);corrupt(x=>x.statistics.originRound++);corrupt(x=>x.statistics.records=[]);corrupt(x=>x.statistics.records.push(copy(x.statistics.records[0])));corrupt(x=>x.statistics.records[0].division=1);corrupt(x=>x.statistics.records[0].players[0].minutes--);corrupt(x=>x.statistics.records[0].players[0].started=false);corrupt(x=>x.statistics.records[0].players[0].identity='t_g1');corrupt(x=>x.statistics.records[0].players[0].cleanSheets=2);corrupt(x=>x.statistics.records[0].players[1].goals=1);corrupt(x=>x.statistics.records[0].unassignedGoals++);corrupt(x=>x.statistics.records[0].events[0].scorerIdentity='f2');corrupt(x=>x.statistics.records[0].events[0].assistId='g1');corrupt(x=>x.statistics.records[0].segments[0].lineup[0]='g2');
});

test('continuous positive match segments preserve records while gaps and missing stop boundaries reject',()=>{
 const settled=settle(S.create(123)),raw=copy(settled),record=raw.statistics.records[0];
 record.segments=record.segments.flatMap(seg=>Array.from({length:seg.end-seg.start},(_,i)=>({start:seg.start+i,end:seg.start+i+1,lineup:[...seg.lineup]})));
 assert.equal(record.segments.length,90);assert.deepEqual(ST.summary(S.restore(raw)),ST.summary(settled));
 const corrupt=fn=>{const bad=copy(raw);fn(bad.statistics.records[0]);assert.throws(()=>S.restore(bad));};
 corrupt(r=>r.segments[10].start++);corrupt(r=>r.segments[10].start--);corrupt(r=>r.segments[10].end=r.segments[10].start);
 corrupt(r=>r.segments[10].end+=.5);corrupt(r=>r.segments.at(-1).end--);corrupt(r=>r.segments.push(copy(r.segments.at(-1))));
 for(const boundary of [45,65])corrupt(r=>{r.segments[boundary-1].end++;r.segments.splice(boundary,1);});
});

test('continuous records reject re-entry and a fourth substitution even with balanced player minutes',()=>{
 let settled;for(let seed=1;seed<=100;seed++){const s=S.create(seed);finish(s.match);if(s.match.score[0]===0){settled=S.settle(s);break;}}assert.ok(settled,'Use a real goal-free match so attribution cannot mask roster validation.');
 const raw=copy(settled),record=raw.statistics.records[0],original=record.segments[0].lineup;
 const stops=[0,10,20,30,40,45,65,90];record.segments=stops.slice(0,-1).map((start,i)=>({start,end:stops[i+1],lineup:[...original]}));
 const recount=r=>{for(const p of r.players){p.minutes=r.segments.reduce((n,seg)=>n+(seg.lineup.includes(p.id)?seg.end-seg.start:0),0);p.started=r.segments[0].lineup.includes(p.id);p.cleanSheets=F.identityProfile(p.identity).pos==='GK'&&p.minutes===90&&r.score[1]===0?1:0;}};
 const rejected=mutate=>{const bad=copy(raw),r=bad.statistics.records[0];mutate(r);recount(r);assert.equal(r.players.reduce((n,p)=>n+p.minutes,0),990);assert.throws(()=>S.restore(bad));};
 rejected(r=>{r.segments[1].lineup=r.segments[1].lineup.map(id=>id==='g1'?'g2':id);});
 rejected(r=>{const swaps=[['g1','g2'],['d1','d5'],['d2','d6'],['m1','m5']];for(let i=1;i<r.segments.length;i++)for(const [out,inside] of swaps.slice(0,Math.min(i,swaps.length)))r.segments[i].lineup=r.segments[i].lineup.map(id=>id===out?inside:id);});
 rejected(r=>{for(let i=1;i<r.segments.length;i++)r.segments[i].lineup=r.segments[i].lineup.map(id=>id==='d1'?'m5':id);});
});

test('past records remain receipt-complete and an archived score cannot change league points',()=>{
 const s=S.nextSeason(complete(S.create(138)));const bad=copy(s);bad.statistics.archive[0].records.pop();assert.throws(()=>S.restore(bad));const wrong=copy(s);wrong.statistics.archive[0].year=2;assert.throws(()=>S.restore(wrong));const changed=copy(s),r=changed.statistics.archive[0].records.find(x=>x.competition==='league'&&x.score[0]>x.score[1]);if(r){const delta=r.score[0]-r.score[1];r.score[1]+=delta;const e=changed.finance.ledger.find(x=>x.id===r.id),old=e.amount;e.bonus=1000;e.income=e.gate+e.sponsor+e.bonus;e.amount=e.income-e.payroll;changed.finance.balance+=e.amount-old;assert.throws(()=>S.restore(changed));}assert.doesNotThrow(()=>S.restore(copy(s)));
});

console.log('Statistics tests passed: '+passed+' groups.');
