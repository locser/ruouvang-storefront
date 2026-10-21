# Đa ngôn ngữ (i18n)

Hiện hỗ trợ: `vi` (gốc), `en`. Cấu hình ở `config.ts`.

## Cách hoạt động
Mỗi chuỗi được render cho **mọi** ngôn ngữ trong `LOCALES`, bọc trong `<span data-l="xx">`.
CSS (sinh từ `LOCALES` ở `app/layout.tsx`) chỉ giữ ngôn ngữ khớp `<html lang>`. Nhờ vậy trang vẫn
tĩnh/ISR, đổi ngôn ngữ tức thì, không cookie, không lệch hydrate.

| Cần hiển thị | Dùng |
|---|---|
| Chuỗi giao diện | `<T k="product.add" />` — văn bản ở `messages/*.json` |
| Chuỗi có tham số | `<T k="card.only_left" v={{ soLuong: 3 }} />` — bản dịch viết `{soLuong}` |
| Tiêu đề có `<em>`/`<br/>` | bản dịch chứa `<em>…</em>`, `<br/>`; `<T emClassName="…" />` |
| Dữ liệu động (menu, bài blog…) | `<TL obj={muc} field="ten" />` — đọc `ten`, `tenEn`, `tenKo`… |
| Nội dung có sẵn từng ngôn ngữ | `<L values={…} />`, `<LBlock …/>`, `<LHtml …/>` |
| Thuộc tính HTML (placeholder, aria-label) | `useT()` từ `i18n/use-t.ts` (chỉ Client Component) |

Thiếu bản dịch → tự rơi về ngôn ngữ gốc (`vi`), trang không vỡ.

## Thêm một ngôn ngữ (ví dụ `ko`)
1. `config.ts`: thêm `"ko"` vào `LOCALES` và một dòng vào `LOCALE_META` (có `medusa: "ko-KR"` cho blog).
2. Tạo `messages/ko.json` (sao chép `vi.json`, dịch giá trị, GIỮ NGUYÊN khoá và `{tham_số}`), rồi đăng ký trong `messages/index.ts`.
3. Dữ liệu động (tuỳ chọn): thêm hậu tố `Ko` vào `lib/*.json` (`tenKo`, `tieuDeKo`…); mô tả sản phẩm là `metadata.description_ko` trong Medusa; bài blog là locale `ko-KR` trong Medusa Admin.

Không phải sửa component nào. `pnpm test` (`__tests__/i18n.unit.spec.ts`) báo chính xác khoá nào ngôn ngữ mới còn thiếu và tham số `{x}` nào lệch.

## Chưa làm / lưu ý
- Các trang tài khoản, giỏ hàng, thanh toán, xác nhận đơn, đăng nhập/đăng ký và một số `aria-label`/`placeholder`
  vẫn là tiếng Việt cứng (xem `node tools/audit-vi.cjs` nếu còn; hoặc `grep` chuỗi có dấu).
- Tiền: `vi` "499.000đ", `en` "₫499,000". Hiển thị bằng `<Tien so={…} />` (hoặc `tienSong(…)` trong `<T v>`); hàm gốc `dinhDangTien(so, locale)` ở `lib/tien.ts`.
- Không có URL theo ngôn ngữ (`/en/...`) và chưa có `hreflang`: nếu cần SEO đa ngôn ngữ thì chuyển sang routing theo locale.
