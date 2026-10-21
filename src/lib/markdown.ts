/**
 * Markdown → HTML, tập con đủ dùng cho bài blog.
 *
 * Vì sao viết tay thay vì thêm `marked` / `remark`:
 *
 *   · Kho này dùng pnpm workspace và ảnh Docker dựng sẵn — thêm một gói là
 *     phải dựng lại ảnh cho cả tám ứng dụng anh em.
 *   · Nội dung do đội nội dung soạn trong Medusa Admin, không phải người lạ
 *     gửi lên. Ta không cần bộ phân tích đầy đủ CommonMark, chỉ cần đúng những
 *     cú pháp mà người viết thật sự dùng.
 *
 * ⚠️ THỨ TỰ QUAN TRỌNG: **thoát HTML TRƯỚC, dựng thẻ SAU**.
 *
 * Làm ngược lại (dựng thẻ rồi mới thoát) sẽ thoát luôn thẻ mình vừa tạo. Còn
 * bỏ hẳn bước thoát thì một tài khoản admin bị chiếm sẽ chèn được `<script>`
 * vào mọi trang blog. Nội dung "tin cậy" vẫn phải thoát — tin cậy không phải
 * là một biện pháp an toàn.
 *
 * Cú pháp hỗ trợ: tiêu đề # ## ###, **đậm**, *nghiêng*, `mã`, [link](url),
 * ![ảnh](url), danh sách - và 1., trích dẫn >, đường kẻ ---, bảng | … |,
 * và đoạn văn.
 */

import { anhCwwinesLoader } from "./anh-cwwines";

function thoat(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Chỉ cho qua đường dẫn an toàn. Chặn `javascript:`, `data:`, `vbscript:` —
 * `[bấm vào đây](javascript:...)` là đường XSS kinh điển qua Markdown.
 */
function duongDanAnToan(url: string): string {
  const u = url.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(u)) return u;
  return "#";
}

