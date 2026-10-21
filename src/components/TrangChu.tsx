import Link from "next/link";
import KhoiSanPhamTab, { type TabDaNap } from "./KhoiSanPhamTab";
import HeroSlides from "./HeroSlides";
import NutHoiAI from "./NutHoiAI";
import TheSanPham from "./TheSanPham";
import T, { L, TL } from "./T";
import { theoNgonNgu } from "@/i18n/translate";
import Anh from "./Anh";
import Hien from "./Hien";
import type { Product } from "@/lib/data";
import { NHA_RUOU } from "@/lib/dieu-huong";
import { tiLeAnh } from "@/lib/ti-le-anh";
import { dinhDangTien, tienSong } from "@/lib/tien";
import {
  CAM_KET,
  CAM_KET_THEO_NGON_NGU,
  SO_CUA_HANG,
  duongDanDanhMuc,
} from "@/lib/theme";

export interface NhaRuouThe {
  ten: string;
  tenEn: string;
  href: string;
  /** Tổng số chai đang bán của nhà rượu. */
  tong: number;
  /** Giá thấp nhất (đồng) — null nếu không chắc đã thấy hết các chai. */
  tuGia: number | null;
  anh: string[];
}

export interface KhoiDaNap {
  tieuDe: string;
  /** Bản dịch theo hậu tố ngôn ngữ: `tieuDeEn`, `tieuDeKo`… */
  [truong: string]: unknown;
  xemTatCa: string | null;
  tab: TabDaNap[];
}

/** Nhãn nhỏ phía trên tiêu đề của từng dải sản phẩm, theo thứ tự xuất hiện. */
const NHAN_DAI = [
  "home.label_selection",
  "home.label_from_the_cellar",
  "home.label_worth_savouring",
];

/**
 * Trang chủ boutique — ít khối, nhiều khoảng thở:
 *
 *   hero (chai rượu trên nền rượu vang) → bốn cam kết → dải sản phẩm tuyển chọn
 *   → nhà rượu (danh sách chữ) → lời mời tư vấn
 *
 * Bản cũ dựng lại đúng thứ tự dải của cwwines.com (slider khuyến mãi, chip lọc,
 * mã giảm giá viền đứt, lưới 5 banner, banner lớn, tường logo). Những khối đó
 * mang ảnh quảng cáo có chữ in sẵn nên không thể làm đồng bộ với bộ nhận diện
 * mới; thay bằng ảnh chai thật lấy từ chính sản phẩm đang bán.
 *
 * Là Server Component: chỉ `KhoiSanPhamTab` (tab) và `Hien` (hiện dần khi cuộn)
 * là client.
 */
