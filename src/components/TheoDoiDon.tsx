"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { DauBatBuoc, LoiO } from "@/components/BieuMau";
import T, { L, Tien } from "@/components/T";
import { useT } from "@/i18n/use-t";
import { moChatAI } from "@/lib/chat-ai";
import {
  chuyenKhoanSanSang,
  nhomSoTaiKhoan,
  noiDungChuyenKhoan,
} from "@/lib/chuyen-khoan";
import { useNganHang, useZaloLink } from "@/lib/cai-dat-context";
import { dinhDangThoiDiem, docDonVuaDat, type DonVuaDat } from "@/lib/don-hang";
import { LOI_VAO_CHINH } from "@/lib/dieu-huong";
import { dinhDangTien } from "@/lib/gio-hang-context";
import {
  KHOA_TRANG_THAI,
  TRANG_THAI,
  anSdt,
  chuanHoaMa,
  type DonTheoDoi,
  type KetQuaTraCuu,
  type PhuongThuc,
  type SacThai,
  type TrangBuoc,
  type TrangThai,
} from "@/lib/theo-doi-don";
import { tienSong } from "@/lib/tien";

type Dich = ReturnType<typeof useT>;

/**
 * Trang theo dõi đơn hàng: nhập mã đơn → trạng thái, tiến trình, vận chuyển,
 * nhật ký và tóm tắt đơn.
 *
 * Dữ liệu là các đơn của tài khoản đang đăng nhập (`donCuaToi`, lấy ở server).
 * Chỉ mã đơn (`?ma=`) được đưa lên URL.
 */

const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tra mã trong các đơn của tài khoản đang đăng nhập. `chuanHoaMa` bỏ tiền tố CW
 * nên "6", "cw6", "CW6" và "CW100001" ~ "100001" đều khớp đúng đơn đó.
 */
function traTrongDonCuaToi(dsDon: DonTheoDoi[], ma: string): KetQuaTraCuu {
  const m = chuanHoaMa(ma);
  const d = m ? dsDon.find((x) => chuanHoaMa(x.ma) === m) : undefined;
  return d ? { ok: true, don: d } : { ok: false, loi: "khong-thay" };
}

/** Chưa đăng nhập: đơn chỉ xem được trong tài khoản của chủ đơn. */
function CanDangNhap() {
  return (
    <div className="container-site pb-20 pt-10 md:pt-16">
      <header className="mx-auto max-w-xl text-center">
        <p className="nhan-nho mb-4"><T k="track.eyebrow" /></p>
        <h1 className="tieu-de-section gach-tieu-de"><T k="track.title" /></h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          <L
            values={{
              vi: "Đăng nhập để theo dõi đơn hàng của anh/chị. Mỗi tài khoản chỉ xem được đơn của chính mình.",
              en: "Sign in to track your orders. Each account can only see its own orders.",
            }}
          />
        </p>
        <Link href="/dang-nhap" className="btn-wine mt-6 min-h-[44px] px-8">
          <L values={{ vi: "Đăng nhập", en: "Sign in" }} />
        </Link>
      </header>
    </div>
  );
}

// ── Định dạng thời gian ────────────────────────────────────────────────────
const hai =(n: number) => String(n).padStart(2, "0");

function gioNgan(iso: string): string {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? "" : `${hai(t.getDate())}/${hai(t.getMonth() + 1)} · ${hai(t.getHours())}:${hai(t.getMinutes())}`;
}

function tuongDoi(iso: string, bayGio: number, t: Dich): string {
  const phut = Math.round((bayGio - Date.parse(iso)) / 60_000);
  if (Number.isNaN(phut)) return "";
  if (phut < 1) return t("track.rel_just_now");
  if (phut < 60) return t("track.rel_minutes", { n: phut });
  if (phut < 60 * 24) return t("track.rel_hours", { n: Math.floor(phut / 60) });
  return t("track.rel_days", { n: Math.floor(phut / (60 * 24)) });
}

/**
 * Khoá dịch cho chuỗi tiếng Việt lưu trong `lib/theo-doi-don.ts` (nhật ký, lý do,
 * dự kiến giao, tên đơn vị). Không khớp thì giữ nguyên chuỗi gốc.
 */
