# XNC Motion Comic Engine – Demo (Local)

Mục tiêu: copy cả folder này lên website của bạn (folder riêng), mở index.html là chạy.

## File
- index.html
- green-theme.css
- xnc-engine.js

## Thay placeholder bằng PNG nhân vật thật
Trong xnc-engine.js, phần setupActors():
- thay createActorShape(...) bằng <img src="..."> và set width/height
- giữ anchors để engine biết điểm tay/mặt/cổ áo

## Preset action có sẵn
- THROW_PROP: ném dép vượt khung + rơi xuống đáy
- PUNCH: tay vượt khung đấm mặt
- PULL: kéo áo lôi nhân vật sang panel khác (demo)

## Tích hợp vào web chính
Bạn đặt folder này vào static, ví dụ:
  /admin/tools/xnc_motion_comic_demo/
Mở:
  /admin/tools/xnc_motion_comic_demo/index.html
