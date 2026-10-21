import type { Metadata } from "next";
import Link from "next/link";
import { layCaiDat } from "@/lib/lay-cai-dat";
import Anh from "@/components/Anh";
import Hien from "@/components/Hien";
import NutHoiAI from "@/components/NutHoiAI";
import T, { L, TL } from "@/components/T";
import { ChaiVang, KhungAnh, SpriteChai, type NenAnh } from "@/components/cam-nang/ChaiVang";
import OTimCamNang from "@/components/cam-nang/OTimCamNang";
import { dinhDangNgay, layDanhMucBlog, layDanhSachBai, type BaiViet } from "@/lib/blog";
import { PHOI_MON, THUAT_NGU } from "@/lib/cam-nang";
import { BAI_MAU, BAI_NOI_BAT_MAU, DANH_MUC_MAU, type BaiMau } from "@/lib/cam-nang-mau";
import { LOI_VAO_CHINH } from "@/lib/dieu-huong";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cẩm nang rượu vang",
  description:
    "Cẩm nang chọn, thưởng thức và tặng rượu vang Úc: ngắn gọn, dễ hiểu, từ C.W. Wines.",
  alternates: { canonical: "/blog" },
};

/** Số bài mỗi trang khi xem bình thường. */
const MOI_TRANG = 12;
/** Khi tìm kiếm, nạp rộng hơn một trang để lọc trong bộ nhớ (Store API chưa có `q`). */
const TIM_TOI_DA = 60;

interface Props {
  searchParams: Promise<{ trang?: string; q?: string; "chu-de"?: string }>;
}

/** Bỏ dấu + hạ chữ thường, để "bo nuong" tìm ra "Bò nướng". */
const bo = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

function khopTuKhoa(b: BaiViet, tuKhoa: string): boolean {
  const kho = [
    b.tieuDe,
    b.tomTat,
    b.tieuDeEn,
    b.tomTatEn,
    b.tuKhoa, // bài mẫu: từ khoá phụ của thiết kế
    ...b.danhMuc.map((c) => c.name),
  ]
    .filter((x): x is string => typeof x === "string")
    .join(" ");
  return bo(kho).includes(tuKhoa);
}

/** Đường dẫn trang Cẩm nang, giữ nguyên bộ lọc hiện có. */
function duongDan(o: { q?: string; chuDe?: string; trang?: number }, neo = true): string {
  const p = new URLSearchParams();
  if (o.q) p.set("q", o.q);
  if (o.chuDe) p.set("chu-de", o.chuDe);
  if (o.trang && o.trang > 1) p.set("trang", String(o.trang));
  const chuoi = p.toString();
  return `/blog${chuoi ? `?${chuoi}` : ""}${neo ? "#bai-viet" : ""}`;
}

/** Bài thật → trang chi tiết; bài mẫu → đích riêng của nó (chưa có trang chi tiết). */
const duongBai = (b: BaiViet) => (b as Partial<BaiMau>).href ?? `/blog/${b.slug}`;

