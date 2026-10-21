import Image, { type ImageProps } from "next/image";
import { ANH_THAY_THE_NOI_BO } from "@/lib/anh-cwwines";

type Props = Omit<ImageProps, "loader">;

/**
 * Ảnh dùng chung của storefront C.W. Wines.
 *
 * URL Shopify chỉ đóng vai trò khoá tra manifest; trình duyệt luôn nhận đường
 * dẫn WebP trong `/anh`. URL ngoài manifest rơi về ảnh thay thế nội bộ.
 */
export default function Anh({ src, unoptimized, ...props }: Props) {
  const nguon = typeof src === "string" && src.trim() ? src : ANH_THAY_THE_NOI_BO;
  const laData = typeof nguon === "string" && nguon.startsWith("data:");

  return (
    <Image
      {...props}
      src={nguon}
      unoptimized={laData || unoptimized}
    />
  );
}
