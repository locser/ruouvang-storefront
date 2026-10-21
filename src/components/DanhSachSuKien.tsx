"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import T, { TL } from "./T";
import { HIEN_NHAN_DEMO, type LoaiSuKien, type SuKien } from "@/lib/su-kien";

/**
 * Danh sách sự kiện: khối nổi bật + lưới thẻ, lọc theo loại (giảm giá / quà tặng /
 * combo). Lọc ở phía trình duyệt vì chỉ vài chục mục — không cần gọi mạng.
 */

type Loc = "tat-ca" | LoaiSuKien;

const D_THE: Record<LoaiSuKien, string> = {
  // nhãn giá
  "giam-gia": "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  // hộp quà
  "qua-tang": "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z",
  // thùng hàng
  combo: "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
};

const KHOA_LOAI: Record<LoaiSuKien, string> = {
  "giam-gia": "events.type_discount",
  "qua-tang": "events.type_gift",
  combo: "events.type_combo",
};

function Bieu({ d, className = "h-[16px] w-[16px]" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function MuiTen() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[16px] w-[16px] shrink-0 transition-transform duration-300 group-hover:translate-x-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

function NhanDemo() {
  if (!HIEN_NHAN_DEMO) return null;
  return (
    <span className="absolute right-0 top-0 bg-ink px-2 py-1 text-[9px] font-medium uppercase leading-none tracking-[0.18em] text-page/80">
      <T k="events.demo_ribbon" />
    </span>
  );
}

function TrangThai({ ev, toi = false }: { ev: SuKien; toi?: boolean }) {
  const dang = ev.trangThai === "dang-dien-ra";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] ${
        toi ? (dang ? "text-copper-light" : "text-page/60") : dang ? "text-wine" : "text-ink-soft"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${dang ? "bg-[#22C55E]" : toi ? "bg-page/40" : "bg-ink/30"}`}
      />
      <T k={dang ? "events.status_live" : "events.status_soon"} />
    </span>
  );
}

function KhoiNoiBat({ ev }: { ev: SuKien }) {
  return (
    <article
      className="nen-toi relative overflow-hidden bg-ink text-page"
      style={{ backgroundImage: "radial-gradient(90% 140% at 12% 30%, #6B1E2E 0%, #4A1520 50%, #1C1A19 100%)" }}
    >
      <NhanDemo />
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-14 lg:p-14">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-copper-light">
              <Bieu d={D_THE[ev.loai]} />
              <T k={KHOA_LOAI[ev.loai]} />
            </span>
            <TrangThai ev={ev} toi />
          </div>
          <h2 className="m-0 font-display text-[38px] font-normal leading-[1.05] !text-page sm:text-[52px] lg:text-[64px]">
            <TL obj={ev} field="tieuDe" />
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-[1.8] text-page/75 sm:text-[16px]">
            <TL obj={ev} field="moTa" />
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href={ev.href} className="btn-dong">
              <T k="events.view_offer" />
            </Link>
            <span className="text-[12px] tracking-wide text-page/60">
              <TL obj={ev} field="thoiGian" />
            </span>
          </div>
        </div>

        <div className="border border-copper/50 p-6 text-center sm:p-8 lg:text-left">
          <p className="nhan-nho !mb-3 !text-copper-light">
            <T k="events.the_offer" />
          </p>
          <p className="m-0 font-display text-[34px] italic leading-tight text-copper-light sm:text-[44px]">
            <TL obj={ev} field="uuDai" />
          </p>
          <span className="my-5 block h-px w-12 bg-copper/70 lg:mx-0" aria-hidden="true" />
          <p className="m-0 text-[13px] leading-relaxed text-page/70">
            <TL obj={ev} field="dieuKien" />
          </p>
        </div>
      </div>
    </article>
  );
}

function TheSuKien({ ev }: { ev: SuKien }) {
  return (
    <article className="relative flex h-full flex-col border border-line bg-cream p-6 transition-colors duration-300 hover:border-wine">
      <NhanDemo />
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 pr-12">
        <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-copper-ink">
          <Bieu d={D_THE[ev.loai]} />
          <T k={KHOA_LOAI[ev.loai]} />
        </span>
        <TrangThai ev={ev} />
      </div>

      <h3 className="m-0 font-display text-[27px] font-normal leading-tight text-ink">
        <TL obj={ev} field="tieuDe" />
      </h3>
      <p className="mt-2 font-display text-[19px] italic leading-snug text-wine">
        <TL obj={ev} field="uuDai" />
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
        <TL obj={ev} field="moTa" />
      </p>

      <p className="mt-4 border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-soft">
        <TL obj={ev} field="dieuKien" />
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-[12px] tracking-wide text-ink-soft">
          <TL obj={ev} field="thoiGian" />
        </span>
        <Link
          href={ev.href}
          className="group inline-flex min-h-[44px] items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
        >
          <T k="events.view_offer" />
          <MuiTen />
        </Link>
      </div>
    </article>
  );
}

export default function DanhSachSuKien({ suKien }: { suKien: SuKien[] }) {
  const [loc, setLoc] = useState<Loc>("tat-ca");

  const noiBat = suKien.find((e) => e.noiBat) ?? null;
  const conLai = useMemo(
    () => suKien.filter((e) => e !== noiBat && (loc === "tat-ca" || e.loai === loc)),
    [suKien, noiBat, loc]
  );
  const dem = (l: Loc) => (l === "tat-ca" ? suKien.length : suKien.filter((e) => e.loai === l).length);

  const bo: { ma: Loc; khoa: string }[] = [
    { ma: "tat-ca", khoa: "events.filter_all" },
    { ma: "giam-gia", khoa: "events.type_discount" },
    { ma: "qua-tang", khoa: "events.type_gift" },
    { ma: "combo", khoa: "events.type_combo" },
  ];

  return (
    <>
      {noiBat && (loc === "tat-ca" || noiBat.loai === loc) && <KhoiNoiBat ev={noiBat} />}

      <div
        role="group"
        aria-label="Filter"
        className="cuon-ngang -mx-5 mt-10 flex gap-2 overflow-x-auto px-5 md:mx-0 md:justify-center md:px-0"
      >
        {bo.map((b) => {
          const dang = loc === b.ma;
          return (
            <button
              key={b.ma}
              type="button"
              onClick={() => setLoc(b.ma)}
              aria-pressed={dang}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border px-4 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine ${
                dang
                  ? "border-wine bg-wine text-page"
                  : "border-ink/20 text-ink-muted hover:border-wine hover:text-wine"
              }`}
            >
              <T k={b.khoa} />
              <span className={`text-[11px] tabular-nums ${dang ? "text-page/70" : "text-ink-soft"}`}>
                {dem(b.ma)}
              </span>
            </button>
          );
        })}
      </div>

      {conLai.length > 0 ? (
        <ul className="m-0 mt-8 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {conLai.map((ev) => (
            <li key={ev.id}>
              <TheSuKien ev={ev} />
            </li>
          ))}
        </ul>
      ) : (
        !(noiBat && (loc === "tat-ca" || noiBat.loai === loc)) && (
          <p className="py-16 text-center font-display text-[24px] italic text-ink-muted">
            <T k="events.empty" />
          </p>
        )
      )}
    </>
  );
}
