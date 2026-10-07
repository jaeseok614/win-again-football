'use strict';
const assert=require('node:assert/strict'),S=require('./dist/season.js'),F=require('./dist/engine.js'),O=require('./dist/opposition.js');
const Cup=require('./dist/cup.js'),Europe=require('./dist/europe.js');
let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
function playedRounds(s,count){for(let round=0;round<count;round++){for(const fixture of S.fixturesFor(s)[round])s.results.push({round,...fixture,goals:[0,0]});s.round=round+1;}return s;}
function nextOpponent(s){const fixture=S.leagueFixture(s);return fixture.home===S.own?fixture.away:fixture.home;}

test('AI cards replay from fixed fixture seeds without writing new save fields or changing results',()=>{
 const s=playedRounds(S.create(1,{startingClub:true}),5),id=nextOpponent(s),before=JSON.stringify(s),first=O.rivalRows(s,id),second=O.rivalRows(s,id);
 assert.ok(first.some(row=>row.pending>0));assert.deepEqual(second,first);assert.equal(JSON.stringify(s),before);assert.ok(s.results.every(result=>!Object.hasOwn(result,'cards')));assert.ok(first.every(row=>row.identity.startsWith('opposition:'+id+':')));
});


test('a ban is served at the next league fixture and fields a weaker reserve',()=>{
 let s=playedRounds(S.create(1,{startingClub:true}),5),id=nextOpponent(s),rows=O.rivalRows(s,id),banned=rows.filter(row=>row.pending>0);assert.ok(banned.length);
 s=S.selectNextMatch(s);assert.equal(s.competition,'league');assert.equal(S.opponentFor(s).id,id);const report=O.read(s),base=O.competitionProfile(S.rawClub(id),s.league.division,'five-tier');
 assert.equal(report.rivalDiscipline.absent.length,banned.length);assert.equal(report.lineup.length,11);assert.ok(report.lineup.some(player=>player.replacementFor));assert.ok(['attack','defense','middle','speed'].some(key=>s.match.opponent[key]<base[key]));
 const baseline=S.create(1,{startingClub:true});baseline.round=5;S.selectNextMatch(baseline);assert.equal(s.match.seed,baseline.match.seed);assert.equal(s.match.rng,baseline.match.rng);
 const before=JSON.stringify(s);O.read(s);assert.equal(JSON.stringify(s),before);
});

test('league cards stay separate from cup and European competition tables',()=>{
 const s=playedRounds(S.create(1,{startingClub:true}),5),id=nextOpponent(s),rows=O.rivalRows(s,id),base=O.competitionProfile(S.rawClub(id),s.league.division,'five-tier'),cup=O.rivalEffect({...s,competition:'cup'},S.club(id),base),europe=O.rivalEffect({...s,competition:'europe'},S.club(id),base);
 assert.ok(rows.some(row=>row.pending));assert.deepEqual(cup.profile,base);assert.deepEqual(europe.profile,base);assert.ok(cup.lineup.every(player=>!player.replacementFor));
});

test('cup suspensions carry into the next cup round and weaken its actual opponent',()=>{
 const s=S.create(17,{startingClub:true}),first=Cup.fixturesFor(s,0),ownFixture=first.find(f=>f.home===S.own||f.away===S.own),partner=first.find(f=>Math.floor(f.index/2)===Math.floor(ownFixture.index/2)&&f.index!==ownFixture.index),red=O.seededCards(s,partner,new Map(),'cup').find(e=>e.card==='red');assert.ok(red);
 const target=red.teamId;s.cup.results=first.map(f=>{const winner=f.index===ownFixture.index?S.own:f.index===partner.index?target:f.home;return {...f,goals:winner===f.home?[1,0]:[0,1],winner,week:Cup.gateFor(s,0)};});s.cup.stage=1;s.round=Cup.gateFor(s,1);
 assert.ok(O.rivalRows(s,target,'cup').some(row=>row.pending));assert.equal(O.rivalRows(s,target,'league').length,0);
 S.selectNextMatch(s);assert.equal(s.competition,'cup');assert.equal(S.opponentFor(s).id,target);const base=O.competitionProfile(S.rawClub(target),s.league.division,'five-tier');assert.ok(['attack','defense','middle','speed'].some(key=>s.match.opponent[key]<base[key]));assert.equal(s.match.seed,Cup.seedFor(s,Cup.fixtureFor(s)));
});

test('European suspensions carry into the next European fixture and stay separate from league cards',()=>{
 const s=S.create(5,{startingClub:true});s.year=2;s.league.division=1;s.history=[{year:1,division:1,rank:1}];Europe.initialize(s);const first=Europe.fixturesFor(s,0),next=Europe.fixturesFor(s,1).find(f=>f.home===S.own||f.away===S.own),target=next.home===S.own?next.away:next.home,redFixture=first.find(f=>O.seededCards(s,f,new Map(),'europe').some(e=>e.card==='red'&&e.teamId===target));assert.ok(redFixture);
 s.europe.results=first.map(f=>({...f,goals:[1,0],winner:f.home,week:Europe.gateFor(s,0)}));s.europe.stage=1;s.round=Europe.gateFor(s,1);s.cup.enabled=false;
 assert.ok(O.rivalRows(s,target,'europe').some(row=>row.pending));assert.equal(O.rivalRows(s,target,'league').length,0);
 S.selectNextMatch(s);assert.equal(s.competition,'europe');assert.equal(S.opponentFor(s).id,target);const base=O.profile(S.rawClub(target));assert.ok(['attack','defense','middle','speed'].some(key=>s.match.opponent[key]<base[key]));assert.equal(s.match.seed,Europe.seedFor(s,Europe.fixtureFor(s)));
});

test('old in-progress saves restore their already-generated opponent profile unchanged',()=>{
 let s=S.create(1,{startingClub:true}),guard=0;while(!(s.round===5&&s.competition==='league')&&guard++<20){while(s.match.phase!=='full'){if(!['first','second','third'].includes(s.match.phase))F.begin(s.match);F.finishSegment(s.match);}s=S.settle(s);}
 assert.ok(guard<20);const current=JSON.parse(JSON.stringify(s));assert.doesNotThrow(()=>S.restore(current));const id=S.opponentFor(s).id,old=JSON.parse(JSON.stringify(s));old.match.opponent=O.competitionProfile(S.rawClub(id),s.league.division,'five-tier');assert.throws(()=>S.restore(old));
});

console.log('Validated '+groups+' rival discipline groups.');
