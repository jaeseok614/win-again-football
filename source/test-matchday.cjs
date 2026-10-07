'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),F=require('./dist/engine.js'),S=require('./dist/season.js'),Matchday=require('./dist/matchday.js');
const copy=value=>JSON.parse(JSON.stringify(value));let checks=0;
function test(label,fn){fn();checks++;console.log('PASS '+label);}
function advance(season,minute){const m=season.match;while(m.minute<minute){if(!F.running(m))F.begin(m);m.paused=false;F.tick(m);}return season;}
function frozen(value){if(value&&typeof value==='object'){for(const item of Object.values(value))frozen(item);Object.freeze(value);}return value;}

test('missing and malformed matches have no fabricated centre statistics',()=>{
 for(const value of [null,{}, {match:null},{match:{phase:'other'}},{match:{...F.create(),chances:null}}]){const d=Matchday.read(value,'f1');assert.equal(d.valid,false);assert.equal(typeof d.reason,'string');assert.equal(Object.hasOwn(d,'stats'),false);assert.equal(Object.hasOwn(d,'events'),false);}
});

test('preparation uses actual zero counters and preserves the entire fresh campaign',()=>{
 const s=S.create(),before=copy(s),d=Matchday.read(s);
 assert.equal(d.valid,true);assert.equal(d.liveMode,'prep');assert.equal(d.status,'경기 준비');assert.equal(d.minute,0);assert.equal(d.phase,'prep');assert.equal(d.paused,false);assert.equal(d.formation,s.match.formation);assert.equal(d.tacticLabel,'균형 유지');
 assert.deepEqual(d.stats,[{key:'chances',label:'공격 기회',own:0,opponent:0},{key:'shots',label:'슈팅',own:0,opponent:0}]);assert.deepEqual(d.events,[]);assert.equal(d.selected,null);assert.deepEqual(d.candidates,[]);assert.equal(d.substitution.canSubstitute,true);assert.deepEqual(s,before);
 assert.equal(Object.hasOwn(d,'possession'),false);assert.equal(Object.hasOwn(d,'score'),false);
});

test('starting player details use the current match profile and same-position healthy bench',()=>{
 const s=S.create(),m=s.match,d=Matchday.read(s,'f1');assert.equal(d.selected.id,'f1');assert.equal(d.selected.identity,m.players.f1.identity);assert.equal(d.selected.name,m.players.f1.name);assert.equal(d.selected.role,'공격수');assert.equal(d.selected.primaryKey,'attack');assert.equal(d.selected.primaryLabel,'결정력');assert.equal(d.selected.primary,m.players.f1.attack);assert.equal(d.selected.speed,m.players.f1.speed);assert.equal(d.selected.energy,m.players.f1.energy);
 assert.deepEqual(d.candidates.map(p=>p.id),['f3','f4']);for(const p of d.candidates){assert.equal(p.pos,d.selected.pos);assert.equal(p.primary,m.players[p.id].attack);assert.equal(p.energy,m.players[p.id].energy);}
 for(const id of ['f3','not-a-slot',null,{},'__proto__']){const invalid=Matchday.read(s,id);assert.equal(invalid.selected,null);assert.deepEqual(invalid.candidates,[]);}
});

test('kickoff has an actual start event and prevents a zero-minute substitution',()=>{
 const s=S.create();F.begin(s.match);const before=copy(s),d=Matchday.read(s,'f1');assert.equal(d.liveMode,'live');assert.equal(d.status,'전반 진행');assert.equal(d.minute,0);assert.equal(d.substitution.canSubstitute,false);assert.equal(d.events.length,1);assert.deepEqual(d.events[0],{minute:0,type:'start',text:s.match.logs[0].text});assert.deepEqual(s,before);
 advance(s,1);assert.equal(Matchday.read(s,'f1').substitution.canSubstitute,true);
});

test('actual live play counters and fatigue change without the read consuming randomness',()=>{
 const s=advance(S.create(),37),m=s.match,before=copy(s),d=Matchday.read(s,'f1');assert.equal(d.minute,37);assert.equal(d.liveMode,'live');assert.equal(d.stats[0].own,m.chances[0]);assert.equal(d.stats[0].opponent,m.chances[1]);assert.equal(d.stats[1].own,m.shots[0]);assert.equal(d.stats[1].opponent,m.shots[1]);
 assert.equal(d.averageEnergy,m.lineup.reduce((n,id)=>n+m.players[id].energy,0)/11);assert.equal(d.tiredCount,m.lineup.filter(id=>m.players[id].energy<50).length);assert.equal(d.selected.energy,m.players.f1.energy);assert(d.selected.energy<s.squad.f1.energy);assert.deepEqual(s,before);assert.deepEqual(Matchday.read(s,'f1'),d);
});

