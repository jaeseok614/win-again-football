'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('./dist/season.js'),F=require('./dist/engine.js'),Objectives=require('./dist/matchday-objectives.js');
const test=(name,fn)=>{fn();console.log('PASS '+name);};
const copy=value=>JSON.parse(JSON.stringify(value));
function finish(match){while(match.phase!=='full'){if(!F.running(match))F.begin(match);F.finishSegment(match);}}

test('fixture-specific three goals read the opponent without changing the campaign',()=>{
 const s=S.create(4433),before=JSON.stringify(s),model=Objectives.read(s);
 assert.equal(model.upcoming.opponent,S.opponentFor(s).name);
 assert.deepEqual(model.upcoming.cards.map(c=>c.id),['score','attack','substitute']);
 assert.equal(model.perfectCount,0);assert.equal(model.last,null);assert.equal(JSON.stringify(s),before);
 const strong=Objectives.goals({attack:81,speed:20});assert.equal(strong[1].id,'defend');
 assert.equal(strong[1].done,null);
});

test('only a confirmed receipt earns a three-goal badge and substitution must occur during play',()=>{
 let s=S.create(4434),m=s.match;F.begin(m);F.finishSegment(m);F.swap(m,'f1','f3');finish(m);
 const pending=Objectives.read(s);assert.equal(pending.pending,true);assert.equal(pending.perfectCount,0);assert.equal(pending.last,null);
 const before=JSON.stringify(s);Objectives.read(s);assert.equal(JSON.stringify(s),before);
 s=S.settle(s);const record=s.statistics.records.at(-1),result=Objectives.result(record),model=Objectives.read(s);
 assert.equal(result.cards[0].done,record.score[0]>=1);
 assert.equal(result.cards[1].done,record.score[0]>=2);
 assert.equal(result.cards[2].done,true);
 assert.equal(result.cards[2].evidence,'교체 1명');
 assert.equal(model.perfectCount,Number(result.perfect));assert.equal(model.last.completed,result.completed);
 assert.equal(model.currentStreak,1);assert.equal(model.bestStreak,1);assert.equal(model.completedGoals,result.completed);
 assert.deepEqual(Objectives.read(S.restore(copy(s))),model);
 let next=S.restore(copy(s));finish(next.match);next=S.settle(next);const afterMiss=Objectives.read(next);assert.equal(afterMiss.currentStreak,0);assert.equal(afterMiss.bestStreak,1);assert.equal(afterMiss.completedGoals,result.completed+afterMiss.last.completed);assert.equal(afterMiss.perfectCount,1);
});

test('defensive objective uses own-relative score, not home/away order or guessed statistics',()=>{
 const opponent={attack:82,speed:76},base={home:'opponent',away:S.own,score:[0,1],segments:[{lineup:['a','b']},{lineup:['a','b']}]};
 let cards=Objectives.goals(opponent,base);assert.deepEqual(cards.map(c=>c.done),[false,true,false]);
 cards=Objectives.goals(opponent,{...base,score:[2,2],segments:[{lineup:['a','b']},{lineup:['a','c']} ]});
 assert.deepEqual(cards.map(c=>c.done),[true,false,true]);
});

test('home challenge is hidden during live play and escapes opponent names',()=>{
 const s=S.create(4435),host={innerHTML:''},ctx=vm.createContext({view:'match',season:s,$:id=>id==='matchday-objectives'?host:null,
  MatchdayObjectives:{read(){throw Error('hidden view should not read objectives');}},escapeText:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')});
 vm.runInContext(fs.readFileSync(__dirname+'/dist/matchday-objectives-ui.js','utf8'),ctx);
 ctx.renderMatchdayObjectives();assert.equal(host.innerHTML,'');
 ctx.view='club';ctx.MatchdayObjectives={read(){return {...Objectives.read(s),upcoming:{opponent:'<상대>',cards:Objectives.read(s).upcoming.cards}};}};
 ctx.renderMatchdayObjectives();assert.match(host.innerHTML,/매치데이 3칸 도전/);assert.match(host.innerHTML,/목표 0개 · 완벽 0회 · 연속 0회 · 최고 0회/);assert.match(host.innerHTML,/&lt;상대&gt;/);assert.ok(!host.innerHTML.includes('<상대>'));
});
