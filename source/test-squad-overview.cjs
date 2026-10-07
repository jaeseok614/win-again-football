'use strict';
const assert=require('node:assert/strict'),S=require('./dist/season.js'),F=require('./dist/engine.js'),E=require('./dist/economy.js'),Q=require('./dist/squad-overview.js');
const s=S.create(4088),before=JSON.stringify(s),m=Q.read(s);
assert.equal(m.total,18);assert.equal(m.rows.filter(p=>p.starting).length,11);assert.equal(m.rows.filter(p=>!p.starting).length,7);assert.deepEqual(m.composition.map(p=>p.count),[2,6,6,4]);assert.equal(new Set(m.rows.map(p=>p.identity)).size,18);assert.ok(m.rows.every(p=>p.overall>0&&p.overall<=100));assert.equal(JSON.stringify(s),before);
console.log('PASS entire squad, lineup groups and calculated overall preserve the campaign');
F.begin(s.match);F.tick(s.match);const running=JSON.stringify(s),live=Q.read(s),starter=live.rows.find(p=>p.starting&&p.pos==='FW');assert.equal(starter.energy,Math.round(s.match.players[starter.slot].energy));assert.equal(JSON.stringify(s),running);
console.log('PASS live stamina follows the actual match without simulating new values');
const fresh=S.create(4089),signed=E.recruit(fresh,'t_f2','f3'),after=Q.read(signed);assert.equal(after.rows.find(p=>p.slot==='f3').identity,'t_f2');assert.equal(after.total,18);assert.equal(after.rows.some(p=>p.identity==='sp_f3'),false);
console.log('PASS recruited identity and attributes replace the departing player in the overview');