const KHOA_CHUOI_DU_LIEU = new Map<string, string>([
  ["Đặt hàng thành công, chờ nhận tiền chuyển khoản", "track.ev_placed_transfer"],
  ["Đặt hàng thành công, chờ nhân viên xác nhận", "track.ev_placed_cod"],
  ["Đặt hàng thành công", "track.ev_placed"],
  ["Nhận được khoản chuyển 1.500.000đ, chưa đủ giá trị đơn hàng", "track.ev_partial"],
  ["Kho đang kiểm tra tem nhãn và đóng gói đơn hàng", "track.ev_packing"],
  ["Nhân viên đã xác nhận đơn qua điện thoại", "track.ev_confirmed_phone"],
  ["Đơn vị vận chuyển đang giao hàng tới địa chỉ của bạn", "track.ev_out_for_delivery"],
  ["Đã bàn giao cho đơn vị vận chuyển", "track.ev_handed_over"],
  ["Đã đóng gói, kiểm tra tem nhãn phụ", "track.ev_packed"],
  ["Đã nhận đủ 2.115.000đ, đơn hàng được xác nhận", "track.ev_paid_full"],
  ["Đang giao hàng", "track.ev_shipping"],
  ["Giao hàng thành công. Người nhận đã xuất trình giấy tờ xác nhận đủ 18 tuổi", "track.ev_delivered"],
  ["Đã nhận đủ tiền, đơn hàng được xác nhận", "track.ev_paid"],
  ["Đơn hàng đã được huỷ vì quá hạn thanh toán", "track.ev_cancelled_overdue"],
  ["Đã tiếp nhận yêu cầu hoàn tiền, nhân viên đang đối soát", "track.ev_refund_received"],
  ["Đơn hàng được huỷ theo yêu cầu của bạn", "track.ev_cancelled_by_customer"],
  ["Quá hạn thanh toán — chúng tôi chưa nhận được tiền chuyển khoản.", "track.reason_overdue"],
  ["Huỷ theo yêu cầu của khách hàng", "track.reason_customer_cancel"],
  ["Dự kiến giao trong 2–4 ngày làm việc", "track.eta_2_4_days"],
  ["Dự kiến giao hôm nay, 14:00 – 18:00", "track.eta_today"],
  ["Giao hàng nội thành C.W. Wines", "track.carrier_local"],
]);

function dichChuoi(chuoi: string, t: Dich): string {
  const khoa = KHOA_CHUOI_DU_LIEU.get(chuoi);
  return khoa ? t(khoa) : chuoi;
}

/** Khoá các bước tiến trình; bước 2 phụ thuộc phương thức thanh toán. */
function khoaBuoc(i: number, phuongThuc: PhuongThuc): string {
  const KHOA = ["track.step_order", phuongThuc === "cod" ? "track.step_confirm" : "track.step_pay", "track.step_prepare", "track.step_shipping", "track.step_delivered"];
  return KHOA[i];
}

// ── Bảng màu theo sắc thái ─────────────────────────────────────────────────
const KHUNG: Record<SacThai, string> = {
  ok: "border-ok-line bg-ok-bg text-ok-ink",
  bad: "border-bad-line bg-bad-bg text-bad",
  warn: "border-copper/50 bg-warn-bg text-warn",
  info: "border-line bg-cream text-ink",
  muted: "border-line bg-stone text-ink-muted",
};
const HUY_HIEU: Record<SacThai, string> = {
  ok: "border-ok-line bg-ok-bg text-ok",
  bad: "border-bad-line bg-bad-bg text-bad",
  warn: "border-copper/50 bg-warn-bg text-warn",
  info: "border-wine/30 bg-wine-pale text-wine",
  muted: "border-line bg-stone text-ink-muted",
};

const ICON: Record<TrangThai, string> = {
  "cho-thanh-toan": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  "thieu-tien": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  "chuan-bi": "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9",
  "dang-giao": "M3 7h11v9H3zM14 10h4l3 3v3h-7M6.5 18.5h.01M17.5 18.5h.01",
  "da-giao": "M5 12.5l4.5 4.5L19 7.5",
  "da-huy": "M6 6l12 12M18 6L6 18",
  "hoan-tien": "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
};
const ICON_CANH_BAO = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5M12 16.5v.01";

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ── Component chính ────────────────────────────────────────────────────────
/**
 * Bắt buộc đăng nhập (`dangNhap`) và chỉ tra trong `donCuaToi` — các đơn của
 * chính tài khoản đang đăng nhập, lấy ở server bằng token khách. Không cần SĐT, và
 * tài khoản khác không xem được đơn của nhau dù biết mã đơn và SĐT.
 */