/** Bảng màu ảnh minh hoạ cho bài chưa có ảnh thật — xoay vòng theo thứ tự bài. */
const MAU_CHAI: Array<{ nen: NenAnh; thuy: string; nap?: string; kieu?: "chai" | "ly" }> = [
  { nen: "ruou", thuy: "#1B0A0E", nap: "#B08D57" },
  { nen: "vang", thuy: "#3B2A12", nap: "#6B1E2E" },
  { nen: "giay", thuy: "#B9923A", nap: "#2A2420" },
  { nen: "hong", thuy: "#C98DA0", nap: "#6B1E2E" },
  { nen: "muc", thuy: "#8C2A3E", kieu: "ly" },
  { nen: "vang", thuy: "#1F3B2A", nap: "#B08D57" },
];

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const tuKhoa = bo(q);
  const trang = Math.max(1, Number(sp.trang ?? 1) || 1);

  let danhMuc = await layDanhMucBlog();

  // Medusa không có chuyên mục lẫn bài viết nào (backend tắt hoặc chưa soạn bài):
  // dùng bộ bài mẫu của thiết kế để trang không trống. Có dữ liệu thật thì KHÔNG đụng tới bộ mẫu.
  const dungMau =
    danhMuc.length === 0 && (await layDanhSachBai({ limit: 1 })).bai.length === 0;
  if (dungMau) danhMuc = DANH_MUC_MAU;

  // Slug lạ thì coi như "Tất cả" — không 404 một trang vốn có nội dung.
  const chuDe = danhMuc.find((c) => c.slug === sp["chu-de"])?.slug;

  let bai: BaiViet[];
  let soTrang: number;
  let noiBat: BaiViet | undefined;

  if (dungMau) {
    bai = BAI_MAU.filter(
      (b) => (!chuDe || b.danhMuc[0].slug === chuDe) && (!tuKhoa || khopTuKhoa(b, tuKhoa))
    );
    soTrang = 1;
    noiBat = !tuKhoa && !chuDe ? BAI_NOI_BAT_MAU : undefined;
  } else {
    const { bai: nap, tong } = await layDanhSachBai({
      danhMuc: chuDe,
      limit: tuKhoa ? TIM_TOI_DA : MOI_TRANG,
      offset: tuKhoa ? 0 : (trang - 1) * MOI_TRANG,
    });
    bai = tuKhoa ? nap.filter((b) => khopTuKhoa(b, tuKhoa)) : nap;
    soTrang = tuKhoa ? 1 : Math.max(1, Math.ceil(tong / MOI_TRANG));
    // Bài nổi bật chỉ hiện ở lần xem đầu, chưa lọc — lọc rồi thì khách đang tìm thứ khác.
    noiBat = !tuKhoa && !chuDe && trang === 1 ? bai.find((b) => b.noiBat) : undefined;
  }

  const zalo = ((await layCaiDat()).zalo_phone ?? "").replace(/\D/g, "");

  return (
    <div className="overflow-x-clip">
      <SpriteChai />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cn-h1" className="pb-14 pt-8 md:pb-20 md:pt-12 lg:pb-24 lg:pt-16">
        <div className="container-site grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
          <div>
            <div className="vao-len flex items-center gap-3 text-copper" aria-hidden="true">
              <span className="h-px w-10 bg-current opacity-70" />
              <i className="h-[5px] w-[5px] rotate-45 bg-current" />
              <span className="h-px w-10 bg-current opacity-70" />
            </div>
            <h1
              id="cn-h1"
              className="vao-len mb-5 mt-5 text-[clamp(46px,9vw,92px)] leading-[1.08]"
              style={{ "--tre": "80ms" } as React.CSSProperties}
            >
              <L
                values={{
                  vi: (
                    <>
                      Cẩm nang<em className="block italic text-wine">rượu vang</em>
                    </>
                  ),
                  en: (
                    <>
                      The wine<em className="block italic text-wine">journal</em>
                    </>
                  ),
                }}
              />
            </h1>
            <p
              className="vao-len max-w-[460px] text-[16px] text-ink-muted md:text-[17px]"
              style={{ "--tre": "160ms" } as React.CSSProperties}
            >
              <L
                values={{
                  vi: "Chọn chai hợp bữa ăn, hợp dịp tặng, hợp ngân sách. Không thuật ngữ rối rắm, chỉ điều bạn cần để tự tin cầm một ly vang.",
                  en: "Choose a bottle that suits the meal, the occasion and the budget. No tangled jargon — just what you need to pick up a glass with confidence.",
                }}
              />
            </p>
            <div className="vao-len" style={{ "--tre": "240ms" } as React.CSSProperties}>
              <OTimCamNang q={q} chuDe={chuDe} />
            </div>
          </div>

          {/* Khung vòm — chi tiết trang trí, bỏ qua với trình đọc màn hình. */}
          <div
            className="vao-len relative mx-auto w-full max-w-[300px] sm:max-w-[420px]"
            style={{ "--tre": "160ms" } as React.CSSProperties}
            aria-hidden="true"
          >
            <div className="pointer-events-none absolute -right-3.5 -top-3.5 bottom-3.5 left-3.5 rounded-t-full border border-copper" />
            <KhungAnh nen="ruou" className="aspect-[4/5] rounded-t-full">
              <ChaiVang thuy="#1B0A0E" nap="#B08D57" cao="74%" />
            </KhungAnh>
            <div className="absolute -left-1.5 bottom-7 border border-line bg-page px-[18px] py-3 text-[11px] font-medium uppercase leading-snug tracking-[0.12em] text-ink-muted lg:-left-8 lg:text-[12px]">
              <L values={{ vi: "Chọn lọc bởi", en: "Curated by" }} />
              <b className="mt-0.5 block font-display text-[20px] font-medium normal-case leading-[1.1] tracking-normal text-wine">
                C.W. Wines
              </b>
            </div>
          </div>
        </div>
      </section>

      {/* ── CHỦ ĐỀ ───────────────────────────────────────────────────────── */}
      {danhMuc.length > 0 && (
        <div className="border-y border-line bg-cream">
          <h2 id="cn-chu-de" className="sr-only">
            <T k="camnang.topics_label" />
          </h2>
          {/* Thanh cuộn ngang tràn mép màn hình; ≥ lg thì căn giữa nếu đủ chỗ. */}
          <nav
            aria-labelledby="cn-chu-de"
            className="cuon-ngang an-thanh-cuon overflow-x-auto"
          >
            <div className="mx-auto flex w-max min-w-full max-w-none gap-1.5 px-5 md:px-8 lg:justify-center">
              {[{ slug: undefined, nhan: null as null }, ...danhMuc.map((c) => ({ slug: c.slug, nhan: c }))].map(
                (muc) => {
                  const dangChon = (muc.slug ?? undefined) === chuDe;
                  return (
                    <Link
                      key={muc.slug ?? "tat-ca"}
                      href={duongDan({ q, chuDe: muc.slug })}
                      scroll={false}
                      aria-current={dangChon ? "page" : undefined}
                      className={`relative flex min-h-[56px] shrink-0 items-center px-4 text-[13px] font-medium uppercase tracking-[0.1em] transition-colors after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:origin-left after:bg-wine after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100 motion-reduce:after:transition-none ${
                        dangChon ? "text-wine after:scale-x-100" : "text-ink-soft after:scale-x-0"
                      }`}
                    >
                      {muc.nhan ? <TL obj={muc.nhan} field="name" /> : <T k="common.all" />}
                    </Link>
                  );
                }
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ── BÀI NÊN ĐỌC TRƯỚC ───────────────────────────────────────────── */}
      {noiBat && (
        <section className="nen-toi bg-menubar text-page" aria-labelledby="cn-noi-bat">
          <div className="grid lg:grid-cols-[1.15fr_1fr]">
            <KhungAnh nen="muc" className="aspect-[4/3] w-full min-w-0 lg:aspect-auto lg:min-h-[560px]">
              {noiBat.thumbnail ? (
                <Anh
                  src={noiBat.thumbnail}
                  alt=""
                  fill
                  sizes="(max-width: 1023px) 100vw, 55vw"
                  className="object-cover"
                />
              ) : (
                <ChaiVang thuy="#26110F" nap="#B08D57" cao="80%" className="lg:!h-[460px]" />
              )}
            </KhungAnh>
            <div className="flex flex-col justify-center gap-5 px-5 pb-14 pt-10 md:px-8 lg:p-16">
              <Hien>
                <div className="nhan-nho">
                  <L values={{ vi: "Bài nên đọc trước", en: "Start here" }} />
                </div>
              </Hien>
              <Hien tre={80}>
                <h2
                  id="cn-noi-bat"
                  className="text-[clamp(34px,5vw,56px)] leading-[1.08] text-page"
                >
                  <TL obj={noiBat} field="tieuDe" />
                </h2>
              </Hien>
              {noiBat.tomTat && (
                <Hien tre={160}>
                  <p className="dong-3 max-w-[480px] text-[16px] text-[#CFC7BB]">
                    <TL obj={noiBat} field="tomTat" />
                  </p>
                </Hien>
              )}
              <Hien tre={160} className="flex flex-wrap gap-x-2.5 text-[13px] text-[#A99F92]">
                <span>
                  <T k="common.min_read" v={{ phutDoc: noiBat.phutDoc }} />
                </span>
                {noiBat.danhMuc[0] && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      <TL obj={noiBat.danhMuc[0]} field="name" />
                    </span>
                  </>
                )}
              </Hien>
              <Hien tre={240}>
                <Link href={duongBai(noiBat)} className="btn-dong group">
                  <L values={{ vi: "Đọc bài viết", en: "Read the article" }} />
                  <MuiTen className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
              </Hien>
            </div>
          </div>
        </section>
      )}

      {/* ── BỮA TỐI NAY ĂN GÌ? ──────────────────────────────────────────── */}
      <section className="pt-16 lg:pt-24" aria-labelledby="cn-phoi-mon">
        <div className="container-site">
          <div className="mb-10 flex flex-col gap-3.5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3.5">
              <div className="nhan-nho">
                <L values={{ vi: "Chọn nhanh", en: "Quick pick" }} />
              </div>
              <h2 id="cn-phoi-mon" className="text-[clamp(34px,5vw,52px)] leading-[1.08]">
                <L
                  values={{
                    vi: (
                      <>
                        Bữa tối nay <em className="italic text-wine">ăn gì?</em>
                      </>
                    ),
                    en: (
                      <>
                        What&apos;s for <em className="italic text-wine">dinner tonight?</em>
                      </>
                    ),
                  }}
                />
              </h2>
            </div>
            <p className="max-w-[520px] text-ink-soft">
              <L
                values={{
                  vi: "Chạm vào món để xem kiểu vang hợp nhất, kèm những chai chúng tôi đề xuất.",
                  en: "Tap a dish to see the style of wine that suits it best, with the bottles we recommend.",
                }}
              />
            </p>
          </div>

          <ul className="border-t border-ink">
            {PHOI_MON.map((m, i) => (
              <Hien as="li" key={m.timKiem} tre={i * 60}>
                <Link
                  href={`/tim-kiem?q=${encodeURIComponent(m.timKiem)}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-1.5 border-b border-line py-5 transition-[padding] duration-300 ease-cellar hover:pl-3 motion-reduce:transition-none motion-reduce:hover:pl-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:py-6"
                >
                  <span className="font-display text-[clamp(28px,5vw,44px)] font-medium leading-[1.1] text-ink transition-colors group-hover:text-wine">
                    <L values={m.ten} />
                  </span>
                  <span className="col-start-1 text-[14px] text-ink-soft md:col-start-2 md:row-start-1 md:text-[15px]">
                    <L values={m.goiY} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="col-start-2 row-span-2 row-start-1 grid h-11 w-11 place-items-center rounded-full border border-line text-wine transition-colors duration-300 group-hover:border-wine group-hover:bg-wine group-hover:text-page md:col-start-3 md:row-span-1"
                  >
                    <MuiTen />
                  </span>
                </Link>
              </Hien>
            ))}
          </ul>
        </div>
      </section>

      {/* ── BÀI VIẾT ────────────────────────────────────────────────────── */}
      <section id="bai-viet" className="pt-16 lg:pt-24" aria-labelledby="cn-bai-moi">
        <div className="container-site">
          <div className="mb-10 flex flex-col gap-3.5">
            <div className="nhan-nho">
              <L values={{ vi: "Bài mới", en: "Latest" }} />
            </div>
            <h2 id="cn-bai-moi" className="text-[clamp(34px,5vw,52px)] leading-[1.08]">
              <L values={{ vi: "Đọc gì hôm nay", en: "What to read today" }} />
            </h2>
          </div>

          {q && (
            <p role="status" className="mb-8 text-[14px] text-ink-soft">
              <L values={{ vi: "Kết quả cho", en: "Results for" }} /> “{q}” ·{" "}
              <Link
                href={duongDan({ chuDe })}
                scroll={false}
                className="lien-ket font-medium text-wine"
              >
                <L values={{ vi: "Xóa tìm kiếm", en: "Clear search" }} />
              </Link>
            </p>
          )}

          {bai.length > 0 ? (
            <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
              {bai.map((b, i) => (
                <Hien as="article" key={b.id} tre={(i % 3) * 80}>
                  <TheCamNang bai={b} thuTu={i} />
                </Hien>
              ))}
            </div>
          ) : (
            <div role="status" className="py-16 text-center text-ink-soft">
              <b className="mb-2 block font-display text-[30px] font-medium leading-tight text-ink">
                <L values={{ vi: "Chưa có bài phù hợp", en: "No matching articles" }} />
              </b>
              <L
                values={{
                  vi: "Thử từ khóa khác, hoặc nhắn cho chúng tôi để được tư vấn.",
                  en: "Try another keyword, or message us for advice.",
                }}
              />
            </div>
          )}

          {soTrang > 1 && (
            <nav aria-label="Pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: soTrang }, (_, k) => k + 1).map((t) => (
                <Link
                  key={t}
                  href={duongDan({ chuDe, trang: t })}
                  aria-current={t === trang ? "page" : undefined}
                  className={`grid h-11 min-w-[44px] place-items-center border px-3 text-[14px] font-semibold transition-colors ${
                    t === trang
                      ? "border-wine bg-wine text-white"
                      : "border-line bg-white text-ink-muted hover:border-wine hover:text-wine"
                  }`}
                >
                  {t}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      {/* ── THUẬT NGỮ ───────────────────────────────────────────────────── */}
      <section className="pt-16 lg:pt-24" aria-labelledby="cn-thuat-ngu">
        <div className="container-site">
          <div className="mb-10 flex flex-col gap-3.5">
            <div className="nhan-nho">
              <L values={{ vi: "Từ điển nhanh", en: "Quick glossary" }} />
            </div>
            <h2 id="cn-thuat-ngu" className="text-[clamp(34px,5vw,52px)] leading-[1.08]">
              <L values={{ vi: "Thuật ngữ trong một phút", en: "Wine terms in a minute" }} />
            </h2>
          </div>
          <dl className="grid border-t border-ink md:grid-cols-2 md:gap-x-16">
            {THUAT_NGU.map((t, i) => (
              <Hien key={t.tu.vi} tre={(i % 2) * 80} className="grid gap-1.5 border-b border-line py-6">
                <dt className="grid gap-1.5">
                  <small className="text-[11px] font-medium uppercase tracking-caps text-copper-ink">
                    <L values={t.nhom} />
                  </small>
                  <span className="font-display text-[30px] font-medium leading-[1.1] text-wine">
                    <L values={t.tu} />
                  </span>
                </dt>
                <dd className="max-w-[560px] text-ink-muted">
                  <L values={t.nghia} />
                </dd>
              </Hien>
            ))}
          </dl>
        </div>
      </section>

      {/* ── TƯ VẤN ──────────────────────────────────────────────────────── */}
      <section
        aria-label="Tư vấn chọn rượu"
        className="nen-toi relative mt-16 overflow-hidden bg-wine px-5 py-20 text-center text-page before:pointer-events-none before:absolute before:inset-3 before:border before:border-copper/55 md:py-24 md:before:inset-[18px] lg:mt-24 lg:py-28"
      >
        <div className="relative">
          <div className="flex items-center justify-center gap-3 text-copper" aria-hidden="true">
            <span className="h-px w-10 bg-current opacity-70" />
            <i className="h-[5px] w-[5px] rotate-45 bg-current" />
            <span className="h-px w-10 bg-current opacity-70" />
          </div>
          <Hien>
            <p className="mx-auto mb-8 mt-6 max-w-[620px] font-display text-[clamp(26px,4.4vw,40px)] leading-[1.2] text-page">
              <L
                values={{
                  vi: "Cho chúng tôi biết dịp, món ăn và ngân sách. Chúng tôi sẽ chọn giúp bạn.",
                  en: "Tell us the occasion, the dish and your budget. We'll choose for you.",
                }}
              />
            </p>
          </Hien>
          <div className="mx-auto flex max-w-[520px] flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <NutHoiAI className="[&>button]:w-full sm:[&>button]:w-auto" />
            {zalo && (
              <a
                href={`https://zalo.me/${zalo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-den"
              >
                <L values={{ vi: "Nhắn Zalo tư vấn", en: "Message us on Zalo" }} />
              </a>
            )}
            <Link href={LOI_VAO_CHINH[0].href} className="btn-den">
              <L values={{ vi: "Xem tất cả rượu vang", en: "Shop all wines" }} />
            </Link>
          </div>
          <p className="mx-auto mt-6 max-w-[460px] text-[13px] text-[#EBDCD6]">
            <L
              values={
                zalo
                  ? {
                      vi: "Trợ lý AI trả lời tức thì, mọi lúc. Cần người thật? Nhắn Zalo cho chuyên viên.",
                      en: "The AI assistant answers instantly, any time. Prefer a person? Message a specialist on Zalo.",
                    }
                  : {
                      vi: "Trợ lý AI trả lời tức thì, mọi lúc.",
                      en: "The AI assistant answers instantly, any time.",
                    }
              }
            />
          </p>
        </div>
      </section>
    </div>
  );
}

function MuiTen({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Thẻ bài viết kiểu biên tập: ảnh dọc, nhãn chủ đề, tiêu đề serif, chân thẻ. */
function TheCamNang({ bai, thuTu }: { bai: BaiViet; thuTu: number }) {
  const mau = MAU_CHAI[thuTu % MAU_CHAI.length];
  const href = duongBai(bai);
  const { chuThich, nhanLienKet } = bai as Partial<BaiMau>;
  const chuDe = bai.danhMuc[0];

  return (
    <div className="group flex h-full flex-col gap-4">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
        <KhungAnh nen={mau.nen} className="aspect-[4/3] sm:aspect-[4/5]">
          {bai.thumbnail ? (
            <Anh
              src={bai.thumbnail}
              alt=""
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              loading="lazy"
              className="object-cover transition-transform duration-700 ease-cellar group-hover:scale-[1.03] motion-reduce:transition-none"
            />
          ) : (
            <ChaiVang thuy={mau.thuy} nap={mau.nap} kieu={mau.kieu} />
          )}
        </KhungAnh>
      </Link>

      {chuDe && (
        <div className="text-[11px] font-medium uppercase tracking-caps text-copper-ink">
          <TL obj={chuDe} field="name" />
        </div>
      )}

      <h3 className="font-display text-[clamp(28px,3.2vw,34px)] font-medium leading-[1.1] text-ink">
        <Link
          href={href}
          className="lien-ket group-hover:[background-size:100%_1px]"
        >
          <TL obj={bai} field="tieuDe" />
        </Link>
      </h3>

      {bai.tomTat && (
        <p className="dong-3 text-[15px] text-ink-muted">
          <TL obj={bai} field="tomTat" />
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3.5 text-[13px] text-ink-soft">
        <span>
          {chuThich ? (
            <L values={chuThich} />
          ) : (
            <>
              {bai.publishedAt && (
                <>
                  {dinhDangNgay(bai.publishedAt)} <span aria-hidden="true">·</span>{" "}
                </>
              )}
              <T k="common.min_read" v={{ phutDoc: bai.phutDoc }} />
            </>
          )}
        </span>
        <Link
          href={href}
          className="inline-flex min-h-11 items-center whitespace-nowrap text-[12px] font-medium uppercase tracking-wide2 text-wine hover:underline hover:underline-offset-4"
        >
          <L values={nhanLienKet ?? { vi: "Đọc tiếp", en: "Read more" }} />
        </Link>
      </div>
    </div>
  );
}
