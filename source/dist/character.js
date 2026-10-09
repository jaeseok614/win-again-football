(function(root,factory){
 'use strict';const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.Football);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PlayerCharacter=api;
})(typeof globalThis==='object'?globalThis:this,function(F){
 'use strict';
 const lines={
 sp_g1:'골대 안만 보지 않겠습니다. 수비 뒤도 제 책임이죠.',sp_g2:'힘든 경기도 끝이 납니다. 마지막 선방까지 준비할게요.',sp_d1:'상대에게 공간을 내줄 생각은 없어요. 공부터 만나겠습니다.',sp_d2:'수비 뒤로 뛰는 거 봤습니다. 제가 따라갈게요.',sp_d3:'오른쪽에서 공을 올립니다. 동료가 달려가는 곳으로요.',sp_d4:'올라갈 때도, 돌아올 때도 왼쪽은 제 길입니다.',sp_d5:'높이 뜨면 제 공입니다. 박스 안에서 먼저 맞서겠습니다.',sp_d6:'동료 옆에 빈틈이 없도록 한 걸음 더 움직일게요.',sp_m1:'공을 되찾으면 먼저 동료부터 찾겠습니다.',sp_m2:'뛰어 주세요. 수비 사이 길은 제가 찾아볼게요.',sp_m3:'측면에서 시작해도 끝은 골문 앞입니다. 왼발로 연결할게요.',sp_m4:'한 번 더 안정적으로요. 공이 끊기지 않게 잇겠습니다.',sp_m5:'아직 뛰어갈 힘이 있어요. 중원에서 한 발 더 보태겠습니다.',sp_m6:'이 구단에서 배우고 싶어요. 제 첫 90분이 기다려집니다.',sp_f1:'함께 돌아갑시다. 양발로 한 골씩 책임질게요.',sp_f2:'제 골만 기다리진 않겠습니다. 동료가 뛸 공간도 만들게요.',sp_f3:'뒤 공간 보였어요. 다음 패스에는 제가 먼저 출발할게요.',sp_f4:'골문 앞 경합은 피하지 않겠습니다. 공을 보내 주세요.',
 r_g1:'장갑은 오래됐어도 골문 앞 약속은 새것입니다.',r_g2:'왼발로 첫 페이지를 열게요. 패스 받을 준비 됐죠?',
 r_d1:'왼쪽에서 보낸 공입니다. 박스 앞에서 받아 주세요.',r_d2:'오른쪽 한 바퀴 더 돌고 올게요. 아직 숨 안 찹니다.',r_d3:'공이 높이 뜨면 제 이름부터 불러주세요.',r_d4:'뒤로 흘린 공은 제가 따라갑니다. 먼저 달려 있을게요.',r_d5:'길이 막히면 뒤로 주세요. 다시 앞으로 보낼게요.',r_d6:'왼발 수비수 한 자리, 제가 배우면서 채우겠습니다.',r_d7:'빨리 뛰는 것보다 먼저 서 있는 법도 있습니다.',r_d8:'오른쪽 빈칸 확인했습니다. 공이랑 같이 올라갈게요.',
 r_m1:'동료가 공격할 동안 수비 앞 문은 제가 잠글게요.',r_m2:'제 왼발은 동료가 뛰는 방향부터 찾습니다.',r_m3:'공격 박스 찍고 우리 박스까지. 다음 왕복도 제 차례죠?',r_m4:'잠깐 고개를 들어요. 공이 갈 길이 보입니다.',r_m5:'첫 출전이 기다려져요. 오늘 배운 패스부터 보여줄게요.',r_m6:'왼쪽에서 시작해 안쪽으로요. 빈틈을 같이 찾죠.',r_m7:'어느 발로 받을까요? 편한 쪽으로 보내 주세요.',r_m8:'화려한 패스 하나보다 끊기지 않는 연결을 맡겠습니다.',
 r_f1:'박스 안에서 받을 준비도, 동료에게 돌려줄 준비도 됐어요.',r_f2:'오른쪽에서 왼발을 꺼냅니다. 따라올 준비 됐나요?',r_f3:'크로스가 높아도 괜찮아요. 제가 먼저 만나러 갑니다.',r_f4:'수비가 돌아보기 전에 출발할게요. 공간에 보내주세요.',r_f5:'상대가 편하게 공을 잡게 두지 않겠습니다.',r_f6:'두 발 다 골문을 기억합니다. 박스 안으로 보내주세요.',
 g1:'골대가 작아진 게 아니라, 제가 좀 든든한 겁니다.',
 g2:'골문 지키다가 잠깐 산책했습니다. 공은 챙겼어요.',
 d1:'이쪽은 관계자 외 출입 금지입니다. 공도 예외 없어요.',
 d2:'공이랑 약속했어요. 오늘은 제가 먼저 도착하기로.',
 d3:'깔끔한 수비의 비결? 잔디 묻기 전에 공을 빼앗는 거죠.',
 d4:'상대 공격수요? 방금 길을 잃었다고 하던데요.',
 d5:'박스 앞까지 무료 배송. 골 넣는 건 수령인 몫입니다.',
 d6:'왼쪽 끝에서 오른쪽 끝? 왕복 적립금 있나요?',
 m1:'공은 제가 돌릴게요. 감독님은 박자만 맞춰주세요.',
 m2:'방금 빈틈 봤어요. 수비수는 아직 못 본 것 같고요.',
 m3:'공격 호출, 수비 호출. 제 휴대폰만 계속 울리네요.',
 m4:'찬스 하나 주문하셨죠? 따끈하게 만들어 드릴게요.',
 m5:'한 바퀴 더요? 두 번째 심장은 아직 멀쩡합니다.',
 m6:'제 왼발 사용 설명서는 공도 아직 못 읽었습니다.',
 f1:'골문 앞은 예약석입니다. 제 이름으로 잡아주세요.',
 f2:'골 넣고 찰칵! 이번 시즌 표지는 제가 맡을게요.',
 f3:'패스 보내셨나요? 저는 이미 도착했는데요.',
 f4:'측면에서 접어 들어갑니다. 수비도 살짝 접어 드릴게요.',
 t_g1:'장갑은 낡아도 선방 영수증은 계속 쌓입니다.',
 t_g2:'손도 크고 꿈도 큽니다. 공만 좀 작게 보이네요.',
 t_d1:'골문 앞 기준선? 오늘도 제가 서 있습니다.',
 t_d2:'벽돌은 아직 쌓는 중입니다. 곧 철벽 영업합니다.',
 t_m1:'수비수 셋 사이에 공 하나. 충분히 지나갑니다.',
 t_m2:'발이 꼬인 건 제가 아니라 수비수입니다.',
 t_f1:'공을 잃어버렸다고요? 제 발밑부터 확인해 보세요.',
 t_f2:'골망이 배고프대요. 공 한 개 더 주세요.'
 };
 const roleLines={GK:'오늘도 장갑부터 출근했습니다. 골문은 제가 맡아요.',DEF:'상대가 빈틈을 찾는 동안 저는 빈틈을 닫습니다.',MID:'골까지 가는 길, 제가 공으로 그려볼게요.',FW:'골망에 인사하러 갑니다. 공으로요.'};
 const keys={GK:'keeping',DEF:'defense',MID:'passing',FW:'attack'},labels={keeping:'선방',defense:'수비',passing:'패스',attack:'결정력',speed:'속도',endurance:'지구력'};
 function info(player){
  const p=typeof player==='string'?F.identityProfile(player):player;if(!p)return null;
  const identity=p.identity||p.id,personality=F.personality(identity),key=keys[p.pos],skills=[key,'speed','endurance'].filter(Boolean).sort((a,b)=>(p[b]||0)-(p[a]||0)),strongest=skills[0];
  const energy=Number.isFinite(p.energy)?Math.max(0,Math.min(100,p.energy)):100,injured=!!(p.injury?.remaining||p.injuryRemaining);
  return {identity,name:p.name,nickname:personality.nickname,tagline:personality.tagline,quote:lines[identity]||roleLines[p.pos]||'기회가 오면 제 축구를 보여드릴게요.',trait:(labels[strongest]||'성장')+' '+(p[strongest]||0)+' · 나의 강점',condition:injured?'지금은 회복에 집중':energy<60?'오늘은 휴식이 필요해요':energy<80?'체력 아껴서 한 발 더':'몸도 마음도 팔팔해요',energy,injured};
 }
 function dialogue(player,turn=0){const p=typeof player==='string'?F.identityProfile(player):player,profile=info(p);if(!profile)return '';const capped=p[keys[p.pos]]>=p.potential;const stateLine=profile.injured?'지금은 쉬는 것도 훈련입니다. 건강하게 돌아올게요.':profile.energy<70?'감독님, 오늘은 회복 메뉴도 한번 봐주세요.':capped?'기술은 꽉 채웠어요. 다음엔 속도나 지구력도 챙겨볼까요?':'성장 한계까지 아직 남았어요. 이번 주 훈련, 저도 줄 서겠습니다.';return [profile.quote,stateLine,roleLines[p.pos]||profile.tagline][Math.abs(Math.trunc(turn)||0)%3];}
 return {info,dialogue};
});
