# 득점 세리머니와 경기장 반응 — 2026-10-11

## 공식 참고 자료

- [FM26 Match Day Experience](https://www.footballmanager.com/fm26/features/where-storytelling-evolves-fm26s-match-day-experience): 경기 상황에 맞춘 하이라이트와 골 유형에 따른 다시 보기, 관중 반응을 참고했습니다. 이 게임에는 실제 득점 기록에 근거한 선제골·동점골·역전골·추격골·추가골 제목과 득점 다시 보기 진입을 적용했습니다.
- [EA SPORTS FC 25 Rush](https://www.ea.com/games/ea-sports-fc/fc-25/news/pitch-notes-fc-25-rush-deep-dive): 득점 선수와 동료가 함께 축하하는 연출을 참고했습니다. 원본 축구 일러스트 위에 실제 게임 득점자의 얼굴·이름·득점 경로·스코어를 합성합니다. 타 게임의 이미지·코드·영상은 사용하지 않습니다.

## 게임에서 확인하기

골망에 공이 도착한 뒤 기존 경기장 영역에 세리머니가 약 4.4초 표시됩니다. '경기 보기'로 바로 넘어가거나 '득점 다시 보기'를 열 수 있습니다. 다시 보기는 기존 기록을 재생하며 경기 진행을 정지하고, 닫은 뒤에는 직접 재개합니다. 설정 → 연출 미리보기로 확인할 수도 있습니다.

관중 반응 자막은 실제 표시 중인 크로스, 슈팅, 선방, 골, 경합, 볼 아웃, 재개에 맞춰 바뀝니다. 아직 보이지 않은 슈팅 결과를 미리 알려주지 않습니다. 새 음성 해설/관중 음원을 추가한 것은 아니며 기존 효과음과 선택적 진동은 유지합니다.

## 동작과 제한

- 모든 득점 스코어·제목은 해당 골까지의 기록만 사용합니다. 미래의 골이나 최종 승자를 미리 알리지 않습니다.
- 세리머니가 열려 있는 동안 공 애니메이션과 다음 엔진 틱을 기다립니다. 경기 분·RNG·능력치·돈·승패·저장 스키마는 바꾸지 않습니다.
- 일시 정지된 실제 골 장면은 그대로 정지합니다. 미리보기와 종료 직전 골은 정지 상태에서도 자동 종료하여 영구 대기를 막습니다.
- 효과 끄기/움직임 줄이기에서는 큰 그림 연출을 생략하고 기존 간단한 득점 표시를 사용합니다. 화면 숨김/다른 화면/계획 팝업 진입 시 장면을 닫습니다.
- 축하 배경은 공통 가상 선수 그림이며 실제 득점자의 신체/유니폼을 생성한 것이 아닙니다. 정확한 선수 식별은 기존 얼굴 초상과 이름으로 제공합니다. 상대 득점은 같은 배경을 저채도로 표시합니다.
- 기존 경기장 안에만 표시하므로 페이지 길이를 늘리지 않습니다. 버튼 최소44px, 이름 줄바꿈과 짧은 화면 전용 크기를 사용합니다.

## 이미지 생성 기록

- 도구: 내장 image_gen, 2026-10-11. 새로운 원본 이미지 1장.
- 원본 로컬 파일: C:/Users/jaese/.codex/generated_images/01a1008e-e5c9-7092-89d5-3385a73fabec/exec-26ac8ebd-6241-4d33-aafc-e3066c2007c4.png
- 게임용 파일: [club-celebration-v1.webp](../source/dist/assets/club-celebration-v1.webp), 768×512 /44,600바이트.
- 게임용 변환: 같은 그림을 Pillow로 축소하여 WebP quality76/method6 저장. 그림 내용 수정 없음.
- CSS 배경으로 사용하며 PWA/Android 오프라인 번들에 포함합니다. 런타임 원격 이미지 요청 없음.
- 정확한 생성 프롬프트:

> Use case: illustration-story. Asset type: original football mobile game goal celebration background, landscape 3:2 composition. A jubilant fictional lower-league football team in pale lime green shirts and dark navy shorts celebrate a scored goal near the corner of a modest English football ground under evening floodlights. Three athletic adult male teammates, mixed ethnic backgrounds, seen mostly from behind and three-quarter rear, one knee-sliding with arms spread in the right center, two teammates sprinting to embrace him, fans lifting scarves behind a low terrace barrier. Cinematic hand-painted sports game illustration, crisp expressive shapes, beautiful amber floodlight and deep teal shadows, joyful rain flecks and small lime confetti. Put players predominantly in the right two thirds; left third dark atmospheric breathing room for a separate player portrait UI. Main action in the central vertical third so it survives a wide banner crop. No text, letters, numbers, logos, badges, brand marks or real player likenesses. Original fictional characters, no giant stadium, no UI panels.

## 검증

새 회귀8그룹은 득점 종류·과거 골 스코어·미래 결과 비노출·저장 비변경·시계 대기·정지와 다시 보기·미리보기·숨김/효과 끄기/종료·오프라인 자산을 검사합니다. 전체 검사/실제 브라우저/배포 결과는 HANDOFF.md 첫 항목에 기록합니다.

공개 번들 예산은3,745,000→3,850,000바이트로 조정했습니다. 이번 실제 증가69,901바이트 중 주요 부분은44,600바이트 WebP를 인라인 데이터로 포함한 것입니다. 기존 얼굴 초상 중복·크기 검사는 유지합니다.

