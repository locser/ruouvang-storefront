import Link from "next/link";
import Anh from "./Anh";
import T from "./T";
import HeroCarousel from "./HeroCarousel";
import type { Product } from "@/lib/data";
import { tiLeAnh } from "@/lib/ti-le-anh";
import { duongDanDanhMuc } from "@/lib/theme";
import { HIEN_NHAN_DEMO } from "@/lib/su-kien";

/**
 * Hero trang chủ dạng carousel — 5 slide:
 *   1. Thương hiệu (nội dung hero cũ) · 2. Sự kiện giảm giá · 3. Thùng 6 chai
 *   4. Quà tặng · 5. Nhà rượu
 *
 * ⚠️ Slide 2–5 là NỘI DUNG DEMO để duyệt bố cục (các con số/ưu đãi chưa phải chương
 * trình thật). `HIEN_NHAN_DEMO` (lib/su-kien.ts) bật dải "Demo" góc phải mỗi slide đó.
 *
 * Mỗi slide lấy một bộ ba chai khác nhau từ chính sản phẩm đang bán (không dùng ảnh
 * quảng cáo có chữ in sẵn), nên khung hình luôn đúng với kho thật.
 */

type Khung = "vom" | "chunhat";
type NenSlide = "ruou" | "than" | "dong";

interface CauHinhSlide {
  id: string;
  /** Khoá i18n. */
  nhan: string;
  tieuDe: string;
  moTa: string;
  cta: { khoa: string; href: string };
  cta2?: { khoa: string; href: string };
  nen: NenSlide;
  khung: Khung;
  /** Dấu tròn đè lên khung ảnh (vd "-20%"). */
  dauTron?: string;
  /** Ưu tiên chai của các nhà rượu khớp biểu thức này. */
  uuTienNhaRuou?: RegExp;
  demo: boolean;
}

const SLIDES: CauHinhSlide[] = [
  {
    id: "thuong-hieu",
    nhan: "home.the_curated_collection",
    tieuDe: "home.hero_title",
    moTa: "home.from_coonawarra_the_limestone_coast",
    cta: { khoa: "home.explore_the_collection", href: duongDanDanhMuc("welcome20-discount") },
    cta2: { khoa: "home.find_a_boutique", href: "/he-thong-cua-hang" },
    nen: "ruou",
    khung: "vom",
    demo: false,
  },
  {
    id: "su-kien",
    nhan: "hero.s2_eyebrow",
    tieuDe: "hero.s2_title",
    moTa: "hero.s2_desc",
    cta: { khoa: "hero.s2_cta", href: "/su-kien" },
    cta2: { khoa: "hero.s2_cta2", href: duongDanDanhMuc("all-discount-blackfriday") },
    nen: "than",
    khung: "vom",
    dauTron: "hero.s2_seal",
    demo: true,
  },
  {
    id: "thung-6",
    nhan: "hero.s3_eyebrow",
    tieuDe: "hero.s3_title",
    moTa: "hero.s3_desc",
    cta: { khoa: "hero.s3_cta", href: duongDanDanhMuc("99-6-packs") },
    nen: "dong",
    khung: "chunhat",
    demo: true,
  },
  {
    id: "qua-tang",
    nhan: "hero.s4_eyebrow",
    tieuDe: "hero.s4_title",
    moTa: "hero.s4_desc",
    cta: { khoa: "hero.s4_cta", href: "/su-kien" },
    cta2: { khoa: "home.find_a_boutique", href: "/he-thong-cua-hang" },
    nen: "ruou",
    khung: "vom",
    demo: true,
  },
  {
    id: "nha-ruou",
    nhan: "hero.s5_eyebrow",
    tieuDe: "hero.s5_title",
    moTa: "hero.s5_desc",
    cta: { khoa: "hero.s5_cta", href: "/danh-muc" },
    nen: "than",
    khung: "chunhat",
    uuTienNhaRuou: /stonehaven|schild|ulithorne|reschke/i,
    demo: true,
  },
];

const NEN: Record<NenSlide, string> = {
  ruou: "radial-gradient(90% 120% at 18% 40%, #6B1E2E 0%, #4A1520 45%, #1C1A19 100%)",
  than: "radial-gradient(90% 130% at 82% 30%, #4A1520 0%, #2A1A1D 48%, #1C1A19 100%)",
  dong: "radial-gradient(90% 120% at 20% 55%, #5C4526 0%, #2D2218 52%, #1C1A19 100%)",
};

const laThung = (p: Product) => /(pack|case|dozen|carton)|(6|12)s*x/i.test(p.title);

/**
 * Chọn tối đa 3 chai cho một slide: chai lẻ, ảnh dọc, mỗi nhà rượu một chai, chưa dùng ở
 * slide trước. Hết chai chưa dùng thì nới dần (cho phép lặp) thay vì để khung trống.
 */
function chonBa(pool: Product[], daDung: Set<string>, uuTien?: RegExp): Product[] {
  const chon: Product[] = [];
  const nhaDaChon = new Set<string>();
  const thu = (nhat: boolean, ganUuTien: boolean) => {
    for (const p of pool) {
      if (chon.length === 3) return;
      if (!p.thumbnail || chon.some((c) => c.handle === p.handle)) continue;
      if (ganUuTien && !(p.brand && uuTien?.test(p.brand))) continue;
      if (nhat) {
        if (daDung.has(p.handle) || laThung(p)) continue;
        const tl = tiLeAnh(p.thumbnail);
        if (tl !== null && tl < 2.2) continue;
        if (p.brand && nhaDaChon.has(p.brand)) continue;
      }
      chon.push(p);
      if (p.brand) nhaDaChon.add(p.brand);
    }
  };
  if (uuTien) thu(true, true);
  thu(true, false);
  thu(false, false);
  chon.forEach((p) => daDung.add(p.handle));
  return chon;
}

