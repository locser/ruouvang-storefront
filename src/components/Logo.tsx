import { THUONG_HIEU } from "@/lib/theme";
import T from "./T";

/**
 * Bộ nhận diện — chữ là chính, không dùng ảnh logo.
 *
 * Tên lấy từ `THUONG_HIEU.ten` nên đổi thương hiệu chỉ cần sửa cấu hình. Dấu
 * hiệu là một giọt rượu nằm trong vòng đồng mảnh: đủ đơn giản để thu nhỏ ở
 * favicon và khắc lên nút chai, và không bắt chước biểu tượng ly/chùm nho vốn
 * đã quá phổ biến ở các cửa hàng rượu.
 */
export function DauHieu({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="19" stroke="#B08D57" strokeWidth="1" />
      <path
        d="M20 8.5c3.6 4.7 7 8.7 7 13.1a7 7 0 0 1-14 0c0-4.4 3.4-8.4 7-13.1Z"
        fill="currentColor"
      />
      <path
        d="M16.7 22.6a3.5 3.5 0 0 0 2.4 3.3"
        stroke="#F7F3EC"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export default function Logo({
  nenToi = false,
  khauHieu = false,
}: {
  nenToi?: boolean;
  /** Hiện dòng khẩu hiệu nhỏ dưới tên (chân trang, hộp chặn tuổi). */
  khauHieu?: boolean;
}) {
  return (
    <span
      className={`inline-flex flex-col items-center leading-none ${
        nenToi ? "text-page" : "text-wine"
      }`}
    >
      <span
        className="whitespace-nowrap font-display text-[18px] font-semibold uppercase tracking-[0.26em] min-[400px]:text-[22px] min-[400px]:tracking-[0.32em] sm:text-[26px]"
        style={{ paddingLeft: "0.32em" }}
      >
        {THUONG_HIEU.ten}
      </span>
      <span className="mt-2 flex items-center gap-2.5" aria-hidden="true">
        <span className="h-px w-6 bg-copper" />
        <svg viewBox="0 0 8 8" className="h-[7px] w-[7px] fill-copper">
          <path d="M4 0 8 4 4 8 0 4Z" />
        </svg>
        <span className="h-px w-6 bg-copper" />
      </span>
      {khauHieu && (
        <span
          className={`mt-2 text-[9px] font-medium uppercase tracking-[0.34em] ${
            nenToi ? "text-copper-light" : "text-copper-ink"
          }`}
          style={{ paddingLeft: "0.34em" }}
        >
          <T k="logo.curated_fine_wine" />
        </span>
      )}
    </span>
  );
}
