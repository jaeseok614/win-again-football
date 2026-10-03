'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),Europe=require('./dist/europe.js'),H=require('./dist/health.js'),File=require('./dist/campaign-file.js');
const {qualified,play,finish,complete}=require('./test-europe.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
const escapeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function firstEurope(){let s=qualified();while(s.competition!=='europe')s=play(s);return s;}
function harness(season,{view='cup'}={}){
 const nodes=new Map(),calls={set:0,lookup:0,standings:0,fixtures:0,gates:0,routes:[]},voids=new Set(['input','br','hr','img','meta','link','area','base','embed','source','wbr']);
 const text=html=>String(html).replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 function element(tag='div',attributes='',parent=null){
  const attrs=Object.fromEntries([...attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([,key,value])=>[key,value??''])),node={tagName:tag.toUpperCase(),id:attrs.id||'',attributes:attrs,parentElement:parent,children:[],markup:'',open:Object.hasOwn(attrs,'open'),disabled:Object.hasOwn(attrs,'disabled'),dataset:{}};
  for(const [key,value]of Object.entries(attrs))if(key.startsWith('data-'))node.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;
  node.matches=selector=>selector.startsWith('#')?node.id===selector.slice(1):selector.startsWith('.')?(attrs.class||'').split(/\s+/).includes(selector.slice(1)):selector.startsWith('[')?[...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].every(([,key,value])=>Object.hasOwn(attrs,key)&&(value===undefined||attrs[key]===value)):node.tagName===selector.toUpperCase();
  node.closest=selector=>node.matches(selector)?node:parent?.closest(selector)||null;
  node.querySelectorAll=selector=>{const result=[];function visit(n){for(const child of n.children){if(child.matches(selector))result.push(child);visit(child);}}visit(node);return result;};node.querySelector=selector=>node.querySelectorAll(selector)[0]||null;
  node.getAttribute=key=>attrs[key]??null;Object.defineProperty(node,'textContent',{get(){return text(node.markup);}});
  Object.defineProperty(node,'innerHTML',{get(){return node.markup;},set(html){node.markup=html;node.children=[];if(node.id==='europe-panel'){nodes.clear();nodes.set(node.id,node);calls.set++;}const stack=[node];for(const token of html.matchAll(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi)){const [whole,tag,attrs]=token;if(whole.startsWith('</')){if(stack.length>1){const closed=stack.pop();closed.markup=html.slice(closed.contentStart,token.index);}continue;}const p=stack.at(-1),child=element(tag,attrs,p);p.children.push(child);child.contentStart=token.index+whole.length;if(child.id)nodes.set(child.id,child);if(!voids.has(tag.toLowerCase())&&!whole.endsWith('/>'))stack.push(child);}}});
  return node;
 }
 const panel=element('div','id="europe-panel"');nodes.set(panel.id,panel);const instrumented={...Europe,standings(...args){calls.standings++;return Europe.standings(...args);},fixturesFor(...args){calls.fixtures++;return Europe.fixturesFor(...args);},gateFor(...args){calls.gates++;return Europe.gateFor(...args);}};
 const context=vm.createContext({season,state:season.match,view,S,Europe:instrumented,$:id=>{calls.lookup++;return nodes.get(id)||null;},setView(next){calls.routes.push(next);context.view=next;},escapeText,moneyLabel:n=>'£'+Math.abs(n).toLocaleString('en-GB')});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/europe-ui.js'),'utf8'),context);
 return {context,panel,calls,render(){context.renderEurope();},click(id){const node=nodes.get(id);assert.ok(node,'missing UI control '+id);assert.equal(node.disabled,false);if(node.onclick)node.onclick({target:node});else panel.onclick?.({target:node});},get html(){return panel.markup;},get text(){return panel.textContent;}};
}

test('inactive and legacy campaigns explain qualification without changing existing matches or finances',()=>{
 const fresh=S.create(7201),before=JSON.stringify(fresh),h=harness(fresh);h.render();assert.ok(h.text.includes('1부 1~2위'));assert.ok(h.text.includes('2부 승격'));assert.ok(h.text.includes('다음 시즌'));assert.equal(h.panel.querySelectorAll('.europe-table').length,0);assert.equal(h.calls.standings,0);assert.equal(h.calls.fixtures,0);assert.equal(JSON.stringify(fresh),before);
 const raw=qualified();delete raw.europe;delete raw.health.originEuropeGames;const legacy=S.restore(raw),old=JSON.stringify(legacy),l=harness(legacy);l.render();assert.ok(l.text.includes('기존 시즌은 그대로'));assert.ok(l.text.includes('현재 일정과 경기 상태를 유지'));assert.equal(l.panel.querySelectorAll('.europe-table').length,0);assert.equal(JSON.stringify(legacy),old);
});
test('active European preparation shows the real foreign opponent and routes to the existing match',()=>{
 const s=firstEurope(),before=JSON.stringify(s),h=harness(s);h.render();assert.ok(h.text.includes('2시즌 1부 2위로 출전'));assert.ok(h.text.includes('조별리그 1차전'));assert.ok(h.text.includes(S.opponentFor(s).short));assert.ok(h.html.includes('id="europe-match"'));assert.equal(h.panel.querySelectorAll('.europe-table').length,2);assert.equal(h.panel.querySelectorAll('.own-row').length,1);assert.equal(JSON.stringify(s),before);h.click('europe-match');assert.deepEqual(h.calls.routes,['match']);assert.equal(JSON.stringify(s),before);assert.equal(h.context.state,s.match);
 finish(s.match);const full=harness(s);full.render();assert.ok(full.text.includes('결과 확정 대기'));assert.ok(full.panel.querySelector('#europe-match').textContent.includes('결과 확인'));
});
test('both group tables reflect confirmed scores and league standings remain independent',()=>{
 const pending=firstEurope(),domestic=S.standings(pending),s=play(pending),before=JSON.stringify(s),h=harness(s);h.render();assert.deepEqual(S.standings(s),domestic);assert.equal(h.calls.standings,2);const tables=h.panel.querySelectorAll('.europe-table');for(const [index,table]of tables.entries()){const expected=Europe.standings(s,index),rows=table.querySelectorAll('tr').slice(1);assert.equal(rows.length,4);for(let i=0;i<4;i++){assert.ok(rows[i].textContent.includes(expected[i].short));assert.deepEqual(rows[i].querySelectorAll('td').map(cell=>cell.textContent),[String(expected[i].played),(expected[i].gd>0?'+':'')+expected[i].gd,String(expected[i].points)]);}}assert.equal(JSON.stringify(s),before);
});
test('actual regulation draws render their score without a false group shootout',()=>{
 let s=qualified();while(!(s.competition==='europe'&&s.europe.stage===3))s=play(s);finish(s.match);assert.deepEqual(s.match.score,[0,0]);const result=Europe.preview(s,s.match);assert.equal(result.penalties,null);s=S.settle(s);const h=harness(s);h.render();const stage=h.panel.querySelectorAll('.europe-stage')[3],pair=stage.querySelectorAll('.europe-pair')[result.index];assert.ok(pair.textContent.includes('0 : 0'));assert.equal(pair.querySelector('small'),null);assert.ok(h.text.includes('조별 무승부 가능'));
});
test('actual knockout shootouts render confirmed penalties separately from regulation goals',()=>{
 let s=qualified();while(!(s.competition==='europe'&&s.europe.stage===6)){assert.ok(s.match);if(s.competition==='league')S.train(s,'recovery');H.rotate(s);F.setTactic(s.match,'counter');s=play(s);}H.rotate(s);F.setTactic(s.match,'counter');finish(s.match);const result=Europe.preview(s,s.match);assert.deepEqual(result.goals,[3,3]);assert.ok(result.penalties);s=S.settle(s);assert.doesNotThrow(()=>S.restore(copy(s)));const before=JSON.stringify(s),h=harness(s);h.render();const stage=h.panel.querySelectorAll('.europe-stage')[6],pair=stage.querySelectorAll('.europe-pair')[result.index];assert.ok(pair.textContent.includes('3 : 3'));assert.ok(pair.querySelector('small').textContent.includes('승부차기 '+result.penalties.join(' : ')));assert.equal(JSON.stringify(s),before);
});
test('fixture details preserve expansion and show scheduled gates with pending knockout slots',()=>{
 const h=harness(firstEurope());h.render();const details=h.panel.querySelector('.europe-fixtures');assert.equal(details.open,false);assert.equal(details.querySelectorAll('.europe-stage').length,8);assert.equal(details.querySelectorAll('.europe-pending').length,2);for(const gate of Europe.gates)assert.ok(details.textContent.includes('리그 '+gate+'경기 뒤'));details.open=true;details.ontoggle();h.render();assert.equal(h.panel.querySelector('.europe-fixtures').open,true);h.panel.querySelector('.europe-fixtures').open=false;h.panel.querySelector('.europe-fixtures').ontoggle();h.render();assert.equal(h.panel.querySelector('.europe-fixtures').open,false);
});
test('historical international winners remain visible in the following season with canonical club names',()=>{
 const ended=complete(qualified()),champion=ended.europe.champion,next=S.nextSeason(ended),before=JSON.stringify(next),h=harness(next);h.render();assert.ok(h.text.includes('3시즌 · '+S.club(champion).short+' 우승'));assert.ok(h.text.includes('챔피언스리그 우승 '+(champion===S.own?1:0)+'회'));assert.equal(JSON.stringify(next),before);assert.deepEqual(S.restore(copy(next)),next);
});
test('hidden European dashboards do zero DOM work and no tournament calculations during match ticks',()=>{
 const s=firstEurope(),before=JSON.stringify(s),h=harness(s,{view:'match'});for(let i=0;i<20;i++)h.render();assert.deepEqual(h.calls,{set:0,lookup:0,standings:0,fixtures:0,gates:0,routes:[]});h.context.view='club';h.render();assert.equal(h.calls.set,0);h.context.view='cup';h.render();assert.equal(h.calls.set,1);assert.equal(h.calls.standings,2);assert.equal(JSON.stringify(s),before);
});
test('mobile keeps six navigation destinations and accessible large controls in the tournament panel',()=>{
 const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8'),nav=html.match(/<nav\b[^>]*class="view-nav"[\s\S]*?<\/nav>/)[0],destinations=[...nav.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(destinations,['club','match','squad','market','academy','cup']);assert.ok(html.includes('id="europe-panel"'));assert.ok(html.includes('europe-ui.js'));const css=fs.readFileSync(path.join(__dirname,'dist/europe.css'),'utf8');assert.ok(css.includes('min-height:44px'));assert.ok(css.includes('summary:focus-visible'));assert.ok(css.includes('@media(max-width:600px)'));assert.ok(css.includes('grid-template-columns:1fr'));const h=harness(firstEurope());h.render();assert.ok(h.html.includes('aria-labelledby="europe-heading"'));assert.ok(h.html.includes('aria-label="챔피언스리그 A조"'));assert.ok(h.html.includes('aria-label="챔피언스리그 B조"'));
});
test('an isolated QA campaign exports and reimports real European preparation without personal data',()=>{
 const s=firstEurope(),text=File.stringify({season:s,view:'cup'},{createdAt:'2026-10-02T00:00:00.000Z'}),read=File.read(text);assert.equal(read.summary.competition,'europe');assert.equal(read.summary.phase,'prep');assert.equal(read.payload.view,'cup');assert.deepEqual(read.payload.season,s);assert.equal(read.summary.year,3);assert.equal(read.summary.playerCount,18);
});
console.log('Validated '+groups+' European UI groups covering actual campaign routes, standings, regulation draws, shootouts, history, lazy rendering and mobile controls.');
