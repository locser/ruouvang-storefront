import Link from "next/link";
import { redirect } from "next/navigation";
import T, { L, Tien } from "@/components/T";
import { layKhachHang, layDonCuaKhach, dangXuat } from "@/lib/khach-hang";
import { dinhDangThoiDiem } from "@/lib/don-hang";
import {
  KHOA_TRANG_THAI,
  TRANG_THAI,
  type SacThai,
  type TrangThai,
} from "@/lib/theo-doi-don";

export const metadata = {
  title: "Tài Khoản Của Tôi — C.W. Wines",
  description: "Thông tin thành viên, đơn hàng và ưu đãi C.W. Wines.",
};

/**
 * Nhóm lọc đơn. Mỗi nhóm gom các trạng thái có cùng việc cần làm với khách.
 * `nhan` là KHOÁ dịch (messages/*.json), không phải chuỗi cứng.
 */
type MaNhom = "todo" | "ship" | "done" | "closed";

const NHOM: Record<MaNhom, { nhan: string; trangThai: readonly TrangThai[] }> = {
  todo: { nhan: "acc.group_todo", trangThai: ["cho-thanh-toan", "thieu-tien"] },
  ship: { nhan: "acc.group_ship", trangThai: ["chuan-bi", "dang-giao"] },
  done: { nhan: "acc.group_done", trangThai: ["da-giao"] },
  closed: { nhan: "acc.group_closed", trangThai: ["da-huy", "hoan-tien"] },
};

const MA_NHOM = Object.keys(NHOM) as MaNhom[];

/** Việc khách cần làm với đơn đang ở nhóm "Cần xử lý" (khoá dịch). */
const VIEC_CAN_LAM: Partial<Record<TrangThai, string>> = {
  "cho-thanh-toan": "acc.todo_pay",
  "thieu-tien": "acc.todo_transfer",
};

const SAC_PILL: Record<SacThai, string> = {
  ok: "bg-ok-bg text-ok",
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
  info: "bg-[#E8EEF2] text-[#2B4656]",
  muted: "bg-stone text-ink-muted",
};

const LOI_TAT = [
  { href: "/gio-hang", nhan: "acc.menu_cart", moTa: "acc.menu_cart_desc" },
  {
    // SỬA BUG-R03: đường dẫn cũ `/chinh-sach/doi-tra` trả về 404.
    href: "/chinh-sach/chinh-sach-doi-tra",
    nhan: "acc.menu_returns",
    moTa: "acc.menu_returns_desc",
  },
];

const lienDon = (ma: string) => `/theo-doi-don-hang?ma=${encodeURIComponent(ma)}`;

