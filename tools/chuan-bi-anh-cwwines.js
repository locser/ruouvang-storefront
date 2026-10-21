#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");

const GOC_REPO = path.resolve(__dirname, "..");
// Dữ liệu cào đã chuyển sang repo backend (nằm cạnh repo storefront trong workspace).
const GOC_WORKSPACE = path.resolve(GOC_REPO, "..");
const THU_MUC_DATA = path.join(
  GOC_WORKSPACE,
  "ruouvang-backend/scripts/scrapers/data"
);
const THU_MUC_NGUON = path.join(THU_MUC_DATA, "cwwines-images");
const TEP_SAN_PHAM = path.join(THU_MUC_DATA, "cwwines-products.jsonl");
const TEP_BLOG = path.join(THU_MUC_DATA, "cwwines-blog.json");
const TEP_THEME = path.join(
  GOC_REPO,
  "src/lib/cwwines-theme.json"
);
const THU_MUC_DICH = path.join(
  GOC_REPO,
  "public/anh"
);
const TEP_MANIFEST = path.join(
  GOC_REPO,
  "src/lib/anh-manifest.json"
);
const CAC_CHIEU_RONG = [200, 400, 800, 1600];
const PLACEHOLDER = "/anh/khong-co-anh.svg";

function napSharp() {
  const tepNext = require.resolve("next/package.json", {
    paths: [path.join(GOC_REPO, ".")],
  });
  return createRequire(tepNext)("sharp");
}

function docJson(tep) {
  return JSON.parse(fs.readFileSync(tep, "utf8"));
}

function docSanPham() {
  return fs
    .readFileSync(TEP_SAN_PHAM, "utf8")
    .split("\n")
    .filter((dong) => dong.trim() !== "")
    .map((dong) => JSON.parse(dong));
}

