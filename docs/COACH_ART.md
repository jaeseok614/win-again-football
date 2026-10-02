# 코치 얼굴

내장 ImageGen으로 만든 가상 인물 10명의 원본 그림입니다. 기존 선수 사진이나
실존 감독 사진을 사용하지 않았습니다. 게임 파일은 `source/dist/assets/coach-faces-v1.webp`
이며, 1280×512 / 5열×2행 / 약 73KB의 한 장을 CSS로 나누어 사용합니다.
이름으로 얼굴을 매핑하므로 계약과 저장 복원 뒤에도 같은 얼굴을 표시합니다.
배포용 크기 조절과 WebP 압축만 적용했습니다.

최종 생성 프롬프트:

> Create one game-ready portrait atlas PNG for an original Korean indie football management game. EXACT layout: 5 columns and 2 rows, 10 equal square portrait tiles, no gutters, each head-and-shoulders centered fully inside its tile, overall canvas aspect ratio 5:2. Optimized compact 1280x512 output preferred. Dark desaturated navy backgrounds #10233a in every cell, clean polished hand-painted editorial comic illustration, realistic adult faces, crisp thin outlines, friendly but professional staff expressions. These are fictional coaches, NOT recognizable celebrities. Staff wear plain dark navy tracksuit jackets with tiny muted lime details, no club logos. Diverse adults age 35-65, distinct hairstyles and faces. Row 1 left to right: white man aged42 shortbrown hair, black man aged48 croppedhair beard, East Asian man aged45 neat blackhair glasses, white man aged60 greyinghair, brown man aged39 wavyhair. Row 2 left to right: white man aged52 beard, black man aged41 bald, East Asian man aged55 grayinghair, white man aged47 auburnhair glasses, brown man aged58 salt-and-pepperhair. All from front slightly three-quarter, uniform eye line and framing. Flat portraits with shoulders at bottom edge, face clear when displayed at 56px. No text, no numbers, no labels, no borders, no badges, no watermark, no player shirts, no football, no extra tiles. Consistent subtle soft lighting and style across all10 square tiles.
