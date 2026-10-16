(function(root){
 'use strict';
 // Original presentation only. Choice IDs, promises, records and effects stay in ClubStory/ClubLife.
 const beats={
  arrival:{scene:'계약서 옆에 원정 버스 견적서가 놓여 있었다. 구단주는 새 펜 대신 잉크가 간당간당한 볼펜을 내밀었다. 창밖에선 관리인이 골망을 꿰매고, 복도에선 누군가 세탁기 문을 발로 차고 있었다.\n\n한때 1부를 보던 구단. 지금은 5부다. 전술판만 잘 만지면 끝날 줄 알았는데, 당장 다음 원정에 누굴 데려갈지도 내 몫이었다. 구단주는 내가 장부를 덮을 때까지 기다렸다.',thought:'5부라니. 시작 위치 한번 살벌하네. 그래도 이번엔 남의 감독을 욕하는 쪽이 아니다. 내가 답을 만들어야 한다.',question:'돌아온다던 감독은 많았어. 자네는 여기서 뭘 먼저 바꿀 건가?',options:['선수들 얘기부터 듣죠','네 번 승격해서 돌아가죠','장부와 선수단부터 같이 보죠'],replies:['좋아. 다만 듣기 싫은 얘기부터 나올 거야. 도망가진 말게.','네 번이라… 시원한 말이군. 그래서 더 쉽게 믿을 수가 없어.','그 말은 마음에 드네. 내일도 문을 여는 구단이어야 하니까.']},
  shape:{scene:'수석 코치가 공격수 자석을 앞으로 밀었다. 나는 그 뒤에 남은 빈칸을 가리켰다. 공격수 한 명이 더 뛰면 화면은 멋있다. 하지만 공을 잃는 순간, 그 빈칸을 메우는 건 지친 미드필더다.\n\n코치는 웃지도 않고 수비수 자석을 집었다. 어제 훈련에서 누가 먼저 발을 멈췄는지, 그도 봤을 것이다. 화이트보드에는 화려한 화살표 대신 세 개의 짧은 길이 남았다.',thought:'게임에선 클릭 한 번이었지. 여기선 사람이 뛴다. 멋있는 전술보다, 끝까지 실행할 전술부터 고르자.',question:'공 가진 애만 보면 늦어요. 공을 잃었을 때 뒤를 누가 막죠?',options:['패스 받을 길부터 만들자','앞에서 뺏고 짧게 끝내자','상대를 끌어내고 뒤를 노리자'],replies:['그럼 두 번째 길도 있어야죠. 첫 패스가 막히면 끝나는 팀은 곤란해요.','좋죠. 첫 압박이 벗겨지면 누가 뛰어 내려올지도 정합시다.','역습은 달리기 대회가 아니에요. 뺏은 공을 지킬 사람부터 필요해요.']},
  captain:{scene:'라커룸 불은 반쯤 꺼져 있었다. 주장은 개어 놓은 훈련복을 다시 펼쳤다. 오늘 이름이 불리지 않은 동료의 옷이었다. 나는 문고리에서 손을 떼고 옆에 앉았다.\n\n이겼다고 모든 얼굴이 밝은 건 아니었다. 주장은 늘 동료들 앞에 서지만, 오늘은 대신 말해도 되는 것과 직접 들어야 하는 것을 가려 놓고 온 표정이었다.',thought:'보고서에는 이 표정이 안 찍힌다. 잘했다는 한마디로 덮으면, 다음엔 아무도 입을 안 열겠지.',question:'감독님, 조용한 애들 있죠. 괜찮아서 조용한 건 아닐 수도 있어요.',options:['한 명씩 직접 들어볼게','더 높은 곳까지 같이 가자','다음 경기에서 바꿀 하나를 찾자'],replies:['제가 대신 전할 건 전할게요. 하지만 감독님이 직접 들어야 할 얘기도 있어요.','저도 올라가고 싶죠. 그런데 누군가는 자기 자리부터 걱정할 거예요.','한 가지라면 따라올 수 있어요. 실수한 사람 하나를 고르는 건 아니죠?']},
  rookie:{scene:'어린 선수가 구겨진 노트를 내밀었다. 화살표 옆에는 훈련 중 놓친 공의 위치가 빼곡했다. 녀석은 자기가 잘한 장면보다 실수한 장면을 먼저 펼쳤다.\n\n나는 노트를 돌려주지 않았다. 벤치에 앉아 있는 동안에도 누군가는 이렇게 경기를 준비한다. 기회를 달라는 말은 쉬워도, 기다린 시간을 보여주는 건 쉽지 않다.',thought:'능력치 한 줄로 사람을 끝내면 편하겠지. 하지만 내가 주는 건 점수가 아니라, 뛰어 볼 기회다.',question:'감독님, 저도 뛰고 싶어요. 어디부터 고치면 되는지 딱 짚어 주세요.',options:['네가 자신 있는 역할부터 듣자','기회가 오면 팀을 바꿀 수 있겠어?','체력과 지금 할 수 있는 것부터 보자'],replies:['제가 잘하는 것도 봐주시는 거죠? 약한 부분만 적혀 있을까 봐 무서웠어요.','자신은 있어요. 솔직히 떨리기도 하고요. 그래도 피하진 않을게요.','숫자도 볼게요. 대신 다음 훈련에선 제 움직임도 직접 봐주세요.']},
  medical:{scene:'의무실 앞에서 코치가 커피 두 잔을 내밀었다. 보고서에는 숫자가 줄지어 있었지만, 문 안에서 들리는 한숨은 숫자로 옮겨지지 않았다.\n\n주전은 괜찮다고 하고 후보는 준비됐다고 했다. 둘 다 믿고 싶다. 둘 다 그대로 믿으면 안 되는 자리이기도 했다.',thought:'이기겠다고 다 갈아 넣으면 다음 경기는 누가 뛰지? 감독의 고집을 선수의 근성이라고 포장하진 말자.',question:'안 힘들다는 애부터 봐요. 계속 버티는 게 꼭 좋은 징조는 아니니까.',replies:['말해도 자리를 잃지 않는다는 확신부터 줘야죠.','믿음은 좋지만 다리는 믿음으로 회복되지 않아요.','좋아요. 후보도 이름만 돌리는 게 아니라 역할부터 맞춰봅시다.']},
  window:{scene:'스카우트 명단은 세 장, 주급 명세서는 그보다 두꺼웠다. 구단주는 영입 후보 사진 위에 계산기를 올려놓았다. 계약 버튼 하나로 끝나지 않는다는 뜻이었다.\n\n내가 찾는 선수는 비어 있는 자리 하나를 채워야 한다. 동시에 누군가의 자리도 바뀐다. 새 얼굴을 반기는 라커룸을 만들지 못하면, 좋은 영입도 첫날부터 빚이 된다.',thought:'싸게 사서 터뜨리면 멋있겠지. 그런데 오늘의 영입가만 보면 다음 달의 내가 욕한다.',question:'좋은 선수인 건 알겠어. 데려온 다음 달에도 우리 장부가 버티나?',options:['현재 선수들 요구부터 듣죠','빈자리를 바로 채울 선수를 찾죠','이적료와 주급을 같이 계산하죠'],replies:['기존 선수부터 보겠다는 건 좋아. 다만 빈자리는 저절로 안 메워져.','즉시 전력이라… 급하다는 이유로 비싼 실수를 하진 말게.','계산기까지 드는 감독이군. 계약 뒤의 구단도 생각한다는 거지?']},
  'three-losses':{thought:'연패 숫자는 세 글자면 끝난다. 그 숫자 안에 들어간 얼굴들은 그렇게 안 끝난다. 누굴 탓하기 전에 내가 놓친 것부터 보자.'},
  'bounce-back':{thought:'한 번 이겼다고 실패가 지워지진 않는다. 그래도 오늘만큼은 고개를 들자. 다음 훈련에 들고 갈 근거가 생겼다.'},
  fans:{thought:'남한텐 순위표 한 줄이겠지. 이 사람들에겐 일주일을 기다린 토요일이다. 지는 날에도 얼굴을 들고 나가야 한다.'},
  tier:{thought:'구장이 커져도 책임은 안 줄어든다. 이제 더 센 상대가 내 약점을 물고 늘어질 차례다.'},
  'promotion-race':{thought:'표 하나만 보면 승격은 가깝다. 그 표를 지키려면 다음 상대부터 이겨야 한다. 미래의 환호보다 오늘의 다리를 보자.'},
  'final-push':{thought:'여기까지 왔는데, 라는 말이 제일 위험하다. 그 마음으로 무리하면 여기까지 온 이유를 내가 망친다.'},
  farewell:{thought:'좋은 선택만 골라 기억하면 또 같은 데서 넘어진다. 이번 시즌은 멋진 사진보다, 틀렸던 결정을 남겨두자.'}
 };
 const thoughts={board:'좋은 말만 하면 문은 쉽게 열린다. 그 다음 장부와 결과표까지 책임지는 건 내 몫이다.',coach:'이 사람은 내 전술이 예쁜지보다 선수들이 실행할 수 있는지를 본다. 듣기 싫어도 끝까지 듣자.',captain:'주장의 말 뒤에는 라커룸 전체가 서 있다. 한 사람의 표정으로 팀 전체를 단정하지 말자.',rookie:'기다리는 입장은 길다. 내가 쉽게 던진 약속은 저 아이에겐 매일 세는 날짜가 된다.',fans:'이 팀을 사랑한 시간은 내가 제일 짧다. 아는 척하기 전에 어떤 주말을 보냈는지부터 듣자.'};
 function story(s,d){
  if(!d)return d;const b=beats[d.key]||{},index=['listen','bold','practical'].indexOf(d.answered[0]?.choice),out={...d,choices:d.choices.map(c=>({...c}))};
  out.scene=b.scene||d.scene;out.options=b.options||d.options;out.thought=b.thought||d.thought||thoughts[d.relation]||'전생의 기억이 다음 골을 넣어주진 않는다. 여기선 내가 직접 판단하고 책임져야 한다.';
  if(d.step===0){out.question=b.question||d.question;if(b.options)out.choices=out.choices.map((c,i)=>({...c,label:b.options[i]}));}
  if(index>=0&&b.replies)out.reaction=b.replies[index];
  if(d.question==='감독님, 오늘의 답을 다음 행동에서도 이어갈 수 있을까요?')out.question=d.relation==='board'?'좋아. 다음 선택에서도 그 말을 지킬 건가?':'말은 들었어요. 다음 행동에서도 같은 기준을 지킬 수 있죠?';
  if(d.reply==='“그 말을 기억하겠습니다. 다음 행동을 기다릴게요.”')out.reply=d.relation==='board'?'좋아. 그 말은 기억하겠네. 이제 행동을 보자.':d.relation==='coach'?'오케이. 다음 훈련에선 그 기준부터 확인하죠.':'알겠어요. 다음에 제 이름을 부를 때도 그 말을 기억해 주세요.';
  if(d.reply==='“조건까지 솔직하게 말해 주셔서 감사합니다. 함께 확인하죠.”')out.reply=d.relation==='board'?'좋아. 빈 약속보단 그게 낫네. 조건부터 같이 보자.':'그럼 기준을 같이 봐요. 좋은 말만 듣겠다는 뜻은 아니니까.';
  if(d.step===1&&!d.serial)out.thought=d.key==='rookie'?'출전 약속은 분위기를 좋게 만드는 문장이 아니다. 다음 두 리그 경기의 실제 시간을 내줘야 한다.':index===1?'세게 말하는 건 쉽다. 이제 그 말 뒤에 선수들을 혼자 세워두면 안 된다.':index===0?'들었다고 끝이 아니다. 다음 행동이 없으면 오늘 대화도 그냥 좋은 말로 남는다.':'계획은 그럴듯하다. 실제 명단과 일정에 들어갈 때도 같은 기준을 지킬 수 있을까.';
  if(d.step===2&&!d.serial)out.thought=d.mission?'약속은 남았다. 기록으로 지킬 수 있는지 확인하자. 내 기억보다 선수의 실제 출전 시간이 더 정확하다.':'말은 기록됐고, 경기는 아직 남아 있다. 오늘의 대답을 다음 선택으로 보여주자.';
  return out;
 }
 function split(text,limit){
  const out=[];let part='';for(const paragraph of String(text).split(/\n\n+/).filter(Boolean)){let first=true;for(const line of paragraph.split(/(?<=[.!?。])\s+|\n+/).filter(Boolean)){const separator=part?(first?'\n\n':' '):'';if(part&&part.length+line.length+separator.length>limit){out.push(part);part='';}part+=(part?separator:'')+line;first=false;}}if(part)out.push(part);return out.length?out:[''];
 }
 function pages(d,{limit=700}={}){
  const block=(speaker,text)=>({speaker,text}),page=blocks=>({speaker:blocks[0].speaker,text:blocks.map(b=>b.text).join('\n\n'),blocks});
  if(d.step===0){const scene=split(d.scene,Math.max(180,limit-d.thought.length-d.question.length-30));return scene.map((text,i)=>page([block('장면',text),...(i===scene.length-1?[block('속마음',d.thought),block(d.questionSpeaker||d.name,d.question)]:[])]));}
  if(d.step===1)return [page([block(d.name,d.reaction),block('속마음',d.thought),block(d.name,d.question)])];
  const first=d.answered[0],original=d.options?.[['listen','bold','practical'].indexOf(first?.choice)];
  if(d.serial){
   const budget=Math.max(150,Math.floor(limit*.6));
   function fragments(text){return split(text,budget-24).flatMap(part=>{if(part.length<=budget-24)return [part];const parts=[];let line='';for(const word of part.split(/\s+/)){if(line&&line.length+word.length+1>budget-24){parts.push(line);line='';}line+=(line?' ':'')+word;}if(line)parts.push(line);return parts;});}
   function group(blocks,kind){const out=[];let current=[],used=0;const flush=()=>{if(current.length)out.push({...page(current),kind:current.some(b=>b.finalReply)?'complete-reply':kind});current=[];used=0;};for(const b of blocks)for(const text of fragments(b.text)){const cost=text.length+b.speaker.length+10;if(current.length&&used+cost>budget)flush();current.push({...b,text});used+=cost;}flush();return out;}
   return [...group([block('장면',d.scene)],'complete-scene'),...group([block('감독',original||'첫 대답'),block(d.name,d.reaction),block(d.name,d.question)],'complete-first-answer'),...group([block('감독',d.finalLabel),{...block(d.name,d.reply),finalReply:true}],'complete-last-answer'),...group([block('속마음',d.thought),...(d.impact?[block('경기력 반영',d.impact)]:[])],'complete-outcome')];
  }
  return [page([block('장면',d.scene),block('속마음',d.thought)]),page([block('감독',original||'첫 대답'),block(d.name,d.reaction),block(d.name,d.question)]),page([block('감독',d.finalLabel),block(d.name,d.reply),block('속마음',d.thought),...(d.impact?[block('경기력 반영',d.impact)]:[])])];
 }
 function press(s,q){
  if(!q)return null;const S=root.Season||(typeof require==='function'?require('./season.js'):null),before=q.phase==='before',win=q.winner===S.own,draw=q.score?.[0]===q.score?.[1],division=s.league.division;
  const question=before?q.opponent+'전입니다. '+(division===5?'이름값은 위 리그인데 무대는 5부죠. ':'')+'기대가 부담입니까, 아니면 결과로 답할 겁니까?':q.penalties?'승부차기 '+(win?'끝에 올라섰습니다. 긴 승부를 버틴 선수들에게 뭐라고 했습니까?':'끝에 멈췄습니다. 아쉬운 장면 하나에 책임을 몰아줄 생각은 없습니까?'):win?q.score.join(' : ')+' 승리입니다. 선수들이 잘한 겁니까, 감독의 준비가 맞아떨어진 겁니까?':draw?q.score.join(' : ')+'로 끝났습니다. 얻은 승점이라고 봅니까, 놓친 경기라고 봅니까?':q.score.join(' : ')+' 패배입니다. 전술도 교체도 감독의 선택이었죠. 팬들에게 뭐라고 하실 겁니까?';
  const answers=before?['상대를 얕보진 않아. 오늘 준비한 것부터 제대로 해보자.','이길 생각으로 나간다. 말한 만큼 내가 먼저 준비할게.','부담은 내가 받는다. 선수들은 자기 역할에 집중하면 돼.']:['한 경기로 전부를 설명하진 않을게. 잘한 건 살리고 놓친 건 고치자.','선수들이 버텨줬다. 이 결과의 책임도 다음 준비도 내 몫이다.','선수 한 명에게 결과를 씌우지 마. 명단과 지시는 내가 정했다.'];
  const choice=['modest','confident','protect'].indexOf(q.choice),reaction=choice===0?'큰 약속보다 다음 준비를 보겠다는 답이군요. 다음 경기에서 확인하겠습니다.':choice===1?'분명히 말씀하셨습니다. 결과가 달라져도 그 책임을 피하지 않으실 거죠?':'선수들을 보호하겠다는 말, 오늘 기사에도 남기겠습니다. 다음 선택도 지켜보죠.';
  return {...q,context:(root.PressContext||(typeof require==='function'?require('./press-context.js'):null))?.read(s,q)||null,reporter:before?'정유라 기자':'강태욱 기자',outlet:before?'풋볼 인사이드':'터치라인 스포츠',question,thought:before?'첫 질문부터 날이 서 있네. 큰소리는 기사 한 줄이면 끝나지만, 그 부담은 선수들이 뛴다.':win?'기분 좋다고 뭐든 약속하진 말자. 다음 상대는 오늘의 환호를 기다려주지 않는다.':'마이크 앞에서 핑계를 찾으면 라커룸에서 아무도 내 말을 안 믿는다.',answers,spoken:choice>=0?answers[choice]:null,reaction:q.answered?reaction:null};
 }
 const api={story,pages,press};root.ManagerVoice=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
