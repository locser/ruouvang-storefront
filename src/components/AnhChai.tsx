"use client";

import { useState } from "react";
import type { ImageProps } from "next/image";
import Anh from "./Anh";

/**
 * Ảnh chai tự chuẩn hoá khung hình.
 *
 * Ảnh nguồn không đồng nhất: khoảng 110/177 ảnh là khung vuông với chai nhỏ ở
 * giữa (chai chỉ chiếm ~40% chiều cao), số còn lại là khung dọc. Đặt chung vào
 * một tấm nền 3:4 thì chai ở ảnh vuông trông nhỏ hơn hẳn bên cạnh chai ở ảnh
 * dọc. Sau khi ảnh tải xong, nếu khung gần vuông thì phóng lên để chai cao gần
 * bằng nhau.
 *
 * Chưa tải xong (hoặc tắt JavaScript) thì giữ nguyên cỡ gốc — ảnh vẫn hiện đủ,
 * chỉ là nhỏ hơn. Dùng thuộc tính CSS `scale` riêng nên cộng được với hiệu ứng
 * `transform` khi rê chuột của lớp cha.
 */
export default function AnhChai({
  heSoVuong = 1.55,
  style,
  onLoad,
  ...props
}: Omit<ImageProps, "loader"> & { heSoVuong?: number }) {
  const [z, setZ] = useState(1);

  return (
    <Anh
      {...props}
      style={{
        ...style,
        scale: z,
        transition: "scale 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), translate 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)",
      }}
      onLoad={(e) => {
        const im = e.currentTarget;
        if (im.naturalWidth > 0 && im.naturalHeight / im.naturalWidth < 1.5) {
          setZ(heSoVuong);
        }
        onLoad?.(e);
      }}
    />
  );
}
