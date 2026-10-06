'use strict';
const assert=require('node:assert/strict'),S=require('./dist/season.js'),F=require('./dist/engine.js'),O=require('./dist/opposition.js');
let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
function playedRounds(s,count){for(let round=0;round<count;round++){for(const fixture of S.fixturesFor(s)[round])s.results.push({round,...fixture,goals:[0,0]});s.round=round+1;}return s;}
function nextOpponent(s){const fixture=S.leagueFixture(s);return fixture.home===S.own?fixture.away:fixture.home;}

test('AI cards replay from fixed fixture seeds without writing new save fields or changing results',()=>{
 const s=playedRounds(S.create(1,{startingClub:true}),5),id=nextOpponent(s),before=JSON.stringify(s),first=O.rivalRows(s,id),second=O.rivalRows(s,id);
 assert.ok(first.some(row=>row.pending>0));assert.deepEqual(second,first);assert.equal(JSON.stringify(s),before);assert.ok(s.results.every(result=>!Object.hasOwn(result,'cards')));assert.ok(first.every(row=>row.identity.startsWith('opposition:'+id+':')));
});

test('confirmed manager-match opponent cards count while legacy cardless receipts stay empty',()=>{
 const s=S.create(81,{startingClub:true}),fixture=S.leagueFixture(s),id=fixture.home===S.own?fixture.away:fixture.home,player=O.roster(S.rawClub(id))[1];
 for(const matchFixture of S.fixturesFor(s)[0])s.results.push({round:0,...matchFixture,goals:[0,0]});
 s.statistics.records.push({year:s.year,competition:'league',round:1,cards:[{team:1,id:'opp1',minute:22,card:'yellow',reason:'foul'}]});
 assert.equal(O.rivalRows(s,id).find(row=>row.identity===player.identity).yellows,1);
});

test('a ban is served at the next league fixture and fields a weaker reserve',()=>{
 let s=playedRounds(S.create(1,{startingClub:true}),5),id=nextOpponent(s),rows=O.rivalRows(s,id),banned=rows.filter(row=>row.pending>0);assert.ok(banned.length);
 s=S.selectNextMatch(s);assert.equal(s.competition,'league');assert.equal(S.opponentFor(s).id,id);const report=O.read(s),base=O.competitionProfile(S.rawClub(id),s.league.division,'five-tier');
 assert.equal(report.rivalDiscipline.absent.length,banned.length);assert.equal(report.lineup.length,11);assert.ok(report.lineup.some(player=>player.replacementFor));assert.ok(['attack','defense','middle','speed'].some(key=>s.match.opponent[key]<base[key]));
 const baseline=S.create(1,{startingClub:true});baseline.round=5;S.selectNextMatch(baseline);assert.equal(s.match.seed,baseline.match.seed);assert.equal(s.match.rng,baseline.match.rng);
 const before=JSON.stringify(s);O.read(s);assert.equal(JSON.stringify(s),before);
});

test('league bans do not weaken Cup or European opponents',()=>{
 const s=playedRounds(S.create(1,{startingClub:true}),5),id=nextOpponent(s),rows=O.rivalRows(s,id),base=O.competitionProfile(S.rawClub(id),s.league.division,'five-tier'),cup=O.rivalEffect({...s,competition:'cup'},S.club(id),base),europe=O.rivalEffect({...s,competition:'europe'},S.club(id),base);
 assert.ok(rows.some(row=>row.pending));assert.deepEqual(cup.profile,base);assert.deepEqual(europe.profile,base);assert.ok(cup.lineup.every(player=>!player.replacementFor));
});

test('old in-progress saves restore their already-generated opponent profile unchanged',()=>{
 let s=S.create(1,{startingClub:true}),guard=0;while(!(s.round===5&&s.competition==='league')&&guard++<20){while(s.match.phase!=='full'){if(!['first','second','third'].includes(s.match.phase))F.begin(s.match);F.finishSegment(s.match);}s=S.settle(s);}
 assert.ok(guard<20);const current=JSON.parse(JSON.stringify(s));assert.doesNotThrow(()=>S.restore(current));const id=S.opponentFor(s).id,old=JSON.parse(JSON.stringify(s));old.match.opponent=O.competitionProfile(S.rawClub(id),s.league.division,'five-tier');const restored=S.restore(old);assert.deepEqual(restored.match.opponent,old.match.opponent);assert.deepEqual(S.restore(JSON.parse(JSON.stringify(restored))),restored);
});

console.log('Validated '+groups+' rival discipline groups.');
