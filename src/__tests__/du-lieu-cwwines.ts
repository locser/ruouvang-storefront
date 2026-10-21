import fs from "node:fs";
import path from "node:path";

export interface BienTheNguon {
  priceAud: number;
}

export interface SanPhamNguon {
  handle: string;
  price: number;
  priceAud: number;
  images: string[];
  collections: string[];
  variants: BienTheNguon[];
}

export interface DanhMucNguon {
  handle: string;
  title: string;
}

const GOC_REPO = path.resolve(__dirname, "../..");
export const THU_MUC_DATA = path.join(GOC_REPO, "tools/scrapers/data");
export const THU_MUC_SRC = path.join(GOC_REPO, "src");

export function docSanPhamNguon(): SanPhamNguon[] {
  return fs
    .readFileSync(path.join(THU_MUC_DATA, "cwwines-products.jsonl"), "utf8")
    .split("\n")
    .filter((dong) => dong.trim() !== "")
    .map((dong) => JSON.parse(dong) as SanPhamNguon);
}

export function docDanhMucNguon(): DanhMucNguon[] {
  return JSON.parse(
    fs.readFileSync(path.join(THU_MUC_DATA, "cwwines-categories.json"), "utf8")
  ) as DanhMucNguon[];
}

export function docBlogNguon(): Array<{ handle: string; publishedAt: string | null }> {
  return JSON.parse(
    fs.readFileSync(path.join(THU_MUC_DATA, "cwwines-blog.json"), "utf8")
  );
}
