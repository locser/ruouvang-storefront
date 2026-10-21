import T from "./T";
import { KHOA_NHAN, type MaNhan } from "@/lib/huong-vi";

/**
 * Nhãn "Bán chạy / Dễ uống / Hợp làm quà" — thiết kế dạng DÒNG CHỮ NHỎ kèm icon, đặt
 * dưới tên sản phẩm. Trước đây nhãn là các ô chữ phủ lên ảnh chai: che chai, tranh
 * với nhãn giảm giá và trông rối. Giờ ảnh được để trống hoàn toàn.
 *
 * Màu theo nhóm: "Bán chạy" đỏ rượu (tín hiệu bán hàng); hai nhãn còn lại màu đồng
 * (gợi ý chọn). Icon chỉ để nhận diện nhanh — nghĩa luôn nằm ở chữ bên cạnh.
 */

const D_BIEU_TUONG: Record<MaNhan, string> = {
  // ngọn lửa
  "ban-chay":
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z",
  // ly rượu
  "de-uong": "M8 22h8M7 10h10M12 15v7M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z",
  // hộp quà
  "hop-lam-qua":
    "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z",
};

export default function NhanSanPham({
  nhan,
  className = "",
}: {
  nhan: MaNhan[];
  /** Căn lề: thêm `justify-center` cho thẻ canh giữa. */
  className?: string;
}) {
  if (nhan.length === 0) return null;
  return (
    <ul className={`m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 ${className}`}>
      {nhan.map((m) => (
        <li
          key={m}
          className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase leading-none tracking-[0.14em] ${
            m === "ban-chay" ? "text-wine" : "text-copper-ink"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[13px] w-[13px] shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={D_BIEU_TUONG[m]} />
          </svg>
          <T k={KHOA_NHAN[m]} />
        </li>
      ))}
    </ul>
  );
}
