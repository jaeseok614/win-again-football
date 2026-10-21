(function(root){
 'use strict';
 // Versioned, additive stories. Published serial-* receipts and prose stay intact.
 const serial=()=>root.StorySerial||(typeof require==='function'?require('./story-serial.js'):null),football=()=>root.Football||(typeof require==='function'?require('./engine.js'):null);
 const definitions=[{id:'link-v1',title:'골보다 먼저 건넨 공',speaker:'도움을 기록한 선수',action:'tactics'},{id:'red-v1',title:'휘슬 뒤에 남은 책임',speaker:'퇴장한 선수',action:'roster'}],firstIds=['listen','bold','practical'],lastIds=['commit','honest'];
 const key=(id,ep)=>'thread-'+id+'-'+ep,player=(g,id)=>g.players.find(p=>p.identity===id),sum=(rows,id,field)=>rows.reduce((n,g)=>n+(player(g,id)?.[field]||0),0),scores=rows=>rows.map(g=>g.round+'R '+g.score.join(' : ')).join(' · ');
 function anchor(s,year,def,rows){
  const F=football(),limit=root.Season?.roundCountForYear?.(s,year)||46;
  for(const g of rows){
   if(g.round>limit-4)break;
   if(def.id==='link-v1'){
    const p=g.players.filter(p=>p.minutes>0&&p.assists>0&&p.goals===0&&F.identityProfile(p.identity)?.pos!=='GK'&&F.identityProfile(p.identity)).sort((a,b)=>b.assists-a.assists||a.identity.localeCompare(b.identity))[0];
    if(p)return {actor:p.identity,round:g.round,record:g,facts:[['확정 경기','리그 '+g.round+'R · '+g.score.join(' : ')],['개인 기록',p.assists+'도움 · 0골 · '+p.minutes+'분 출전'],['이야기의 출발','도움 기록에 남은 실제 선수']]};
   }else{
    const card=(g.cards||[]).find(c=>c.team===0&&c.card==='red'&&g.players.some(p=>p.id===c.id&&p.minutes>0&&F.identityProfile(p.identity)));
    if(card){const p=g.players.find(p=>p.id===card.id);return {actor:p.identity,round:g.round,record:g,card,facts:[['확정 경기','리그 '+g.round+'R · '+g.score.join(' : ')],['징계 장면',card.minute+'분 · '+(card.reason==='second-yellow'?'경고 누적 퇴장':'직접 퇴장')],['확인할 것','현재 징계·출전 조건은 선수단에서 확인']]};}
   }
  }
  return null;
 }
 function opening(def,a,name){
  if(def.id==='link-v1')return {
   title:'득점 사진 바깥의 얼굴',scene:'라커룸 한쪽에서 휴대폰 화면이 돌았다. 골을 넣은 동료의 사진이었다. '+name+'도 같이 웃다가 자기 자리에 앉았다. 감독이 옆에 서자 수건을 접던 손이 멈췄다. “사진에 안 나왔다고 삐친 건 아니에요.” 묻지도 않은 말이 먼저 나왔다.\n\n리그 '+a.round+'R, '+a.record.score.join(' : ')+'. 그의 기록에는 '+player(a.record,a.actor).assists+'도움과 0골이 남았다. “그런데 자꾸 패스하면, 제가 슛을 무서워한다고 생각하실까 봐요.” 감독은 골 장면을 다시 틀려다 화면을 껐다. 오늘 그가 꺼내려는 건 잘했다는 한마디보다 조금 더 복잡한 이야기였다.',
   thought:'좋은 패스였다고 칭찬하면 끝날 줄 알았다. 이 선수는 다음에도 자기 판단을 믿어도 되는지 묻고 있네. 골이 안 나면 내 칭찬부터 바뀌었던 건 아닐까.',question:'“다음에는 제가 직접 때렸다가 놓쳐도, 오늘 패스하던 저를 기억해 주실 거죠?”',
   options:['패스할 때 네가 본 선택지부터 듣자','골 넣는 사람만 주인공인 팀은 만들지 말자','도움 기록과 실제 역할을 나눠서 보자'],replies:['“저쪽이 먼저 열렸어요. 제가 잘한 건지, 그냥 피한 건지 혼자 생각했어요.”','“그럼 골 없는 날에도 제 이름을 불러 주세요.” 수건이 무릎 위에서 펴졌다.','“도움이 안 찍힌 패스도 있잖아요. 기록만으론 모르는 장면도 말하게 해주세요.”'],
   follow:'“다음 두 경기에서 숫자가 안 붙어도, 얘기는 계속할 수 있죠?”',followOptions:['두 리그 경기 뒤 출전과 득점·도움을 함께 보자','공격 지시는 직접 정하되 선택의 이유를 듣자'],finalReplies:['감독은 두 경기 뒤의 빈칸을 남겨 뒀다. 도움을 더 하라는 숙제도, 슛을 무조건 하라는 명령도 적지 않았다.','다음 명단과 전술은 바뀌지 않았다. 그는 자기 판단을 설명할 자리가 남았다는 것만 확인하고 자리에서 일어났다.']};
  return {
   title:'빈자리에 놓인 유니폼',scene:'동료들이 나간 뒤에도 '+name+'의 유니폼은 벤치에 남아 있었다. 그는 퇴장 장면을 멈춘 화면 앞에 앉아 있었다. “심판이 좀…” 말을 꺼냈다가 스스로 삼켰다. 감독도 화가 가라앉은 얼굴은 아니었다. 그래도 문을 닫고 의자를 끌어왔다.\n\n리그 '+a.round+'R '+a.card.minute+'분, '+(a.card.reason==='second-yellow'?'두 번째 경고에 따른 퇴장':'직접 퇴장')+'. 최종 결과는 '+a.record.score.join(' : ')+'. “제가 나가고 남은 애들한테는 뭐라고 해야 하죠?” 그는 화면보다 문밖을 오래 봤다. 한 장면의 책임을 인정하는 일과, 경기 전체를 한 사람의 잘못으로 만드는 일은 달랐다.',
   thought:'나도 화가 났다. 그렇다고 화난 만큼 전부 이 선수에게 밀어 넣으면 내 지시는 어디로 사라지지? 퇴장한 선택은 돌아봐야 한다. 사람까지 밀어내는 방식으론 안 된다.',question:'“잘못했다고 말하면, 그걸로 제가 할 수 있는 말은 끝인가요?”',
   options:['네가 본 장면과 동료에게 할 말을 먼저 듣자','퇴장한 선택은 돌아보되 모든 결과를 떠넘기진 말자','실제 카드 기록과 현재 출전 조건부터 확인하자'],replies:['“핑계를 대고 싶은 마음도 있어요. 그래도 남은 애들한테 먼저 말해야겠죠.”','“잘못은 제 거예요. 그래도 돌아올 때 뭘 준비할지는 알고 싶어요.”','“다음 명단부터 묻는 것 같아 말을 못 꺼냈어요. 지금 조건부터 같이 볼게요.”'],
   follow:'“돌아올 기회는 보장 못 해도, 준비할 기준은 직접 말해줄 거죠?”',followOptions:['두 리그 경기 뒤 실제 출전과 카드를 함께 보자','징계와 선발 경쟁을 나눠 이유를 직접 설명하자'],finalReplies:['유니폼을 챙기던 손이 멈췄다. “동료들한테는 제가 말할게요.” 감독은 다음 두 경기 뒤 확인할 자리를 수첩에 남겼다.','감독은 징계를 없애거나 선발을 약속하지 않았다. 그는 그 조건을 듣고도, 이번에는 화면을 끄고 문을 열었다.']};
 }
 function continuation(def,a,name,ep,previous,rows){
  const n=sum(rows,a.actor,'minutes'),gf=sum(rows,a.actor,'goals'),assists=sum(rows,a.actor,'assists'),red=rows.reduce((total,g)=>total+(g.cards||[]).filter(c=>c.team===0&&c.card==='red'&&g.players.find(p=>p.id===c.id)?.identity===a.actor).length,0),prior=previous.options[firstIds.indexOf(previous.first.choice)],last=previous.followOptions[lastIds.indexOf(previous.last.choice)],line=def.id==='link-v1'?n+'분 · '+gf+'골 · '+assists+'도움':n+'분 · 추가 퇴장 '+red+'회';
  const common={facts:[['면담 뒤 리그',scores(rows)],['같은 선수의 기록',line],['지난 대답',last]],scene:'“'+prior+'.” '+name+' 선수가 감독의 지난 말을 먼저 꺼냈다. 마지막에는 “'+last+'”라고 했다.\n\n그 뒤 확정된 리그 두 경기: '+scores(rows)+'. 같은 선수의 기록은 '+line+'. 감독은 숫자 옆에 그날의 대답을 펼쳤다. 해석부터 붙이기 전에, 그 말을 들은 사람의 이야기가 남아 있었다.\n\n'};
  if(def.id==='link-v1'){
   if(ep===2)return {...common,title:'숫자가 붙지 않은 날에도',scene:common.scene+(n===0?'“두 경기 다 밖에서 봤어요. 준비하면서도 그날 하신 말을 혼자 다르게 읽게 되더라고요.”':assists>0?'“또 도움은 했네요. 그런데 이번에는 골보다 먼저 동료가 돌아봐 줬어요.”':gf>0?'“이번에는 제 이름 옆에 골도 있네요. 이제야 패스 얘기를 해도 되는 건 아니죠?”':'“이번엔 골도 도움도 없어요. 그래서 먼저 찾아오기 좀 그랬어요.”')+' 감독은 고개를 끄덕이다 멈췄다. 이 기록만으로 좋은 선택과 나쁜 선택을 전부 가릴 수는 없었다.',thought:'원하는 숫자가 있으면 준비가 맞았다고 쉽게 말한다. 숫자가 없을 때도 같은 질문을 할 수 있어야 기준이지. 내 칭찬의 조건부터 들키고 있네.',question:'“숫자부터 보고 나면, 그날 본 공간 얘기는 늦어지지 않나요?”',options:['기록에 안 붙은 네 판단부터 듣자','득점표 하나로 역할의 가치를 바꾸진 말자','실제 출전과 골·도움을 구분해서 보자'],replies:['“제가 놓친 것도 말할게요. 좋았다는 말만 듣고 싶은 건 아니니까요.”','“그 말은 다른 동료도 같이 들으면 좋겠어요.”','“뛴 시간이 달랐는데 숫자만 같게 보일 때도 있더라고요.”'],follow:'“다음에 동료가 좋은 자리에 있으면, 제 선택으로 건네도 되겠죠?”',followOptions:['다음 두 리그 경기 뒤에도 판단과 기록을 함께 보자','전술은 직접 정하고 네가 본 장면도 듣자'],finalReplies:['그는 감독 수첩 옆에 자기가 본 위치를 손가락으로 짚었다. 다음 결과 대신 다음에 물을 질문 하나가 남았다.','화면 속 자석은 그대로였다. 실제 배치는 전술에서 따로 정하기로 하고, 대화는 기록에 남겼다.']};
   return {...common,title:'함께 불린 이름',scene:common.scene+'라커룸에서 동료가 손을 들었다. “그때 왜 그쪽으로 줬어?” '+name+' 선수가 잠깐 감독을 봤다가 자기 말로 답하기 시작했다. “네가 먼저 움직였잖아.” 둘은 같은 장면을 조금 다르게 기억하고 있었다. 감독은 수첩을 닫지 않고 옆으로 밀었다. 이번에는 다른 사람의 말이 들어갈 자리였다.',thought:'내가 발견했다고 떠들고 싶었지. 하지만 공을 건넨 건 이 선수고 움직인 건 동료다. 내가 할 일은 둘의 판단이 내 칭찬에만 매달리지 않게 듣는 거다.',question:'“동료랑 생각이 다르면, 그때도 서로 얘기하게 해줄 거죠?”',options:['각자 본 공간을 자기 말로 설명하자','누가 주인공인지부터 가르는 말은 줄이자','기록으로 아는 것과 장면으로 볼 것을 나누자'],replies:['“그럼 제가 틀린 것도 같이 말할 수 있겠네요.”','“골 넣은 애도, 패스한 저도 같은 경기 안에 있었죠.”','“좋아요. 숫자가 대신 대답하게 두지는 말죠.”'],follow:'“오늘은 제가 동료한테 먼저 물어볼게요. 왜 거기로 뛰었는지.”',followOptions:['서로 다르게 본 장면을 듣는 기준을 남기자','선발·득점을 약속하는 대신 판단의 이유를 말하자'],finalReplies:['수첩의 한 장면에 두 사람의 설명이 남았다. 누구의 골이 더 중요했는지 적는 대신, 서로를 본 순간을 적었다.','감독은 보장하는 말 없이 고개를 끄덕였다. 그는 동료 옆에 앉았다. 도움 숫자 바깥에서도 대화가 시작됐다.']};
  }
  if(ep===2)return {...common,title:'돌아오는 길의 기준',scene:common.scene+(n===0?'“아직 못 뛰었어요. 징계인지, 경쟁인지, 감독님 마음인지 혼자 짐작하게 되더라고요.”':red>0?'“또 퇴장 기록이 남았네요. 이번엔 무슨 말을 해도 가볍게 들릴 것 같아요.”':'“이번 두 경기에는 제 퇴장 기록이 없어요. 그렇다고 그날 일이 없어진 건 아니죠.”')+' 감독은 현재의 출전 조건을 다시 확인하자고 했다. 기록에 출전이 없다는 사실만으로 그 이유를 정할 수는 없었다.',thought:'조용해졌으니 반성했겠지, 뛰었으니 풀렸겠지. 내가 편하게 붙인 해석이다. 징계와 명단의 이유는 확인하고 직접 말해야지.',question:'“동료에게 미안한 마음이랑, 다시 뛰고 싶은 마음이 같이 있어도 되죠?”',options:['둘 다 숨기지 말고 네 말로 설명하자','사과를 선발 자리와 맞바꾸지는 말자','지금 출전 조건과 내가 고른 명단을 따로 보자'],replies:['“미안하다는 말 뒤에는 아무것도 바라면 안 되는 줄 알았어요.”','“그래요. 돌아오는 이유가 사과를 잘해서는 아니었으면 좋겠어요.”','“이유를 모른 채 기다리는 것보다는 듣고 준비할게요.”'],follow:'“다음에도 잘못을 말할 때, 사람들 앞에서 망신주는 걸로 끝내진 않을 거죠?”',followOptions:['다음 두 리그 경기 뒤 실제 출전·카드를 다시 보자','선택의 책임과 사람을 대하는 기준은 구분하자'],finalReplies:['감독은 두 경기 뒤 확인할 항목을 적었다. 카드가 없었다는 이유로 모든 문제가 해결됐다는 말은 하지 않았다.','그는 먼저 잘못을 설명하고, 감독은 명단을 고른 이유를 설명하기로 했다. 징계와 출전 상태는 실제 규칙 그대로 남았다.']};
  return {...common,title:'유니폼을 걸어 둔 자리',scene:common.scene+'훈련복을 챙기던 동료가 문 앞에서 멈췄다. '+name+' 선수가 먼저 옆자리를 비웠다. “잠깐 얘기해도 돼?” 감독은 대신 설명하려던 입을 다물었다. 그날 남은 선수들이 무엇을 겪었는지, 퇴장한 선수가 무엇을 준비했는지. 같은 유니폼 아래에도 다른 이야기가 있었다.',thought:'면담을 끝냈으니 갈등도 끝났다고 적고 싶다. 하지만 동료가 용서했는지는 내가 결정할 일이 아니지. 책임을 말할 자리를 남긴 것, 오늘은 거기까지다.',question:'“제 얘기만 하지 말고, 남아서 뛴 애들 말도 듣고 올게요.”',options:['대신 결론내지 말고 서로의 말을 듣자','실수한 사람도 설명할 수 있는 팀을 만들자','확정 기록과 아직 모르는 사정을 나누자'],replies:['“바로 괜찮다고 해달라는 말은 안 할게요.”','“저도 다음에 동료가 실수하면 그 기준을 기억할게요.”','“숫자만 보고 제가 모르는 마음까지 정하지는 않을게요.”'],follow:'“오늘 한 말은 제 이름 옆에 남겨 주세요. 다음 명단 약속 말고요.”',followOptions:['책임을 숨기지 않고 설명을 듣는 기준으로 남기자','출전은 직접 판단하고 이유를 당사자에게 말하자'],finalReplies:['유니폼은 원래 자리에 걸렸다. 용서도 선발도 기록에서 만들어내지 않았다. 서로 말할 자리가 남았다는 사실만 두 사람이 확인했다.','감독은 다음 명단 대신 오늘의 대답에 밑줄을 그었다. 그는 동료를 찾아 문을 열었다. 휘슬이 끝낸 것은 그 경기였고, 대화까지는 아니었다.']};
 }
 function events(s,year=s.year){
  const rows=serial().games(s,year),receipts=s.clubStory?.records||[],out=[];
  for(const def of definitions){const a=anchor(s,year,def,rows);if(!a)continue;const name=football().identityProfile(a.actor).name;let previous=null,content=opening(def,a,name);
   for(let ep=1;ep<=3;ep++){
    const id=year+':'+key(def.id,ep),answered=receipts.filter(r=>r.event===id);if(year===s.year&&!Object.values(s.squad||{}).some(p=>p.identity===a.actor)&&!answered.length)break;
    let round=a.round;if(ep>1){const after=rows.filter(g=>g.round>previous.last.atRound).slice(0,2);if(after.length!==2)break;round=after[1].round;content=continuation(def,a,name,ep,previous,after);}
    out.push({key:key(def.id,ep),round,relation:'captain',actor:a.actor,speaker:def.speaker,conflict:true,drama:'locker',artThread:def.id==='link-v1'?'link':'red',context:def.title+' · '+ep+'/3화',action:def.action,title:content.title,scene:content.scene,thought:content.thought,question:content.question,options:content.options,replies:content.replies,serial:{id:def.id,title:def.title,episode:ep,of:3,originRound:a.round,previous:ep>1?year+':'+key(def.id,ep-1):null,facts:content.facts||a.facts},turns:content.options.map(()=>[content.follow,content.followOptions,content.finalReplies])});
    const first=answered.find(r=>r.step===0),last=answered.find(r=>r.step===1);if(!first||!last)break;previous={...content,first,last};
   }
  }
  return out;
 }
 function read(s,year=s.year){
  const all=events(s,year),rows=serial().games(s,year),receipts=s.clubStory?.records||[],end=year!==s.year||!!(s.rebirth&&(root.Rebirth||(typeof require==='function'?require('./rebirth.js'):null))?.read(s)?.status!=='active'),complete=Math.max(year===s.year?s.round:0,rows.at(-1)?.round||0)>=(root.Season?.roundCountForYear?.(s,year)||46);
  return definitions.flatMap(def=>{const stages=all.filter(e=>e.serial.id===def.id);if(!stages.length)return [];const e=stages.at(-1),done=receipts.find(r=>r.event===year+':'+e.key&&r.step===1),finished=e.serial.episode===3&&!!done,remaining=done?Math.max(0,2-rows.filter(g=>g.round>done.atRound).slice(0,2).length):null,departed=year===s.year&&!Object.values(s.squad||{}).some(p=>p.identity===e.actor);
   return [{id:def.id,title:def.title,drama:'locker',artThread:def.id==='link-v1'?'link':'red',year,actor:e.actor,finished,departed,waiting:!finished&&!!done,remaining,readOnly:end,status:finished?'함께 남긴 세 장면':end?'지난 기록 · 읽기 전용':departed?'선수단을 떠난 인물의 기록':done?(complete?'이 시즌에 남은 이야기':'다음 리그 '+remaining+'경기 결과를 기다리는 중'):receipts.some(r=>r.event===year+':'+e.key)?'대화 이어가기':'새 장면 도착',facts:e.serial.facts,stages:stages.map(e=>({event:year+':'+e.key,episode:e.serial.episode,title:e.title,round:e.round,step:receipts.filter(r=>r.event===year+':'+e.key).length}))}];
  });
 }
 const api={events,read};root.StoryThreads=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