test('quick selection contains the three actual lowest-energy starters in stable order',()=>{
 const s=advance(S.create(),37),m=s.match,before=copy(s),d=Matchday.read(s);assert.equal(d.lowestEnergy.length,3);for(const p of d.lowestEnergy){assert(m.lineup.includes(p.id));assert.equal(p.energy,m.players[p.id].energy);assert.equal(p.primary,m.players[p.id][p.primaryKey]);}assert(d.lowestEnergy[0].energy<=d.lowestEnergy[1].energy);assert(d.lowestEnergy[1].energy<=d.lowestEnergy[2].energy);assert.equal(d.lowestEnergy[0].id,'f1');assert.deepEqual(s,before);
 const fresh=S.create(),freshBefore=copy(fresh),tied=Matchday.read(fresh);assert.deepEqual(tied.lowestEnergy,Matchday.read(fresh).lowestEnergy);tied.lowestEnergy[0].energy=0;assert.deepEqual(fresh,freshBefore);
});

test('paused tactics and same-minute substitution reflect the current players and decision logs',()=>{
 const s=advance(S.create(),17),m=s.match;m.paused=true;F.setTactic(m,'press');F.swap(m,'f1','f3');const before=copy(s),d=Matchday.read(s,'f3');
 assert.equal(d.liveMode,'paused');assert.equal(d.status,'작전 타임');assert.equal(d.paused,true);assert.equal(d.minute,17);assert.equal(d.tactic,'press');assert.equal(d.tacticLabel,'몰아붙이기');assert.equal(d.selected.id,'f3');assert.equal(d.substitution.used,1);assert.equal(d.substitution.remaining,2);assert.equal(d.events[0].type,'sub');assert.equal(d.events[1].type,'tactic');assert.equal(d.events[0].minute,17);assert.deepEqual(d.candidates.map(p=>p.id),['f4']);assert.equal(Matchday.read(s,'f1').selected,null);assert.deepEqual(s,before);
});

test('injured bench players and removed starters are never offered for re-entry',()=>{
 const s=S.create();s.squad.f3.injury={kind:'knock',remaining:1};s.match=F.create(s.match.seed,{players:s.squad});let d=Matchday.read(s,'f1');assert.deepEqual(d.candidates.map(p=>p.id),['f4']);
 advance(s,12);F.swap(s.match,'f1','f4');d=Matchday.read(s,'f4');assert.deepEqual(d.candidates,[]);assert.equal(d.substitution.used,1);assert.equal(s.match.out.includes('f1'),true);
});

test('all three used substitutions disable further changes without inventing bench availability',()=>{
 const s=advance(S.create(),17);for(const [out,incoming] of [['f1','f3'],['d1','d5'],['m1','m5']])F.swap(s.match,out,incoming);const before=copy(s),d=Matchday.read(s,'f3');assert.deepEqual(d.substitution,{used:3,limit:3,remaining:0,canSubstitute:false,suggestion:null,options:[],windows:null});assert.deepEqual(d.candidates.map(p=>p.id),['f4']);assert.deepEqual(s,before);
});

test('modern matches expose five players and three real substitution windows without offering a spent window',()=>{
 const s=advance(S.create(2060,{startingClub:true}),17),m=s.match;for(const [out,incoming] of [['f1','f3'],['d1','d5']])F.swap(m,out,incoming);advance(s,30);F.swap(m,'m1','m5');advance(s,45);F.swap(m,'f2','f4');advance(s,65);F.swap(m,'d2','d6');const before=copy(s),d=Matchday.read(s,'m2');assert.equal(m.version,10);assert.deepEqual(d.substitution.windows,{used:3,limit:3,remaining:0});assert.equal(d.substitution.used,5);assert.equal(d.substitution.remaining,0);assert.equal(d.substitution.canSubstitute,false);assert.equal(d.substitution.suggestion,null);assert.deepEqual(s,before);
});

test('natural breaks and the last legal minute have distinct accurate control states',()=>{
 const s=S.create();for(const [minute,mode,status] of [[45,'break','하프타임'],[59,'live','후반 진행'],[65,'break','65분 작전 타임'],[74,'live','마지막 승부'],[89,'live','마지막 승부']]){advance(s,minute);const d=Matchday.read(s,'f1');assert.equal(d.minute,minute);assert.equal(d.liveMode,mode);assert.equal(d.status,status);assert.equal(d.substitution.canSubstitute,true);}
});

