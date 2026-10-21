# C.W. Wines storefront

Storefront thứ 8 cho dữ liệu thật từ [cwwines.com](https://www.cwwines.com),
song ngữ Việt–Anh, hiển thị giá VND và có cổng xác nhận đủ 18 tuổi.

## Dữ liệu và tỷ giá

- Nguồn sản phẩm/collection: Shopify JSON API công khai của cwwines.com.
- Trang tĩnh: sitemap Shopify và HTML `/pages/*`.
- Blog: sitemap blog và HTML `/blogs/news/*`.
- Theme: biến CSS `:root`, stylesheet, DOM và computed style qua Chrome headless
  (khi máy có Chrome).
- Tỷ giá cố định: `1 AUD = 17.500 VND`, chốt ngày 18/08/2026.
- Giá VND được làm tròn lên bội 1.000đ; không chia 100 vì VND là zero-decimal.
- Mô tả tiếng Anh gốc được bảo toàn. Bản tiếng Việt do crawler dịch máy và
  lưu riêng để giao diện đổi ngôn ngữ không tải lại trang.

Chạy crawler trên host:

```bash
node tools/scrapers/crawl-cwwines.js --max-collections=5
node tools/scrapers/crawl-cwwines.js
```

Đầu ra nằm ở `tools/scrapers/data/cwwines-*`; ảnh dự phòng nằm trong
`cwwines-images/`. Storefront vẫn dùng URL CDN Shopify gốc.

## Nạp Medusa

CSDL riêng: `medusa_cwwines`; Redis DB `7`; backend host `9700`, admin host
`5873`, storefront `8900`. Các biến hạ tầng là `TENANT_CWWINES`, `PK_CWWINES`
và `PK_WIDGET_CWWINES`.

Luôn xem 10 sản phẩm và đối chiếu AUD → VND trước:

```bash
SO_LUONG=10 CHI_XEM=1 npx medusa exec ./src/scripts/seed-cwwines.ts
LO=30 npx medusa exec ./src/scripts/seed-cwwines.ts
npx medusa exec ./src/scripts/seed-blog-cwwines.ts
npx medusa exec ./src/scripts/sync-meili.ts
```

`seed-cwwines.ts` tạo region VND, kênh bán, publishable key riêng, kho, tồn kho,
fulfillment set, service zone và shipping option 50.000đ. Sản phẩm giá 0 AUD
không được đưa lên bán. Shopify không công khai số lượng tồn kho: crawler đặt
100 cho variant `available` và 0 cho variant không available; đây là số khởi
tạo cần đội vận hành đối chiếu trước khi mở bán.

## Chạy storefront

```bash
pnpm --filter @dtc/storefront-cwwines run typecheck
pnpm --filter @dtc/storefront-cwwines run build
PORT=8900 pnpm --filter @dtc/storefront-cwwines run start
```

Danh sách sản phẩm đọc từ Meilisearch; chi tiết/giá dùng Store API. TTL: danh
mục 300 giây, danh sách 60 giây, region 3.600 giây. Medusa timeout 8 giây,
Meilisearch timeout 5 giây và đều suy giảm về trạng thái an toàn khi lỗi.
Khi đặt hàng, route server `/api/dat-hang` tạo lại giỏ từ handle/SKU, đọc giá
và tồn kho hiện tại, chọn shipping option, mở payment session COD rồi chỉ báo
thành công sau khi Store API trả về order thật.

## Chưa kiểm chứng vì Docker đang tắt

- Chưa tạo/migrate `medusa_cwwines`, chưa chạy seed trong container.
- Chưa xác nhận publishable key, tồn kho, category link và shipping option trên
  CSDL thật.
- Chưa chạy phễu container/site thật hoặc chuyển tên miền
  `ruouvang.polarisvn.holdings`; việc Compose/deploy thuộc Claude.
- Kiểm tra bắt buộc trong `dung-storefront.sh` trả `[]` trước khi thêm dòng bảng.
  Trong lúc triển khai có thay đổi đồng thời ngoài nhiệm vụ bổ sung một dịch vụ
  `storefront-cwwines` vào Compose; kiểm tra tĩnh hiện trả đúng một dịch vụ,
  nhưng cấu hình đó chưa được chạy hay xác nhận bằng Docker.
- Mã `WELCOME20` được suy ra từ collection `welcome20-discount`; cần xác nhận
  điều kiện thương mại trước khi công bố. Storefront chỉ dẫn tới collection,
  không cho nhập mã hoặc tự trừ tiền khi Medusa chưa có promotion tương ứng.
- Route checkout đã nối đủ các bước Store API nhưng chưa E2E trong container;
  phải tạo một đơn COD thử và đối chiếu order trong Admin trước khi nhận đơn thật.
- Hai địa chỉ Australia lấy từ trang Contact; số điện thoại/email không có trong
  dữ liệu cào, còn tọa độ bản đồ chỉ là ước lượng theo địa chỉ và cần xác nhận.
- Địa chỉ kho seed hiện là cấu hình vận hành tạm tại Việt Nam; Claude cần thay
  bằng địa chỉ kho/pháp nhân chính thức trước khi deploy.
