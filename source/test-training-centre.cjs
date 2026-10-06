'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),F=require('./dist/engine.js'),S=require('./dist/season.js'),T=require('./dist/training.js'),D=require('./dist/development.js'),PlayerForm=require('./dist/player-form.js'),Centre=require('./dist/training-centre.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(label,fn){fn();groups++;console.log('PASS '+label);}
function readPure(s,filters){const before=JSON.stringify(s),d=Centre.read(s,filters);assert.equal(JSON.stringify(s),before);return d;}
function energy(s,slot,n){s.squad[slot].energy=n;s.match.players[slot].energy=n;s.match.players[slot].initialEnergy=n;}
function stat(s,slot,key,n){s.squad[slot][key]=n;s.match.players[slot][key]=n;}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}}
function play(s){finish(s.match);return S.settle(s);}
function advance(s,minute){while(s.match.minute<minute){if(!F.running(s.match))F.begin(s.match);F.tick(s.match);}return s;}
function frozen(value){if(value&&typeof value==='object'){for(const item of Object.values(value))frozen(item);Object.freeze(value);}return value;}
function row(d,slot){return d.players.find(p=>p.slot===slot);}
function sortable(){const s=S.create();for(const p of Object.values(s.squad)){stat(s,p.id,S.primaryKey(p),80);stat(s,p.id,'potential',99);energy(s,p.id,100);}return s;}

test('missing or incomplete state is safe and invalid options normalize without inventing players',()=>{
 for(const s of [null,undefined,{}, {squad:{}},{year:1,round:0,squad:{}},{...S.create(),squad:[]},{...S.create(),squad:{f1:{}}}]){const d=Centre.read(s,{position:'bad',query:123,sort:'bad'});assert.equal(d.valid,false);assert.deepEqual(d.players,[]);assert.equal(d.totalMatched,0);assert.deepEqual(d.filters,{position:'all',query:'',sort:'recommended'});assert.equal(d.context,null);}
 const s=S.create();delete s.squad.f3.xp;assert.equal(Centre.read(s).valid,false);assert.doesNotThrow(()=>Centre.read({},null));
});

test('fresh centre reports all eighteen registered players and exact unfabricated development values',()=>{
 const s=S.create(),d=readPure(s);assert.equal(d.valid,true);assert.equal(d.players.length,18);assert.equal(d.totalMatched,18);assert.deepEqual(d.context,{year:1,round:1,competition:'league',phase:'prep',trained:null,trainingOpen:true});assert.deepEqual(d.summary,{total:18,fit:18,injured:0,tired:1,growable:18});
 for(const p of d.players){const actual=s.squad[p.slot],development=D.analyze(s,p.slot);assert.equal(p.id,p.slot);assert.equal(p.identity,actual.identity);assert.equal(p.primary,actual[S.primaryKey(actual)]);assert.equal(p.cap,actual.potential);assert.equal(p.remaining,actual.potential-p.primary);assert.equal(p.growthSinceRegistration,0);assert.equal(p.xp,0);assert.equal(p.xpInStep,0);assert.equal(p.minutesToGrowth,270);assert.equal(p.starting,s.match.lineup.includes(p.slot));assert.deepEqual(p.recommendation,development.recommendation);assert.equal(Object.hasOwn(p,'order'),false);}
});

test('position and whitespace/case-normalized name search preserve complete-team summaries',()=>{
 const s=S.create();s.squad.f3.name='  Alex   <Goal>  ';const all=readPure(s),forwards=readPure(s,{position:' fw ',query:'  ALEX   <goal>  ',sort:'potential'});assert.deepEqual(forwards.filters,{position:'FW',query:'alex <goal>',sort:'potential'});assert.equal(forwards.totalMatched,1);assert.equal(forwards.players[0].slot,'f3');assert.equal(forwards.players[0].name,'  Alex   <Goal>  ');assert.deepEqual(forwards.summary,all.summary);
 for(const [position,count] of [['GK',2],['DEF',6],['MID',6],['FW',4]])assert.equal(readPure(s,{position}).players.length,count);
 const empty=readPure(s,{query:'없는 선수'});assert.deepEqual(empty.players,[]);assert.equal(empty.totalMatched,0);assert.deepEqual(empty.summary,all.summary);assert.equal(readPure(s,{position:'ALL'}).filters.position,'all');
});

