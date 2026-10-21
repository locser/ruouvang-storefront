import manifestJson from "./anh-manifest.json";

interface BanGhiAnh {
  base: string;
  widths: number[];
}

interface ManifestAnh {
  placeholder: string;
  images: Record<string, BanGhiAnh>;
}

const manifest = manifestJson as ManifestAnh;

export interface ThamSoLoaderAnh {
  src: string;
  width: number;
  quality?: number;
}

export function chonChieuRong(yeuCau: number, cacMoc: number[]): number {
  const hopLe = [...new Set(cacMoc)]
    .filter((rong) => Number.isFinite(rong) && rong > 0)
    .sort((a, b) => a - b);
  if (hopLe.length === 0) return Math.max(1, Math.ceil(yeuCau || 1));
  return hopLe.find((rong) => rong >= yeuCau) ?? hopLe[hopLe.length - 1];
}

function chuanHoaKhoa(src: string): string {
  const sach = src.trim().replace(/&amp;/g, "&");
  if (sach.startsWith("//")) return `https:${sach}`;
  try {
    return new URL(sach).toString();
  } catch {
    return sach;
  }
}

export function anhCwwinesLoader({ src, width }: ThamSoLoaderAnh): string {
  if (typeof src !== "string" || src.trim() === "") return manifest.placeholder;
  const khoa = chuanHoaKhoa(src);
  if (khoa.startsWith("data:") || khoa.startsWith("blob:") || khoa.startsWith("/")) {
    return khoa;
  }

  const anh = manifest.images[khoa];
  if (!anh) return manifest.placeholder;
  const rong = chonChieuRong(width, anh.widths);
  return `/anh/${anh.base}-${rong}.webp`;
}

export const ANH_THAY_THE_NOI_BO = manifest.placeholder;

export default anhCwwinesLoader;
