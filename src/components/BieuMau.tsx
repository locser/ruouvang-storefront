import type { ReactNode } from "react";

/** Dấu * trực quan; trình đọc màn hình đã biết ô bắt buộc qua thuộc tính `required`. */
export function DauBatBuoc() {
  return (
    <span className="font-medium text-wine" aria-hidden="true">
      *
    </span>
  );
}

/** Thông báo lỗi dưới ô: có icon + chữ (không chỉ màu), `role="alert"` để đọc ngay khi hiện. */
export function LoiO({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-2 text-[14px] font-medium text-wine">
      <svg
        viewBox="0 0 24 24"
        className="mt-0.5 h-[18px] w-[18px] shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5V13M12 16.5v.1" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
