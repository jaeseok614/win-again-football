'use strict';
// Optional deterministic benchmark. Prints aggregates; never reads personal saves.
const F=require('./dist/engine.js'),S=require('./dist/season.js'),O=require('./dist/opposition.js'),C=require('./dist/continuous-football.js'),CM=require('./dist/continuous-match.js');
const version=Number(process.argv.find(a=>a.startsWith('--version='))?.split('=')[1]||4);
if(![1,2,3,4].includes(version))throw Error('Use --version=1, 2, 3 or 4.');
const tactics=['balanced','press','counter','lowBlock'],starter=[],matched=[],matchedSeeds=process.argv.includes('--extended')?Array.from({length:20},(_,i)=>41+i):[41,42,43,44];
const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;
function row(seed,tactic,w,teamOnly){const field=w.players.filter(p=>p.pos!=='GK'&&(!teamOnly||p.team===0));return {seed,tactic,ownGoals:w.score[0],conceded:w.score[1],won:Number(w.score[0]>w.score[1]),draw:Number(w.score[0]===w.score[1]),goals:w.score[0]+w.score[1],shots:w.stats.shots[0]+w.stats.shots[1],passes:w.stats.passes[0]+w.stats.passes[1],completion:(w.stats.completed[0]+w.stats.completed[1])/Math.max(1,w.stats.passes[0]+w.stats.passes[1]),possession:w.stats.possession[0]/Math.max(1,w.stats.possession[0]+w.stats.possession[1]),energy:mean(field.map(p=>p.energy)),distance:mean(field.map(p=>p.distance))};}
for(const tactic of tactics)for(const seed of [11,17,23,31,41,53]){
 const s=S.create(seed,{startingClub:true,suspensions:true});F.setTactic(s.match,tactic);const r=O.preview(s);F.enableStoppage(s.match);F.enableContinuous(s.match,{ruleVersion:version,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});
 while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}
 starter.push(row(seed,tactic,s.match.continuous,true));
}
for(const tactic of tactics)for(const seed of matchedSeeds){
 const m=F.create(seed);F.enableContinuous(m,{ruleVersion:version});const cfg=CM.config(F,m,m.continuousSetup);
 for(const p of cfg.players){for(const key of ['attack','defense','passing','speed','endurance','keeping'])p[key]=60;p.initialEnergy=95;}
 const w=C.create(cfg);for(let i=0;i<57600;i++){if(i===28800)C.kickoff(w,1-w.firstKickTeam,true,false);C.step(w,{tactics:[tactic,'balanced'],focuses:['balanced','balanced']});}
 matched.push(row(seed,tactic,w,false));
}
function aggregate(rows){return Object.fromEntries(tactics.map(tactic=>{const sample=rows.filter(r=>r.tactic===tactic);return [tactic,{games:sample.length,...Object.fromEntries(['ownGoals','conceded','won','draw','goals','shots','passes','completion','possession','energy','distance'].map(key=>[key,mean(sample.map(r=>r[key]))])),goalRange:[Math.min(...sample.map(r=>r.goals)),Math.max(...sample.map(r=>r.goals))]}];}));}
console.log(JSON.stringify({version,starter:{games:starter.length,seeds:[11,17,23,31,41,53],substitutions:false,stoppage:true,fieldEnergyDistance:'own ten, including dismissed players',averages:aggregate(starter)},matched:{games:matched.length,seeds:matchedSeeds,ability:60,initialEnergy:95,minutes:96,substitutions:false,fieldEnergyDistance:'both twenty, including dismissed players',averages:aggregate(matched)}},null,2));