export default async function TrangTaiKhoan({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const kh = await layKhachHang();

  // Chưa đăng nhập (hoặc JWT hết hạn) thì đưa về trang đăng nhập.
  // Không kèm `tiep`: sau khi đăng nhập khách về trang chủ, rồi tự bấm icon người để vào hồ sơ.
  if (!kh) redirect("/dang-nhap");

  async function thoat() {
    "use server";
    await dangXuat();
    redirect("/");
  }

  const { loc } = await searchParams;
  const dangLoc: MaNhom | "all" = MA_NHOM.includes(loc as MaNhom) ? (loc as MaNhom) : "all";

  // Đơn của khách lấy từ Medusa (`GET /store/orders`).
  const tatCa = await layDonCuaKhach();
  const trongNhom = (ma: MaNhom) => tatCa.filter((d) => NHOM[ma].trangThai.includes(d.trangThai));
  const dsHienThi = dangLoc === "all" ? tatCa : trongNhom(dangLoc);
  const canXuLy = trongNhom("todo");

  const hoTen = [kh.first_name, kh.last_name].filter(Boolean).join(" ");
  const chuCai = (kh.first_name || kh.email || "?").trim().charAt(0).toUpperCase();

  const LOC = [
    { ma: "all" as const, nhan: "acc.filter_all", so: tatCa.length },
    ...MA_NHOM.map((ma) => ({ ma, nhan: NHOM[ma].nhan, so: trongNhom(ma).length })),
  ];

  return (
    <div className="container-site">
      {/* Tiêu đề */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-8 pt-6">
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-caps text-copper-ink">
            <T k="acc.eyebrow" />
          </p>
          <h1 className="font-display text-4xl leading-none text-ink-strong md:text-5xl">
            {kh.first_name ? (
              <T k="acc.hello_named" v={{ ten: kh.first_name }} emClassName="italic text-wine" />
            ) : (
              <T k="acc.hello_guest" emClassName="italic text-wine" />
            )}
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            <T k="acc.subtitle" />
          </p>
        </div>
        <form action={thoat}>
          <button type="submit" className="btn-wine-outline">
            <T k="acc.logout" />
          </button>
        </form>
      </div>

      {/* Việc cần khách xử lý: chỉ hiện khi có đơn cần làm gì đó */}
      {canXuLy.length > 0 && (
        <section aria-labelledby="todo-h" className="mb-8 border border-l-4 border-bad-line border-l-bad bg-[#FDF8F6]">
          <header className="flex items-center gap-3 px-6 pb-2 pt-5">
            <h2 id="todo-h" className="font-display text-2xl text-ink-strong">
              <T k="acc.todo_title" />
            </h2>
            <span
              className="grid h-[26px] min-w-[26px] place-items-center rounded-full bg-bad px-2 text-[13px] font-semibold text-white"
            >
              {canXuLy.length}
            </span>
          </header>
          <ul>
            {canXuLy.map((d) => (
              <li
                key={d.ma}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-bad-line px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">
                    <Link href={lienDon(d.ma)} className="text-wine underline-offset-[3px] hover:underline">
                      {d.ma}
                    </Link>{" "}
                    · <T k={KHOA_TRANG_THAI[d.trangThai]} />
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    <T k={VIEC_CAN_LAM[d.trangThai] ?? "acc.todo_pay"} />
                  </p>
                </div>
                <Link href={lienDon(d.ma)} className="btn-wine min-h-[44px] px-5 py-2">
                  <T k="acc.process_now" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid items-start gap-9 pb-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* Hỗ trợ đơn hàng */}
          <div className="flex flex-wrap items-center gap-4 border border-l-[3px] border-line border-l-copper bg-cream py-3 pl-5 pr-4">
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink-muted">
              <b className="font-semibold text-ink">
                <T k="acc.support_title" />
              </b>{" "}
              <T k="acc.support_text" />
            </p>
            <Link href="/theo-doi-don-hang" className="btn-wine-outline min-h-[44px] px-5 py-2 text-[11px]">
              <T k="acc.support_btn" />
            </Link>
          </div>

          {/* Danh sách đơn */}
          <section aria-labelledby="ord-h" className="panel">
            <div className="px-6 pt-6 md:px-7">
              <h2 id="ord-h" className="font-display text-3xl text-ink-strong">
                <T k="acc.orders_title" />
              </h2>
            </div>

            <nav
              aria-labelledby="ord-h"
              className="flex gap-2 overflow-x-auto border-b border-line px-6 py-4 md:px-7"
            >
              {LOC.map((l) => {
                const dangChon = dangLoc === l.ma;
                return (
                  <Link
                    key={l.ma}
                    href={l.ma === "all" ? "/tai-khoan" : `/tai-khoan?loc=${l.ma}`}
                    scroll={false}
                    aria-current={dangChon ? "true" : undefined}
                    className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap border px-4 text-sm transition-colors ${
                      dangChon
                        ? "border-wine bg-wine text-page"
                        : "border-line-strong hover:border-wine hover:text-wine"
                    }`}
                  >
                    <T k={l.nhan} />
                    <span className="ml-1.5 opacity-80">{l.so}</span>
                  </Link>
                );
              })}
            </nav>

            {tatCa.length === 0 ? (
              <div className="px-6 py-14 text-center md:px-7">
                <h3 className="font-display text-3xl text-ink-strong">
                  <T k="acc.empty_title" />
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                  <T k="acc.empty_text" />
                </p>
                {/* SỬA BUG-R04: câu chữ còn sót của website mỹ phẩm Hasaki. */}
                <Link href="/danh-muc/all" className="btn-wine mt-6">
                  <T k="acc.empty_cta" v={{ n: 185 }} />
                </Link>
              </div>
            ) : dsHienThi.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-ink-muted md:px-7">
                <T k="acc.group_empty" />
              </p>
            ) : (
              <ul>
                {dsHienThi.map((d) => {
                  const tt = TRANG_THAI[d.trangThai];
                  const soChai = d.monHang.reduce((s, m) => s + m.soLuong, 0);
                  return (
                    <li
                      key={d.ma}
                      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line px-6 py-5 last:border-b-0 md:px-7"
                    >
                      <div className="min-w-0">
                        <Link
                          href={lienDon(d.ma)}
                          className="font-semibold text-wine underline-offset-[3px] hover:underline"
                        >
                          {d.ma}
                        </Link>
                        <p className="mt-0.5 text-sm text-ink-muted">
                          <L values={{ vi: dinhDangThoiDiem(d.datLuc, "lúc"), en: dinhDangThoiDiem(d.datLuc, "at") }} />{" "}
                          · <T k="acc.bottles" v={{ n: soChai }} />
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap ${SAC_PILL[tt.sacThai]}`}
                        >
                          <T k={KHOA_TRANG_THAI[d.trangThai]} />
                        </span>
                        <span className="font-display text-2xl tabular-nums text-ink-strong">
                          <Tien so={d.tong} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside aria-labelledby="prof-h" className="space-y-5 lg:sticky lg:top-6">
          {/* Hồ sơ */}
          <section aria-labelledby="prof-h" className="panel p-6">
            <h2 id="prof-h" className="sr-only">
              <T k="acc.profile_sr" />
            </h2>
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-wine font-display text-3xl text-copper-light">
                {chuCai}
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl leading-tight text-ink-strong">
                  {hoTen || <T k="acc.guest_name" />}
                </p>
                <p className="mt-0.5 break-all text-sm text-ink-muted">{kh.email}</p>
              </div>
            </div>

            <p className="mt-5 inline-flex items-center bg-[#EFEEF0] px-3.5 py-2 text-[13px] font-semibold text-[#3C3A45]">
              <T k="acc.member_tier" />
            </p>

            <dl className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-3 text-sm">
                <dt className="text-ink-muted">
                  <T k="acc.phone" />
                </dt>
                <dd className="text-right font-medium text-ink-strong">
                  {kh.phone || <T k="acc.phone_empty" />}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-3 text-sm">
                <dt className="text-ink-muted">
                  <T k="acc.customer_id" />
                </dt>
                <dd className="max-w-full break-all text-right font-mono text-[12.5px] text-ink-strong">
                  {kh.id}
                </dd>
              </div>
            </dl>
          </section>

          {/* Lối tắt */}
          <nav aria-labelledby="sc-h" className="panel">
            <h2 id="sc-h" className="sr-only">
              <T k="acc.shortcuts_sr" />
            </h2>
            <ul>
              {LOI_TAT.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-[56px] items-center gap-4 border-t border-line px-5 py-3 transition-colors first:border-t-0 hover:bg-stone"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink-strong">
                        <T k={l.nhan} />
                      </span>
                      <span className="block text-[12.5px] leading-snug text-ink-muted">
                        <T k={l.moTa} />
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-ink-soft">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
