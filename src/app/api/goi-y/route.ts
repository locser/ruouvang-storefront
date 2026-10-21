import { NextResponse } from "next/server";
import { goiY } from "@/lib/meili";

/**
 * Proxy gợi ý tìm kiếm.
 *
 * Lý do tồn tại: `CONFIG_MEILI_MASTER_KEY` có toàn quyền đọc/ghi/xoá trên dữ liệu của
 * MỌI shop. Cho trình duyệt gọi thẳng Meilisearch là phải nhúng khoá đó vào mã
 * JavaScript công khai. Route này giữ khoá phía server, trình duyệt chỉ thấy
 * `/api/goi-y?q=...`.
 *
 * Bộ lọc `tenant_id` do server áp, KHÔNG nhận từ client — khách sửa tham số URL
 * cũng không xem được hàng của shop khác.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ ketQua: [] });
  }

  try {
    const hits = await goiY(q, 6);
    return NextResponse.json(
      {
        ketQua: hits.map((h) => ({
          id: h.id,
          title: h.title,
          handle: h.handle,
          price_vnd: h.price_vnd,
          thumbnail: h.thumbnail,
        })),
      },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (e) {
    console.error("[api/goi-y] Meilisearch lỗi:", e);
    // Trả mảng rỗng thay vì 500: mất gợi ý thì khách vẫn gõ xong bấm Enter
    // được, còn 500 làm hiện thông báo lỗi giữa trang.
    return NextResponse.json({ ketQua: [] }, { status: 200 });
  }
}
