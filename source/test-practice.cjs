'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),F=require('./dist/engine.js'),Practice=require('./dist/practice.js');
const copy=value=>JSON.parse(JSON.stringify(value));let checks=0;
function test(label,fn){fn();checks++;console.log('PASS '+label);}
function natural(seed,minute){const match=F.create(seed,{players:Object.fromEntries(F.startingRoster.map(p=>[p.id,p])),homeName:'토투넘',opponentName:'팔켄루 04'});while(match.minute<minute){if(!F.running(match))F.begin(match);F.tick(match);}match.paused=true;return match;}
function advance(session,minute){const match=session.match;while(match.minute<minute){if(!F.running(match))F.begin(match);match.paused=false;F.tick(match);}return session;}
function complete(session,tactic){F.setTactic(session.match,tactic);advance(session,90);return Practice.summary(session);}

test('two practice scenarios reach their starting situations through unmodified normal simulation',()=>{
 assert.deepEqual(Practice.scenarios.map(s=>[s.id,s.title,s.startMinute]),[['comeback','15분의 승부',75],['protect','마지막 10분',80]]);
 for(const [id,seed,minute,score] of [['comeback',29,75,[0,1]],['protect',16,80,[2,1]]]){const session=Practice.create(id);assert.deepEqual(session.match,natural(seed,minute));assert.deepEqual(session.startScore,score);assert.equal(session.startMinute,minute);assert.equal(session.match.paused,true);assert.equal(session.match.phase,'third');assert.equal(session.match.subs,0);assert.equal(session.match.players.f1.minutes,minute);assert.equal(Object.values(session.match.players).reduce((sum,p)=>sum+p.minutes,0),minute*11);assert.deepEqual(F.restore(session.match),session.match);assert.equal(Practice.read(session).valid,true);}
 assert.throws(()=>Practice.create('other'),/연습 경기/);
});

test('ready summaries have no fake events, energy cost, decisions or completed objective',()=>{
 for(const scenario of Practice.scenarios){const session=Practice.create(scenario.id),summary=Practice.read(session);assert.equal(summary.status,'ready');assert.equal(summary.fulltime,false);assert.equal(summary.objectiveAchieved,null);assert.equal(summary.remainingMinutes,90-scenario.startMinute);for(const key of ['goals','chances','shots','xg'])assert.deepEqual(summary[key],[0,0]);assert.deepEqual(summary.events,[]);assert.deepEqual(summary.decisions,[]);assert.equal(summary.subsUsed,0);assert.equal(summary.players.length,18);for(const p of summary.players){assert.equal(p.minutes,0);assert.equal(p.energySpent,0);assert.equal(p.energy,p.startEnergy);assert.equal(p.onField,p.onFieldAtStart);}}
});

test('the same practice can be replayed with exactly the same team, seed and starting history',()=>{
 for(const scenario of Practice.scenarios){const first=Practice.create(scenario.id),second=Practice.create(scenario.id);assert.deepEqual(first,second);assert.notEqual(first,second);assert.notEqual(first.match,second.match);F.setTactic(first.match,'press');F.swap(first.match,'f1','f3');advance(first,first.startMinute+1);assert.deepEqual(second,Practice.create(scenario.id));assert.equal(Practice.read(second).valid,true);}
});

test('all three tactics complete each objective from real final scores without a victory guarantee',()=>{
 const outcomes={comeback:{balanced:[[0,1],false],press:[[1,1],true],counter:[[0,1],false]},protect:{balanced:[[2,2],false],press:[[2,2],false],counter:[[2,1],true]}};
 for(const scenario of Practice.scenarios)for(const tactic of ['balanced','press','counter']){const session=Practice.create(scenario.id),summary=complete(session,tactic),[score,achieved]=outcomes[scenario.id][tactic];assert.equal(summary.valid,true);assert.equal(summary.status,'fulltime');assert.equal(summary.minute,90);assert.equal(summary.fulltime,true);assert.equal(summary.remainingMinutes,0);assert.deepEqual(summary.score,score);assert.equal(summary.objectiveAchieved,achieved);assert.deepEqual(F.restore(session.match),session.match);assert.deepEqual(Practice.summary(session),summary);}
});

