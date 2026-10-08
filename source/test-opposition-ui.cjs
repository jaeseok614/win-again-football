'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'dist'),Portraits=require('./dist/portraits.js'),host={hidden:false,innerHTML:''},lineup=Array.from({length:11},(_,i)=>({id:'opp'+i,identity:'opposition:arsenal:'+i,no:i+1,name:'선수 '+i,pos:i===0?'GK':i<5?'DEF':i<9?'MID':'FW',primaryLabel:i===0?'선방':i<5?'수비':i<9?'패스':'결정력',primary:60+i,overall:58+i,speed:55+i,endurance:63+i,energy:94,condition:'좋음'}));
const report={setPieces:{note:'현재 능력 지표',roles:[{role:'freeKick',label:'프리킥 키커',ours:{name:'<영입 선수>',score:72},opponentCandidates:[{name:'<상대 후보>',pos:'MID',score:71}]}],chances:[{kind:'freeKick',label:'직접 프리킥 슈팅',ours:.091,opponent:.087}]},valid:true,club:{id:'arsenal',name:'아스널드 FC',short:'아스널드',code:'AF',color:'#c8f36e',reference:'Arsenal'},division:{number:1,name:'프리미어 리그',rounds:14},plan:{description:'점유율 축구',formation:'442',label:'중원과 패스 중심'},keyPlayer:{id:'opp10',name:'선수 10',pos:'FW',role:'에이스 공격수',threat:'결정력 70 · 속도 65',overall:68},lineup,activePlayers:{ours:11,opponent:11},minute:0,rank:3,points:9,recent:['승'],condition:{opponent:94,ours:92,tired:1},comparisons:[{label:'공격',ours:70,opponent:80},{label:'수비',ours:65,opponent:77},{label:'중원',ours:68,opponent:82},{label:'수비 속도',ours:75,opponent:84}],advice:'상대 수비가 느립니다.'};
report.rivalDiscipline={applicable:true,rows:[{name:"<징계 선수>",pending:1,yellows:0}],absent:[]};lineup[0]={...lineup[0],name:"후보 선수",replacementFor:"<결장 선수>"};report.lineup=lineup;const context={document:{getElementById:id=>id==='opposition-report'?host:null},view:'match',state:{seed:1,minute:0,tactic:'balanced',lineup:['g1'],players:{g1:{energy:92}},phase:'prep',suspensions:false},season:{suspensions:false},Opposition:{read:()=>report},TacticsBoard:{read:()=>({valid:false})},Portraits,matchdayText:value=>String(value).replaceAll("<","&lt;").replaceAll(">","&gt;"),matchdayCardInfo:()=>({markup:''})};
vm.runInNewContext(fs.readFileSync(path.join(root,'opposition-ui.js'),'utf8'),context,{filename:'opposition-ui.js'});
context.renderOpponentReport();
assert.match(host.innerHTML,/실제 구단 전력 참고 <b>Arsenal<\/b>/);
assert.match(host.innerHTML,/종합 능력은 포지션별 창작 가중치이며 실제 선수 평점이나 실시간 데이터가 아닙니다/);
assert.match(host.innerHTML,/<abbr title="포지션 주요 능력을 가중한 1~99 종합 지수">종합<\/abbr>/);
assert.equal((host.innerHTML.match(/<th(?: class="[^"]*")?>/g)||[]).length,6);
assert.equal((host.innerHTML.match(/class="opposition-overall"/g)||[]).length,11);
assert.equal((host.innerHTML.match(/class="player-portrait portrait-small"/g)||[]).length,11);
assert.equal(new Set([...host.innerHTML.matchAll(/data-portrait-index="(\d+)"/g)].map(m=>m[1])).size,11);
assert.equal((host.innerHTML.match(/<tr/g)||[]).length,12);
assert.match(host.innerHTML,/경고·출전 정지/);assert.match(host.innerHTML,/&lt;징계 선수&gt; · 이번 리그전 결장/);assert.match(host.innerHTML,/&lt;결장 선수&gt; · 누적 정지 · 후보 출전/);assert.doesNotMatch(host.innerHTML,/<징계 선수>|<결장 선수>/);
const css=fs.readFileSync(path.join(root,'opposition.css'),'utf8');assert.match(css,/\.opposition-overall/);assert.match(css,/\.opposition-discipline/);assert.match(css,/@media\(max-width:730px\)/);
console.log('PASS opponent report identifies real club references and shows eleven portrait-backed positional ratings');

assert.match(host.innerHTML,/세트피스 분석/);assert.match(host.innerHTML,/&lt;영입 선수&gt;/);assert.match(host.innerHTML,/&lt;상대 후보&gt;/);assert.doesNotMatch(host.innerHTML,/<영입 선수>|<상대 후보>/);assert.match(host.innerHTML,/0.091 : 0.087/);console.log('PASS specialist comparison escapes names and displays exact engine xG');

assert.ok(host.innerHTML.indexOf('opposition-snapshot')<host.innerHTML.indexOf('opposition-roster"'));
assert.ok(host.innerHTML.indexOf('opposition-roster"')<host.innerHTML.indexOf('opposition-coach-analysis'));
assert.ok(host.innerHTML.indexOf('opposition-roster"')<host.innerHTML.indexOf('opposition-set-pieces'));
assert.match(host.innerHTML,/선방<span class="opposition-mobile-attributes"> 60 · 지구력 63/);
console.log('PASS the full lineup precedes long analysis and mobile rows retain primary ability and endurance');

let markup=host.innerHTML,writes=0,reads=0,details={};
Object.defineProperty(host,'innerHTML',{get:()=>markup,set:value=>{markup=value;writes++;details={'.opposition-set-pieces':{open:false},'.opposition-coach-analysis':{open:false}};}});
host.querySelector=selector=>details[selector];context.Opposition.read=()=>{reads++;return report;};context.opponentReportKey=null;
const before=JSON.stringify([context.state,context.season,report]);context.renderOpponentReport();details['.opposition-set-pieces'].open=true;details['.opposition-coach-analysis'].open=true;context.renderOpponentReport();assert.equal(writes,1);assert.equal(reads,1);
host.hidden=true;context.state.minute=1;context.renderOpponentReport();assert.equal(reads,1);host.hidden=false;context.renderOpponentReport();assert.equal(reads,2);assert.equal(details['.opposition-set-pieces'].open,true);assert.equal(details['.opposition-coach-analysis'].open,true);context.state.minute=0;assert.equal(JSON.stringify([context.state,context.season,report]),before);
console.log('PASS hidden and cached reports skip reads, preserve expanded analysis, and leave the campaign and report untouched');

report.lineup[10]={...report.lineup[10],overall:99,energy:1,dismissed:true};context.state.minute=2;context.renderOpponentReport();assert.match(host.innerHTML,/<dt>활동 선수 종합·계산<\/dt><dd>63<\/dd>/);assert.match(host.innerHTML,/<dt>활동 선수 평균 체력<\/dt><dd>94<\/dd>/);assert.match(host.innerHTML,/opposition-dismissed/);assert.equal((host.innerHTML.match(/class="opposition-overall"/g)||[]).length,11);
console.log('PASS summary averages exclude a dismissed player while the report retains all eleven names and the red-card status');
const previousReads=reads;context.state.phase='first';context.renderOpponentReport();assert.equal(reads,previousReads+1);assert.match(host.innerHTML,/OPPOSITION \/ 경기 중/);context.renderOpponentReport();assert.equal(reads,previousReads+1);console.log('PASS kickoff invalidates the report at the same minute and subsequent unchanged reads stay cached');