test('recommendation sorting puts executable recovery first and blocked recommendations after available ones',()=>{
 const s=sortable();energy(s,'f3',50);energy(s,'f4',30);s.squad.f4.injury={kind:'knock',remaining:1};s.match.players.f4.injuryRemaining=1;const d=readPure(s);assert.equal(d.players[0].slot,'f3');assert.equal(d.players[0].recommendation.focus,'recovery');assert.equal(d.players[0].recommendation.available,true);assert.equal(d.players.at(-1).slot,'f4');assert.equal(d.players.at(-1).recommendation.available,false);
 const tie=sortable();tie.squad.m2.xp=269;assert.equal(readPure(tie).players[0].slot,'m2');assert.deepEqual(readPure(sortable()).players.slice(0,3).map(p=>p.slot),['g1','g2','d1']);
});

test('potential sorting orders actual remaining growth then lower primary and original slot',()=>{
 const s=sortable();stat(s,'f3','attack',66);stat(s,'f3','potential',97);stat(s,'f2','attack',68);const d=readPure(s,{sort:'potential'});assert.deepEqual(d.players.slice(0,5).map(p=>p.slot),['f3','f2','g1','g2','d1']);assert.equal(row(d,'f3').remaining,31);assert.equal(row(d,'f2').remaining,31);assert.equal(d.filters.sort,'potential');assert.equal(readPure(s,{sort:'unknown'}).filters.sort,'recommended');
});

test('confirmed-minute sorting never promises growth for capped players or includes pending minutes',()=>{
 const s=sortable();s.squad.f3.xp=269;s.squad.g1.xp=539;stat(s,'f3','attack',66);stat(s,'f1','attack',99);s.squad.f1.xp=269;const d=readPure(s,{sort:'minutes'});assert.deepEqual(d.players.slice(0,2).map(p=>p.slot),['f3','g1']);assert.equal(row(d,'f3').minutesToGrowth,1);assert.equal(row(d,'g1').minutesToGrowth,1);assert.equal(d.players.at(-1).slot,'f1');assert.equal(row(d,'f1').minutesToGrowth,null);
 s.squad.f3.xp=270;assert.equal(row(readPure(s),'f3').xpInStep,0);assert.equal(row(readPure(s),'f3').minutesToGrowth,270);
});

test('injury and the exact seventy-energy threshold use the existing training recommendation',()=>{
 const s=S.create();energy(s,'f3',69.5);s.squad.d5.injury={kind:'knock',remaining:1};s.match.players.d5.injuryRemaining=1;let d=readPure(s);assert.equal(d.summary.injured,1);assert.equal(d.summary.fit,17);assert.equal(row(d,'d5').injured,true);assert.equal(row(d,'d5').recommendation.available,false);assert.match(row(d,'d5').recommendation.reason,/부상/);assert.equal(row(d,'f3').recommendation.focus,'recovery');assert.deepEqual(row(d,'f3').recommendation.preview,T.preview(s,'f3','recovery','f3'));
 energy(s,'f3',70);d=readPure(s);assert.equal(row(d,'f3').recommendation.focus,'technique');assert.equal(row(d,'f3').recommendation.preview.energyAfter,60);assert.equal(d.summary.tired,1);
});

test('during actual play current energy is live but confirmed experience and training availability stay honest',()=>{
 const s=S.create();s.squad.f2.xp=269;advance(s,17);const d=readPure(s),p=row(d,'f2');assert.equal(d.context.phase,'first');assert.equal(d.context.trainingOpen,false);assert.equal(p.energy,s.match.players.f2.energy);assert(p.energy<s.squad.f2.energy);assert.equal(p.xp,269);assert.equal(p.minutesToGrowth,1);assert.equal(p.recommendation.available,false);assert.equal(p.recommendation.focus,null);assert.equal(d.summary.tired,d.players.filter(p=>p.energy<70).length);
 s.match.paused=true;assert.equal(readPure(s).context.trainingOpen,false);s.match.paused=false;advance(s,45);const half=readPure(s);assert.equal(half.context.phase,'half');assert.equal(half.context.trainingOpen,false);assert(half.players.every(p=>!p.recommendation.available));
});

test('individual and whole-team training share the real weekly action and report exact completed growth',()=>{
 for(const individual of [true,false]){const s=S.create(),before=readPure(s);if(individual)T.train(s,'f3','technique','f3');else S.train(s,'fitness');const d=readPure(s);assert.equal(d.context.trained,individual?'technique':'fitness');assert.equal(d.context.trainingOpen,false);assert(d.players.every(p=>!p.recommendation.available&&p.recommendation.focus===null));assert.equal(row(d,'f3').growthSinceRegistration,individual?2:0);if(individual)assert.equal(row(d,'f3').primary,row(before,'f3').primary+2);assert.doesNotThrow(()=>S.restore(copy(s)));}
});