function chuanHoaUrl(giaTri) {
  if (typeof giaTri !== "string") return null;
  const sach = giaTri.trim().replace(/&amp;/g, "&");
  if (!sach) return null;
  const dayDu = sach.startsWith("//") ? `https:${sach}` : sach;
  try {
    const url = new URL(dayDu);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (
      !url.pathname.includes("/cdn/shop/") &&
      !url.pathname.includes("/s/files/")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function timUrlAnhTrongDuLieu(giaTri, ketQua = new Set()) {
  if (typeof giaTri === "string") {
    const khop = giaTri.match(/(?:https?:)?\/\/[^\s"'<>\\)]+/g) ?? [];
    for (const chuoi of khop) {
      const url = chuanHoaUrl(chuoi.replace(/[.,;]+$/, ""));
      if (url) ketQua.add(url);
    }
    return ketQua;
  }
  if (Array.isArray(giaTri)) {
    for (const muc of giaTri) timUrlAnhTrongDuLieu(muc, ketQua);
  } else if (giaTri && typeof giaTri === "object") {
    for (const muc of Object.values(giaTri)) timUrlAnhTrongDuLieu(muc, ketQua);
  }
  return ketQua;
}

function tenBoSung(url, nhom) {
  const diaChi = new URL(url);
  const tenGoc = path.basename(diaChi.pathname, path.extname(diaChi.pathname));
  const tenSach = tenGoc
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "anh";
  const ma = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
  return `${nhom}-${tenSach}-${ma}`;
}

function timTepSanPham(tenCoSo, tepNguon) {
  const ketQua = tepNguon.filter((ten) => {
    const khongDuoi = ten.slice(0, -path.extname(ten).length);
    return khongDuoi === tenCoSo;
  });
  if (ketQua.length !== 1) {
    throw new Error(
      `Không tìm được đúng một tệp nguồn cho ${tenCoSo} (thấy ${ketQua.length}).`
    );
  }
  return path.join(THU_MUC_NGUON, ketQua[0]);
}

function cacRongCanSinh(rongNguon) {
  const nhoHon = CAC_CHIEU_RONG.filter((rong) => rong <= rongNguon);
  const mocTran = CAC_CHIEU_RONG.find((rong) => rong > rongNguon);
  return [...nhoHon, ...(mocTran ? [mocTran] : [])];
}

async function taiAnh(url) {
  const phanHoi = await fetch(url, {
    headers: { "User-Agent": "VP-Holding-CWWines-Image-Prep/1.0" },
    redirect: "follow",
  });
  if (!phanHoi.ok) {
    throw new Error(`Tải ${url} thất bại: HTTP ${phanHoi.status}`);
  }
  return Buffer.from(await phanHoi.arrayBuffer());
}

function tongDungLuong(thuMuc) {
  if (!fs.existsSync(thuMuc)) return 0;
  return fs.readdirSync(thuMuc).reduce((tong, ten) => {
    const tep = path.join(thuMuc, ten);
    return tong + (fs.statSync(tep).isFile() ? fs.statSync(tep).size : 0);
  }, 0);
}

function dinhDangMb(soByte) {
  return `${(soByte / 1024 / 1024).toFixed(2)} MB`;
}

async function xuLyAnh(sharp, anh, manifestCu) {
  const banCu = manifestCu?.images?.[anh.url];
  if (!anh.tepNguon && banCu?.widths?.length) {
    const daDu = banCu.widths.every((rong) =>
      fs.existsSync(path.join(THU_MUC_DICH, `${banCu.base}-${rong}.webp`))
    );
    if (daDu) return { banGhi: banCu, daBoQua: banCu.widths.length, daSinh: 0 };
  }

  const duLieu = anh.tepNguon ? anh.tepNguon : await taiAnh(anh.url);
  const thongTin = await sharp(duLieu).metadata();
  if (!thongTin.width) throw new Error(`Không đọc được chiều rộng ảnh ${anh.url}`);
  const widths = cacRongCanSinh(thongTin.width);
  let daBoQua = 0;
  let daSinh = 0;

  for (const rong of widths) {
    const tepDich = path.join(THU_MUC_DICH, `${anh.base}-${rong}.webp`);
    if (fs.existsSync(tepDich) && fs.statSync(tepDich).size > 0) {
      daBoQua++;
      continue;
    }
    await sharp(duLieu)
      .rotate()
      .resize({ width: rong, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 82, effort: 4 })
      .toFile(tepDich);
    daSinh++;
  }

  return {
    banGhi: { base: anh.base, widths },
    daBoQua,
    daSinh,
  };
}

async function main() {
  const sharp = napSharp();
  fs.mkdirSync(THU_MUC_DICH, { recursive: true });

  const sanPham = docSanPham();
  const tepNguon = fs
    .readdirSync(THU_MUC_NGUON)
    .filter((ten) => fs.statSync(path.join(THU_MUC_NGUON, ten)).isFile());
  const anhTheoUrl = new Map();

  for (const sp of sanPham) {
    for (const [chiSo, urlGoc] of (sp.images ?? []).entries()) {
      const url = chuanHoaUrl(urlGoc);
      if (!url) throw new Error(`URL ảnh sản phẩm không hợp lệ: ${urlGoc}`);
      // Crawler chỉ lưu lần xuất hiện ĐẦU của một URL dùng chung. Sản phẩm sau
      // có thể dùng lại ảnh đó với handle khác nhưng không tạo thêm tệp.
      if (anhTheoUrl.has(url)) continue;
      const base = `${sp.handle}-${String(chiSo + 1).padStart(2, "0")}`;
      const tep = timTepSanPham(base, tepNguon);
      anhTheoUrl.set(url, { url, base, tepNguon: tep, nhom: "san-pham" });
    }
  }

  if (anhTheoUrl.size !== 221 || tepNguon.length !== 221) {
    throw new Error(
      `Dữ liệu ảnh sản phẩm lệch mốc đã nghiệm thu: ${anhTheoUrl.size} URL / ${tepNguon.length} tệp.`
    );
  }

  const urlTheme = timUrlAnhTrongDuLieu(docJson(TEP_THEME));
  const urlBlog = timUrlAnhTrongDuLieu(docJson(TEP_BLOG));
  for (const [nhom, tapUrl] of [
    ["theme", urlTheme],
    ["blog", urlBlog],
  ]) {
    for (const url of tapUrl) {
      if (!anhTheoUrl.has(url)) {
        anhTheoUrl.set(url, { url, base: tenBoSung(url, nhom), nhom });
      }
    }
  }

  let manifestCu = null;
  if (fs.existsSync(TEP_MANIFEST)) {
    try {
      manifestCu = docJson(TEP_MANIFEST);
    } catch {
      manifestCu = null;
    }
  }

  const images = {};
  let daSinh = 0;
  let daBoQua = 0;
  for (const anh of anhTheoUrl.values()) {
    const ketQua = await xuLyAnh(sharp, anh, manifestCu);
    images[anh.url] = ketQua.banGhi;
    daSinh += ketQua.daSinh;
    daBoQua += ketQua.daBoQua;
  }

  const manifest = {
    version: 1,
    widths: CAC_CHIEU_RONG,
    placeholder: PLACEHOLDER,
    images,
  };
  fs.writeFileSync(TEP_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-labelledby="t m"><title id="t">C.W. Wines</title><desc id="m">Ảnh đang được cập nhật</desc><rect width="800" height="800" fill="#f4f1ed"/><path d="M365 185h70l-12 65v92c0 43 17 82 48 112 37 36 59 87 59 140v51H270v-51c0-53 22-104 59-140 31-30 48-69 48-112v-92l-12-65Z" fill="#931d36" opacity=".16"/><text x="400" y="690" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#6b5f5a">C.W. Wines</text></svg>`;
  fs.writeFileSync(path.join(THU_MUC_DICH, "khong-co-anh.svg"), svg, "utf8");

  const dungLuongTruoc = tongDungLuong(THU_MUC_NGUON);
  const dungLuongSau = tongDungLuong(THU_MUC_DICH);
  const theoNhom = [...anhTheoUrl.values()].reduce((dem, anh) => {
    dem[anh.nhom] = (dem[anh.nhom] ?? 0) + 1;
    return dem;
  }, {});

  console.log("Chuẩn bị ảnh C.W. Wines hoàn tất");
  console.log(`- Ảnh sản phẩm đầu vào: ${tepNguon.length} tệp / ${dinhDangMb(dungLuongTruoc)}`);
  console.log(`- URL manifest: ${Object.keys(images).length} (${Object.entries(theoNhom).map(([nhom, so]) => `${nhom}: ${so}`).join(", ")})`);
  console.log(`- Dẫn xuất WebP: sinh mới ${daSinh}, bỏ qua ${daBoQua}`);
  console.log(`- Dung lượng public/anh: ${dinhDangMb(dungLuongSau)}`);
}

main().catch((loi) => {
  console.error(loi instanceof Error ? loi.stack : loi);
  process.exitCode = 1;
});
