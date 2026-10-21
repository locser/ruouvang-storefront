"use client";

import Link from "next/link";
import T from "../T";
import AnhChai from "../AnhChai";
import { useGioHang } from "@/lib/gio-hang-context";
import { doiTimSangProduct } from "@/lib/data";
import { layHuongVi } from "@/lib/huong-vi";
import { CHINH_SACH } from "@/lib/khuyen-mai";
import type { SanPhamTim } from "@/lib/meili";
import { Tien } from "@/components/T";

/**
 * "Gợi ý cho chai thứ 6" — một thẻ gọn ngay dưới danh sách giỏ, có nút THÊM một chạm.
 * Chỉ hiện khi giỏ còn thiếu chai để lên thùng; thêm đủ rồi thì tự biến mất.
 *
 * Vùng chạm nút ≥ 44px; ảnh chai trên nền kem; chữ gợi ý một dòng (hương vị) để thẻ luôn cao
 * bằng nhau dù tên dài.
 */
export default function GoiYChaiThu6({ chai }: { chai: SanPhamTim | null }) {
  const { themVaoGio, uuDai } = useGioHang();
  const thung = uuDai.thung;

  if (!chai || thung.soChai === 0 || thung.chaiConThieu === 0) return null;

  const huongVi = layHuongVi({
    title: chai.title,
    handle: chai.handle,
    loai: chai.loai,
    tags: chai.tags,
    giaVnd: chai.price_vnd,
  });
  const thuTu = Math.min(CHINH_SACH.chaiMoiThung, (thung.soChai % CHINH_SACH.chaiMoiThung) + 1);

  return (
    <section aria-label="Gợi ý" className="mt-6">
      <p className="nhan-nho mb-2.5 !text-[11px]">
        <T k="promo.suggest_title" v={{ n: thuTu }} />
      </p>
      <div className="flex items-center gap-3 border border-line bg-cream p-3">
        <Link
          href={`/san-pham/${chai.handle}`}
          aria-label={chai.title}
          className="the-sp__nen relative block h-16 w-12 shrink-0 overflow-hidden"
        >
          <AnhChai src={chai.thumbnail} alt="" fill sizes="48px" className="object-contain p-1 mix-blend-multiply" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/san-pham/${chai.handle}`} className="no-underline">
            <p className="dong-2 m-0 font-ten text-[17px] leading-tight text-ink">{chai.title}</p>
          </Link>
          <p className="m-0 mt-1 truncate text-[12px] text-ink-muted">
            {huongVi && (
              <>
                <T k={huongVi} className="" /> ·{" "}
              </>
            )}
            <span className="tabular-nums"><Tien so={chai.price_vnd} /></span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => themVaoGio(doiTimSangProduct(chai), 1)}
          className="inline-flex min-h-[44px] shrink-0 items-center border border-wine px-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-wine transition-colors duration-200 hover:bg-wine hover:text-page focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine active:bg-wine active:text-page motion-reduce:transition-none"
        >
          <T k="promo.add" />
        </button>
      </div>
    </section>
  );
}
