"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  KHOA_LUU_NGON_NGU,
  LOCALES,
  LOCALE_META,
  laLocale,
  type Locale,
} from "@/i18n/config";

/**
* Công tắc ngôn ngữ — tự sinh từ `LOCALES` (VI | EN | …), thêm ngôn ngữ không phải sửa file này.
 *
 * Việc duy nhất nó làm là đặt `lang` trên thẻ `<html>` và nhớ lựa chọn. Toàn bộ
 * phần dịch nằm ở CSS (sinh trong layout.tsx) và component `T`, nên đổi ngôn ngữ
 * không tải lại trang, không gọi mạng, không mất vị trí cuộn. Script trong
 * `<head>` (layout.tsx) áp lựa chọn đã lưu TRƯỚC khi trình duyệt vẽ nên không bị
 * nháy ngôn ngữ gốc.
 */
export default function DoiNgonNgu({ nenToi = true }: { nenToi?: boolean }) {
  const [ngonNgu, setNgonNgu] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let luu: string | null = null;
    try {
      luu = window.localStorage.getItem(KHOA_LUU_NGON_NGU);
    } catch {
      /* chế độ riêng tư — dùng mặc định */
    }
    const nn = laLocale(luu) ? luu : DEFAULT_LOCALE;
    setNgonNgu(nn);
    document.documentElement.lang = nn;
  }, []);

  const doi = (nn: Locale) => {
    setNgonNgu(nn);
    document.documentElement.lang = nn;
    try {
      window.localStorage.setItem(KHOA_LUU_NGON_NGU, nn);
    } catch {
      /* không lưu được thì lần sau về mặc định */
    }
  };

  return (
    <div className="flex items-center" role="group" aria-label="Language">
      {LOCALES.map((ma, i) => {
        const dang = ngonNgu === ma;
        return (
          <span key={ma} className="flex items-center">
            {i > 0 && (
              <span aria-hidden="true" className={nenToi ? "text-page/25" : "text-ink/25"}>
                |
              </span>
            )}
            <button
              type="button"
              onClick={() => doi(ma)}
              aria-label={LOCALE_META[ma].ten}
              aria-pressed={dang}
              lang={ma}
              className={`min-h-[28px] min-w-[28px] px-1 text-[11px] font-medium tracking-[0.18em] transition-colors duration-200 ${
                dang
                  ? nenToi
                    ? "text-copper-light"
                    : "text-wine"
                  : nenToi
                    ? "text-page/60 hover:text-page"
                    : "text-ink-soft hover:text-ink"
              }`}
            >
              {LOCALE_META[ma].nhan}
            </button>
          </span>
        );
      })}
    </div>
  );
}