export default function TrangChu({
  khoi,
  moiVe,
  nhaRuou,
}: {
  khoi: KhoiDaNap[];
  moiVe: Product[];
  nhaRuou: NhaRuouThe[];
}) {
  // Kho chai cho các slide hero: dải "mới về" trước, rồi các dải đã nạp; mỗi sản phẩm một lần.
  const daCo = new Set<string>();
  const pool = [...moiVe, ...khoi.flatMap((k) => k.tab.flatMap((t) => t.sanPham))].filter((p) => {
    if (daCo.has(p.handle)) return false;
    daCo.add(p.handle);
    return true;
  });

  const tatCaRong = khoi.every((k) => k.tab.every((t) => t.sanPham.length === 0));

  // Dải không có sản phẩm nào thì KhoiSanPhamTab tự ẩn — cũng không được tạo phần (màn hình trống) cho nó.
  const khoiHien = khoi.filter((k) => k.tab.some((t) => t.sanPham.length > 0));
  const coDaiDuPhong = tatCaRong && moiVe.length > 0;

  return (
    <div>
      {/* Hero (carousel) + dải cam kết. */}
      <HeroSlides pool={pool} />
      <CamKet />

      {khoiHien.map((k, i) => (
        <KhoiSanPhamTab key={k.tieuDe + i} khoi={k} nhan={NHAN_DAI[i % NHAN_DAI.length]} />
      ))}

      {/* Lưới dự phòng: chỉ hiện khi mọi dải theo bộ sưu tập đều rỗng — nghĩa
          là bộ sưu tập trên trang chủ chưa được nạp, chứ không phải shop hết
          hàng. Thà hiện hàng mới về còn hơn trang trắng. */}
      {coDaiDuPhong && (
        <section className="container-site py-16 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="tieu-de-section gach-tieu-de">
              <T k="home.new_arrivals" />
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
            {moiVe.slice(0, 8).map((p) => (
              <TheSanPham key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <NhaRuou the={nhaRuou} />
      <MoiTuVan />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bốn cam kết
// ─────────────────────────────────────────────────────────────────────────────

const BIEU_TUONG = [
  // Chính hãng: khiên + dấu tích
  "M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Zm-3 9 2.2 2.2L15.5 10",
  // Danh mục nhà rượu: ba chai
  "M7 21V11l1.5-2V4h3v5L13 11v10H7Zm8-10 1-1.5V6h2v3.5l1 1.5v10h-4",
  // Giao hàng: xe tải
  "M3 6.5h11v9H3v-9Zm11 3h4l3 3v3h-7v-6ZM7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  // Tư vấn: bong bóng thoại
  "M4 5.5h16v10H10l-4.5 3.5v-3.5H4v-10Z",
];

function CamKet() {
  return (
    <section className="border-b border-line">
      <div className="container-site grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4 lg:gap-x-10">
        {CAM_KET.map((ck, i) => (
          <Hien key={ck} tre={i * 80} className="flex items-center gap-4">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 shrink-0 stroke-copper"
              fill="none"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={BIEU_TUONG[i % BIEU_TUONG.length]} />
            </svg>
            <p className="text-[13px] leading-snug tracking-wide text-ink">
              <L values={theoNgonNgu((l) => CAM_KET_THEO_NGON_NGU[l][i] ?? ck)} />
            </p>
          </Hien>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nhà rượu — danh sách chữ
// ─────────────────────────────────────────────────────────────────────────────

function NhaRuou({ the }: { the: NhaRuouThe[] }) {
  if (NHA_RUOU.length === 0) return null;

  // Có số liệu thật thì dựng thẻ; chưa có (backend lỗi) thì rơi về danh sách chữ.
  if (the.length > 0) {
    return (
      <section className="bg-stone py-20 md:py-28">
        <div className="container-site">
          <Hien className="mb-12 text-center md:mb-14">
            <p className="nhan-nho mb-4">
              <T k="common.producers" />
            </p>
            <h2 className="tieu-de-section gach-tieu-de">
              <T k="home.explore_by_producer" emClassName="italic text-wine" />
            </h2>
          </Hien>

          <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-10 p-0 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
            {the.map((n, i) => (
              <Hien as="li" key={n.href} tre={(i % 5) * 70}>
                <Link href={n.href} className="group block">
                  <span className="relative flex aspect-[4/5] items-end justify-center overflow-hidden bg-page px-[8%] pb-[8%] pt-[14%] transition-colors duration-500 group-hover:bg-cream">
                    {n.anh.map((src, k) => (
                      <span
                        key={src}
                        className={`relative block self-end ${
                          n.anh.length === 1 ? "w-[60%]" : k === 1 ? "z-10 w-[44%]" : "w-[36%]"
                        } ${k === 0 && n.anh.length > 1 ? "-mr-[4%]" : ""} ${k === 2 ? "-ml-[4%]" : ""}`}
                        style={{ aspectRatio: "1 / 2.55" }}
                      >
                        <Anh
                          src={src}
                          alt=""
                          fill
                          sizes="(max-width: 767px) 25vw, 12vw"
                          loading="lazy"
                          className="object-contain mix-blend-multiply transition-transform duration-700 ease-cellar group-hover:-translate-y-1.5"
                        />
                      </span>
                    ))}
                  </span>
                  <span className="mt-5 block text-center">
                    <span className="block font-display text-[24px] leading-tight text-ink transition-colors duration-300 group-hover:text-wine">
                      <TL obj={n} field="ten" />
                    </span>
                    <span className="mt-1.5 block text-[12px] tracking-wide text-ink-muted">
                      <T k="home.wines" v={{ tong: n.tong }} />
                      {n.tuGia ? (
                        <>
                          {" · "}
                          <T k="home.from" v={{ p1: tienSong(n.tuGia) }} />
                        </>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </Hien>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-stone py-20 md:py-28">
      <div className="container-site grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Hien>
          <p className="nhan-nho mb-4">
            <T k="common.producers" />
          </p>
          <h2 className="tieu-de-section">
            <T k="home.explore_by_producer" />
          </h2>
          <span className="mt-7 block h-px w-14 bg-copper" aria-hidden="true" />
        </Hien>

        <ul className="grid gap-x-10 sm:grid-cols-2">
          {NHA_RUOU.map((m, i) => (
            <Hien as="li" key={m.href} tre={(i % 5) * 60}>
              <Link
                href={m.href}
                className="flex items-center justify-between border-b border-ink/15 py-5 font-display text-[26px] leading-tight text-ink transition-colors duration-300 hover:text-wine"
              >
                <TL obj={m} field="ten" />
              </Link>
            </Hien>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lời mời tư vấn
// ─────────────────────────────────────────────────────────────────────────────

function MoiTuVan() {
  return (
    <section className="nen-toi bg-wine text-page">
      <div className="container-site py-20 text-center md:py-28">
        <Hien>
          <span className="mx-auto mb-8 block h-px w-14 bg-copper" aria-hidden="true" />
          <h2 className="mx-auto max-w-2xl font-display text-[34px] font-normal leading-[1.15] !text-page md:text-[48px]">
            <T k="home.invite_title" emClassName="italic text-copper-light" />
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[16px] leading-[1.8] text-page/75">
            <T k="home.visit_one_of_our_boutiques" v={{ SO_CUA_HANG }} />
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/he-thong-cua-hang" className="btn-dong">
              <T k="home.find_a_boutique" />
            </Link>
            <Link href="/blog" className="btn-den">
              <T k="home.read_the_journal" />
            </Link>
          </div>
          <NutHoiAI className="mt-8" />
        </Hien>
      </div>
    </section>
  );
}