export default function TheoDoiDon({
  dangNhap = false,
  donCuaToi = [],
}: {
  dangNhap?: boolean;
  donCuaToi?: DonTheoDoi[];
}) {
  const t = useT();
  const zaloLink = useZaloLink();
  const router = useRouter();
  const sp = useSearchParams();
  const maTuUrl = sp.get("ma") ?? "";

  const [ma, setMa] = useState(maTuUrl);
  const [loi, setLoi] = useState<{ ma?: string }>({});
  const [dang, setDang] = useState(false);
  const [khongThay, setKhongThay] = useState(false);
  const [don, setDon] = useState<DonTheoDoi | null>(null);
  const [bayGio, setBayGio] = useState(() => Date.now());
  const [donPhien, setDonPhien] = useState<DonVuaDat | null>(null);
  const [live, setLive] = useState("");

  const ketQuaRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const tra = useCallback(
    async (maTra: string) => {
      setDang(true);
      setKhongThay(false);
      setLive(t("track.live_searching"));
      const [kq] = await Promise.all([
        Promise.resolve(traTrongDonCuaToi(donCuaToi, maTra)),
        nghi(550),
      ]);
      setDang(false);
      setBayGio(Date.now());
      if (kq.ok) {
        setDon(kq.don);
        setLive(t("track.live_found", { ma: kq.don.ma, trangThai: t(KHOA_TRANG_THAI[kq.don.trangThai]) }));
        // Chỉ mã lên URL — SĐT không bao giờ.
        router.replace(`/theo-doi-don-hang?ma=${encodeURIComponent(kq.don.ma)}`, { scroll: false });
        requestAnimationFrame(() => {
          ketQuaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          ketQuaRef.current?.focus({ preventScroll: true });
        });
      } else {
        setDon(null);
        setKhongThay(true);
        setLive(t("track.live_not_found"));
      }
    },
    [router, t, donCuaToi]
  );

  // Nạp đơn vừa đặt trong phiên để hiện nút xem lại.
  useEffect(() => {
    const d = docDonVuaDat();
    setDonPhien(d);
    // Vào bằng link có `?ma=` (từ tab Đơn hàng, email, trang cảm ơn) thì tra luôn.
    if (dangNhap && maTuUrl) void tra(maTuUrl);
    // chỉ chạy một lần khi vào trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guiForm = (e: FormEvent) => {
    e.preventDefault();
    if (!ma.trim()) {
      setLoi({ ma: t("track.err_ma_required") });
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("#td-ma")?.focus());
      return;
    }
    setLoi({});
    void tra(ma);
  };

  // Chưa đăng nhập thì không tra được (đơn chỉ xem được trong tài khoản của chủ đơn).
  if (!dangNhap) return <CanDangNhap />;

  const traDonVuaDat = () => {
    if (!donPhien) return;
    const m = donPhien.maDon.startsWith("CW") ? donPhien.maDon : `CW${donPhien.maDon}`;
    setMa(m);
    setLoi({});
    void tra(m);
  };

  return (
    <div className="container-site pb-20 pt-10 md:pt-16">
      <header className="mb-10 text-center md:mb-14">
        <p className="nhan-nho mb-4"><T k="track.eyebrow" /></p>
        <h1 className="tieu-de-section gach-tieu-de"><T k="track.title" /></h1>
        <p className="mx-auto mt-2 max-w-xl text-[15px] text-ink-muted">
          <T k="track.intro" />
        </p>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>

      {/* ── Form tra cứu ───────────────────────────────────────────────── */}
      <form
        ref={formRef}
        onSubmit={guiForm}
        noValidate
        className="mx-auto max-w-6xl border border-line bg-cream p-5 sm:p-7"
        aria-label={t("track.lookup")}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label htmlFor="td-ma" className="nhan-form">
              <T k="track.field_order_code" /> <DauBatBuoc />
            </label>
            <input
              id="td-ma"
              name="ma"
              type="text"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={ma}
              onChange={(e) => {
                setMa(e.target.value);
                if (loi.ma) setLoi((l) => ({ ...l, ma: undefined }));
              }}
              placeholder={t("track.ph_order_code")}
              aria-invalid={!!loi.ma}
              aria-describedby={loi.ma ? "loi-td-ma" : "goi-y-td-ma"}
              className="o-nhap uppercase placeholder:normal-case"
            />
            {loi.ma ? (
              <LoiO id="loi-td-ma">{loi.ma}</LoiO>
            ) : (
              <p id="goi-y-td-ma" className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                <T k="track.hint_order_code" />
              </p>
            )}
          </div>

          {/* Nút tra cứu: từ lg nằm cùng hàng với hai ô (nhãn ẩn để canh ngang ô nhập); dưới lg chiếm cả hàng, full width ở mobile. */}
          <div>
            <span className="nhan-form invisible hidden lg:block" aria-hidden="true">&nbsp;</span>
            <button type="submit" disabled={dang} aria-busy={dang} className="btn-wine w-full lg:min-w-[200px] disabled:opacity-60">
              {dang ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" />
                  <T k="track.searching" />
                </>
              ) : (
                <T k="track.lookup" />
              )}
            </button>
          </div>
        </div>

        {donPhien && !dang && (
          <div className="mt-4 flex">
            <button
              type="button"
              onClick={traDonVuaDat}
              className="inline-flex min-h-11 items-center justify-center px-2 text-[14px] font-medium text-wine underline underline-offset-4"
            >
              <T k="track.view_last_order" v={{ ma: donPhien.maDon.startsWith("CW") ? donPhien.maDon : `CW${donPhien.maDon}` }} />
            </button>
          </div>
        )}

        {/* Các đơn của tài khoản đang đăng nhập, bấm để xem ngay. */}
        <div className="mt-6 border-t border-line pt-5">
          <p id="td-don-cua-toi" className="m-0 text-[13px] font-medium text-ink">
            <L values={{ vi: "Đơn hàng của tài khoản này", en: "Orders on this account" }} />
          </p>
          {donCuaToi.length === 0 ? (
            <p className="m-0 mt-3 text-[14px] text-ink-muted">
              <L values={{ vi: "Tài khoản chưa có đơn hàng nào.", en: "This account has no orders yet." }} />
            </p>
          ) : (
            <div role="group" aria-labelledby="td-don-cua-toi" className="mt-3 flex flex-wrap gap-2">
              {donCuaToi.map((d) => {
                const dangXem = !!don && chuanHoaMa(don.ma) === chuanHoaMa(d.ma);
                return (
                  <button
                    key={d.ma}
                    type="button"
                    disabled={dang}
                    aria-pressed={dangXem}
                    onClick={() => {
                      setMa(d.ma);
                      setLoi({});
                      void tra(d.ma);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 border border-line-strong bg-cream px-3 text-left text-[13px] transition-colors hover:border-wine disabled:opacity-60 aria-pressed:border-wine aria-pressed:bg-wine-pale aria-pressed:ring-1 aria-pressed:ring-wine"
                  >
                    <span className="font-semibold tabular-nums text-ink">{d.ma}</span>
                    <span className="text-ink-muted">
                      <T k={KHOA_TRANG_THAI[d.trangThai]} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {khongThay && (
          <div role="alert" className="mt-6 flex gap-3 border border-bad-line bg-bad-bg p-4 text-[14px] leading-relaxed text-bad">
            <Icon d={ICON_CANH_BAO} className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="m-0 font-semibold"><T k="track.nf_title" /></p>
              <p className="m-0 mt-1 text-ink-muted">
                <T k="track.nf_body" emClassName="not-italic font-bold" />
                {zaloLink && (
                  <>
                    {" "}
                    <T k="track.nf_still" /> <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="font-medium text-wine underline underline-offset-4"><T k="track.nf_zalo_link" /></a>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </form>

      {/* ── Kết quả ────────────────────────────────────────────────────── */}
      {don && <KetQua don={don} bayGio={bayGio} tieuDeRef={ketQuaRef} />}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// KẾT QUẢ
// ───────────────────────────────────────────────────────────────────────────

function KetQua({ don, bayGio, tieuDeRef }: { don: DonTheoDoi; bayGio: number; tieuDeRef: React.RefObject<HTMLHeadingElement | null> }) {
  const nganHang = useNganHang();
  const t = useT();
  const tt = TRANG_THAI[don.trangThai];
  const banner = noiDungBanner(don, t);

  return (
    <section aria-labelledby="td-ket-qua" className="mx-auto mt-12 max-w-6xl scroll-mt-28">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,.7fr)] lg:items-start lg:gap-12">
        <div className="min-w-0">
          {/* Đầu đơn */}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="nhan-nho"><T k="track.order" /></p>
              <h2
                id="td-ket-qua"
                ref={tieuDeRef}
                tabIndex={-1}
                className="mt-2 break-all font-sans text-[22px] font-semibold leading-snug tracking-normal tabular-nums text-ink outline-none sm:text-[26px]"
              >
                {don.ma}
              </h2>
              <p className="mt-1.5 text-[14px] text-ink-soft">
                <T
                  k="track.placed_at"
                  v={{
                    thoiDiem: dinhDangThoiDiem(don.datLuc, t("common.at")),
                    phuongThuc: don.phuongThuc === "cod" ? t("track.method_cod") : t("track.method_transfer"),
                  }}
                />
              </p>
            </div>
            <span className={`inline-flex min-h-9 items-center gap-2 border px-3.5 text-[13px] font-semibold ${HUY_HIEU[tt.sacThai]}`}>
              <Icon d={ICON[don.trangThai]} className="h-[18px] w-[18px]" />
              <T k={KHOA_TRANG_THAI[don.trangThai]} />
            </span>
          </div>

          {/* Thông báo theo trạng thái */}
          <div className={`mt-6 border border-l-4 p-5 ${KHUNG[tt.sacThai]}`}>
            <h3 className="m-0 font-display text-[26px] font-medium leading-tight sm:text-[28px]">{banner.tieuDe}</h3>
            <p className="m-0 mt-2 max-w-[60ch] text-[15px] leading-relaxed">{banner.moTa}</p>
            {banner.hanhDong && <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{banner.hanhDong}</div>}
          </div>

          {/* Tiến trình */}
          <TienTrinh don={don} />

          {/* Khối thông tin riêng theo trạng thái */}
          {(don.trangThai === "cho-thanh-toan" || don.trangThai === "thieu-tien") && chuyenKhoanSanSang(nganHang) && (
            <ThongTinChuyenKhoan don={don} />
          )}
          {don.vanChuyen && <ThongTinVanChuyen don={don} />}

          {/* Nhật ký */}
          <div className="mt-10">
            <h3 className="m-0 mb-4 font-display text-[26px] font-medium"><T k="track.history_title" /></h3>
            <ol className="m-0 list-none border-t border-line p-0">
              {don.suKien.map((s, i) => (
                <li key={i} className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-line py-4 sm:grid-cols-[150px_1fr]">
                  <div className="col-span-2 mb-1 text-[13px] text-ink-soft sm:col-span-1 sm:mb-0">
                    <span className="font-medium text-ink">{gioNgan(s.luc)}</span>
                    <span className="block sm:mt-0.5">{tuongDoi(s.luc, bayGio, t)}</span>
                  </div>
                  <p className={`col-span-2 m-0 text-[15px] leading-relaxed sm:col-span-1 ${i === 0 ? "font-medium text-ink" : "text-ink-muted"}`}>
                    {dichChuoi(s.noiDung, t)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <TomTat don={don} />
      </div>
    </section>
  );
}

function noiDungBanner(don: DonTheoDoi, t: Dich): { tieuDe: string; moTa: ReactNode; hanhDong?: ReactNode } {
  const thieu = Math.max(don.tong - (don.daNhan ?? 0), 0);
  const noiDung = noiDungChuyenKhoan(don.ma);
  const em = { emClassName: "not-italic font-bold" };

  switch (don.trangThai) {
    case "cho-thanh-toan":
      return {
        tieuDe: t("track.b_awaiting_title"),
        moTa: <T k="track.b_awaiting_body" v={{ tien: tienSong(don.tong), noiDung }} {...em} />,
        hanhDong: don.tuPhien ? (
          <Link href="/thanh-toan/chuyen-khoan" className="btn-wine">
            <T k="track.btn_open_transfer" />
          </Link>
        ) : undefined,
      };
    case "thieu-tien":
      return {
        tieuDe: t("track.b_partial_title"),
        moTa: (
          <T k="track.b_partial_body" v={{ daNhan: tienSong(don.daNhan ?? 0), thieu: tienSong(thieu), noiDung }} {...em} />
        ),
      };
    case "chuan-bi":
      return {
        tieuDe: don.tuPhien ? t("track.b_received_title") : t("track.b_preparing_title"),
        moTa: don.tuPhien ? t("track.b_received_body") : t("track.b_preparing_body"),
      };
    case "dang-giao":
      return {
        tieuDe: t("track.b_shipping_title"),
        moTa: t("track.b_shipping_body", { eta: dichChuoi(don.vanChuyen?.duKien ?? t("track.courier_en_route"), t) }),
      };
    case "da-giao":
      return {
        tieuDe: t("track.b_delivered_title"),
        moTa: t("track.b_delivered_body"),
        hanhDong: (
          <Link href={LOI_VAO_CHINH[0].href} className="btn-wine-outline">
            <T k="track.btn_keep_browsing" />
          </Link>
        ),
      };
    case "da-huy":
      return {
        tieuDe: t("track.b_cancelled_title"),
        moTa: don.lyDo ? dichChuoi(don.lyDo, t) : t("track.b_cancelled_default"),
        hanhDong: (
          <Link href={LOI_VAO_CHINH[0].href} className="btn-wine-outline">
            <T k="track.btn_reorder" />
          </Link>
        ),
      };
    case "hoan-tien":
      return {
        tieuDe: t("track.b_refund_title"),
        moTa: <T k="track.b_refund_body" v={{ tien: tienSong(don.daNhan ?? don.tong) }} {...em} />,
      };
  }
}

// ── Thanh tiến trình: dọc ở mobile, ngang từ sm ─────────────────────────────
const VONG: Record<TrangBuoc, string> = {
  xong: "border-wine bg-wine text-white",
  "hien-tai": "border-wine bg-cream text-wine",
  "canh-bao": "border-copper bg-warn-bg text-warn",
  cho: "border-line-strong bg-cream text-ink-soft",
  huy: "border-line-strong bg-stone text-ink-soft",
};
const KHOA_CHU_TRANG_THAI: Record<TrangBuoc, string> = {
  xong: "track.state_done",
  "hien-tai": "track.state_current",
  "canh-bao": "track.state_attention",
  cho: "track.state_upcoming",
  huy: "track.state_stopped",
};

function TienTrinh({ don }: { don: DonTheoDoi }) {
  const t = useT();
  const buoc = TRANG_THAI[don.trangThai].buoc;
  const soBuoc = buoc.length;

  return (
    <nav aria-label={t("track.progress_aria")} className="mt-8 border border-line bg-cream p-5 sm:p-6">
      <ol className="m-0 flex list-none flex-col p-0 sm:flex-row">
        {Array.from({ length: soBuoc }, (_, i) => {
          const tr = buoc[i];
          const cuoi = i === soBuoc - 1;
          const noiTiep = tr === "xong"; // đường nối sang bước sau chỉ đậm khi bước này đã xong
          return (
            <li
              key={i}
              aria-current={tr === "hien-tai" || tr === "canh-bao" ? "step" : undefined}
              className="relative flex gap-4 pb-6 last:pb-0 sm:flex-1 sm:flex-col sm:gap-3 sm:pb-0"
            >
              {!cuoi && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 sm:left-9 sm:top-[15px] sm:h-0.5 sm:w-[calc(100%-2.5rem)] ${
                    noiTiep ? "bg-wine" : "bg-line"
                  }`}
                />
              )}
              <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[13px] font-semibold ${VONG[tr]}`}>
                {tr === "xong" ? (
                  <Icon d="M5 12.5l4.5 4.5L19 7.5" className="h-4 w-4" />
                ) : tr === "canh-bao" ? (
                  <span aria-hidden="true">!</span>
                ) : tr === "huy" ? (
                  <Icon d="M7 7l10 10M17 7L7 17" className="h-3.5 w-3.5" />
                ) : tr === "hien-tai" ? (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-wine motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{i + 1}</span>
                )}
              </span>
              <span className="min-w-0 pt-1 sm:pt-0">
                <span className={`block text-[14px] leading-snug ${tr === "hien-tai" || tr === "canh-bao" ? "font-semibold text-ink" : tr === "xong" ? "font-medium text-ink" : "text-ink-soft"}`}>
                  {t(khoaBuoc(i, don.phuongThuc))}
                </span>
                <span className="sr-only"> — {t(KHOA_CHU_TRANG_THAI[tr])}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ── Khối thông tin ─────────────────────────────────────────────────────────
function KhoiThongTin({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <div className="mt-8 border border-line bg-cream">
      <h3 className="m-0 border-b border-line px-5 py-3.5 font-display text-[22px] font-medium">{tieuDe}</h3>
      <dl className="m-0 px-5">{children}</dl>
    </div>
  );
}

function Hang({ nhan, children, chep }: { nhan: string; children: ReactNode; chep?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 text-[14px] last:border-b-0">
      <div className="min-w-0">
        <dt className="text-[13px] text-ink-soft">{nhan}</dt>
        <dd className="m-0 mt-0.5 break-words font-medium text-ink">{children}</dd>
      </div>
      {chep && <NutSaoChep giaTri={chep} nhan={nhan.toLowerCase()} />}
    </div>
  );
}

function ThongTinChuyenKhoan({ don }: { don: DonTheoDoi }) {
  const t = useT();
  const NGAN_HANG = useNganHang();
  const canChuyen = don.trangThai === "thieu-tien" ? Math.max(don.tong - (don.daNhan ?? 0), 0) : don.tong;
  const noiDung = noiDungChuyenKhoan(don.ma);
  return (
    <KhoiThongTin tieuDe={don.trangThai === "thieu-tien" ? t("track.transfer_topup_title") : t("track.transfer_title")}>
      <Hang nhan={t("track.bank")}>{NGAN_HANG.ten}</Hang>
      <Hang nhan={t("track.account_no")} chep={NGAN_HANG.soTaiKhoan}>
        {nhomSoTaiKhoan(NGAN_HANG.soTaiKhoan)}
      </Hang>
      <Hang nhan={t("track.account_holder")}>{NGAN_HANG.chuTaiKhoan}</Hang>
      <Hang nhan={don.trangThai === "thieu-tien" ? t("track.amount_missing") : t("track.amount")} chep={String(Math.round(canChuyen))}>
        <Tien so={canChuyen} />
      </Hang>
      <Hang nhan={t("track.transfer_content")} chep={noiDung}>
        <span className="text-wine">{noiDung}</span>
      </Hang>
    </KhoiThongTin>
  );
}

function ThongTinVanChuyen({ don }: { don: DonTheoDoi }) {
  const t = useT();
  const v = don.vanChuyen!;
  return (
    <KhoiThongTin tieuDe={t("track.shipping_title")}>
      {v.hang && <Hang nhan={t("track.carrier")}>{dichChuoi(v.hang, t)}</Hang>}
      {v.maVanDon && (
        <Hang nhan={t("track.tracking_no")} chep={v.maVanDon}>
          {v.maVanDon}
        </Hang>
      )}
      {v.duKien && <Hang nhan={t("track.eta_label")}>{dichChuoi(v.duKien, t)}</Hang>}
    </KhoiThongTin>
  );
}

function NutSaoChep({ giaTri, nhan }: { giaTri: string; nhan: string }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  const xong = () => {
    setOk(true);
    setTimeout(() => setOk(false), 1600);
  };
  const chep = async () => {
    try {
      await navigator.clipboard.writeText(giaTri);
      xong();
    } catch {
      const o = document.createElement("textarea");
      o.value = giaTri;
      o.style.position = "fixed";
      o.style.opacity = "0";
      document.body.appendChild(o);
      o.select();
      try {
        if (document.execCommand("copy")) xong();
      } finally {
        document.body.removeChild(o);
      }
    }
  };
  return (
    <button
      type="button"
      onClick={chep}
      aria-label={t("track.copy_aria", { nhan })}
      className={`inline-flex min-h-11 min-w-[92px] shrink-0 items-center justify-center border px-3 text-[12px] font-semibold uppercase tracking-wide2 transition-colors ${
        ok ? "border-ok bg-ok text-white" : "border-ink text-ink hover:bg-ink hover:text-white"
      }`}
    >
      <span aria-live="polite">{ok ? t("track.copied") : t("track.copy")}</span>
    </button>
  );
}

// ── Tóm tắt đơn (cột phải ≥ lg, xuống dưới ở mobile) ───────────────────────
function TomTat({ don }: { don: DonTheoDoi }) {
  const t = useT();
  const tienHang = don.tong - don.phiGiaoHang;
  return (
    <aside aria-label={t("track.summary_aria")} className="min-w-0 lg:sticky lg:top-[120px]">
      <HoTro ma={don.ma} />

      <div className="border border-line bg-cream p-5 sm:p-6">
        <h3 className="m-0 font-display text-[26px] font-medium"><T k="track.order" /></h3>
        <ul className="m-0 mt-4 list-none p-0">
          {don.monHang.map((m, i) => (
            <li key={i} className="flex items-start justify-between gap-4 border-t border-line py-3.5">
              <span className="min-w-0 font-display text-[18px] leading-tight">
                {m.title}
                <small className="mt-0.5 block font-sans text-[13px] text-ink-soft"><T k="track.qty" v={{ n: m.soLuong }} /></small>
              </span>
              <span className="shrink-0 text-[14px] tabular-nums"><Tien so={m.thanhTien} /></span>
            </li>
          ))}
        </ul>
        <dl className="m-0 grid gap-2 border-t border-line pt-3.5 text-[14px]">
          <div className="flex justify-between gap-3">
            <dt><T k="track.subtotal" /></dt>
            <dd className="m-0 tabular-nums"><Tien so={tienHang} /></dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt><T k="track.shipping_fee" /></dt>
            <dd className={`m-0 tabular-nums ${don.phiGiaoHang === 0 ? "font-medium text-ok" : ""}`}>
              {don.phiGiaoHang === 0 ? <T k="track.free_shipping" /> : <Tien so={don.phiGiaoHang} />}
            </dd>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-line pt-3.5">
            <dt className="text-[13px] font-semibold uppercase tracking-caps"><T k="track.total" /></dt>
            <dd className="m-0 font-display text-[28px] font-medium leading-none tabular-nums text-wine"><Tien so={don.tong} /></dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 border border-line bg-cream p-5 sm:p-6">
        <h3 className="m-0 font-display text-[22px] font-medium"><T k="track.deliver_to" /></h3>
        <p className="m-0 mt-3 text-[15px] font-medium">{don.hoTen}</p>
        <p className="m-0 mt-0.5 text-[14px] text-ink-soft">{anSdt(don.dienThoai)}</p>
        <p className="m-0 mt-2 text-[14px] leading-relaxed text-ink-muted">{don.diaChi}</p>
      </div>
    </aside>
  );
}

function HoTro({ ma }: { ma: string }) {
  const t = useT();
  const zaloLink = useZaloLink();
  return (
    <section aria-labelledby="td-ho-tro" className="mb-6 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 border border-l-[3px] border-line border-l-copper bg-cream p-5">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-wine text-copper-light" aria-hidden="true">
        <Icon d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" className="h-[22px] w-[22px]" />
      </div>
      <div>
        <h3 id="td-ho-tro" className="m-0 font-display text-[24px] font-medium leading-tight">
          <T k="track.help_title" />
        </h3>
        <p className="m-0 mt-0.5 text-[14px] text-ink-muted"><T k="track.help_body" v={{ ma }} /></p>
      </div>
      <div className="col-span-full mt-2.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5">
        <button type="button" onClick={() => moChatAI(t("track.ask_ai_prompt", { ma }))} aria-haspopup="dialog" className="btn-wine">
          <T k="track.btn_ask_ai" />
        </button>
        {zaloLink && (
          <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-[13px] font-semibold tracking-[0.06em] text-wine underline underline-offset-4">
            <T k="track.zalo_or" />
          </a>
        )}
      </div>
    </section>
  );
}