test('full time keeps actual totals and history but clears actionable selection',()=>{
 const s=advance(S.create(),90),m=s.match,before=copy(s),d=Matchday.read(s,'f1');assert.equal(d.liveMode,'full');assert.equal(d.status,'경기 종료');assert.equal(d.minute,90);assert.equal(d.substitution.canSubstitute,false);assert.equal(d.selected,null);assert.deepEqual(d.candidates,[]);assert.equal(d.events[0].type,'break');assert.equal(d.events[0].minute,90);assert.deepEqual(d.stats.map(r=>[r.own,r.opponent]),[m.chances,m.shots]);assert.equal(s.round,0);assert.deepEqual(s,before);
});

test('only the latest six actual events are returned in reverse chronology and detached from state',()=>{
 const s=advance(S.create(32),90),m=s.match;assert(m.logs.length>6);const before=copy(s),d=Matchday.read(s);assert.equal(d.events.length,6);assert.deepEqual(d.events,m.logs.slice(-6).reverse().map(e=>({minute:e.minute,type:e.type,text:F.displayText(e.text,m.players)})));
 d.events[0].text='changed';d.stats[0].own=900;assert.deepEqual(s,before);const prep={match:F.create()},prepBefore=copy(prep),selection=Matchday.read(prep,'f1');selection.selected.energy=0;selection.candidates[0].name='changed';assert.deepEqual(prep,prepBefore);
});

test('restored interrupted and completed games retain exactly the same centre model',()=>{
 for(const minute of [17,59,74,90]){const s=advance(S.create(),17);s.match.paused=true;F.setTactic(s.match,'counter');F.swap(s.match,'f1','f3');advance(s,minute);if(F.running(s.match))s.match.paused=true;const before=copy(s),restored=S.restore(s);assert.deepEqual(Matchday.read(restored,'f3'),Matchday.read(s,'f3'));assert.deepEqual(s,before);assert.deepEqual(F.restore(s.match),s.match);}
});

test('deeply frozen state is read safely and browser UMD needs no campaign global',()=>{
 const s=advance(S.create(),17);s.match.paused=true;const expected=Matchday.read(s,'f2');assert.deepEqual(Matchday.read(frozen(s),'f2'),expected);
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/engine.js'),'utf8'),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/matchday.js'),'utf8'),context);assert(context.Matchday);assert.equal(context.Season,undefined);const m=context.Football.create();assert.deepEqual(copy(context.Matchday.read({match:m},'f1')),Matchday.read({match:F.create()},'f1'));
});

test('suggested substitution pairs the tired starter with a real healthy same-position reserve without applying it',()=>{
 const s=advance(S.create(2040),17),m=s.match;for(const id of m.lineup)m.players[id].energy=80;for(const p of Object.values(m.players).filter(p=>!m.lineup.includes(p.id)))p.energy=75;m.players.f1.energy=31;m.players.f3.energy=94;const before=copy(s),d=Matchday.read(s),q=d.substitution.suggestion;
 assert.equal(q.out.id,'f1');assert.equal(q.incoming.id,'f3');assert.equal(q.out.pos,q.incoming.pos);assert.equal(q.energyGain,63);assert.equal(q.primaryDelta,m.players.f3.attack-m.players.f1.attack);assert.match(q.reason,/체력 31/);assert.equal(m.subs,0);assert.deepEqual(s,before);
 m.players.f3.injuryRemaining=1;m.players.f4.injuryRemaining=1;assert.equal(Matchday.read(s).substitution.suggestion,null);m.phase='full';assert.equal(Matchday.read(s).substitution.suggestion,null);
});

test('substitution shortlist ranks at most three real same-position changes and only describes their live impact',()=>{
 const s=advance(S.create(2042),65),m=s.match;m.discipline={version:1,events:[]};for(const id of m.lineup)m.players[id].energy=82;for(const p of Object.values(m.players).filter(p=>!m.lineup.includes(p.id)))p.energy=88;
 const targets=['FW','DEF','MID'].map(pos=>m.lineup.map(id=>m.players[id]).find(p=>p.pos===pos));for(const [index,p] of targets.entries())p.energy=[28,46,61][index];
 const before=copy(s),options=Matchday.read(s).substitution.options;
 assert.equal(options.length,3);assert.equal(options[0].out.id,targets[0].id);assert.equal(options[0].urgency,'긴급');
 for(const option of options){assert.equal(option.out.pos,option.incoming.pos);assert(option.energyGain>0);assert.equal(option.minutes,25);assert.match(option.reason,/남은 25분/);assert(Number.isFinite(option.score));}
 assert.deepEqual(s,before);
});
console.log('Validated '+checks+' actual matchday centre groups.');
