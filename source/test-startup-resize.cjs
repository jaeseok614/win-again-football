'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const listeners={},frames=[],context=vm.createContext({window:{addEventListener:(name,fn)=>listeners[name]=fn},document:{getElementById:id=>{assert.equal(id,'tactics-board');return {addEventListener(){}};}},requestAnimationFrame:fn=>frames.push(fn)});
vm.runInContext(fs.readFileSync(require.resolve('./dist/team-shape-ui.js'),'utf8'),context);
assert.equal(typeof listeners.resize,'function');
assert.doesNotThrow(()=>listeners.resize(),'A real resize can arrive between the analysis and popup script blocks');
assert.equal(frames.length,0);
for(const value of [null,'roster','tactics']){context.matchPopupActive=value;listeners.resize();assert.equal(frames.length,0);}
context.matchPopupActive='analysis';listeners.resize();assert.equal(frames.length,1);assert.equal(frames[0],context.fitTeamShape);
delete context.matchPopupActive;assert.doesNotThrow(()=>listeners.resize());assert.equal(frames.length,1);
console.log('PASS real analysis module tolerates early resize and still fits the active popup');
