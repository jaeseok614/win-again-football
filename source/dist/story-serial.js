(function(root){
 'use strict';
 const football=()=>root.Football||(typeof require==='function'?require('./engine.js'):null),own='brynwell';
 const firstChoices=['listen','bold','practical'],lastChoices=['commit','honest'];
 const definitions=[{id:'keeper',title:'골문 너머의 목소리',relation:'captain',speaker:'골키퍼',drama:'locker'},{id:'workload',title:'괜찮다는 말의 무게',relation:'captain',speaker:'선수',drama:'medical'},{id:'away',title:'돌아오는 버스의 불빛',relation:'fans',speaker:'팬 대표',drama:'away'},{id:'board',title:'작은 구단의 큰 장부',relation:'board',speaker:'구단주',drama:'office'}];
 const fullRecord=g=>g.statisticsOriginMinute===0&&(!g.unassignedGoals||Number.isInteger(g.continuousVersion)&&g.continuousVersion>=1&&g.continuousVersion<=14&&Array.isArray(g.ownGoals)&&g.ownGoals.length===g.unassignedGoals&&g.unassignedGoals<=g.score[0]);
 function games(s,year){return ((year===s.year?s.statistics?.records:s.statistics?.archive?.find(a=>a.year===year)?.records)||[]).filter(g=>g.competition==='league'&&fullRecord(g)).slice().sort((a,b)=>a.round-b.round);}
 const points=rows=>rows.reduce((n,g)=>n+(g.score[0]>g.score[1]?3:g.score[0]===g.score[1]?1:0),0),goals=(rows,team)=>rows.reduce((n,g)=>n+g.score[team],0),minutes=(rows,actor)=>rows.reduce((n,g)=>n+(g.players.find(p=>p.identity===actor)?.minutes||0),0);
 const particle=(name,closed,open)=>{const code=String(name).codePointAt(String(name).length-1);return name+(code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28?closed:open);};
 const topic=name=>particle(name,'은','는'),subject=name=>particle(name,'이','가');
 const result=g=>g.score[0]>g.score[1]?'승리':g.score[0]<g.score[1]?'패배':'무승부',key=(id,episode)=>'serial-'+id+'-'+episode;
 function anchor(s,year,def,rows){
  const F=football(),limit=root.Season?.roundCountForYear?.(s,year)||46;
  if(def.id==='keeper'){
   const g=rows.find(g=>g.score[1]>=3&&g.players.some(p=>p.minutes>0&&F.identityProfile(p.identity)?.pos==='GK'));if(!g||g.round>limit-4)return null;
   const actor=g.players.filter(p=>p.minutes>0&&F.identityProfile(p.identity)?.pos==='GK').sort((a,b)=>b.minutes-a.minutes||a.identity.localeCompare(b.identity))[0].identity;
   return {round:g.round,actor,rows:[g],facts:[['확정 경기','리그 '+g.round+'R · '+g.score.join(' : ')],['출전',F.identityProfile(actor).name+' '+minutes([g],actor)+'분'],['기록',g.score[1]+'실점 · '+result(g)]]};
  }
  if(def.id==='workload'){
   if(rows.length<4||rows[3].round>limit-4)return null;const first=rows.slice(0,4),totals=new Map();for(const g of first)for(const p of g.players)if(F.identityProfile(p.identity)?.pos!=='GK'&&p.minutes>0)totals.set(p.identity,(totals.get(p.identity)||0)+p.minutes);
   const player=[...totals].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];if(!player||player[1]<300)return null;
   return {round:first.at(-1).round,actor:player[0],rows:first,facts:[['확정 경기','초반 확정 리그 4경기'],['누적 출전',F.identityProfile(player[0]).name+' '+player[1]+'분'],['확인할 것','현재 체력·출전 조건은 선수단에서 확인']]};
  }
  if(def.id==='away'){
   const g=rows.find(g=>g.away===own&&g.score[0]<g.score[1]);if(!g||g.round>limit-4)return null;
   return {round:g.round,rows:[g],facts:[['확정 경기','원정 · 리그 '+g.round+'R'],['결과',g.score.join(' : ')+' 패배'],['이야기','결과가 확정된 원정에서 시작']]};
  }
  if(rows.length<6||rows[5].round>limit-4)return null;const first=rows.slice(0,6);
  return {round:first.at(-1).round,rows:first,facts:[['확정 경기','초반 확정 리그 6경기'],['승점',points(first)+' / 18'],['득점·실점',goals(first,0)+'득점 · '+goals(first,1)+'실점']]};
 }
 function opening(def,a,name){
  if(def.id==='keeper')return {
   title:'스코어보드가 꺼진 뒤',scene:'스코어보드 불이 꺼졌는데도 '+topic(name)+' 장갑을 벗지 않았다. 테이프 끝을 잡아당겼다가, 다시 손가락에 감았다. 감독이 벤치 옆에 앉자 그제야 입을 열었다. “골이 들어갈 때마다 내 이름이 먼저 보이죠. 나도 알아요.”\n\n확정된 리그 '+a.round+'R, '+a.rows[0].score.join(' : ')+'. 숫자는 바꿀 수 없다. 하지만 그 숫자만으로 한 사람의 경기를 전부 설명할 수도 없었다. 감독은 변명부터 찾던 입을 다물고, 장갑이 벤치 위에 놓일 때까지 기다렸다.',
   thought:'나도 방금까지 골키퍼 탓부터 하고 싶었다. 편하니까. 그런데 수비를 세운 것도, 그 뒤를 맡긴 것도 내 선택이었지.',question:'“다음에도 골이 들어가면, 제 이름부터 지우실 거예요?”',
   options:['네가 본 장면부터 차근차근 듣자','결정은 내가 책임진다. 혼자 뒤집어쓰지 마','실점 장면과 네 역할을 나눠서 다시 보자'],
   replies:['“변명처럼 들릴까 봐 입을 못 열겠더라고요.” 그는 처음으로 장갑에서 손을 뗐다.','“그 말, 선수들 앞에서도 해줄 수 있죠?” 눈을 피하지 않는 대신 목소리가 작아졌다.','“막을 수 있었던 공도 있을 거예요. 그래도 전부 같은 실수는 아니잖아요.”'],
   follow:'“그럼 다음 명단에 제 이름이 있든 없든, 이유는 직접 말해줄 거죠?”',followOptions:['다음 두 리그 경기 뒤 기록을 함께 보자','선발은 보장 못 해. 선택한 이유는 직접 말할게'],finalReplies:['장갑은 가방 안으로 들어갔다. 다음 두 리그 경기가 끝나면, 실제 출전과 팀 실점을 놓고 다시 이야기하기로 했다.','그는 바로 안심하지 않았다. 그래도 감독이 문밖으로 먼저 나가지는 않았다. 선발 약속 대신 설명할 책임을 남겼다.']};
  if(def.id==='workload')return {
   title:'“괜찮아요”가 먼저 나왔다',scene:'회복실 문을 열자 '+subject(name)+' 먼저 웃었다. “괜찮아요. 다음 경기도 뛸 수 있어요.” 아직 아무것도 묻지 않았는데 나온 대답이었다. 의자 밑에는 벗어 놓은 축구화가 가지런했다.\n\n확정 기록이 남은 초반 네 리그 경기 출전 '+minutes(a.rows,a.actor)+'분. 이 기록은 그가 얼마나 뛰었는지는 알려준다. 지금 아픈지, 다음 경기를 버틸 수 있는지는 알려주지 않는다. 수석 코치는 체력표를 책상에 놓고 한발 물러섰다. 감독이 직접 물어야 할 차례였다.',
   thought:'믿고 썼다는 말은 내가 하기 좋다. 힘들어도 괜찮다고 해야 자리를 지킨다면, 그건 믿음이 아니라 압박일 수도 있겠네.',question:'“쉬고 싶다고 하면, 다음엔 제 자리가 없어지는 건 아니죠?”',
   options:['몸 상태를 말하는 것과 선발 경쟁은 따로 보자','무리하라고 한 적 없다는 말로 피하지 않을게','체력과 다음 두 경기의 출전 계획부터 같이 보자'],
   replies:['“그 구분을 감독님 입으로 듣고 싶었어요.” 웃던 얼굴이 잠깐 풀렸다.','“저도 괜찮다고 먼저 말했으니까요. 서로 듣기 좋은 답만 골랐나 봐요.”','“기록은 같이 볼게요. 대신 숫자에 안 나오는 얘기도 하게 해주세요.”'],
   follow:'“제가 힘들다고 말해도, 그 말을 약점처럼 쓰진 않을 거죠?”',followOptions:['다음 두 리그 경기 출전 시간을 함께 돌아보자','출전은 상황에 맞추되 몸 상태는 계속 직접 묻자'],finalReplies:['쉬게 해주겠다는 말도, 다음 선발을 보장하는 말도 꺼내지 않았다. 다음 두 리그 경기의 실제 시간을 보고 다시 만나기로 했다.','명단과 체력은 그대로다. 달라진 것은 괜찮지 않을 때도 말할 수 있게 문을 열어 두었다는 점이었다.']};
  if(def.id==='away')return {
   title:'버스가 출발하지 못한 이유',scene:'원정 버스 시동은 켜져 있었다. 그런데 운전기사는 문을 닫지 않았다. 비에 젖은 목도리 하나가 문밖에 남아 있었기 때문이다. 팬 대표는 선수들 대신 감독을 불렀다. “잠깐이면 돼요. 졌다고 따지러 온 건 아니니까.”\n\n리그 '+a.round+'R 원정 '+a.rows[0].score.join(' : ')+' 패배. 그는 표를 접어 주머니에 넣었다. “우린 다음에도 와요. 그런데 선수들이 고개를 못 들고 지나가면, 우리가 여기 온 게 부담이 된 건가 싶어서요.” 감독은 따뜻한 버스 안을 돌아보다가 한 계단 내려왔다.',
   thought:'지면 다들 화내러 온 줄 알았다. 이 사람은 다음 주에도 온다는 얘기를 하러 왔네. 내가 먼저 피하고 있었구나.',question:'“결과를 약속하라는 게 아니에요. 졌을 때도 우리 얼굴은 봐줄 거죠?”',
   options:['기다린 팬들 이야기를 여기서 더 듣죠','선수 탓 뒤에 숨지는 않겠습니다','오늘 결과와 다음 준비를 직접 설명하죠'],
   replies:['“집에선 축구 보러 왜 거기까지 가냐고 해요.” 그가 처음으로 웃었다.','“그럼 선수들 앞에도 서주세요. 우리 앞에만 서지 말고요.”','“좋아요. 다만 다음엔 이긴다는 말로 오늘을 덮지는 마요.”'],
   follow:'“다음 두 경기가 어떻게 끝나든, 오늘 한 말을 잊진 않을 거죠?”',followOptions:['두 리그 경기 뒤 실제 결과로 다시 이야기하죠','이겨도 져도 사람을 피하지 않겠습니다'],finalReplies:['팬 대표가 버스 문에서 물러났다. 환호 대신 짧은 손인사가 남았다. 다음 두 리그 경기의 결과를 본 뒤 다시 말을 잇기로 했다.','그는 승리를 약속받지 못했다. 대신 감독이 고개를 들고 이름을 물었다. 버스가 출발할 때까지 목도리는 그 자리에 있었다.']};
  const pts=points(a.rows);return {
   title:pts>=12?'잘나갈 때 닫아야 할 계산기':pts<=5?'계산기를 덮지 못한 밤':'여섯 경기, 아직 남은 빈칸',scene:'사무실 불은 구장보다 늦게 꺼졌다. 구단주는 계산기를 밀어 놓고 첫 여섯 리그 경기의 성적표를 펼쳤다. 승점 '+pts+'점, '+goals(a.rows,0)+'득점과 '+goals(a.rows,1)+'실점. 장부와 성적표 사이에는 아직 이름이 적히지 않은 빈 종이가 있었다.\n\n“여기에 선수를 하나 더 쓰고 싶은 표정이군.” 구단주가 말했다. “그 마음은 알아. 그런데 계약서에 사인한 다음 달도 우리 구단이야.” 감독은 계약서를 집으려던 손을 멈췄다. 이 자리는 새 돈을 약속받는 자리가 아니었다. 지금 있는 책임을 어떻게 나눌지 묻는 자리였다.',
   thought:'좋은 선수 한 명이면 다 해결될 것 같지. 그 한 명의 다음 주급, 밀려나는 선수의 자리, 실패했을 때의 설명까지 같이 데려오는 거다.',question:'“지금 이 팀에 더 필요한 건 새 이름인가, 지금 있는 이름을 쓰는 방법인가?”',
   options:['선수와 코치가 느끼는 빈자리부터 듣죠','영입을 요구한다면 그 책임도 제가 설명하죠','현재 자금·주급과 출전 구성을 함께 보죠'],
   replies:['“좋아. 다만 모두의 요구를 들어준다는 약속은 하지 말게.”','“시원한 답이군. 책임진다는 말이 돈을 만들어내진 않는다는 건 알지?”','“그 계산이 보고 싶었어. 이적료만 적힌 표 말고, 그다음 달까지.”'],
   follow:'“그럼 두 경기 뒤, 말한 준비가 실제로 무엇을 바꿨는지 다시 보자고.”',followOptions:['두 리그 경기의 결과와 선택을 놓고 다시 앉죠','성과를 보장하진 않겠습니다. 판단 근거는 남기죠'],finalReplies:['구단주는 새 계약서에 서명하는 대신 성적표를 접었다. 장부는 원래 자리로 돌아갔다. 다음 두 리그 경기의 결과를 두고 다시 논의하기로 했다.','구단주는 빈 종이를 감독에게 건넸다. “원하는 이름부터 쓰지 말고, 필요한 이유부터 써봐.” 다음 결정을 대신 내려주지는 않았다.']};
 }
 function continuation(def,a,name,episode,previous,first,rows){
  const n=minutes(rows,a.actor),pts=points(rows),gf=goals(rows,0),ga=goals(rows,1),scores=rows.map(g=>g.round+'R '+g.score.join(' : ')).join(' · '),memory=previous.options[firstChoices.indexOf(first.choice)],last=previous.followOptions[lastChoices.indexOf(previous.last.choice)];
  const summary=def.id==='keeper'?name+' '+n+'분 출전 · 팀 '+ga+'실점':def.id==='workload'?name+' '+n+'분 출전':points(rows)+'승점 · '+gf+'득점 · '+ga+'실점';
  const common={title:episode===2?'말을 꺼낸 뒤의 두 경기':'다음에 문을 두드릴 사람',scene:'이전 면담에서 감독이 남긴 답은 “'+memory+'”였다. 마지막에는 “'+last+'”라고 했다.\n\n그 뒤 확정된 리그 두 경기: '+scores+'. '+summary+'. 이 기록을 펼치기 전에는 그때의 말이 어떻게 들렸을지 알 수 없었다. 좋은 말로 끝낸 면담이라도, 그다음 두 번의 명단과 경기장은 다른 대답이 될 수 있었다.',thought:'내가 기억하는 의도와 상대가 겪은 일은 다를 수 있다. 내가 그런 뜻이 아니었다는 말부터 하진 말자.',facts:[['면담 뒤 리그',scores],['확정 기록',summary],['지난 약속',last]]};
  if(def.id==='keeper')Object.assign(common,{
   scene:common.scene+'\n\n'+topic(name)+' 이번에도 장갑을 들고 왔다. 이번에는 손에 끼지 않고 책상 위에 먼저 놓았다. '+(n===0?'“두 경기 다 밖에서 봤어요. 왜 바뀌었는지는 듣고 싶었고요.”':ga===0?'“팀이 두 경기를 무실점으로 끝냈어요. 이번엔 제 이름만 부르진 않겠죠?”':'“또 실점은 했네요. 그래도 이번엔 장면을 같이 볼 수 있을 것 같아요.”'),
   question:episode===2?(n===0?'“뛰지 못한 시간도, 준비한 시간으로 봐주실 수 있죠?”':ga===0?'“이번엔 동료들이 앞에서 막아준 것도 같이 말해주세요.”':'“실점을 줄이는 일과 제 자리를 지키는 일, 같은 얘기일까요?”'):'“다음에 누가 실수하더라도, 오늘처럼 먼저 얘기할 수 있게 해줄 거죠?”',
   options:['네가 받아들인 말을 먼저 듣자','한 사람에게 결과를 다 씌우는 일은 막자','실제 출전과 팀 기록을 따로 놓고 보자'],replies:['“이번엔 말하기 전에 변명부터 준비하지 않았어요.”','“저도 동료가 실수했을 때 그 말부터 해야겠네요.”','“제가 뛴 시간과 팀의 실점이 전부 같은 뜻은 아니니까요.”'],follow:'“이 이야기를 다른 선수에게도 해도 될까요? 누가 틀렸는지 가리는 말 말고요.”',followOptions:['다음 두 리그 경기 뒤에도 직접 물어볼게','선수의 사정은 허락받고, 기준은 모두에게 말하자'],finalReplies:['감독은 기록 옆에 다음에 물을 질문을 적었다. 숫자가 좋아졌다는 이유로 대화를 끝내지는 않았다.','그는 장갑을 챙겼다. 다음 실수가 없어질 거라는 약속은 없었다. 실수한 뒤에도 말할 자리가 남았다.']});
  else if(def.id==='workload')Object.assign(common,{
   scene:common.scene+'\n\n'+subject(name)+' 회복실 의자를 당겼다. '+(n>=170?'“계속 뛰었네요. 제가 괜찮다고 한 말을 감독님도 믿고 싶었던 거죠?”':n===0?'“이번엔 두 경기 다 못 뛰었어요. 몸을 생각한 건지, 경쟁에서 밀린 건지 혼자 추측했어요.”':'“전보다 다른 시간을 보냈어요. 뛰는 시간도, 밖에서 보는 시간도 있었고요.”')+' 감독은 다음 명단을 쓰려던 손을 멈췄다. 기록을 확인하는 일과 지금 몸이 어떤지 묻는 일은 달랐다.',
   question:episode===2?'“출전 시간이 바뀌었으니까 이제 괜찮겠지, 그렇게 끝내진 않을 거죠?”':'“다른 동료가 괜찮다고 먼저 말하면, 저도 한 번 더 물어봐도 되겠죠?”',options:['몇 분 뛰었는지 다음에 몸 상태도 직접 묻자','괜찮다는 답을 강요하는 분위기는 만들지 말자','체력·일정·역할을 함께 보고 직접 결정하자'],replies:['“기록 보고 끝나는 게 아니라 제 말도 듣는 거죠.”','“솔직하게 말해도 경쟁은 계속되겠죠. 그래도 말은 할게요.”','“그럼 다음 경기 전에 제가 느끼는 상태부터 말할게요.”'],follow:'“쉬어야 한다는 말이 누군가에겐 용기가 필요하더라고요.”',followOptions:['두 리그 경기 뒤에도 같은 질문을 직접 할게','몸 상태를 말한 선수에게 해명부터 시키진 말자'],finalReplies:['다음 명단은 아직 정해지지 않았다. 실제로 얼마나 뛰었는지 확인하고, 지금 어떤지를 묻는 순서를 수첩에 남겼다.','훈련복을 챙기던 그가 문 앞에서 멈췄다. “오늘은 질문하기 전에 괜찮다고 안 했네요.” 둘 다 그제야 웃었다.']});
  else if(def.id==='away')Object.assign(common,{
   scene:common.scene+'\n\n팬 대표는 그때 젖었던 목도리를 다시 두르고 왔다. '+(pts>=4?'“이번엔 돌아가는 길이 좀 짧게 느껴지더군요. 그래도 그날 버스 앞에서 한 말은 기억해요.”':pts===0?'“두 번 더 졌네요. 그래도 오늘은 감독님이 먼저 나오셨군요.”':'“웃은 날도, 아쉬운 날도 있었어요. 그때 하신 말은 그대로인가요?”')+' 감독은 그가 펼친 표 두 장 사이에 빈 의자를 놓았다.',
   question:episode===2?'“결과가 달라졌다고, 우리 얘기도 다 해결된 건 아니죠?”':'“처음 오는 팬한테 이 팀을 어떻게 설명하면 좋을까요?”',options:['다른 결과를 겪은 팬들의 얘기도 듣죠','좋은 날에만 얼굴을 드는 감독은 안 되겠습니다','확정된 경기와 다음 준비를 나누어 말하죠'],replies:['“같이 와도 같은 마음으로 돌아가진 않더라고요.”','“그 말은 승리 인터뷰보다 오래 기억할게요.”','“그래요. 아직 안 뛴 경기를 이겼다고 하진 맙시다.”'],follow:'“이 팀을 아직 믿느냐고 물으면, 저는 다음에도 간다고 답할 거예요.”',followOptions:['두 경기 뒤에도 결과부터 숨기지 않고 얘기하죠','새 팬에게도 좋은 날과 힘든 날을 함께 말해주세요'],finalReplies:['다음 경기가 표 위에 추가됐다. 승리를 보장하는 문장 대신, 경기가 끝나도 자리를 피하지 않겠다는 답이 남았다.','팬 대표는 빈 의자를 밀어 넣었다. “그럼 처음 온 사람도 옆에 앉히죠.” 작은 구단에 한 사람의 자리가 더 생겼다.']});
  else Object.assign(common,{
   scene:common.scene+'\n\n구단주는 성적표에 손가락을 얹었다. '+(pts>=4?'“잘됐군. 이 숫자 때문에 지난 걱정이 다 틀렸다고 하진 않겠지?”':pts===0?'“이번에도 쉽지 않았군. 그렇다고 지난 대화가 없던 일이 되진 않아.”':'“기대할 장면과 고칠 장면이 같이 있네. 하나만 골라 보고 싶겠지만.”')+' 계산기는 켜지지 않았다. 먼저 설명해야 할 것은 이미 내린 선택이었다.',
   question:episode===2?'“원했던 결과와 실제 결과 사이에서, 자네가 책임질 건 뭔가?”':'“다음 감독에게 이 구단을 넘긴다면, 어떤 기준을 남기고 싶나?”',options:['선수와 코치가 겪은 변화부터 들으시죠','명단과 지시를 고른 책임은 제가 설명하죠','성과와 지출 판단은 따로 근거를 남기죠'],replies:['“내가 못 본 훈련장 이야기도 있겠지. 들어보겠네.”','“좋아. 그렇다고 모든 공까지 혼자 가져가지는 말게.”','“그 자료는 결과가 안 좋을 때도 같은 방식으로 쓰게.”'],follow:'“같은 판단을 다음에도 하겠나? 결과를 이미 안다고 생각하지 말고.”',followOptions:['두 리그 경기 뒤 다시 근거를 확인하죠','결과를 보장하지 않고 선택 이유를 계속 남기죠'],finalReplies:['구단주는 다음 면담 날짜 옆에 두 칸을 그었다. 결과와 판단 근거. 둘을 같은 것으로 취급하지 말자는 뜻이었다.','빈 종이 위에 선수 이름보다 기준이 먼저 적혔다. 장부의 숫자를 고쳐 쓰지는 못했다. 그래도 다음 선택을 돌아볼 기록은 남았다.']});
  if(episode===3){
   const endings={
    keeper:{title:'장갑을 벗고 들어온 날',follow:'“다음에 다른 동료가 실수하면, 저부터 오늘 얘기를 기억할게요.”',followOptions:['실수한 장면과 선수 전체를 나누어 보자','잘한 날에도 뒤에서 도운 동료를 같이 보자'],finalReplies:['장갑은 가방 안에 있었고, 대화는 이미 시작돼 있었다. 실수를 지우지는 못했다. 그래도 한 번의 실수만으로 서로의 이름을 지우지 않는 법은 남았다.','그는 문을 나서다 돌아왔다. “그때 앞에서 막아준 애들한테도 말해야겠네요.” 감독은 자기 몫의 이름도 수첩 옆에 적었다.']},
    workload:{title:'괜찮지 않아도 하는 말',follow:'“오늘은 묻기 전에 괜찮다고 안 할게요. 제 말부터 해도 되죠?”',followOptions:['괜찮지 않다는 말도 먼저 할 수 있게 남겨 두자','몸 상태와 선발 경쟁을 각각 설명하는 기준을 지키자'],finalReplies:['“오늘은 다리가 무거워요.” 짧은 말이었다. 그 말을 꺼내기까지 세 번의 면담과 네 번의 리그 경기가 있었다. 감독은 먼저 변명을 찾지 않고 고개를 끄덕였다.','그는 자리를 보장받지 않았다. 감독도 다음 결과를 보장받지 못했다. 대신 몸 상태를 솔직히 말한 것부터 불리한 증거로 만들지는 않기로 했다.']},
    away:{title:'목도리 옆의 빈자리',follow:'“다음엔 처음 오는 사람도 데려올게요. 좋은 날만 있는 팀이라고는 말 안 할 거예요.”',followOptions:['함께 기다린 사람의 자리를 남겨 두죠','힘든 결과도 직접 마주하는 팀으로 남겠습니다'],finalReplies:['팬 대표가 목도리를 의자 등받이에 걸었다. “여긴 처음 온 사람 자리예요.” 아직 좌석을 크게 늘린 구단은 아니었다. 그래도 누군가를 맞을 자리는 생겼다.','버스 문이 닫힐 때 감독이 먼저 손을 들었다. 누가 이겼는지 묻지 않아도 알아볼 수 있는 인사가 됐다. 다음 결과는 아직 모르지만, 서로 피하지는 않았다.']},
    board:{title:'이름보다 먼저 적은 기준',follow:'“이 종이는 내가 보관하지. 나중에 잘나가도, 자네가 쓴 기준은 안 버릴 거야.”',followOptions:['성과와 함께 선택한 이유를 남기는 구단으로 만들죠','좋은 이름보다 감당할 수 있는 선택부터 하겠습니다'],finalReplies:['처음 비어 있던 종이에는 선수 이름보다 판단 기준이 먼저 남았다. 구단주는 장부 옆에 그 종이를 끼웠다. 숫자가 어려워지는 날에도 펼쳐 볼 수 있는 자리였다.','구단주는 계산기를 서랍에 넣었다. “돈 얘기는 또 하겠지. 그래도 자네가 무엇부터 볼지는 알겠군.” 투자가 약속된 것은 아니었다. 대신 같은 표를 놓고 말할 근거가 생겼다.']}
   };
   Object.assign(common,endings[def.id]);
  }
  return common;
 }
 function events(s,year=s.year){
  const rows=games(s,year),receipts=s.clubStory?.records||[],out=[],F=football();
  for(const def of definitions){const a=anchor(s,year,def,rows);if(!a)continue;const name=a.actor?F.identityProfile(a.actor).name:def.speaker;let content=opening(def,a,name),previous=null;
   for(let episode=1;episode<=3;episode++){
    const event=year+':'+key(def.id,episode),answered=receipts.filter(r=>r.event===event),present=!a.actor||year!==s.year||Object.values(s.squad||{}).some(p=>p.identity===a.actor);if(!present&&!answered.length)break;
    let round=a.round;
    if(episode>1){const last=previous.last,after=rows.filter(g=>g.round>last.atRound).slice(0,2);if(after.length<2)break;round=after.at(-1).round;content=continuation(def,a,name,episode,previous,previous.first,after);}
    const follow=content.follow,followOptions=content.followOptions,finalReplies=content.finalReplies;
    const e={key:key(def.id,episode),round,relation:def.relation,speaker:def.speaker,title:content.title,scene:content.scene,thought:content.thought,options:content.options,replies:content.replies,question:content.question,conflict:true,drama:def.drama,...(a.actor?{actor:a.actor}:{}),context:def.title+' · '+episode+'/3화',serial:{id:def.id,title:def.title,episode,of:3,originRound:a.round,previous:episode>1?year+':'+key(def.id,episode-1):null,facts:content.facts||a.facts},turns:content.options.map(()=>[follow,followOptions,finalReplies])};out.push(e);
    const first=answered.find(r=>r.step===0),last=answered.find(r=>r.step===1);if(!first||!last)break;previous={...content,first,last};
   }
  }
  return out;
 }
 function read(s,year=s.year){
  const rows=games(s,year),all=events(s,year),receipts=s.clubStory?.records||[],seasonComplete=Math.max(year===s.year?s.round:0,rows.at(-1)?.round||0)>=(root.Season?.roundCountForYear?.(s,year)||46),end=year!==s.year||!!(s.rebirth&&(root.Rebirth||(typeof require==='function'?require('./rebirth.js'):null))?.read(s)?.status!=='active');
  return definitions.flatMap(def=>{const stages=all.filter(e=>e.serial.id===def.id);if(!stages.length)return [];const latest=stages.at(-1),done=receipts.filter(r=>r.event===year+':'+latest.key&&r.step===1)[0],after=done?rows.filter(g=>g.round>done.atRound).slice(0,2):[];
   const actor=latest.actor,departed=!!actor&&year===s.year&&!Object.values(s.squad||{}).some(p=>p.identity===actor),finished=latest.serial.episode===3&&!!done;
   return [{id:def.id,title:def.title,drama:def.drama,year,actor:actor||def.relation,finished,departed,waiting:!finished&&!!done,remaining:done?Math.max(0,2-after.length):null,readOnly:end,status:finished?'함께 남긴 세 장면':end?'지난 기록 · 읽기 전용':departed?'선수단을 떠난 인물의 기록':done?(seasonComplete?'이 시즌에 남은 이야기':'다음 리그 '+Math.max(0,2-after.length)+'경기 결과를 기다리는 중'):receipts.some(r=>r.event===year+':'+latest.key)?'대화 이어가기':'새 장면 도착',stages:stages.map(e=>({event:year+':'+e.key,episode:e.serial.episode,title:e.title,round:e.round,step:receipts.filter(r=>r.event===year+':'+e.key).length})),facts:latest.serial.facts}];});
 }
 const api={events,read,games};root.StorySerial=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
