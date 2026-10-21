import Link from "next/link";
import T, { TL } from "./T";
import Logo from "./Logo";
import { FOOTER, HE_THONG_CUA_HANG, SO_CUA_HANG } from "@/lib/theme";
import { layCaiDat } from "@/lib/lay-cai-dat";

/**
 * Chân trang — nền charcoal, đường kẻ đồng, chữ ngà.
 *
 * Hai dòng giấy phép và dải cảnh báo tuổi ở cuối KHÔNG phải trang trí: doanh
 * nghiệp bán rượu ở Việt Nam bắt buộc công khai số giấy phép bán buôn rượu và
 * Luật Phòng, chống tác hại của rượu, bia 2019 yêu cầu cảnh báo người dưới 18
 * tuổi. Giữ nguyên văn, chỉ đổi cách trình bày.
 */
export default async function Footer() {
  // Hotline là dữ liệu cửa hàng trong app_settings (Medusa), không hardcode trong JSON tĩnh.
  const caiDat = await layCaiDat();
  const hotline = (caiDat.hotline ?? "").trim();
  return (
    <footer className="nen-toi mt-24 bg-ink text-page">
      {/* Đường kẻ đồng mảnh ngăn thân trang với chân trang */}
      <div className="h-px bg-gradient-to-r from-transparent via-copper to-transparent" aria-hidden="true" />

      <div className="container-site grid gap-14 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-10 lg:py-20">
        {/* Thương hiệu & liên hệ */}
        <div className="md:col-span-2 lg:col-span-1">
          <Link href="/" aria-label="Trang chủ" className="inline-block text-page">
            <Logo nenToi khauHieu />
          </Link>

          <ul className="mt-10 space-y-3 text-[14px] leading-relaxed text-page/70">
            <li>
              <TL obj={HE_THONG_CUA_HANG} field="truSo" />
            </li>
            {hotline && (
              <li>
                <a
                  href={`tel:${hotline.replace(/\s/g, "")}`}
                  className="lien-ket text-page transition-colors"
                >
                  {hotline}
                </a>
              </li>
            )}
            {HE_THONG_CUA_HANG.email && (
              <li>
                <a
                  href={`mailto:${HE_THONG_CUA_HANG.email}`}
                  className="lien-ket text-page transition-colors"
                >
                  {HE_THONG_CUA_HANG.email}
                </a>
              </li>
            )}
            <li className="pt-2">
              <Link
                href="/he-thong-cua-hang"
                className="lien-ket text-[11px] font-medium uppercase tracking-[0.16em] text-copper-light"
              >
                <T k="footer.our_boutiques" v={{ SO_CUA_HANG }} />
              </Link>
            </li>
          </ul>
        </div>

        {/* Các cột liên kết */}
        {FOOTER.cot.map((cot) => (
          <div key={cot.tieuDe}>
            <h3 className="mb-6 text-[11px] font-medium uppercase tracking-caps text-copper-light">
              <TL obj={cot} field="tieuDe" />
            </h3>
            <ul className="space-y-3.5">
              {cot.muc.map((m) => (
                <li key={m.duongDan}>
                  <Link
                    href={m.duongDan}
                    className="text-[14px] text-page/70 transition-colors duration-300 hover:text-page"
                  >
                    <TL obj={m} field="ten" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Pháp lý & cảnh báo tuổi */}
      <div className="border-t border-page/10">
        <div className="container-site space-y-3 py-8 text-[12px] leading-relaxed text-page/55">
          {HE_THONG_CUA_HANG.giayPhep.length > 0 && (
            <div className="space-y-1">
              {HE_THONG_CUA_HANG.giayPhep.map((g) => (
                <p key={g}>{g}</p>
              ))}
            </div>
          )}
          <p className="max-w-3xl text-page/70">
            <T k="common.alcoholic_products_not_for_anyone" />
          </p>
        </div>
      </div>

      <div className="border-t border-page/10">
        <div className="container-site py-6 text-[12px] text-page/50">
          <TL obj={FOOTER} field="banQuyen" />
        </div>
      </div>
    </footer>
  );
}
