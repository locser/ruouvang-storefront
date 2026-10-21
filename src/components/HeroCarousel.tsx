"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n/use-t";

/**
 * CAROUSEL CHO HERO TRANG CHỦ.
 *
 * Dựng trên cuộn ngang gốc của trình duyệt (`scroll-snap`) nên vuốt trên điện thoại
 * mượt như cuộn thường, không cần thư viện, và không có JS thì vẫn vuốt được. Nút,
 * chấm tiến độ và tự chuyển slide chỉ là lớp điều khiển phía trên.
 *
 * Trải nghiệm & trợ năng (theo UI/UX Pro Max, WCAG 2.2.2):
 *   · Tự chuyển 7 giây, DỪNG khi rê chuột, focus bàn phím, chạm, tab ẩn — và có nút
 *     Tạm dừng/Tiếp tục cho người dùng. Tắt hẳn khi chọn "giảm chuyển động".
 *   · Chấm tiến độ dạng thanh mảnh chạy theo thời gian còn lại của slide hiện tại.
 *   · Slide ngoài khung bị `inert` (không focus, không đọc nhầm); vùng nhấn chấm ≥ 44px.
 *   · Mũi tên trái/phải khi focus trong carousel; nút Trước/Sau trên màn hình rộng.
 *
 * `slides` là các phần tử dựng sẵn ở server (nội dung, ảnh, i18n); component này chỉ
 * điều khiển việc hiển thị. Slide đang hiện nhận `data-active="true"` để CSS chạy hiệu
 * ứng chữ hiện dần (xem `.hero-an` trong globals.css).
 */
