'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),F=require('./dist/engine'),S=require('./dist/season'),Opposition=require('./dist/opposition');
let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
function harness(){
 const season=S.create(87),nodes=new Map(),intervals=[],timers=[],calls={save:0,advance:0,popups:[]};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},open:false,handlers:{},focus(){},setAttribute(){},addEventListener(type,fn){this.handlers[type]=fn;},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(id);};
 const ctx={F,S,Opposition,season,state:season.match,view:'match',document:{hidden:false,createElement:()=>node('ceremony'),body:{append(){}},querySelector:()=>ctx.blocked||node('ceremony').open?{}:null},$:node,escapeText:String,matchClock:{reset(){}},movementStamp:0,performance:{now:()=>0},setInterval:fn=>intervals.push(fn),setTimeout:fn=>timers.push(fn),clearTimeout(){},motionEnabled:()=>true,movementHighlightPending:()=>ctx.highlight,pendingVisibleMatchEvent:()=>ctx.highlight,save(){calls.save++;},render(){},openMatchPopup:id=>calls.popups.push(id),presentMatchEvents(){},advanceMatchWithFeedback(){calls.advance++;F.begin(ctx.state);}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/dist/match-ceremony-ui.js','utf8'),ctx);
 return {ctx,node,calls,intervals,timers,dialog:node('ceremony')};
}
test('kickoff requires opponent review, cancellation preserves the match and confirmation enables actual stoppage',()=>{
 const h=harness(),before=JSON.stringify(h.ctx.state);h.ctx.advanceMatchWithFeedback();assert.equal(h.dialog.dataset.kind,'preview');assert.equal(JSON.stringify(h.ctx.state),before);h.dialog.handlers.cancel({preventDefault(){}});assert.equal(JSON.stringify(h.ctx.state),before);h.ctx.advanceMatchWithFeedback();h.node('ceremony-ready').onclick();assert.equal(h.ctx.state.phase,'first');assert.equal(h.ctx.state.minute,0);assert.ok(h.ctx.state.stoppage);assert.equal(h.dialog.dataset.kind,'kickoff');assert.equal(h.ctx.matchCeremonyHold,true);h.timers.at(-1)();assert.equal(h.ctx.matchCeremonyHold,false);
});
test('opening detailed opposition never starts the match',()=>{const h=harness();h.ctx.advanceMatchWithFeedback();h.node('ceremony-lineup').onclick();assert.equal(h.ctx.state.phase,'prep');assert.deepEqual(h.calls.popups,['opponent']);assert.equal(h.ctx.matchCeremonyHold,false);});
test('half and full ceremonies wait for the last visible scene and another open dialog',()=>{
 for(const phase of ['half','full']){const h=harness();h.ctx.state.phase=phase;h.ctx.presentMatchEvents([{type:'break'}]);h.ctx.highlight=true;h.intervals[0]();assert.equal(h.dialog.open,false);h.ctx.highlight=false;h.ctx.blocked=true;h.intervals[0]();assert.equal(h.dialog.open,false);h.ctx.blocked=false;h.intervals[0]();assert.equal(h.dialog.dataset.kind,phase);h.node('ceremony-ready').onclick();assert.equal(h.ctx.state.phase,phase);assert.deepEqual(h.calls.popups,[phase==='half'?'talk':'stats']);}
});
test('a quick resume cannot skip the queued halftime ceremony or replay it in the second half',()=>{const h=harness();h.ctx.state.phase='half';h.ctx.state.minute=45;h.ctx.presentMatchEvents([{type:'break'}]);h.ctx.advanceMatchWithFeedback();assert.equal(h.dialog.dataset.kind,'half');assert.equal(h.calls.advance,0);h.node('ceremony-ready').onclick();h.ctx.advanceMatchWithFeedback();assert.equal(h.ctx.state.phase,'second');h.intervals[0]();assert.equal(h.dialog.dataset.kind,'kickoff');});
console.log('Validated '+groups+' match ceremony groups.');
