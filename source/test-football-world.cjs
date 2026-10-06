'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),S=require('./dist/season.js'),U=require('./dist/europe.js'),O=require('./dist/opposition.js');
const copy=value=>JSON.parse(JSON.stringify(value));
let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
const ratings=club=>({attack:club.attack,defense:club.defense,middle:club.middle,speed:club.speed,energy:94});

test('league and European clubs have unique presentation names without changing their raw identities or ratings',()=>{
 const rawClubs=[...S.clubs,...U.clubs],names=[];
 assert.equal(rawClubs.length,123);
 for(const raw of rawClubs){
  const before=JSON.stringify(raw),presented=S.presentClub(raw);
  assert.equal(S.rawClub(raw.id),raw);
  assert.notEqual(presented,raw);
  assert.equal(JSON.stringify(raw),before);
  assert.equal(presented.id,raw.id);
  for(const key of ['attack','defense','middle','speed','style','en'])assert.equal(presented[key],raw[key]);
  assert.deepEqual(O.profile(raw),ratings(raw));
  assert.deepEqual(O.profile(presented),ratings(raw));
  names.push(presented.name);
 }
 assert.equal(new Set(names).size,123);
 assert.equal(S.rawClub('norhaven').name,'노르헤이븐 시티');
 assert.equal(S.club('norhaven').name,'게이츠힐 FC');
 assert.equal(S.club('rosenholt').name,'몬치스타 시티');
 assert.equal(S.leagueClubs({league:{division:2}}).find(club=>club.id==='norhaven').name,'게이츠힐 FC');
 assert.equal(U.rawClub('meridian').name,'메리디안 FC');
 assert.equal(U.club('meridian').name,'레알 마드리온');
 assert.equal(S.club('meridian').name,'레알 마드리온');
});

test('five divisions use representative 2026/27 English clubs and keep the Tottenham story exception',()=>{
 const expected={
  1:['Manchester City','Chelsea','Arsenal','Newcastle United','Manchester United','Aston Villa','Crystal Palace','Liverpool'],
  2:['Wolverhampton Wanderers','Sheffield United','Burnley','West Ham United','Southampton','Norwich City','Middlesbrough','Wrexham'],
  3:['Leicester City','Stockport County','Wigan Athletic','Wycombe Wanderers','Barnsley','Blackpool','Bradford City','Notts County'],
  4:['York City','Bristol Rovers','Oldham Athletic','Rochdale','Port Vale','Swindon Town','Shrewsbury Town','Walsall'],
  5:['Tottenham Hotspur','Carlisle United','Scunthorpe United','Hartlepool United','Forest Green Rovers','Southend United','Gateshead','Boreham Wood']
 };
 assert.equal(Object.keys(S.clubReferences).length,116);
 for(const division of [1,2,3,4,5]){
  const pool=S.fiveTierPools[division],references=pool.map(club=>S.clubReferences[club.id]);
  assert.equal(pool.length,division===1?20:24,'division '+division+' has its real league size');
  assert.equal(new Set(pool.map(club=>club.id)).size,pool.length);
  assert.deepEqual(references.slice(0,8).map(reference=>reference.reference).sort(),expected[division].sort());
  for(const reference of references)assert.equal(reference.division,division);
  assert.equal(S.divisionInfo({division,rules:'five-tier'}).name,{1:'프리미어 리그',2:'챔피언십',3:'리그 원',4:'리그 투',5:'내셔널 리그'}[division]);
 }
 assert.equal(S.clubReferences.brynwell.competition,'Premier League');
 assert.equal(S.clubReferences.brynwell.division,5);
 assert.equal(S.create(800,{startingClub:true}).league.clubIds.includes(S.own),true);
 assert.equal(new Set(S.clubs.map(club=>S.club(club.id).code)).size,116,'parody crests use distinct short codes');
});

test('club presentation and opposition reports leave the campaign JSON, RNG and engine profile unchanged',()=>{
 const s=S.create(4701),fixture=S.fixtureFor(s),opponentId=fixture.home===S.own?fixture.away:fixture.home,raw=S.rawClub(opponentId),presented=S.opponentFor(s);
 const before=JSON.stringify(s),rng=s.match.rng,seed=s.match.seed,profile=copy(s.match.opponent);
 assert.equal(s.match.homeName,S.rawClub(S.own).name);
 assert.equal(s.match.opponentName,raw.name);
 assert.equal(presented.id,raw.id);
 assert.notEqual(presented.name,raw.name);
 assert.deepEqual(profile,ratings(raw));
 S.club(S.own);S.club(opponentId);S.leagueClubs(s);S.standings(s);O.read(s);
 assert.equal(JSON.stringify(s),before);
 assert.equal(s.match.rng,rng);
 assert.equal(s.match.seed,seed);
 assert.deepEqual(s.match.opponent,profile);
 assert.ok(!before.includes(S.club(S.own).name));
 assert.ok(!before.includes(presented.name));
 assert.deepEqual(S.restore(copy(s)),s);
});

test('every domestic and European club has a deterministic unique eleven and one featured opponent',()=>{
 for(const club of [...S.clubs,...U.clubs]){
  const lineup=O.roster(club),again=O.roster(club);
  assert.deepEqual(again,lineup);
  assert.equal(lineup.length,11);
  assert.equal(new Set(lineup.map(player=>player.name)).size,11,club.id+' names');
  assert.equal(new Set(lineup.map(player=>player.identity)).size,11,club.id+' identities');
  assert.deepEqual(lineup.map(player=>player.identity),lineup.map((player,index)=>'opposition:'+club.id+':'+index));
  assert.equal(lineup.filter(player=>player.featured).length,club.id===S.own?0:1,club.id+' featured');
  for(const player of lineup){
   assert.equal(player.id,'opp'+(player.no-1));
   assert.ok(player.name.length>1);
   assert.ok(['GK','DEF','MID','FW'].includes(player.pos));
  }
 }
});

test('the reported key player is the actual featured lineup member and read remains pure after restore',()=>{
 const s=S.create(4702),before=JSON.stringify(s),report=O.read(s),featured=report.lineup.filter(player=>player.featured);
 assert.equal(report.valid,true);
 assert.equal(featured.length,1);
 assert.deepEqual(report.keyPlayer,{
  id:featured[0].id,identity:featured[0].identity,name:featured[0].name,pos:featured[0].pos,
  role:{GK:'골문 장벽',DEF:'수비 리더',MID:'플레이메이커',FW:'에이스 공격수'}[featured[0].pos],
  threat:report.keyPlayer.threat,primary:featured[0].primary,overall:featured[0].overall,speed:featured[0].speed
 });
 assert.ok(report.keyPlayer.threat.includes(String(featured[0].primary))||report.keyPlayer.threat.includes(String(featured[0].speed)));
 assert.equal(JSON.stringify(s),before);
 assert.deepEqual(O.read(s),report);
 const restored=S.restore(copy(s)),restoredBefore=JSON.stringify(restored);
 assert.deepEqual(O.read(restored),report);
 assert.equal(JSON.stringify(restored),restoredBefore);
});

console.log('Validated '+groups+' football-world groups.');