/** Cú pháp trong MỘT dòng: đậm, nghiêng, mã, link, ảnh. */
function trongDong(s: string): string {
  return (
    thoat(s)
      // Ảnh trước link — cú pháp ảnh chỉ khác link đúng một dấu `!` ở đầu, xử
      // lý link trước là ảnh biến thành link tới file ảnh.
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => {
        // Nội dung Markdown là chuỗi HTML nên không thể gắn React component.
        // Vẫn bắt buộc ánh xạ qua manifest để URL CDN lạ rơi về ảnh nội bộ.
        const anhNoiBo = anhCwwinesLoader({ src: duongDanAnToan(src), width: 800 });
        return `<img src="${anhNoiBo}" alt="${alt}" loading="lazy" class="my-5 h-auto w-full" />`;
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, chu, href) => {
        const u = duongDanAnToan(href);
        const ngoai = /^https?:/i.test(u);
        return `<a href="${u}"${ngoai ? ' target="_blank" rel="noopener noreferrer"' : ""} class="text-wine underline underline-offset-2 hover:text-wine-dark">${chu}</a>`;
      })
      .replace(/`([^`]+)`/g, '<code class="bg-page px-1.5 py-0.5 text-[13px]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-ink">$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
  );
}

/** Một hàng bảng `| a | b |` → mảng ô. */
function tachHang(dong: string): string[] {
  return dong
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((o) => o.trim());
}

const LA_NGAN_CACH = (d: string) => /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(d) && d.includes("-");

export function markdownSangHtml(md: string): string {
  if (!md) return "";

  const dong = md.replace(/\r\n/g, "\n").split("\n");
  const ra: string[] = [];
  let i = 0;

  const dongVanBan: string[] = [];
  const xaDoanVan = () => {
    if (dongVanBan.length === 0) return;
    ra.push(
      `<p class="my-4 text-[15px] leading-[1.9] text-ink-muted">${trongDong(
        dongVanBan.join(" ")
      )}</p>`
    );
    dongVanBan.length = 0;
  };

  while (i < dong.length) {
    const d = dong[i];

    // Dòng trống — kết thúc đoạn văn đang gom
    if (!d.trim()) {
      xaDoanVan();
      i++;
      continue;
    }

    // Bảng: hàng tiêu đề + hàng ngăn cách + các hàng dữ liệu
    if (d.trim().startsWith("|") && i + 1 < dong.length && LA_NGAN_CACH(dong[i + 1])) {
      xaDoanVan();
      const tieuDe = tachHang(d);
      i += 2;
      const than: string[][] = [];
      while (i < dong.length && dong[i].trim().startsWith("|")) {
        than.push(tachHang(dong[i]));
        i++;
      }
      ra.push(
        `<div class="my-6 overflow-x-auto"><table class="w-full border-collapse text-[14px]">` +
          `<thead><tr>${tieuDe
            .map(
              (o) =>
                `<th class="border border-line bg-page px-3 py-2 text-left font-bold text-ink">${trongDong(o)}</th>`
            )
            .join("")}</tr></thead>` +
          `<tbody>${than
            .map(
              (h) =>
                `<tr>${h
                  .map(
                    (o) =>
                      `<td class="border border-line px-3 py-2 text-ink-muted">${trongDong(o)}</td>`
                  )
                  .join("")}</tr>`
            )
            .join("")}</tbody></table></div>`
      );
      continue;
    }

    // Tiêu đề
    const tieuDe = d.match(/^(#{1,4})\s+(.*)$/);
    if (tieuDe) {
      xaDoanVan();
      const cap = tieuDe[1].length;
      const co =
        cap === 1
          ? "mt-10 mb-4 font-display text-[26px] leading-tight md:text-[32px]"
          : cap === 2
            ? "mt-9 mb-3 font-display text-[21px] leading-snug md:text-[25px]"
            : "mt-7 mb-2 text-[17px] font-bold";
      ra.push(`<h${cap} class="${co} text-ink">${trongDong(tieuDe[2])}</h${cap}>`);
      i++;
      continue;
    }

    // Đường kẻ ngang
    if (/^\s*(---|\*\*\*|___)\s*$/.test(d)) {
      xaDoanVan();
      ra.push('<hr class="my-8 border-line" />');
      i++;
      continue;
    }

    // Trích dẫn
    if (/^\s*>\s?/.test(d)) {
      xaDoanVan();
      const khoi: string[] = [];
      while (i < dong.length && /^\s*>\s?/.test(dong[i])) {
        khoi.push(dong[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      ra.push(
        `<blockquote class="my-6 border-l-4 border-wine bg-wine-pale px-5 py-4 text-[15px] italic leading-relaxed text-ink">${trongDong(
          khoi.join(" ")
        )}</blockquote>`
      );
      continue;
    }

    // Danh sách không thứ tự
    if (/^\s*[-*+]\s+/.test(d)) {
      xaDoanVan();
      const muc: string[] = [];
      while (i < dong.length && /^\s*[-*+]\s+/.test(dong[i])) {
        muc.push(dong[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      ra.push(
        `<ul class="my-4 list-disc space-y-2 pl-6 text-[15px] leading-[1.9] text-ink-muted">${muc
          .map((m) => `<li>${trongDong(m)}</li>`)
          .join("")}</ul>`
      );
      continue;
    }

    // Danh sách có thứ tự
    if (/^\s*\d+[.)]\s+/.test(d)) {
      xaDoanVan();
      const muc: string[] = [];
      while (i < dong.length && /^\s*\d+[.)]\s+/.test(dong[i])) {
        muc.push(dong[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      ra.push(
        `<ol class="my-4 list-decimal space-y-2 pl-6 text-[15px] leading-[1.9] text-ink-muted">${muc
          .map((m) => `<li>${trongDong(m)}</li>`)
          .join("")}</ol>`
      );
      continue;
    }

    dongVanBan.push(d.trim());
    i++;
  }

  xaDoanVan();
  return ra.join("\n");
}
