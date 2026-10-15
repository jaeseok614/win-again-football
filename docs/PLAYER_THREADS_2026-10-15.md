# 선수의 판단과 책임 — 2026-10-15 추가 개발

## 두 갈래, 여섯 장면

기존 골키퍼·출전 부담·원정 팬·구단주 12화는 그대로 보존했다. 새 `story-threads.js`에 독립된 버전 키를 추가했다.

| 이야기 | 실제 출발점 | 다음 장면 |
| --- | --- | --- |
| 골보다 먼저 건넨 공 | 완전하게 확정된 리그 경기에서 출전·도움이 있고 개인 득점은 없는 실제 필드 선수 | 각 마지막 답변 뒤 확정 리그 두 경기의 개인 출전·골·도움 |
| 휘슬 뒤에 남은 책임 | 완전한 확정 리그 카드에서 우리 팀 퇴장 슬롯과 실제 출전 identity가 일치 | 같은 선수의 다음 두 경기 출전·추가 퇴장, 현재 징계와 명단의 이유를 구분 |

키는 `thread-link-v1-1..3`, `thread-red-v1-1..3`이다. 두 번의 명시적 답변을 기록하고, 다음 회차에서 선택한 두 문장을 정확히 다시 꺼낸다. 골·도움이 없거나 출전하지 못한 경우와 반복 퇴장을 다르게 말한다. 사과가 선발을 보장하거나 동료의 용서를 만들어내지 않는다. 현재 징계는 실제 선수단에서 확인한다. 부상·심판의 오심·투자·새 계약·전술 변경을 기록 없이 주장하지 않는다.

배우는 최초 해당 기록의 identity로 고정한다. 아직 시작하지 않은 대화는 현재 선수단을 떠난 배우에게 열지 않는다. 시작한 대화와 과거 시즌 기록은 남긴다. 컵·유럽·라이브 점수·일부 구간 기록은 리그 두 경기를 대신하지 않는다. 기존 검증된 연속 자책골은 팀 결과의 완전성을 유지하며 개인 골·도움으로 바꾸지 않는다. 시즌 마지막 네 경기 안에서 새 갈래를 시작하지 않는다. 일정이 끝나면 존재하지 않는 다음 경기를 기다리라는 안내를 하지 않는다.

기존 schema10 / win-again-season-v17 / applicationId / 공개 연속1–9 / 경제·시즌 전환은 유지한다. 이야기 반응도 기존 관계별 최신 한 건·확정 두 리그 라운드 만료·선수별 합계 ±2% 범위다.

## 창작과 참고

[이전 장르 참고 범위](TOUCHLINE_STORIES_2026-10-15.md)의 감독 성장·동료 관계 소재를 이어갔다. 새 사건·문장·답변·속마음과 네 컷은 이 게임의 창작이다. 다른 작품 대사나 유명 작가의 그림체를 복사하지 않았다. 골의 주인공을 가리는 이야기보다 동료들이 서로 본 공간을 설명하는 장면, 퇴장 선수가 책임과 선발 경쟁을 나누어 이야기하는 갈등을 넣었다.

## 가로 한 화면

세 갈래 이상이면 수첩 왼쪽에 모든 이야기 이름과 완료 회차를, 오른쪽에 선택한 이야기의 삽화·확정 근거·세 회차 버튼을 함께 놓는다. 여섯 장면 카드를 동시에 작은 칸에 압축하지 않는다. 작은 높이에서는 왼쪽을 세 열 두 줄로 배치하고, 상세 근거는 실제 회차의 삽화 옆에도 모두 제공한다. 선택은 준비한 목록을 재사용하며 저장·시간·명단을 바꾸지 않는다. 회차를 읽고 돌아오면 선택한 이야기와 수첩 종류·페이지·시즌을 복원한다.

