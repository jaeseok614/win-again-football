'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),S=require('./dist/season.js'),F=require('./dist/engine.js'),T=require('./dist/training.js'),Flow=require('./dist/match-flow.js'),Files=require('./dist/campaign-file.js');
const copy=value=>JSON.parse(JSON.stringify(value)),createdAt='2026-10-02T01:23:45.000Z';let groups=0;
function test(label,fn){fn();groups++;console.log('PASS '+label);}
function payload(season=S.create()){return {season,view:'squad',playback:{speed:'slow',coachPause65:true},media:{effects:false,haptics:true},individual:{slot:'f3',focus:'pace'},records:{tab:'training',filter:'cup',sort:'minutes',year:season.year}};}
function exportText(data){const before=JSON.stringify(data),text=Files.stringify(data,{createdAt});assert.equal(JSON.stringify(data),before);return text;}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}}
function play(s){finish(s.match);return S.settle(s);}
function advance(s,minute){while(s.match.minute<minute){if(!F.running(s.match))F.begin(s.match);s.match.paused=false;F.tick(s.match);}return s;}
function rejectedChange(base,change,reason=/손상/){const envelope=copy(base);change(envelope);assert.throws(()=>Files.read(JSON.stringify(envelope)),reason);}
function frozen(value){if(value&&typeof value==='object'){for(const item of Object.values(value))frozen(item);Object.freeze(value);}return value;}
function oldV4(){const context=vm.createContext({}),base=path.join(__dirname,'legacy-v4');for(const name of ['engine.js','economy.js','career.js','season.js'])vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),context);return {S:context.Season,F:context.Football};}

test('fresh backups use the exact game envelope, detached payload and real league summary',()=>{
 const data=payload(),before=copy(data),text=exportText(data),envelope=JSON.parse(text),result=Files.read(text),me=S.standings(data.season).find(c=>c.id===S.own);assert.deepEqual(Object.keys(envelope),['format','version','createdAt','payload']);assert.equal(envelope.format,'win-again-campaign');assert.equal(envelope.version,1);assert.equal(envelope.createdAt,createdAt);assert.equal(text,JSON.stringify(envelope,null,2));assert.deepEqual(result.payload,data);assert.deepEqual(result.summary,{year:1,round:1,competition:'league',phase:'prep',minute:0,club:S.club(S.own).name,rank:me.rank,points:me.points,balance:data.season.finance.balance,playerCount:18});assert.deepEqual(data,before);
 envelope.payload.season.finance.balance=0;result.payload.season.squad.f3.attack=0;assert.deepEqual(data,before);assert.equal(Files.maxBytes,2*1024*1024);
});

test('UI preferences normalize unknown choices while valid settings survive independently',()=>{
 const data={season:S.create(),view:'other',playback:{speed:'other',coachPause65:'true'},media:{effects:0,haptics:1},individual:{slot:'missing',focus:'magic'},records:{tab:'other',filter:'bad',sort:'bad',year:900},practice:{results:[{win:true}]}},result=Files.read(exportText(data)).payload;
 assert.equal(result.view,'club');assert.deepEqual(result.playback,{speed:'normal',coachPause65:false});assert.deepEqual(result.media,{effects:true,haptics:false});assert.deepEqual(result.individual,{slot:'',focus:'technique'});assert.deepEqual(result.records,{tab:'health',filter:'all',sort:'goals',year:null});assert.equal(Object.hasOwn(result,'practice'),false);
 const defaults=Files.create({season:S.create()},{createdAt}).payload;assert.deepEqual(defaults.individual,{slot:'',focus:'technique'});assert.deepEqual(defaults.records,{tab:'health',filter:'all',sort:'goals',year:null});assert.deepEqual(defaults.playback,Flow.normalize());
});

test('live tactics and substitutions round-trip at the actual minute without consuming RNG or player energy',()=>{
 const s=advance(S.create(),17);F.setTactic(s.match,'press');F.swap(s.match,'f1','f3');s.match.paused=false;const data=payload(s),before=copy(data),result=Files.read(exportText(data));assert.equal(result.payload.view,'match');assert.equal(result.payload.season.match.minute,17);assert.equal(result.payload.season.match.paused,true);assert.equal(result.payload.season.match.rng,s.match.rng);assert.deepEqual(result.payload.season.match.lineup,s.match.lineup);assert.deepEqual(result.payload.season.match.decisions,s.match.decisions);for(const p of Object.values(s.match.players)){assert.equal(result.payload.season.match.players[p.id].energy,p.energy);assert.equal(result.payload.season.match.players[p.id].minutes,p.minutes);}assert.deepEqual(data,before);
 const restored=result.payload.season,uninterrupted=copy(s);finish(restored.match);finish(uninterrupted.match);assert.deepEqual(restored.match,uninterrupted.match);
});