function Slide({ cau, chai }: { cau: CauHinhSlide; chai: Product[] }) {
  // Chai giữa cao nhất, hai chai bên thấp hơn và lùi về phía sau.
  const bo = [
    { vt: 1, cls: "w-[27%] sm:w-[35%] -mr-[3%]" },
    { vt: 0, cls: "w-[33%] sm:w-[42%] z-10" },
    { vt: 2, cls: "w-[27%] sm:w-[35%] -ml-[3%]" },
  ];
  const ds = bo
    .map((b) => ({ ...b, p: chai[b.vt] }))
    .filter((b): b is typeof b & { p: Product } => Boolean(b.p));
  const vom = cau.khung === "vom";
  // Trang chỉ có MỘT <h1>: tiêu đề của slide đầu. Các slide sau là <h2>.
  const Tieude = cau.id === "thuong-hieu" ? "h1" : "h2";

  return (
    <section
      className="nen-toi relative w-full min-w-0 overflow-hidden bg-ink text-page"
      style={{ backgroundImage: NEN[cau.nen] }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 hidden h-[640px] w-[640px] -translate-y-1/2 rounded-full opacity-[0.16] blur-3xl lg:block"
        style={{ background: "radial-gradient(closest-side, #B08D57, transparent)" }}
      />

      {cau.demo && HIEN_NHAN_DEMO && (
        <span className="absolute right-0 top-0 z-10 bg-page/15 px-2.5 py-1.5 text-[9px] font-medium uppercase leading-none tracking-[0.18em] text-page/80">
          <T k="hero.demo" />
        </span>
      )}

      <div className="container-site relative grid items-center gap-8 pb-[72px] pt-9 md:min-h-[560px] md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:pb-24 md:pt-14 lg:min-h-[680px] lg:pb-28 lg:pt-16">
        <div className="max-w-xl">
          <p className="nhan-nho hero-an mb-4 md:mb-6" style={{ ["--tre" as string]: "0ms" }}>
            <T k={cau.nhan} />
          </p>

          <Tieude
            className="hero-an m-0 font-display text-[40px] font-normal leading-[1.04] !text-page sm:text-[52px] lg:text-[76px]"
            style={{ ["--tre" as string]: "120ms" }}
          >
            <T k={cau.tieuDe} emClassName="font-normal italic text-copper-light" />
          </Tieude>

          <p
            className="hero-an mt-7 hidden max-w-md text-[16px] leading-[1.8] text-page/75 sm:block"
            style={{ ["--tre" as string]: "260ms" }}
          >
            <T k={cau.moTa} />
          </p>

          <div
            className="hero-an mt-6 flex gap-3 sm:mt-10 sm:flex-wrap sm:gap-4"
            style={{ ["--tre" as string]: "400ms" }}
          >
            <Link href={cau.cta.href} className="btn-dong flex-1 !px-4 sm:flex-none sm:!px-8">
              <T k={cau.cta.khoa} />
            </Link>
            {cau.cta2 && (
              <Link href={cau.cta2.href} className="btn-den flex-1 !px-4 sm:flex-none sm:!px-8">
                <T k={cau.cta2.khoa} />
              </Link>
            )}
          </div>
        </div>

        {ds.length > 0 && (
          <div
            className="hero-an relative mx-auto w-full max-w-[340px] sm:max-w-[400px] md:ml-auto md:mr-0 lg:max-w-[440px]"
            style={{ ["--tre" as string]: "200ms" }}
          >
            <div
              aria-hidden="true"
              className={`absolute inset-0 translate-x-3 translate-y-3 border border-copper/60 ${
                vom ? "rounded-t-[999px]" : "rounded-[6px]"
              }`}
            />
            <div
              className={`the-sp__nen relative flex aspect-[4/3.5] items-end justify-center overflow-hidden px-[6%] pb-[5%] sm:aspect-[4/5] ${
                vom
                  ? "rounded-t-[999px] pt-[9%] sm:pb-[6%] sm:pt-[18%]"
                  : "rounded-[6px] pt-[9%] sm:pb-[6%] sm:pt-[18%]"
              }`}
            >
              {ds.map(({ p, cls }) => (
                <Link
                  key={p.handle}
                  href={`/san-pham/${p.handle}`}
                  aria-label={p.title}
                  className={`relative block self-end ${cls}`}
                  style={{ aspectRatio: "1 / 2.55" }}
                >
                  <Anh
                    src={p.thumbnail}
                    alt={p.title}
                    fill
                    sizes="(max-width: 1023px) 30vw, 140px"
                    className="object-contain mix-blend-multiply transition-transform duration-700 ease-cellar hover:-translate-y-2"
                  />
                </Link>
              ))}
            </div>

            {cau.dauTron && (
              <div className="absolute -right-1 top-4 z-20 grid h-[84px] w-[84px] place-items-center rounded-full border border-copper bg-wine text-center font-display text-[28px] leading-none text-copper-light shadow-[0_10px_30px_rgba(0,0,0,0.4)] sm:-right-4 sm:h-[104px] sm:w-[104px] sm:text-[34px]">
                <T k={cau.dauTron} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-copper/60 to-transparent" aria-hidden="true" />
    </section>
  );
}

export default function HeroSlides({ pool }: { pool: Product[] }) {
  const daDung = new Set<string>();
  const slides = SLIDES.map((cau) => (
    <Slide key={cau.id} cau={cau} chai={chonBa(pool, daDung, cau.uuTienNhaRuou)} />
  ));
  return <HeroCarousel slides={slides} />;
}
