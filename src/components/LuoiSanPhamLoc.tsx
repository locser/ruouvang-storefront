import Link from "next/link";
import { tonKhoThat } from "@/lib/ton-kho";
import type { SanPhamLoc } from "@/lib/loc-danh-muc";
import TheLuoi from "./TheLuoi";
import T from "./T";

/**
 * Lưới sản phẩm cho trang danh mục KHI ĐANG LỌC — SỬA BUG-R06.
 *
 * Khác `LuoiSanPhamCuonThem` ở chỗ dùng phân trang bằng liên kết thay vì cuộn
 * vô hạn. Lý do: cuộn vô hạn gọi `/api/danh-muc-sp` vốn không biết gì về bộ
 * lọc, nên nó sẽ nối thêm hàng KHÔNG khớp bộ lọc vào cuối lưới — sai một cách
 * rất khó nhận ra. Phân trang giữ đúng tập kết quả và mỗi trang là một địa chỉ
 * chia sẻ được.
 */
export default function LuoiSanPhamLoc({
  sanPham,
  trang,
  soTrang,
  duongDanTrang,
}: {
  sanPham: SanPhamLoc[];
  trang: number;
  soTrang: number;
  /** Hàm dựng địa chỉ của một số trang, bảo toàn mọi bộ lọc đang bật. */
  duongDanTrang: (trang: number) => string;
}) {
  if (sanPham.length === 0) {
    return (
      <p className="py-16 text-center font-display text-[24px] italic text-ink-muted">
        <T k="listing.no_bottles_match_these_filters" />
      </p>
    );
  }

  // Dải số trang gọn: luôn có trang đầu, trang cuối và hai trang quanh trang hiện tại.
  const soHien = new Set<number>([1, soTrang, trang - 1, trang, trang + 1]);
  const danhSachTrang = [...soHien]
    .filter((n) => n >= 1 && n <= soTrang)
    .sort((a, b) => a - b);

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
        {sanPham.map((p) => {
          const ton = tonKhoThat(p.tonKho);
          return (
            <TheLuoi
              key={p.id}
              handle={p.handle}
              title={p.title}
              thumbnail={p.thumbnail}
              gia={p.gia}
              hetHang={!ton.conHang}
              sapHet={ton.sapHet}
              soLuong={ton.soLuong}
              loai={p.loai}
              tags={p.tags}
            />
          );
        })}
      </div>

      {soTrang > 1 && (
        <nav
          aria-label="Phân trang"
          className="mt-16 flex flex-wrap items-center justify-center gap-2"
        >
          {trang > 1 && (
            <Link
              href={duongDanTrang(trang - 1)}
              className="inline-flex min-h-[40px] items-center border border-ink/20 px-4 text-[12px] font-medium tracking-wide text-ink transition-colors hover:border-wine hover:text-wine"
            >
              <T k="listing.previous" />
            </Link>
          )}

          {danhSachTrang.map((n, i) => (
            <span key={n} className="flex items-center gap-2">
              {i > 0 && danhSachTrang[i - 1] !== n - 1 && (
                <span className="text-[12px] text-ink-soft">…</span>
              )}
              <Link
                href={duongDanTrang(n)}
                aria-current={n === trang ? "page" : undefined}
                className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center border px-3 text-[12px] font-medium tabular-nums transition-colors ${
                  n === trang
                    ? "border-wine bg-wine text-page"
                    : "border-ink/20 text-ink hover:border-wine hover:text-wine"
                }`}
              >
                {n}
              </Link>
            </span>
          ))}

          {trang < soTrang && (
            <Link
              href={duongDanTrang(trang + 1)}
              className="inline-flex min-h-[40px] items-center border border-ink/20 px-4 text-[12px] font-medium tracking-wide text-ink transition-colors hover:border-wine hover:text-wine"
            >
              <T k="listing.next" />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