test('full-time pending, actual Cup games and completed seasons keep their own lifecycle',()=>{
 const pending=S.create();finish(pending.match);const pendingData=Files.read(exportText(payload(pending)));assert.equal(pendingData.summary.phase,'full');assert.equal(pendingData.summary.minute,90);assert.equal(pendingData.payload.season.round,0);assert.deepEqual(pendingData.payload.season.statistics,pending.statistics);
 let cup=S.create(8301);for(let round=0;round<4;round++)cup=play(cup);assert.equal(cup.competition,'cup');advance(cup,59);const restoredCup=Files.read(exportText(payload(cup))).payload.season;assert.deepEqual(restoredCup.cup,cup.cup);assert.equal(restoredCup.match.rng,cup.match.rng);assert.equal(restoredCup.competition,'cup');assert.equal(restoredCup.match.minute,59);finish(restoredCup.match);finish(cup.match);assert.deepEqual(S.settle(restoredCup),S.settle(cup));
 let ended=S.create(8302);while(ended.match)ended=play(ended);const data=payload(ended);data.view='match';const result=Files.read(exportText(data));assert.equal(result.summary.phase,'season-complete');assert.equal(result.summary.minute,null);assert.equal(result.payload.view,'club');assert(S.ready(result.payload.season));assert.deepEqual(result.payload.season,ended);
});

test('a second-year recruited player retains identity, precise floats, growth and archived statistics',()=>{
 let s=S.recruit(S.create(8303),'t_f2','f3');T.train(s,'f3','pace','t_f2');while(s.match)s=play(s);s=S.nextSeason(s);s=S.recruit(s,'t_m2','m6');s=S.scout(s,'FW');const youth=s.career.reports[0].candidates[1];s=play(s);s=S.recruit(s,youth,'f1');advance(s,22);const result=Files.read(exportText(payload(s))).payload.season;assert.equal(result.year,2);assert.equal(result.squad.f1.identity,youth);assert.equal(result.squad.m6.identity,'t_m2');assert.equal(result.squad.f3.identity,'t_f2');assert.equal(result.squad.f3.speed,s.squad.f3.speed);assert.equal(result.match.players.f1.energy,s.match.players.f1.energy);assert(!Number.isInteger(result.match.players.f1.energy));for(const key of ['statistics','finance','career','health','cup','history'])assert.deepEqual(result[key],s[key]);assert.doesNotThrow(()=>S.restore(copy(result)));
});

test('real injuries remain identical and unavailable to the restored line-up',()=>{
 let injured=null;for(let seed=1;seed<=100&&!injured;seed++){let s=play(S.create(seed));if(Object.values(s.squad).some(p=>p.injury))injured=s;}assert(injured,'Find a naturally generated post-match injury.');const before=copy(injured),restored=Files.read(exportText(payload(injured))).payload.season;assert.deepEqual(restored.squad,injured.squad);assert.deepEqual(restored.health,injured.health);for(const p of Object.values(restored.squad).filter(p=>p.injury)){assert.equal(restored.match.players[p.id].injuryRemaining,p.injury.remaining);assert.equal(restored.match.lineup.includes(p.id),false);}assert.deepEqual(injured,before);
});

test('supported legacy saves migrate through Season.restore without losing real old finance or participants',()=>{
 const old=oldV4();let s=old.S.create(8304);old.F.begin(s.match);old.F.finishSegment(s.match);old.F.swap(s.match,'f1','f3');const before=copy(s),result=Files.read(exportText(payload(s))).payload.season,expected=S.restore(copy(s));assert.equal(result.version,10);assert.equal(result.match.version,5);assert.deepEqual(result,expected);assert.deepEqual(result.finance,copy(s.finance));assert.equal(result.match.players.f3.minutes,s.match.players.f3.minutes);assert.deepEqual(copy(s),before);
});

test('format, envelope versions and unsupported season versions reject clearly instead of becoming a new game',()=>{
 const base=Files.create(payload(),{createdAt});for(const text of ['{}','[]','null',JSON.stringify(payload()),JSON.stringify({...base,format:'another-game'})])assert.throws(()=>Files.read(text),/구단 백업|시즌 정보/);
 for(const value of [0,2,'1',null])rejectedChange(base,x=>x.version=value,/백업 버전/);
 for(const value of [1,11,99,'8',null])rejectedChange(base,x=>x.payload.season.version=value,/시즌 버전/);
 rejectedChange(base,x=>delete x.payload.season,/시즌 정보/);rejectedChange(base,x=>x.extra='unknown',/형식/);
});

test('tampered participation, RNG, identities and injury contracts reject through the existing validators',()=>{
 const s=advance(S.create(),17);F.swap(s.match,'f1','f3');const base=Files.create(payload(s),{createdAt});for(const change of [x=>x.payload.season.match.lineup[0]='missing',x=>x.payload.season.match.rng++,x=>x.payload.season.match.players.f3.minutes++,x=>x.payload.season.match.players.f3.identity='t_f2',x=>delete x.payload.season.squad.f3.identity,x=>x.payload.season.match.players.f1.energy=Math.round(x.payload.season.match.players.f1.energy),x=>x.payload.season.match.players.d1.injuryRemaining=1,x=>x.payload.season.match.segments[0].end--])rejectedChange(base,change);
});