test('actual Cup preparations block training without losing the owned roster or its growth',()=>{
 let s=S.create(4201);for(let round=0;round<4;round++)s=play(s);assert.equal(s.competition,'cup');const d=readPure(s);assert.equal(d.context.competition,'cup');assert.equal(d.context.round,5);assert.equal(d.context.phase,'prep');assert.equal(d.context.trainingOpen,false);assert.equal(d.players.length,18);assert(d.players.every(p=>!p.recommendation.available));assert.match(row(d,'f3').recommendation.reason,/컵/);
});

test('growth caps have no next primary-minute target and preserve real secondary-skill recommendations',()=>{
 const s=S.create();stat(s,'f3','attack',s.squad.f3.potential);stat(s,'f3','speed',99);stat(s,'f3','endurance',98);let d=readPure(s),p=row(d,'f3');assert.equal(p.capped,true);assert.equal(p.remaining,0);assert.equal(p.minutesToGrowth,null);assert.equal(p.recommendation.focus,'fitness');assert.equal(p.recommendation.preview.gain,1);assert.equal(d.summary.growable,17);
 stat(s,'f3','endurance',99);energy(s,'f3',100);p=row(readPure(s),'f3');assert.equal(p.recommendation.focus,null);assert.equal(p.recommendation.available,false);energy(s,'f3',85);p=row(readPure(s),'f3');assert.equal(p.recommendation.focus,'recovery');assert.equal(p.recommendation.preview.gain,15);
});

test('recruited identities reset the original growth baseline and stale match identities cannot supply live condition',()=>{
 let s=S.recruit(S.create(),'t_f2','f3');let p=row(readPure(s),'f3');assert.equal(p.identity,'t_f2');assert.equal(p.primary,F.identityProfile('t_f2').attack);assert.equal(p.growthSinceRegistration,0);T.train(s,'f3','technique','t_f2');p=row(readPure(s),'f3');assert.equal(p.growthSinceRegistration,2);assert.equal(p.xp,0);
 const stale=S.recruit(S.create(),'t_f2','f3');stale.match.players.f3.identity='f3';stale.match.players.f3.energy=1;stale.match.players.f3.injuryRemaining=1;stale.match.lineup[stale.match.lineup.indexOf('f1')]='f3';p=row(readPure(stale),'f3');assert.equal(p.energy,stale.squad.f3.energy);assert.equal(p.injured,false);assert.equal(p.starting,false);assert.equal(p.recommendation.available,false);
 stale.squad.f3.identity='not-a-profile';assert.equal(row(readPure(stale),'f3').growthSinceRegistration,null);
});

test('DTOs are detached and frozen input keeps every model, finance and RNG value unchanged',()=>{
 const s=S.create(),before=copy(s),d=readPure(s);assert.deepEqual(readPure(frozen(s)),d);const p=d.players.find(p=>p.recommendation.preview);p.name='changed';p.recommendation.reason='changed';p.recommendation.preview.after=999;d.summary.total=999;d.context.year=999;d.filters.position='FW';d.players.reverse();assert.deepEqual(s,before);assert.deepEqual(Centre.read(s),Centre.read(copy(before)));
});

test('restored games, completed seasons and browser UMD retain the actual availability contract',()=>{
 let s=S.create(4202);T.train(s,'f3','technique');s=play(s);assert.deepEqual(readPure(S.restore(copy(s))),readPure(s));while(s.match)s=play(s);assert(S.ready(s));let d=readPure(s);assert.equal(d.context.trainingOpen,false);assert.equal(d.context.phase,'season-complete');assert.equal(d.players.length,18);assert(d.players.every(p=>!p.recommendation.available));s=S.nextSeason(s);d=readPure(s);assert.equal(d.context.year,2);assert.equal(d.context.trainingOpen,true);
 const context=vm.createContext({Football:F,Season:S,Training:T,PlayerDevelopment:D,PlayerForm});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/training-centre.js'),'utf8'),context);assert(context.TrainingCentre);assert.deepEqual(copy(context.TrainingCentre.read(s,{position:'FW'})),Centre.read(s,{position:'FW'}));
});

console.log('Validated '+groups+' actual training-centre groups.');
