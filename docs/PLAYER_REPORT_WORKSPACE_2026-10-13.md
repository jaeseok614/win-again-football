# 가로 선수 보고서와 적은 정보의 통합 원칙

선수 상세는 신상/주발/선호 포지션을 왼쪽에 고정하고 현재 기본6능력과 기술·판단·신체의 모든 1–20 코치 평가를 오른쪽에 동시에 표시합니다. 골키퍼는 기술/골키퍼 그룹을 같은 열에 배치합니다. 선수 이름·얼굴·주급·나이·키·국적·성장 한계·종합·체력·컨디션을 첫 화면에서 확인합니다. 역할 강조 및 보고서 전환은 상단, 이전/다음은 하단44px입니다. 소량 정보인 주발/컨디션과 위치별 개별 페이지는 통합했고 전체 위치는 한 화면에 모았습니다.

상대 선수는 상태/체력/강점/역할과 우리 선수와의6능력 비교를 첫 화면에 함께 표시합니다. 설명 기준만 별도 항목으로 유지하며 실제 비교 선택 핸들러를 이동해 재사용합니다. 정보가 적으면 추가 보기 버튼이나 페이지로 쪼개지 않고 해당 화면에 기본 표시한다는 영구 요구를 적용합니다. 긴 기록/훈련/계약 결정은 기존 기능을 보존합니다.

## 데이터와 출처

종합은 선수단과 동일한 PlayerTraits 선호 위치의 가중 평균입니다. 기본 능력은 현재 훈련 수치, 나이와 주급은 현재 저장에서 읽습니다. 주발/포지션/1–20 평가는 기존 게임 설정이며 실제 선수의 최신 능력이나 임금으로 덮어쓰지 않습니다. 키는 아래 참조 선수의 공개 신체 정보로 만든 표시용 메타데이터로서 헤딩/충돌/저장/엔진 보너스를 추가하지 않습니다. 후보/유소년의 확인되지 않은 키는 미확인으로 표시합니다. 선수 식별자 기준이어서 이적/슬롯 교환 뒤에도 잘못된 옛 선수 정보를 붙이지 않습니다.

- FIFA2022 공식 명단: Romero185 / Bentancur187 / Sarr185 / Davies181 / Johnson179 / Richarlison184. https://fdp.fifa.org/assetspublic/ce44/pdf/SquadLists-English.pdf
- England 공식 프로필: Forster201 / Maddison175 / Solanke187. https://www.englandfootball.com/england/mens-senior-team/squad/profiles-archive/fraser-forster ; https://www.englandfootball.com/england/mens-senior-team/squad/james-maddison ; https://www.englandfootball.com/england/mens-senior-team/squad/dominic-solanke
- LAFC 공식 Son6ft0in(반올림183cm): https://www.lafc.com/players/son-heung-min/
- 장갑 후원사 공식 Vicario194: https://brand.uhlsport.com/en/guglielmo-vicario/
- Bundesliga Van de Ven193: https://www.bundesliga.com/en/player/micky-van-de-ven ; LaLiga Porro173: https://www.laliga.com/jugador/pedro-porro
- SkySport Dragusin191: https://sport.sky.it/calcio/atleti/radu-dragusin/493125
- 나머지 신체 참조는 Wikipedia 프로필: Udogie186 / Bissouma182 / Kulusevski186 / Bergvall187. https://en.wikipedia.org/wiki/Destiny_Udogie ; https://en.wikipedia.org/wiki/Yves_Bissouma ; https://en.wikipedia.org/wiki/Dejan_Kulusevski ; https://en.wikipedia.org/wiki/Lucas_Bergvall

2026-10-13 확인. 현 Tottenham 사이트의 일부 높이/주발 표시가 다른 공식 자료와 상충하여 그 표시를 사용하지 않았습니다. 실제 최신 소속이나 계약으로 게임의 가상 토투넘 설정을 변경하지 않습니다.

## 검증

읽기 전용6검사:18명 실제 종합/주발/위치, 슬롯 교환, 현재 훈련/주급, 시즌별 나이, 실제 영입 전후 미확인 키, 미발견 후보 접근 제한. 브라우저7크기에서18명 모든 능력·신상 영역과 상대 비교의 내부/외부 잘림을 검사합니다. Android 검사도 실제 선수 보기/뒤로가기, 모든 능력과 기본 정보의 한 화면 표시를 확인합니다. 최종 결과와 APK는 HANDOFF 최신 항목에 기록합니다.
