# 추가 선수 얼굴과 구단 장면 (2026-10-08)

내장 image_gen 도구로 새 원본을 생성했다. 실제 선수 사진, 기존 게임 화면,
구단 로고나 언론사 이미지를 자산으로 내려받지 않았다. 참고 화면은 화면 구성과
경기 움직임을 연구하는 데만 사용했다. 게임에는 모두 구단 일러스트로 표시한다.

## 추가 선수 아틀라스

- source/dist/assets/player-faces-v17.webp: 8 × 8, 64개 독립 얼굴, 1254 × 1254,
  208,648바이트. 이전 16개 JPEG 아틀라스(236,488바이트)를 대체한다.
- 선발 선수의 기존 28개 얼굴 및 동아시아인 손헝민 얼굴은 v16에 유지한다.
- 이적·유소년 등의 새 identity는 결정적으로 64개 얼굴에 배정한다. 상대 구단은
  같은 선발 11명에게 서로 다른 얼굴을 배정한다. 선수 identity와 경기 RNG는 바꾸지 않는다.
- Pillow로 원본 PNG를 WebP로 인코딩했다. 원본 그림의 볼 부분 색도 읽기 전용으로 분석해 경기장 머리 색 팔레트로 사용했다. 사진이나 그림에 창작 편집을 적용하지 않았다.

### 최종 생성 프롬프트

```text
Use case: stylized-concept
Asset type: a production portrait sprite atlas for an original fictional football management mobile game.
Generate one square image containing exactly 8 columns by 8 rows of equal square cells, 64 separate head-and-shoulders portraits. Every cell has a single original fictional male footballer, facing the viewer, eyes open, complete hair and chin comfortably inside the cell, dark navy studio background and a plain dark navy football training shirt with subtle lime collar trim. Consistent professionally painted semi-realistic sports-game illustration, clean detailed facial features, even soft light. No dividing gutters, borders, text, badges, logos or watermarks. Arrange perfectly uniform aligned 8x8 grid, no person overlaps another cell.
Make all 64 people visibly distinct: vary face shapes, noses, eye spacing, facial hair, short curls, tight coils, braids, fades, straight black hair, swept blond hair, red hair, shaved heads, and brown hair. Include players of Korean/East Asian, Black African, mixed Black-European, Mediterranean, Northern European, Latin American, Middle Eastern and South Asian appearance, balanced variety. Most look 18–32 years old, some mature veterans 33–38. Every face should be individually designed and recognizable at small mobile portrait size; do not repeat one head, hairstyle or generic face. These are original fictional people, not real player photographs or copies. Keep the palette and lighting cohesive across all 64 cells. No UI elements, frames or extra objects. Overall square composition.
```

## 구단 장면 아틀라스

- source/dist/assets/club-scenes-v1.webp: 3 × 2, 2048 × 768, 234,188바이트.
- 경기장 도착 / 라커룸 / 기자회견 / 훈련 / 유소년 / 우승의 여섯 장면이다.
- 기본 홈의 경기장 미리보기, 감독 가이드, 선수 대화, 기자회견, 훈련, 유소년, 시즌 결산에 연결한다.
- 시즌 우승 장면은 확정된 시즌 1위에서만 표시한다. 일반 승리를 우승으로 표현하지 않는다.
- 한 개 공유 CSS 아틀라스로 묶어 각 카드마다 이미지 데이터를 복제하지 않는다.

### 최종 생성 프롬프트

```text
Use case: illustration-story
Asset type: original scene sprite atlas used as small chapter, club-story and training headers in a fictional football management mobile game.
One wide landscape image, exactly three columns by two rows, six equal landscape panels. Each panel has 16:9 framing; overall sheet about 8:3 aspect ratio. Panels touch without borders or gutters, strict aligned grid. Consistent cinematic digitally painted sports illustration, dark navy shadows, green grass, warm practical lighting. The game follows an English fifth-division club rebuilding toward the first division. These are atmospheric original club illustrations, not screenshots or photographs of a real club.
Panel index 0 top left: rain-soaked small English non-league ground at dusk, floodlights, simple covered terrace, old club bus beside entrance, a few supporters in coats.
Panel 1 top middle: modest locker room, coach standing at a tactics board and seated adult footballers listening, navy training kits with lime trim, warm lamps, wide establishing view.
Panel 2 top right: small press room, fictional manager behind microphones and reporters in foreground, no readable sponsor wall, wide establishing view.
Panel 3 bottom left: morning training ground, adult players practising passing and sprinting around cones, coach observing, footballs, green pitch, wide view.
Panel 4 bottom middle: youth academy training, several teenage footballers practising with a coach and a scout observing with a clipboard at the touchline, healthy professional football setting, navy kits, daylight, wide view.
Panel 5 bottom right: jubilant adult football squad celebrating together on a modest football pitch under floodlights with scarves and cheering supporters, a generic unbranded trophy held high, navy and lime kits, wide view.
Keep subjects and defining action toward the centre of each panel, useful when cropped as a short mobile banner. Natural varied people, no close-up portraits. No text, letters, numbers, logos, badges, watermarks or UI. Do not imitate any FM or EA artwork. Six clearly distinct scenes, cohesive professional illustration quality.
```

## 승격 장면

- source/dist/assets/club-promotion-v1.webp: 1672 × 941, 123,838바이트. 내장 image_gen으로 생성하고 WebP로 인코딩했다.
- 트로피 없이 다음 리그 진출을 축하하는 감독·선수단이다. 2~5부의 확정된 2위에는 이 장면을, 확정된 리그 1위에는 우승 장면을 보여준다. 시즌 진행 중의 현재 순위와 1부 2위에는 승격 장면을 표시하지 않는다.
- [최종 생성 프롬프트](PROMOTION_ART_PROMPT.txt). 실제 인물 사진이나 다른 게임 자산을 사용하지 않았다.

## 공식 참고 자료

- [FM26 Mobile](https://www.footballmanager.com/fm26/features/mobile): 전술 화면의 피치와 선수 역할 목록, 감독 업무 화면의 정보 구성.
- [FC Mobile 27 업데이트](https://www.ea.com/games/ea-sports-fc/fc-mobile/news/fc-mobile-27-update): 수비 위치, 침투 패스, 헤더, 골키퍼의 프리킥 대응.
- [FC Mobile 전술 소개](https://www.ea.com/games/ea-sports-fc/fc-mobile/news/fcm27-game-plans-deep-dive): 폭, 수비선, 지원 선수의 침투 차이. 해당 기능의 적용 모드는 문서상 H2H/PvE이며, 우리 엔진의 결과를 재현한다는 뜻은 아니다.

우리 경기의 변경은 기존 엔진이 기록한 사건을 보여주는 표현 계층에 한정한다.
움직임이 추가 득점·패스·태클·체력 소모 또는 능력치 효과를 만들지 않는다.

