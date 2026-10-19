'use strict';
// Disposable campaign, real display clock and buttons. CPU throttling is a
// desktop diagnostic, never a measurement of a particular phone's frame rate.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const args=process.argv.slice(2),arg=(k,f)=>args.includes(k)?args[args.indexOf(k)+1]:f;
const entry=arg('--entry','index.html'),rule=arg('--rule','current'),speed=arg('--speed','normal'),cpu=Number(arg('--cpu','1')),out=path.resolve(arg('--output','work/release-playthrough'));
if(!['current','13','14'].includes(rule))throw Error('Invalid diagnostic rule');
if(!['slow','normal','fast','rapid'].includes(speed)||![1,2,4].includes(cpu))throw Error('Invalid playback diagnostic');
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),p=await b.newPage({viewport:{width:844,height:364}}),errors=[],samples=[];p.on('pageerror',e=>errors.push(e.message));try{
 await p.goto(pathToFileURL(path.resolve(entry)).href);
 await p.evaluate(({speed,rule})=>{if(rule!=='current'){const enable=F.enableContinuous;F.enableContinuous=(match,options={})=>enable(match,{...options,ruleVersion:Number(rule)});}document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{suspensions:true});state=season.match;customPositions={};tacticalRoles={};selected=null;playbackPrefs={speed,watch:'key',coachPause65:false};setView('match');window.releaseFrameGaps=[];window.releaseFrameStamp=null;const sample=t=>{if(window.releaseFrameStamp!==null)window.releaseFrameGaps.push(t-window.releaseFrameStamp);window.releaseFrameStamp=t;window.releaseFrameHandle=requestAnimationFrame(sample);};window.releaseFrameHandle=requestAnimationFrame(sample);},{speed,rule});
 const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
 await p.locator('#primary').click();await p.locator('#ceremony-ready').click();await p.waitForFunction(()=>state.continuous?.tick>0);
 const started=Date.now();let last=-30,halves=0,goals=0,wasGoal=false,shot=false,done=false;
 while(Date.now()-started<600000){const d=await p.evaluate(()=>({minute:state.minute,tick:state.continuous.tick,phase:state.phase,paused:state.paused,score:state.score,ceremony:document.getElementById('match-ceremony').open?document.getElementById('match-ceremony').dataset.kind:null,goal:!!goalSceneHold,dialogs:[...document.querySelectorAll('dialog[open]')].map(x=>x.id),names:document.getElementById('match-names')._labels?.length,active:state.continuous.players.filter(p=>p.active).length,viewPhase:lastMotionFrame?.phase,field:document.getElementById('field').getBoundingClientRect().width,rail:document.getElementById('match-live-stats').getBoundingClientRect().width}));
  d.elapsed=(Date.now()-started)/1000;samples.push(d);if(d.elapsed-last>=30){console.log(JSON.stringify(d));fs.writeFileSync(out+'/progress.json',JSON.stringify(d));last=d.elapsed;}
  assert.ok(d.rail>0&&d.field>d.rail,'The actual pitch remains larger than the statistical rail');
  if(!d.ceremony&&!d.goal&&d.tick>100)assert.equal(d.names,d.active,'Every active player, including both teams after a dismissal, retains its name');
  if(d.goal&&!wasGoal){goals++;if(goals===1)await p.screenshot({path:out+'/goal.png'});}wasGoal=d.goal;
  if(!shot&&d.viewPhase==='shot'){shot=true;await p.screenshot({path:out+'/shot.png'});}
  if(d.ceremony==='half'){halves++;await p.screenshot({path:out+'/half.png'});await p.locator('#halftime-return').click();await p.locator('#primary').click();}
  else if(d.ceremony==='full'||d.phase==='full'){done=true;break;}
  else if(d.paused&&!d.dialogs.length)throw Error('Unexpected automatic pause in key viewing');
  await new Promise(r=>setTimeout(r,500));
 }
 assert.ok(done,'The real match completes within the unchanged ten-minute bound');assert.equal(halves,1);assert.deepEqual(errors,[]);const finishedAt=Date.now();
 const final=await p.evaluate(()=>{cancelAnimationFrame(window.releaseFrameHandle);return {match:state,round:season.round,confirmed:season.results.length,frameGaps:window.releaseFrameGaps};});
 assert.equal(final.round,0);assert.equal(final.confirmed,0);assert.equal(final.match.phase,'full');
 const gaps=final.frameGaps.sort((a,b)=>a-b),q=v=>gaps[Math.min(gaps.length-1,Math.floor(gaps.length*v))],hash=crypto.createHash('sha256').update(JSON.stringify(final.match)).digest('hex');
 await p.screenshot({path:out+'/full.png'});const restoreStarted=Date.now();await p.reload();const restored=await p.evaluate(raw=>JSON.stringify(F.restore(raw)),final.match);assert.equal(restored,JSON.stringify(final.match));
 const result={entry,requestedRule:rule,viewport:[844,364],speed,cpuThrottle:cpu,elapsed:(finishedAt-started)/1000,coldRestoreSeconds:(Date.now()-restoreStarted)/1000,hash,version:final.match.continuousSetup.version,score:final.match.score,shots:final.match.shots,ticks:final.match.continuous.tick,goalScenes:goals,halves,shotCaptured:shot,frameGaps:{count:gaps.length,p50:q(.5),p95:q(.95),p99:q(.99),over100ms:gaps.filter(n=>n>100).length},samples,errors};
 fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));fs.writeFileSync(out+'/match.json',JSON.stringify(final.match));console.log('PASS actual key-viewing buttons, all names, larger pitch, automatic goals, explicit halftime, no auto-settlement and exact cold restore '+JSON.stringify({...result,samples:undefined}));
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
