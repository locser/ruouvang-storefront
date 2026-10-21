import "server-only";
import fs from "fs";
import path from "path";
import manifestJson from "./anh-manifest.json";

/**
 * Tỉ lệ cao/rộng của ảnh chai (đọc từ phần đầu tệp WebP trong /public/anh).
 *
 * Ảnh nguồn không đồng nhất: khoảng 110/177 ảnh là khung vuông với chai nhỏ ở
 * giữa, số còn lại là khung dọc cao 2,3–3,5 lần. Hero chỉ đứng đẹp với ảnh
 * dọc, nên cần biết tỉ lệ trước khi chọn. Đọc 32 byte đầu mỗi tệp, có nhớ đệm.
 *
 * Trả `null` khi không đọc được (ví dụ thiếu thư mục public) — nơi gọi coi đó
 * là "chưa biết" chứ không phải "không đạt".
 */
const nho = new Map<string, number | null>();

function docKichThuoc(tep: string): [number, number] | null {
  const fd = fs.openSync(tep, "r");
  try {
    const b = Buffer.alloc(32);
    fs.readSync(fd, b, 0, 32, 0);
    const loai = b.toString("ascii", 12, 16);
    if (loai === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (loai === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (loai === "VP8L") {
      const v = b.readUInt32LE(21);
      return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

export function tiLeAnh(src: string): number | null {
  if (nho.has(src)) return nho.get(src)!;
  let kq: number | null = null;
  try {
    const khoa = new URL(src.trim().replace(/&amp;/g, "&")).toString();
    const ban = (manifestJson as any).images?.[khoa] as { base: string } | undefined;
    if (ban) {
      const kt = docKichThuoc(path.join(process.cwd(), "public", "anh", `${ban.base}-200.webp`));
      if (kt && kt[0] > 0) kq = kt[1] / kt[0];
    }
  } catch {
    kq = null;
  }
  nho.set(src, kq);
  return kq;
}
