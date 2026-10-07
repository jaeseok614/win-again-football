'use strict';
const assert=require('node:assert/strict');
const Football=require('./dist/engine.js'),Season=require('./dist/season.js');
function copy(value){return JSON.parse(JSON.stringify(value));}
const campaign=Season.create(20261007,{suspensions:true});
assert.equal(campaign.version,10);
assert.equal(campaign.startingClub,'tottunham');
assert.equal(campaign.league.rules,'five-tier');
assert.equal(campaign.league.division,5);
assert.equal(campaign.match.version,10);
assert.equal(Season.restore(copy(campaign)).match.version,10);
assert.equal(Football.restore(copy(campaign.match)).version,10);
for(const version of [2,5,9]){const old=copy(campaign);old.version=version;assert.throws(()=>Season.restore(old));}
const oldMatch=copy(campaign.match);oldMatch.version=9;delete oldMatch.subWindows;assert.throws(()=>Football.restore(oldMatch));
console.log('PASS Tottenham-only campaigns create and restore with the current version');
console.log('PASS obsolete season and match saves are rejected');