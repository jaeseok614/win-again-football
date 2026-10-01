(function(root,factory){
 'use strict';const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.Football);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.PlayerCharacter=api;
})(typeof globalThis==='object'?globalThis:this,function(F){
 'use strict';
 const lines={
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