test('altered real ledger amounts, Cup results and recorded goals cannot be imported as a valid campaign',()=>{
 const s=play(S.create(8305)),base=Files.create(payload(s),{createdAt});rejectedChange(base,x=>x.payload.season.finance.balance++);rejectedChange(base,x=>x.payload.season.statistics.records[0].players[0].minutes--);rejectedChange(base,x=>x.payload.season.statistics.records[0].score[0]++);
 let cup=S.create(8306);for(let i=0;i<4;i++)cup=play(cup);cup=play(cup);const cupBase=Files.create(payload(cup),{createdAt});rejectedChange(cupBase,x=>x.payload.season.cup.results[0].winner='missing');
});

test('UTF-8 size limits apply to the whole actual file including multibyte names and export formatting',()=>{
 const text=exportText(payload());assert(Buffer.byteLength(text,'utf8')<Files.maxBytes);assert.throws(()=>Files.read(text+' '.repeat(Files.maxBytes)),/2MiB/);assert.throws(()=>Files.read('한'.repeat(Math.ceil(Files.maxBytes/3))),/2MiB/);
 const large=payload();large.season.backupPadding='x'.repeat(Files.maxBytes);assert.throws(()=>Files.create(large,{createdAt}),/2MiB/);assert.throws(()=>Files.stringify(large,{createdAt}),/2MiB/);
});

test('dangerous prototype keys, custom objects, accessors and non-JSON values are rejected without execution',()=>{
 const base=exportText(payload()),before={}.polluted;for(const key of ['__proto__','constructor','prototype']){const parsed=JSON.parse(base);Object.defineProperty(parsed.payload.season,key,{value:{polluted:true},enumerable:true});assert.throws(()=>Files.read(JSON.stringify(parsed)),/안전하지 않은/);}assert.equal({}.polluted,before);
 const custom=Object.create({inherited:true});custom.season=S.create();assert.throws(()=>Files.create(custom,{createdAt}),/JSON/);const disguised=Object.create(null);disguised.constructor=Object;const fakePlain=Object.create(disguised);fakePlain.season=S.create();assert.throws(()=>Files.create(fakePlain,{createdAt}),/JSON/);const sparse=payload();sparse.extra=new Array(2);sparse.extra[1]=1;assert.throws(()=>Files.create(sparse,{createdAt}),/배열/);
 const getter={};let hits=0;Object.defineProperty(getter,'season',{enumerable:true,get(){hits++;return S.create();}});assert.throws(()=>Files.create(getter,{createdAt}),/JSON/);assert.equal(hits,0);
 const cyc=payload();cyc.extra=cyc;assert.throws(()=>Files.create(cyc,{createdAt}),/순환/);for(const value of [NaN,Infinity,()=>1,1n,new Date()]){const p=payload();p.extra=value;assert.throws(()=>Files.create(p,{createdAt}),/숫자|JSON/);}
 const nested=JSON.parse(base);let p=nested;for(let i=0;i<90;i++){p.extra={};p=p.extra;}assert.throws(()=>Files.read(JSON.stringify(nested)),/중첩/);
});

test('bad JSON, dates and absent payloads have Korean errors while UTF-8 BOM files remain readable',()=>{
 for(const text of ['', '{broken', '[1,',undefined,123])assert.throws(()=>Files.read(text),/백업 파일/);
 const base=Files.create(payload(),{createdAt});for(const date of [undefined,'not-a-date','2026-02-30T01:23:45.000Z','2026-10-02','2026-10-02T01:23:45Z'])rejectedChange(base,x=>x.createdAt=date,/저장 날짜/);
 assert.throws(()=>Files.create(payload(),{createdAt:'invalid'}),/저장 날짜/);rejectedChange(base,x=>delete x.payload,/시즌 정보/);assert.deepEqual(Files.read('\uFEFF'+JSON.stringify(base)),Files.read(JSON.stringify(base)));
});

test('read-only export and preview work with frozen state and browser UMD without filesystem or storage access',()=>{
 const data=frozen(payload(advance(S.create(),59))),before=copy(data),text=exportText(data),preview=Files.read(text);assert.deepEqual(data,before);preview.payload.season.finance.balance=0;assert.deepEqual(data,before);
 const context=vm.createContext({Season:S,Football:F,Training:T,MatchFlow:Flow});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/campaign-file.js'),'utf8'),context);assert(context.CampaignFile);assert.equal(context.localStorage,undefined);assert.equal(context.document,undefined);assert.deepEqual(copy(context.CampaignFile.read(context.CampaignFile.stringify(payload(),{createdAt}))),Files.read(Files.stringify(payload(),{createdAt})));
});

console.log('Validated '+groups+' campaign backup-file groups.');