test('tactics and substitutions at the practice start preserve pause, time, RNG and existing history',()=>{
 for(const scenario of Practice.scenarios){const session=Practice.create(scenario.id),before=copy(session.match);F.setTactic(session.match,'press');F.swap(session.match,'f1','f3');F.setTactic(session.match,'counter');assert.equal(session.match.minute,before.minute);assert.equal(session.match.paused,true);assert.equal(session.match.rng,before.rng);assert.deepEqual(session.match.logs.slice(0,before.logs.length),before.logs);assert.deepEqual(session.match.players,before.players);assert.deepEqual(session.match.score,before.score);assert.equal(session.match.segments.at(-1).start,scenario.startMinute);assert.equal(session.match.segments.at(-1).end,null);
  const summary=Practice.read(session);assert.equal(summary.valid,true);assert.equal(summary.status,'ready');assert.equal(summary.objectiveAchieved,null);assert.equal(summary.subsUsed,1);assert.deepEqual(summary.decisions.map(d=>[d.minute,d.type]),[[scenario.startMinute,'tactic'],[scenario.startMinute,'sub'],[scenario.startMinute,'tactic']]);assert.equal(summary.decisions[0].toLabel,'전방 압박');assert.equal(summary.decisions[1].outIdentity,'sp_f1');assert.equal(summary.decisions[1].inIdentity,'sp_f3');assert.equal(summary.decisions[1].outName,session.match.players.f1.name);assert.equal(summary.tactic.id,'counter');assert.match(summary.tactic.description,/상대 기회/);assert.deepEqual(summary.events,[]);
 }
});

test('tail score, chances, shots, xG and event attributions exactly match the played final minutes',()=>{
 for(const scenario of Practice.scenarios){const session=Practice.create(scenario.id);F.setTactic(session.match,scenario.id==='comeback'?'press':'balanced');advance(session,90);const summary=Practice.read(session),match=session.match;
  for(const [reported,stored,initial] of [['goals','score','startScore'],['chances','chances','startChances'],['shots','shots','startShots'],['xg','xg','startXg']])assert.deepEqual(summary[reported],match[stored].map((value,team)=>value-session[initial][team]));
  const events=match.logs.filter(e=>e.minute>scenario.startMinute&&['goal','chance','shot'].includes(e.type));assert.deepEqual(summary.events,events);assert.ok(summary.events.length>0);for(const event of summary.events)assert.ok(event.minute>scenario.startMinute&&event.minute<=90);for(let team=0;team<2;team++)assert.equal(summary.events.filter(e=>e.type==='goal'&&e.team===team).length,summary.goals[team]);
  for(const goal of summary.events.filter(e=>e.type==='goal'&&e.team===0)){const segment=match.segments.find(s=>goal.minute>s.start&&goal.minute<=s.end);assert.ok(segment.lineup.includes(goal.scorerId));assert.equal(goal.scorerIdentity,match.players[goal.scorerId].identity);if(goal.assistId)assert.ok(segment.lineup.includes(goal.assistId));}
 }
});

test('mid-practice substitutions report actual tail minutes and stop spending outgoing energy',()=>{
 const session=Practice.create('comeback');F.setTactic(session.match,'press');F.swap(session.match,'f1','f3');advance(session,79);F.swap(session.match,'m1','m5');advance(session,84);F.swap(session.match,'d1','d5');const outgoingEnergy={f1:session.match.players.f1.energy,m1:session.match.players.m1.energy,d1:session.match.players.d1.energy};advance(session,90);const summary=Practice.read(session);assert.equal(summary.valid,true);assert.equal(summary.subsUsed,3);assert.deepEqual(summary.decisions.filter(d=>d.type==='sub').map(d=>d.minute),[75,79,84]);
 const players=Object.fromEntries(summary.players.map(p=>[p.id,p]));for(const [id,minutes] of Object.entries({f1:0,f3:15,m1:4,m5:11,d1:9,d5:6,g1:15,g2:0}))assert.equal(players[id].minutes,minutes);assert.equal(summary.players.reduce((sum,p)=>sum+p.minutes,0),165);
 for(const id of Object.keys(outgoingEnergy))assert.equal(players[id].energy,outgoingEnergy[id]);for(const p of summary.players){assert.equal(p.energySpent,session.startEnergy[p.id]-session.match.players[p.id].energy);assert.ok(p.energySpent>=0);assert.equal(p.onField,session.match.lineup.includes(p.id));}assert.equal(players.f1.onField,false);assert.equal(players.f1.onFieldAtStart,true);assert.equal(players.f3.onFieldAtStart,false);assert.equal(players.f3.onField,true);
});

test('normal engine saves restore identically at the start, during decisions and at full time',()=>{
 for(const scenario of Practice.scenarios){const original=Practice.create(scenario.id);F.setTactic(original.match,'press');F.swap(original.match,'f1','f3');const checkpoints=[scenario.startMinute,scenario.startMinute+3,89,90];for(const minute of checkpoints){advance(original,minute);const restored=copy(original);restored.match=F.restore(restored.match);assert.equal(Practice.read(restored).valid,true);assert.deepEqual(Practice.read(restored),Practice.read(original));advance(restored,90);const uninterrupted=copy(original);advance(uninterrupted,90);assert.deepEqual(restored,uninterrupted);}}
});

