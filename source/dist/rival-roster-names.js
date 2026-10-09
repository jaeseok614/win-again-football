(function(root){
 'use strict';
 // Original parody names inspired by public squad lists, not a live squad feed.
 // Numeric profiles, stable opposition identities and match RNG remain unchanged.
 const byClub={
  Woking:{GK:['윌리엄 야스켈라이넨느','크레이그 로스턴'],DEF:['케일럽 리처즈온','친위케 오콜링','티미 오두시나르','아론 드루잉','타리크 힌즈튼','올라툰지 아키놀라'],MID:['해리 뷰티맨슨','로이 실라르','제이미 앤드루쑤','팀 아키놀랑','잭 터너슨','제이크 포스터캐스키'],FW:['조시 켈리온','에이든 오브라이언느','매튜 워드슨','샘 애시포드','올리버 샌더쏜'],star:['FW','조시 켈리온']},
  Wrexham:{GK:['아서 오콩쿠','대니 워드슨'],DEF:['칼럼 도일링','맥스 클리워스튼','도미닉 하이엄슨','댄 스캐르','루이스 브런튼','잭 바이너스'],MID:['조지 돕쏜','조지 토마쏜','올리버 래스본느','루이스 오브라이언느','벤 시프턴','엘리엇 리온'],FW:['키퍼 무어슨','폴 멀리닝','샘 스미스톤','라이언 하디르'],star:['FW','키퍼 무어슨']},
  'Salford City':{GK:['매튜 영턴','마크 하워드슨'],DEF:['마이클 로즈튼','루크 가버트슨','톰 에드워즈온','브랜던 쿠퍼링','로이크 아이나르','알피 도링턴느'],MID:['호르헤 그랜트슨','맷 버처링','벤 우드번느','오사마 애슐리온','조시 오스터필드','칼럼 시세잉'],FW:['콜 스톡턴느','켈리 은마잉','다니엘 우도흐','라이언 그레이던느','프린스윌 에비하티온'],star:['FW','콜 스톡턴느']},
  'Stockport County':{GK:['벤 힌치클리프턴','코리 아다잉'],DEF:['조시 데이크러스콜리','조지프 올로우','아르투 호스코넨느','이선 파이온','프레이저 호스폴튼','카일 노일링'],MID:['루이스 베이트슨','올리버 노우드슨','칼럼 캠프스온','루이스 피오리니아','라이언 라이델링','잭 다이아먼드'],FW:['카일 우튼느','해리 우드슨','오딘 베일리온','베노니 안드레쏜'],star:['FW','카일 우튼느']},
  Arsenal:{GK:['다비드 라야옹','케파 아리사발라가르'],DEF:['벤 화이트닝','윌리엄 살리바르','가브리엘 마갈랑','리카르도 칼라피오링','유리엔 팀버슨','피에로 인카피에르'],MID:['데클런 라이스볼','마르틴 외데고르드','미켈 메리노르','마르틴 수비멘디아','에베레치 에제잉','맥스 다우먼느'],FW:['부카요 사캉','빅토르 요케레쑤','카이 하베르츠온','노니 마두에케잉'],star:['FW','부카요 사캉']},
  'Manchester City':{GK:['잔루이지 돈나룸보','마르쿠스 베티넬리오'],DEF:['루벤 디아즈온','마르크 게히온','요슈코 그바르디올라','리코 루이쑤','압두코디르 후사노브','라얀 아이트누리르'],MID:['필 포드닝','마테오 코바치치온','라얀 셰르키온','엔소 페르난데쑤','엘리엇 앤더쏜','아이유브 부아디아'],FW:['엘릭 홀란트','앙투안 세메뇨르','일리만 은디아예잉','오스카 보브슨'],star:['FW','엘릭 홀란트']},
  Liverpool:{GK:['알리쏭 베커리','기오르기 마마르다쉴리'],DEF:['버질 판다이크닝','조 고메즈온','코너 브래들링','밀로시 케르케즈온','제레미 프림퐁느','로날드 아라우호스'],MID:['도미니크 소보슬라잉','알렉시스 맥앨리스톤','라이언 흐라벤베르흐','트레이 뇨니아','플로리안 비르츠렌','엔도 와타룽'],FW:['코디 각포르','알렉 이사콕','위고 에키티케잉','페데리코 키에사르','브래들리 바르콜랑'],star:['FW','알렉 이사콕']}
 };
 const lower={GK:['윌리엄 야스켈라이넨느','아서 오콩쿠','매튜 영턴','벤 힌치클리프턴','크레이그 로스턴','코리 아다잉','칼럼 버턴느','대니 워드슨'],DEF:['친위케 오콜링','티미 오두시나르','아론 드루잉','칼럼 도일링','맥스 클리워스튼','마이클 로즈튼','루크 가버트슨','브랜던 쿠퍼링','조지프 올로우','이선 파이온','도미닉 하이엄슨','타리크 힌즈튼'],MID:['해리 뷰티맨슨','제이미 앤드루쑤','로이 실라르','조지 돕쏜','조지 토마쏜','호르헤 그랜트슨','맷 버처링','벤 우드번느','루이스 베이트슨','올리버 노우드슨','칼럼 캠프스온','올리버 래스본느','팀 아키놀랑','잭 터너슨'],FW:['조시 켈리온','에이든 오브라이언느','매튜 워드슨','키퍼 무어슨','폴 멀리닝','샘 스미스톤','콜 스톡턴느','켈리 은마잉','다니엘 우도흐','라이언 그레이던느','카일 우튼느','해리 우드슨','올리버 샌더쏜','라이언 하디르']};
 for(const catalog of [...Object.values(byClub),lower]){for(const values of Object.values(catalog))Object.freeze(values);Object.freeze(catalog);}Object.freeze(byClub);
 function read(club){const reference=root.Season?.clubReferences?.[club?.id];if(!reference||club.id===root.Season.own)return null;const specific=byClub[reference.reference];return specific?{pools:specific,star:specific.star,kind:'club',reference:reference.reference}:reference.division>=2?{pools:lower,star:null,kind:'lower',reference:reference.reference}:null;}
 const api={read,byClub,lower};root.RivalRosterNames=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
