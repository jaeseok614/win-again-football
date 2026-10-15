'use strict';
// Isolated deterministic QA campaigns only. Never reads the user's stored game.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),S=require('../dist/season'),F=require('../dist/engine'),O=require('../dist/opposition'),R=require('../dist/rebirth'),Story=require('../dist/club-story'),Serial=require('../dist/story-serial'),Voice=require('../dist/manager-voice'),Life=require('../dist/club-life'),News=require('../dist/newsroom'),File=require('../dist/campaign-file');
const arg=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.split('=').slice(1).join('=')??fallback;
const seed=Number(arg('seed','614')),years=Number(arg('seasons','1')),limit=Number(arg('games','250')),rebirth=process.argv.includes('--rebirth'),output=path.resolve(arg('output','work/story-career-audit'));
assert.ok(Number.isInteger(seed)&&seed>=0&&Number.isInteger(years)&&years>=1&&years<=5&&Number.isInteger(limit)&&limit>=1&&limit<=260);
fs.mkdirSync(output,{recursive:true});const start=performance.now(),report={seed,rebirth,rule:9,requestedSeasons:years,games:[],checks:0,arcs:[],pressTopics:[],seasons:[],readMs:[]};let s=S.create(seed,{suspensions:true,rebirth}),played=0,topics=new Set();
const check=()=>{assert.deepEqual(S.restore(JSON.parse(JSON.stringify(s))),s);report.checks++;};
const read=()=>{const before=JSON.stringify(s),t=performance.now(),arcs=Serial.read(s);Story.read(s);const status=Life.pressStatus(s);for(const q of [status.before,status.after])if(q)topics.add(Voice.press(s,q).context.topic);for(const style of ['broadcast','analysis','players'])News.get(s,'review:'+style);assert.equal(JSON.stringify(s),before);report.readMs.push(performance.now()-t);report.checks++;return arcs;};
function answerStories(){for(const e of Serial.events(s)){const id=s.year+':'+e.key,d=Story.scene(s,id);if(d.step===0)Story.choose(s,id,0,'practical',Story.fingerprint(s));if(Story.scene(s,id).step===1)Story.choose(s,id,1,'honest',Story.fingerprint(s));}}
while(s.year<=years&&played<limit){
 if(rebirth){const r=R.read(s);if(r.status!=='active'){report.end={status:r.status,round:s.round,year:s.year};break;}if(r.pending)s=R.choose(s,'steady');}
 if(S.ready(s)){
  const me=S.standings(s).find(c=>c.id===S.own);report.seasons.push({year:s.year,division:s.league.division,rank:me.rank,points:me.points,rounds:s.round});
  fs.writeFileSync(path.join(output,'season-'+s.year+'.json'),File.stringify({season:s,view:'club'}));if(s.year===years)break;s=S.nextSeason(s);check();read();continue;
 }
 answerStories();read();const pre=O.preview(s),m=s.match;F.enableStoppage(m);F.enableContinuous(m,{opponentFormation:pre.teams[1].formation,opponentPlayers:pre.teams[1].players});
 const phaseStart=performance.now();while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);if(m.phase==='half'){assert.deepEqual(F.restore(JSON.parse(JSON.stringify(m))),m);report.checks++;}}
 const id=s.competition==='league'?'match-'+s.year+'-'+(s.round+1):s.competition+'-'+s.year+'-'+(s.competition==='cup'?s.cup.stage:s.europe.stage),score=[...m.score],ticks=m.continuous.tick,matchMs=performance.now()-phaseStart;
 s=S.settle(s);played++;answerStories();check();const arcs=read();report.games.push({id,score,ticks,matchMs:Math.round(matchMs),year:s.year,round:s.round,competition:s.lastReport?.competition});report.arcs=arcs;report.pressTopics=[...topics];report.elapsedMs=Math.round(performance.now()-start);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(output,'latest.json'),File.stringify({season:s,view:'club'}));
 console.log(JSON.stringify({game:played,id,score,year:s.year,round:s.round,division:s.league.division,arcs:arcs.map(a=>a.id+':'+a.stages.at(-1).episode+(a.finished?'완료':'')),elapsedSeconds:Math.round(report.elapsedMs/1000)}));
}
report.elapsedMs=Math.round(performance.now()-start);report.readSummary={count:report.readMs.length,max:Math.max(...report.readMs),mean:report.readMs.reduce((n,x)=>n+x,0)/report.readMs.length};delete report.readMs;fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log('PASS isolated continuous9 career audit '+JSON.stringify({games:report.games.length,checks:report.checks,seasons:report.seasons,end:report.end,read:report.readSummary,elapsedSeconds:Math.round(report.elapsedMs/1000)}));