test('practice reads and returned reports are detached, with no mutation of gameplay or session metadata',()=>{
 const session=Practice.create('comeback');F.setTactic(session.match,'press');advance(session,82);const before=JSON.stringify(session),summary=Practice.read(session);assert.equal(JSON.stringify(session),before);assert.deepEqual(Practice.summary(session),summary);assert.equal(JSON.stringify(session),before);
 summary.startScore[0]=99;summary.score[0]=99;summary.goals[0]=99;summary.players[0].energy=0;summary.players[0].identity='other';summary.decisions[0].to='other';if(summary.events[0])summary.events[0].text='other';summary.tactic.description='other';assert.equal(JSON.stringify(session),before);assert.equal(Practice.read(session).valid,true);assert.notEqual(Practice.read(session).score[0],99);
});

test('a lead or equal score before full time does not claim the objective is achieved',()=>{
 const protect=Practice.create('protect');advance(protect,81);const summary=Practice.read(protect);assert.equal(summary.valid,true);assert.equal(summary.status,'playing');assert.equal(summary.fulltime,false);assert.equal(summary.objectiveAchieved,null);assert.equal(summary.remainingMinutes,9);
 const comeback=Practice.create('comeback');F.setTactic(comeback.match,'press');while(comeback.match.minute<89&&comeback.match.score[0]<comeback.match.score[1])advance(comeback,comeback.match.minute+1);assert.equal(comeback.match.score[0],comeback.match.score[1]);assert.equal(Practice.read(comeback).objectiveAchieved,null);
});

test('invalid scenarios, changed start snapshots and foreign or malformed matches are rejected honestly',()=>{
 assert.equal(Practice.read(null).valid,false);assert.equal(Practice.read({id:'other'}).valid,false);assert.equal(Practice.read({id:'comeback'}).valid,false);
 const session=Practice.create('comeback');for(const mutate of [s=>s.id='protect',s=>s.startMinute++,s=>s.startScore[0]++,s=>s.startChances[0]++,s=>s.startShots[0]++,s=>s.startXg[0]+=.1,s=>s.startEnergy.f1++,s=>s.startPlayerMinutes.f1++,s=>s.startSubs++,s=>s.startDecisionCount++,s=>s.match=F.create(),s=>s.match=natural(6,75),s=>s.match.rng++,s=>s.match.logs[0].text='invented',s=>s.match.players.f1.attack++]){const bad=copy(session);mutate(bad);const before=JSON.stringify(bad);const result=Practice.read(bad);assert.equal(result.valid,false);assert.equal(typeof result.reason,'string');assert.ok(result.reason.length>0);assert.equal(JSON.stringify(bad),before);}
});

test('practice sessions stay independent of campaign state, transfers, economy and prior attempts',()=>{
 const campaign={seed:123,round:12,cash:480000,squad:{f1:{identity:'t_f1',attack:99,energy:9}},match:continuousOtherMatch()};const before=JSON.stringify(campaign),session=Practice.create('protect');F.swap(session.match,'f1','f3');F.setTactic(session.match,'counter');advance(session,90);assert.equal(Practice.read(session).valid,true);assert.equal(JSON.stringify(campaign),before);assert.equal(session.match.players.f1.identity,'sp_f1');assert.ok(!Object.hasOwn(session,'season'));assert.ok(!Object.hasOwn(session,'cash'));assert.ok(!Object.hasOwn(Practice,'settle'));assert.deepEqual(Practice.create('protect').match,natural(16,80));
 const source=fs.readFileSync(path.join(__dirname,'dist/practice.js'),'utf8');assert.ok(!/require\(['"]\.\/(?:season|economy|career|statistics|health)\.js/.test(source));
});
function continuousOtherMatch(){const match=F.create(123);F.begin(match);for(let i=0;i<4;i++)F.tick(match);F.setTactic(match,'press');return match;}

test('browser UMD exports the same practice model without campaign globals',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/engine.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/practice.js'),'utf8'),context);assert.ok(context.Practice);const session=context.Practice.create('protect');assert.deepEqual(copy(context.Practice.read(session)),Practice.read(Practice.create('protect')));assert.equal(context.Season,undefined);assert.equal(context.Economy,undefined);
});

console.log('Validated '+checks+' isolated practice groups.');
