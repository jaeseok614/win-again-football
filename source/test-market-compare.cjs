'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Portraits=require('./dist/portraits.js'),PlayerCharacter=require('./dist/character.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function harness(season){
 const portraits=[],context=vm.createContext({F,S,PlayerCharacter,season,state:season?.match,Portraits:{html(person,options){portraits.push({identity:person.identity,id:person.id});return Portraits.html(person,options);}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/market-ui.js'),'utf8'),context);
 return {render:context.recruitComparisonMarkup,portraits};
}
function metric(html,key){const match=new RegExp('<div class="comparison-stat" data-comparison-stat="'+key+'">([\\s\\S]*?)</div>').exec(html);assert.ok(match,'missing metric '+key);return match[1];}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}

test('each role compares its actual primary ability and shows both current identities and portraits',()=>{
 const pairs=[['t_g1','g1','선방'],['t_d1','d1','수비'],['t_m1','m1','패스'],['t_f1','f1','결정력']];
 for(const [identity,slot,label] of pairs){const s=S.create(1301),incoming=F.identityProfile(identity),outgoing=s.squad[slot],h=harness(s),html=h.render(incoming,outgoing),key=S.primaryKey(incoming);assert.match(metric(html,'primary'),new RegExp('즉시 전력 · '+label));assert.ok(metric(html,'primary').includes(outgoing[key]+' → '+incoming[key]));assert.ok(html.includes(outgoing.name));assert.ok(html.includes(incoming.name));assert.match(html,/보낼 선수/);assert.match(html,/영입 후보/);assert.equal((html.match(/class="comparison-person"/g)||[]).length,2);assert.deepEqual(h.portraits.map(p=>p.identity),[outgoing.identity,incoming.identity]);assert.ok(html.includes('data-comparison-identity="'+identity+'"'));}
});

test('a trained recruited outgoing player uses current values instead of the slot or original market baseline',()=>{
 const s=S.recruit(S.create(1302),'t_f1','f4'),outgoing=s.squad.f4,incoming=F.identityProfile('t_f2');outgoing.attack=92;outgoing.speed=88;outgoing.endurance=84;
 const h=harness(s),html=h.render(incoming,outgoing);
 assert.match(metric(html,'primary'),/−19<small>낮음/);assert.match(metric(html,'primary'),/92 → 73/);assert.match(metric(html,'speed'),/88 → 92/);assert.match(metric(html,'endurance'),/84 → 86/);assert.match(metric(html,'growth'),/0 → 24/);assert.match(metric(html,'growth'),/\+24<small>더 큼/);assert.match(html,/성장 한계 도달/);assert.deepEqual(h.portraits[0],{identity:'t_f1',id:'f4'});assert.equal(F.identityProfile('t_f1').attack,89);
});

test('incoming current player values are respected when a caller supplies an owned candidate',()=>{
 const s=S.recruit(S.create(1303),'t_f2','f3'),incoming=s.squad.f3,outgoing=s.squad.f2;incoming.attack=95;incoming.speed=99;incoming.endurance=94;
 const html=harness(s).render(incoming,outgoing);assert.match(metric(html,'primary'),/76 → 95/);assert.match(metric(html,'speed'),/70 → 99/);assert.match(metric(html,'endurance'),/64 → 94/);assert.match(metric(html,'growth'),/15 → 2/);assert.equal(F.identityProfile('t_f2').attack,73);
});

test('immediate strength and growth headroom remain separate when their comparison directions disagree',()=>{
 const s=S.create(1304),outgoing=s.squad.f3,incoming=F.identityProfile('t_f1'),html=harness(s).render(incoming,outgoing);
 assert.match(metric(html,'primary'),/comparison-delta up/);assert.match(metric(html,'primary'),/66 → 89/);assert.match(metric(html,'growth'),/comparison-delta down/);assert.match(metric(html,'growth'),/31 → 3/);assert.doesNotMatch(html,/종합 점수|무조건|영입 추천|더 좋은 선수/);assert.equal((html.match(/data-comparison-stat=/g)||[]).length,4);
});

test('maximum caps and equal metrics show zero remaining growth rather than an invented future gain',()=>{
 const s=S.create(1305),incoming={...F.identityProfile('t_f2'),attack:99,potential:99,speed:99,endurance:99},outgoing={...s.squad.f3,attack:99,potential:99,speed:99,endurance:99};
 const html=harness(s).render(incoming,outgoing);for(const key of ['primary','speed','endurance','growth']){assert.match(metric(html,key),/comparison-delta same/);assert.match(metric(html,key),/0<small>같음/);}assert.match(metric(html,'growth'),/0 → 0/);assert.equal((html.match(/성장 한계 도달/g)||[]).length,2);assert.doesNotMatch(html,/성장 여유 −|270분 뒤|성장 \+1/);
});

test('youth candidates use their seeded identity and current outgoing growth at the selected slot',()=>{
 const s=S.create(1306),incoming=F.youthCandidates(s.seed,s.year,1,'FW')[1],outgoing=s.squad.f1;outgoing.attack=86;
 const h=harness(s),html=h.render(incoming,outgoing),remaining=incoming.potential-incoming.attack;assert.match(metric(html,'primary'),new RegExp('86 → '+incoming.attack));assert.match(metric(html,'growth'),new RegExp('1 → '+remaining));assert.deepEqual(h.portraits.map(p=>p.identity),['f1',incoming.identity]);assert.ok(html.includes(incoming.name));
});

test('names and identity attributes are escaped before becoming comparison markup',()=>{
 const s=S.create(1307),incoming={...F.identityProfile('t_f1'),name:'A <script>alert(1)</script> "B" & C',identity:'t_f1" onmouseover="attack'},outgoing={...s.squad.f1,name:"O'Brien <img src=x>"};
 const html=harness(s).render(incoming,outgoing);assert.match(html,/A &lt;script&gt;alert\(1\)&lt;\/script&gt; &quot;B&quot; &amp; C/);assert.match(html,/O&#39;Brien &lt;img src=x&gt;/);assert.match(html,/data-comparison-identity="t_f1&quot; onmouseover=&quot;attack"/);assert.doesNotMatch(html,/<script>|<img| onmouseover="/);
});

test('rendering repeatedly reads frozen players without changing match RNG, finances or any season field',()=>{
 const s=freeze(copy(S.create(1308))),incoming=freeze(copy(F.identityProfile('t_f2'))),outgoing=s.squad.f3,before=JSON.stringify(s),candidateBefore=JSON.stringify(incoming),h=harness(s),first=h.render(incoming,outgoing);
 for(let i=0;i<5;i++)assert.equal(h.render(incoming,outgoing),first);assert.equal(JSON.stringify(s),before);assert.equal(JSON.stringify(incoming),candidateBefore);assert.equal(s.match.rng,s.match.seed>>>0);assert.equal(s.trained,null);assert.equal(s.finance.balance,160000);
});
console.log('Validated '+groups+' market comparison groups, including current trained values, growth headroom, identity portraits and read-only rendering.');