긴 대답 버튼은 44px 높이를 유지하고 단어 사이에서 줄을 바꾸며 필요한 만큼 글자 크기를 줄인다. 기본 글자 크기를 상속해 상태 문구가 제목을 밀어내는 문제, 네 갈래가 두 줄의 작은 카드로 쌓이며 근거가 넘치는 문제도 함께 고쳤다. 검사에서는 외부 창 크기뿐 아니라 실제 글자·내용·버튼과 상위 잘림 경계를 확인한다.

## 원본 삽화와 오프라인 자산

- 배포: `source/dist/assets/player-threads-v1.webp`, 244,156바이트. 원본1536×1024, 2×2/각768×512. RGB WebP quality84/method6으로 형식만 변환했다.
- 원본: `$CODEX_HOME/generated_images/01a0f9b0-5ed6-7323-9be3-fd40b239f4dd/exec-2b504fbd-fc13-473b-9032-dc1c35df2e96.png`.
- 내장 imagegen, 기존 창작 `touchline-drama-v1.webp`를 감독·코치 및 세계의 참조로 사용했다. 실제 선수의 얼굴·상표가 없으며, 익명 필드 선수의 뒷모습으로 여러 배우에게 맞춘다.
- 위 두 컷은 첫 면담·후속 질문, 아래 두 컷은 실제 3화 및 완결 카드에서만 사용한다. 기존 골키퍼의 장갑 그림을 필드 선수에게 재사용하지 않는다.
- 하나의 공유 아틀라스를 PWA/Android 셸에 한 번만 넣는다. 장면마다 base64를 복제하지 않으며 네 컷 모두 3:2 원본 비율로 잘라 표시한다.
- 셸 상한은 5,700,000→6,060,000바이트다. 신규 대화·선택 UI의 30KB, 244,156바이트 WebP의 base64 325,544바이트와 작은 선택 코드 330KB를 제한한 것이다. 기존 얼굴·중복 금지·오프라인·자산 일치 검사는 유지한다. 경기 틱에는 새 작업이 없다.

## 검증 및 설치판

최종 실행 결과와 설치 파일 증빙은 아래에 기록한다. 기존 배포 APK는 새 버전의 Source/Android 검증을 통과한 뒤에만 같은 Drive ID로 교체한다.

## 이미지 생성에 보낸 정확한 프롬프트

```text
Use case: illustration-story. Create ONE new production game atlas, exactly a seamless 2 by 2 grid of four equal rectangular narrative panels, total 1536x1024 landscape composition, each panel 768x512 wide 3:2. No borders, gutters, lettering, speech bubbles, captions, logos, shirt names or numbers. The reference is our original fictional Korean manager, about 30, tousled black hair and navy tracksuit with cream piping, and Black middle-aged assistant coach; preserve their identities, painted cinematic sports graphic-novel look, forest/navy/cream palette and modest English lower-league club. This is a NEW set of illustrations. TOP LEFT: after a match, the manager listens at eye level to an anonymous adult outfield player seen only from behind, folded towel in his hands, a phone placed face down on the bench; feeling overlooked after assisting a teammate, restrained uncertainty, no goalkeeper gloves. TOP RIGHT: tense empty locker room after a dismissal, the manager and assistant sit across from an anonymous adult outfield player seen from behind with head down, a plain navy jersey folded on the empty bench between them; accountability without humiliation, no referee, no actual red card prop, no violence. BOTTOM LEFT: later on the training ground, two anonymous adult outfield teammates seen from behind discuss where to pass with open palms, manager listens alongside them, a ball rests on the grass; mutual understanding, no celebration or guaranteed goal. BOTTOM RIGHT: later in the same small locker room, the formerly isolated anonymous outfield player seen from behind pulls out an empty stool for a teammate while the manager stands back, a plain navy jersey hangs on the hook; a chance to talk, not a guaranteed starting place or forgiveness. Do not make player faces identifiable: use back views and central gestures so the illustrations suit many actual fictional squad identities. Keep the important interaction in the central two-thirds of each quadrant for safe vertical cropping. Grounded emotional acting, believable hands/anatomy, natural practical lighting, detailed but quiet club textures. No real stars, real team branding, named-artist imitation or existing comic characters. All four panels reach their quadrant edges.
```
