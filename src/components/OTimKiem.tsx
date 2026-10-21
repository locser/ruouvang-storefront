"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import Anh from "./Anh";

/**
 * Ô tìm kiếm ở header.
 *
 * Gõ ≥2 ký tự thì gọi `/api/goi-y` lấy gợi ý; Enter hoặc nút kính lúp sang
 * `/tim-kiem?q=...`. Gợi ý đi qua route phía server, KHÔNG gọi thẳng
 * Meilisearch: khoá master có toàn quyền trên dữ liệu mọi shop.
 *
 * ⚠️ SỬA BUG-R07 (kiểm thử 05/08/2026): lần Enter ĐẦU TIÊN ngay sau khi tải
 * trang nguội không có tác dụng vì React chưa hydrate. Cách chữa: để form là
 * form GET THẬT (`action="/tim-kiem"` + `name="q"`) — chưa có JavaScript thì
 * trình duyệt tự điều hướng; có rồi thì `onSubmit` chuyển trang mềm.
 *
 * Giao diện: chỉ một đường kẻ chân, không hộp — để header thoáng.
 */

interface GoiY {
  id: string;
  title: string;
  handle: string;
  price_vnd: number;
  thumbnail: string;
}

export default function OTimKiem({ tuFocus = false }: { tuFocus?: boolean }) {
  const router = useRouter();
  const [tuKhoa, setTuKhoa] = useState("");
  const [goiY, setGoiY] = useState<GoiY[]>([]);
  const [moGoiY, setMoGoiY] = useState(false);
  const boc = useRef<HTMLDivElement>(null);
  const idDanhSach = useId();

  useEffect(() => {
    const q = tuKhoa.trim();
    if (q.length < 2) {
      setGoiY([]);
      return;
    }
    const ac = new AbortController();
    const hen = setTimeout(async () => {
      try {
        const res = await fetch(`/api/goi-y?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        if (!res.ok) return;
        const d = await res.json();
        setGoiY(Array.isArray(d.ketQua) ? d.ketQua : []);
      } catch (e) {
        /* huỷ hoặc lỗi mạng — im lặng, khách vẫn Enter được */
      }
    }, 250);
    return () => {
      clearTimeout(hen);
      ac.abort();
    };
  }, [tuKhoa]);

  useEffect(() => {
    function ngoai(e: MouseEvent) {
      if (boc.current && !boc.current.contains(e.target as Node)) {
        setMoGoiY(false);
      }
    }
    document.addEventListener("mousedown", ngoai);
    return () => document.removeEventListener("mousedown", ngoai);
  }, []);

  function guiDi(e: React.FormEvent) {
    e.preventDefault();
    const q = tuKhoa.trim();
    if (!q) return;
    setMoGoiY(false);
    router.push(`/tim-kiem?q=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={boc} className="relative flex min-w-0 flex-1 items-center">
      <form
        onSubmit={guiDi}
        action="/tim-kiem"
        method="get"
        className="relative w-full"
        role="search"
      >
        <input
          type="search"
          name="q"
          value={tuKhoa}
          autoFocus={tuFocus}
          onChange={(e) => {
            setTuKhoa(e.target.value);
            setMoGoiY(true);
          }}
          onFocus={() => setMoGoiY(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMoGoiY(false);
          }}
          placeholder="Tìm rượu, nhà rượu, vùng trồng…"
          aria-label="Tìm kiếm rượu vang"
          aria-controls={idDanhSach}
          autoComplete="off"
          className="h-11 w-full rounded-none border-0 border-b border-ink/25 bg-transparent pl-0 pr-10 text-[14px] text-ink outline-none transition-colors duration-300 placeholder:text-ink-soft focus:border-wine [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          aria-label="Tìm"
          className="absolute right-0 top-0 flex h-11 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-ink transition-colors hover:text-wine"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" strokeLinecap="round" />
          </svg>
        </button>
      </form>

      {moGoiY && goiY.length > 0 && (
        <div
          id={idDanhSach}
          className="absolute left-0 right-0 top-[48px] z-50 min-w-[320px] border border-line bg-cream shadow-mega"
        >
          {goiY.map((g) => (
            <Link
              key={g.id}
              href={`/san-pham/${g.handle}`}
              onClick={() => setMoGoiY(false)}
              className="flex items-center gap-3 border-b border-line px-4 py-3 text-ink no-underline transition-colors last:border-b-0 hover:bg-stone"
            >
              {g.thumbnail && (
                <span className="grid h-12 w-9 shrink-0 place-items-center bg-stone">
                  <Anh
                    src={g.thumbnail}
                    alt=""
                    width={36}
                    height={48}
                    sizes="36px"
                    className="h-12 w-auto object-contain"
                  />
                </span>
              )}
              <span className="dong-2 min-w-0 flex-1 font-display text-[16px] leading-tight">
                {g.title}
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-ink-muted">
                {g.price_vnd.toLocaleString("vi-VN")}đ
              </span>
            </Link>
          ))}
          <button
            type="button"
            onClick={guiDi}
            className="w-full cursor-pointer border-0 bg-stone px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-wine transition-colors hover:bg-line"
          >
            Xem tất cả kết quả cho “{tuKhoa.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
