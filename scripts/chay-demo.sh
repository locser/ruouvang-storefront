#!/usr/bin/env bash
# Dựng bản production của storefront C.W. Wines rồi chạy để cho người xem demo.
# Không dùng `next dev`: bản dev chậm và hiện biểu tượng dev ở góc.
#
# Cách dùng (từ thư mục storefront-cwwines):
#   bash scripts/chay-demo.sh            dựng lại rồi chạy ở cổng 8900
#   PORT=8910 bash scripts/chay-demo.sh  đổi cổng
#   SKIP_BUILD=1 bash scripts/chay-demo.sh   chạy lại bản đã dựng, bỏ qua bước build
#
# Cần Medusa chạy ở MEDUSA_BACKEND_URL trong .env.local và đã nạp sản phẩm — xem README.
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${PORT:-8900}"

# Windows: build với nhiều worker hay gặp lỗi "Cannot find module './NN.js'".
export NEXT_CPU_COUNT="${NEXT_CPU_COUNT:-1}"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "[demo] Xoá bản dựng cũ và dựng lại production..."
  rm -rf .next
  npx next build
fi

echo "[demo] Chạy storefront tại http://localhost:${PORT}"
exec npx next start -p "${PORT}"
