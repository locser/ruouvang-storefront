"use client";

import { useMemo, useState } from "react";
import T, { TL } from "./T";
import { layTruong } from "@/i18n/translate";
import { useLocale, useT } from "@/i18n/use-t";
import { TINH_THANH, type CuaHang } from "@/lib/theme";

/**
 * Tìm cửa hàng — dựng lại tiện ích store-locator của cwwines.com.
 *
 * Site gốc dùng tiện ích EGANY đọc dữ liệu từ một Google Sheet qua endpoint
 * gviz, nên KHÔNG có API công khai để đọc lại. Dữ liệu 2 địa điểm ở đây được
 * bóc bằng cách duyệt hết ô chọn tỉnh × ô chọn cửa hàng trên trình duyệt rồi
 * đọc DOM, lưu ở `src/lib/cwwines-stores.json`.
 *
 * Giữ đúng hai bước của site gốc — chọn tỉnh thành, rồi chọn cửa hàng — nhưng
 * thêm danh sách thẻ bấm được bên dưới: chọn qua hai ô `<select>` lồng nhau
 * trên điện thoại khá khó, mà đây chính là trang khách dùng nhiều nhất trên
 * điện thoại (đang trên đường tìm cửa hàng gần nhất).
 */
export default function TimCuaHang() {
  const locale = useLocale();
  const t = useT();
  const [iTinh, setITinh] = useState(0);
  const [iCuaHang, setICuaHang] = useState(0);

  const tinh = TINH_THANH[iTinh];
  const cuaHang: CuaHang | undefined = tinh?.cuaHang[iCuaHang];

  const tongSo = useMemo(
    () => TINH_THANH.reduce((s, t) => s + t.cuaHang.length, 0),
    []
  );

  const doiTinh = (i: number) => {
    setITinh(i);
    setICuaHang(0); // cửa hàng cũ không thuộc tỉnh mới — phải về đầu danh sách
  };

  return (
    <div className="container-site py-8">
      <div className="mb-8 text-center">
        <h1 className="tieu-de-section gach-tieu-de">
          <T k="stores.our_stores" />
        </h1>
        <p className="mt-4 text-[14px] text-ink-muted">
          <T k="stores.c_w_wines_boutiques_across" />
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
        {/* ── Cột trái: chọn tỉnh → chọn cửa hàng → địa chỉ ────────────── */}
        <div className="border border-line bg-white p-5">
          <h2 className="mb-4 text-[16px] font-bold uppercase tracking-wide text-ink">
            <T k="common.find_a_store" />
          </h2>

          <label className="nhan-form" htmlFor="chon-tinh">
            <T k="stores.select_a_city" />
          </label>
          <select
            id="chon-tinh"
            value={iTinh}
            onChange={(e) => doiTinh(Number(e.target.value))}
            className="o-nhap mb-4 cursor-pointer"
          >
            {TINH_THANH.map((tt, i) => (
              <option key={tt.slug} value={i}>
                {layTruong(tt, "ten", locale)} ({tt.cuaHang.length})
              </option>
            ))}
          </select>

          <label className="nhan-form" htmlFor="chon-cua-hang">
            <T k="stores.select_a_store" />
          </label>
          <select
            id="chon-cua-hang"
            value={iCuaHang}
            onChange={(e) => setICuaHang(Number(e.target.value))}
            className="o-nhap cursor-pointer"
          >
            {tinh?.cuaHang.map((c, i) => (
              <option key={c.slug} value={i}>
                {i + 1}. {layTruong(c, "ten", locale)}
              </option>
            ))}
          </select>

          {cuaHang && (
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-start gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-5 w-5 shrink-0 stroke-wine"
                  fill="none"
                  strokeWidth="1.6"
                >
                  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-ink">
                    <TL obj={cuaHang} field="ten" />
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                    <TL obj={cuaHang} field="diaChi" />
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {cuaHang.dienThoai.map((sdt) => (
                      <a
                        key={sdt}
                        href={`tel:${sdt.replace(/\s/g, "")}`}
                        className="border border-wine px-3 py-1.5 text-[13px] font-semibold text-wine transition-colors hover:bg-wine hover:text-white"
                      >
                        {sdt}
                      </a>
                    ))}
                  </div>

                  {cuaHang.googleMaps && (
                    <a
                      href={cuaHang.googleMaps}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-3 inline-block text-[13px] font-semibold text-wine underline-offset-4 hover:underline"
                    >
                      <T k="stores.directions_on_google_maps" />
                    </a>
                  )}

                  {(cuaHang.laShowroom || cuaHang.laTruSo) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {cuaHang.laTruSo && (
                        <span className="bg-wine-pale px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-wine">
                          <T k="stores.head_office" />
                        </span>
                      )}
                      {cuaHang.laShowroom && (
                        <span className="bg-wine-pale px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-wine">
                          Showroom
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Cột phải: bản đồ ──────────────────────────────────────────── */}
        <div className="min-h-[380px] border border-line bg-white">
          {cuaHang && (
            <iframe
              key={cuaHang.slug}
              src={cuaHang.embed}
              title={t("stores.map_of", { name: layTruong(cuaHang, "ten", locale) })}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-[380px] w-full border-0 lg:min-h-[520px]"
            />
          )}
        </div>
      </div>

      {/* ── Toàn bộ cửa hàng, gom theo tỉnh ─────────────────────────────── */}
      <div className="mt-14">
        <h2 className="mb-6 text-center font-display text-[24px] text-ink md:text-[30px]">
          <T k="stores.all_boutiques" />
        </h2>

        <div className="space-y-8">
          {TINH_THANH.map((t, ti) => (
            <div key={t.slug}>
              <h3 className="mb-3 border-b border-line pb-2 text-[15px] font-bold uppercase tracking-wide text-wine">
                <TL obj={t} field="ten" />
                <span className="ml-2 font-normal normal-case text-ink-soft">
                  ({t.cuaHang.length})
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {t.cuaHang.map((c, ci) => {
                  const dangChon = ti === iTinh && ci === iCuaHang;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => {
                        setITinh(ti);
                        setICuaHang(ci);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`h-full border p-4 text-left transition-colors ${
                        dangChon
                          ? "border-wine bg-wine-pale"
                          : "border-line bg-white hover:border-wine"
                      }`}
                    >
                      <div className="text-[14px] font-bold text-ink">
                        <TL obj={c} field="ten" />
                      </div>
                      <div className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                        <TL obj={c} field="diaChiNgan" />
                      </div>
                      {c.dienThoai.length > 0 && (
                        <div className="mt-2 text-[13px] font-semibold text-wine">
                          {c.dienThoai[c.dienThoai.length - 1]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