export default function HeroCarousel({
  slides,
  thoiGian = 7000,
}: {
  slides: ReactNode[];
  thoiGian?: number;
}) {
  const t = useT();
  const n = slides.length;
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [tamDung, setTamDung] = useState(false);
  const [dangTuongTac, setDangTuongTac] = useState(false);
  const [giamChuyenDong, setGiamChuyenDong] = useState(false);
  const [tabAn, setTabAn] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const doi = () => setGiamChuyenDong(mq.matches);
    doi();
    mq.addEventListener("change", doi);
    return () => mq.removeEventListener("change", doi);
  }, []);

  useEffect(() => {
    const doi = () => setTabAn(document.hidden);
    document.addEventListener("visibilitychange", doi);
    return () => document.removeEventListener("visibilitychange", doi);
  }, []);

  const tuDong = n > 1 && !tamDung && !dangTuongTac && !giamChuyenDong && !tabAn;

  const toi = useCallback(
    (k: number) => {
      const el = track.current;
      if (!el) return;
      const dich = ((k % n) + n) % n;
      el.scrollTo({ left: dich * el.clientWidth, behavior: giamChuyenDong ? "auto" : "smooth" });
    },
    [n, giamChuyenDong]
  );

  // Đồng bộ chỉ số slide với vị trí cuộn (vuốt tay hoặc bấm nút đều đi qua đây).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let khung = 0;
    const khiCuon = () => {
      cancelAnimationFrame(khung);
      khung = requestAnimationFrame(() => {
        const k = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setI((cu) => (cu === k ? cu : k));
      });
    };
    el.addEventListener("scroll", khiCuon, { passive: true });
    return () => {
      el.removeEventListener("scroll", khiCuon);
      cancelAnimationFrame(khung);
    };
  }, []);

  // Đổi cỡ màn hình thì căn lại đúng slide đang xem. Đọc chỉ số qua ref và KHÔNG phụ thuộc
  // vào `i`: ResizeObserver gọi callback ngay khi observe(), nên nếu đăng ký lại theo từng
  // slide thì lúc cuộn mượt đi qua slide trung gian (vd. 1/5 → trái sang 5/5) nó sẽ kéo
  // track về đúng slide đó và dừng nhầm ở 2/5.
  const iRef = useRef(i);
  iRef.current = i;
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      el.scrollTo({ left: iRef.current * el.clientWidth, behavior: "auto" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tự chuyển. Khoá theo (i, tuDong): đổi slide hay tiếp tục sau khi dừng thì đếm lại từ đầu,
  // khớp với thanh tiến độ cũng khởi động lại cùng lúc.
  useEffect(() => {
    if (!tuDong) return;
    const h = window.setTimeout(() => toi(i + 1), thoiGian);
    return () => window.clearTimeout(h);
  }, [i, tuDong, thoiGian, toi]);

  const khiBamPhim = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      toi(i + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      toi(i - 1);
    }
  };

  const nutTron =
    "grid h-11 w-11 place-items-center rounded-full border border-page/30 text-page transition-colors duration-200 hover:border-copper-light hover:text-copper-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper-light active:opacity-70";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("hero.region")}
      className="relative"
      onKeyDown={khiBamPhim}
      onPointerEnter={(e) => e.pointerType === "mouse" && setDangTuongTac(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setDangTuongTac(false)}
      onFocusCapture={() => setDangTuongTac(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDangTuongTac(false);
      }}
      onTouchStart={() => setDangTuongTac(true)}
      onTouchEnd={() => setDangTuongTac(false)}
      onTouchCancel={() => setDangTuongTac(false)}
    >
      <div
        ref={track}
        aria-live={tuDong ? "off" : "polite"}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, k) => (
          <div
            key={k}
            role="group"
            aria-roledescription="slide"
            aria-label={t("hero.slide_n", { n: k + 1, total: n })}
            data-active={k === i ? "true" : "false"}
            inert={k !== i}
            className="hero-slide flex min-w-full shrink-0 snap-center"
          >
            {s}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <div className="container-site flex items-center gap-3 pb-4 md:gap-5 md:pb-7">
            <button
              type="button"
              onClick={() => setTamDung((v) => !v)}
              aria-label={tamDung ? t("hero.play") : t("hero.pause")}
              aria-pressed={tamDung}
              className={`${nutTron} pointer-events-auto !h-10 !w-10 shrink-0`}
            >
              {tamDung ? (
                <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="currentColor" aria-hidden="true">
                  <path d="M7 4.5v15l13-7.5-13-7.5Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="currentColor" aria-hidden="true">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              )}
            </button>

            <ol className="pointer-events-auto m-0 flex max-w-[104px] flex-1 list-none gap-1.5 p-0 sm:max-w-[360px] sm:gap-2">
              {slides.map((_, k) => {
                const hienTai = k === i;
                const daQua = k < i;
                return (
                  <li key={k} className="flex-1">
                    <button
                      type="button"
                      onClick={() => toi(k)}
                      aria-label={t("hero.go_to", { n: k + 1 })}
                      aria-current={hienTai ? "true" : undefined}
                      className="group flex h-11 w-full items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-copper-light"
                    >
                      <span className="relative block h-[3px] w-full overflow-hidden bg-page/25 transition-[height] duration-200 group-hover:h-[5px]">
                        <span
                          key={hienTai ? `${i}-${tuDong}` : k}
                          className="hero-tien"
                          data-fill={hienTai ? (tuDong ? "run" : "full") : daQua ? "full" : "none"}
                          style={{ animationDuration: `${thoiGian}ms` }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <span
              className="pointer-events-none hidden text-[12px] font-medium tabular-nums tracking-[0.18em] text-page/70 sm:block"
              aria-hidden="true"
            >
              {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>

            <div className="pointer-events-auto hidden gap-2 md:flex">
              <button type="button" onClick={() => toi(i - 1)} aria-label={t("hero.prev")} className={`${nutTron} !h-10 !w-10`}>
                <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m14.5 5-7 7 7 7" />
                </svg>
              </button>
              <button type="button" onClick={() => toi(i + 1)} aria-label={t("hero.next")} className={`${nutTron} !h-10 !w-10`}>
                <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9.5 5 7 7-7 7" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
