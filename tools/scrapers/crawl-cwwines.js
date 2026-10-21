#!/usr/bin/env node
/**
 * Cào dữ liệu thật từ cwwines.com (Shopify).
 *
 * Chạy:
 *   node tools/scrapers/crawl-cwwines.js
 *   node tools/scrapers/crawl-cwwines.js --max-collections=5
 *
 * Sản phẩm lấy từ /products.json; quan hệ danh mục bắt buộc được dựng bằng
 * cách quét từng /collections/<handle>/products.json. Crawler còn lấy trang
 * tĩnh và blog từ sitemap, đặc tả theme từ CSS/DOM, rồi tải ảnh sản phẩm về
 * thư mục dự phòng. Link dùng để nạp Medusa vẫn là link CDN Shopify gốc.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const GOC = "https://www.cwwines.com";
const TY_GIA_AUD_VND = 17500; // Chốt ngày 18/08/2026 theo brief dự án.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const THU_MUC_DATA = path.join(__dirname, "data");
const THU_MUC_ANH = path.join(THU_MUC_DATA, "cwwines-images");
const FILE_SP = path.join(THU_MUC_DATA, "cwwines-products.jsonl");
const FILE_DM = path.join(THU_MUC_DATA, "cwwines-categories.json");
const FILE_THEME = path.join(THU_MUC_DATA, "cwwines-theme.json");
const FILE_BLOG = path.join(THU_MUC_DATA, "cwwines-blog.json");
const FILE_PAGES = path.join(THU_MUC_DATA, "cwwines-pages.json");
const FILE_BC = path.join(THU_MUC_DATA, "cwwines-crawl-report.json");

function docThamSo() {
  const args = process.argv.slice(2);
  const lay = (ten, macDinh) => {
    const hit = args.find((a) => a.startsWith(`--${ten}=`));
    return hit ? hit.split("=").slice(1).join("=") : macDinh;
  };
  return {
    maxCollections: Math.max(0, parseInt(lay("max-collections", "0"), 10) || 0),
    concurrency: Math.max(1, parseInt(lay("concurrency", "5"), 10) || 5),
    nghi: Math.max(0, parseInt(lay("nghi", "120"), 10) || 120),
  };
}

const ngu = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tai(url, kieu = "text", soLanThu = 4) {
  for (let lan = 1; lan <= soLanThu; lan++) {
    const ac = new AbortController();
    const hetGio = setTimeout(() => ac.abort(), 30000);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: {
          "User-Agent": UA,
          Accept: kieu === "json" ? "application/json,text/plain,*/*" : "text/html,*/*",
          "Accept-Language": "en-AU,en;q=0.9,vi;q=0.7",
        },
      });
      clearTimeout(hetGio);
      if (res.status === 429 || res.status >= 500) {
        await ngu(1000 * lan);
        continue;
      }
      if (!res.ok) return null;
      const text = await res.text();
      if (!text.trim()) return null;
      return kieu === "json" ? JSON.parse(text) : text;
    } catch (e) {
      clearTimeout(hetGio);
      if (lan === soLanThu) {
        console.error(`  ✖ ${url} — ${String(e?.message ?? e).slice(0, 100)}`);
        return null;
      }
      await ngu(1000 * lan);
    }
  }
  return null;
}

async function chayTheoLan(dsItem, soLuong, viec) {
  const ketQua = new Array(dsItem.length);
  let chiSo = 0;
  const congNhan = Array.from({ length: Math.min(soLuong, dsItem.length) }, async () => {
    while (chiSo < dsItem.length) {
      const i = chiSo++;
      ketQua[i] = await viec(dsItem[i], i);
    }
  });
  await Promise.all(congNhan);
  return ketQua;
}

function giaiMaHtml(s) {
  return String(s ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function boThe(html) {
  return giaiMaHtml(
    String(html ?? "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|article|section|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function urlDayDu(url) {
  const s = giaiMaHtml(String(url ?? "").trim());
  if (!s) return "";
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${GOC}${s}`;
  if (s.startsWith("http://www.cwwines.com")) return s.replace("http://", "https://");
  return s;
}

function giaAud(v) {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function audSangVnd(v) {
  const aud = giaAud(v);
  return aud > 0 ? Math.ceil((aud * TY_GIA_AUD_VND) / 1000) * 1000 : 0;
}

/** Chỉ ghi sản phẩm có ít nhất một biến thể mang giá dương vào catalog. */
function sanPhamBanDuoc(sp) {
  return Array.isArray(sp?.variants) && sp.variants.some((v) => giaAud(v.priceAud) > 0);
}

function tachTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function chuanHoaSanPham(p) {
  const variants = (p.variants ?? []).map((v, i) => {
    const priceAud = giaAud(v.price);
    const originalPriceAud = giaAud(v.compare_at_price) || null;
    return {
      sku: String(v.sku || `CW-${p.id}-${v.id || i + 1}`).trim(),
      title: String(v.title || v.option1 || "Default Title").trim(),
      option1: v.option1 ?? null,
      option2: v.option2 ?? null,
      option3: v.option3 ?? null,
      price: audSangVnd(priceAud),
      priceAud,
      originalPrice: originalPriceAud ? audSangVnd(originalPriceAud) : null,
      originalPriceAud,
      // Shopify public API không lộ số lượng. 100 là mức khởi tạo
      // cho biến thể đang available; giá trị này được đánh dấu trong metadata.
      inventoryQuantity: v.available === false ? 0 : 100,
      available: v.available !== false,
      weightGram: Number(v.grams ?? 0) || 0,
      barcode: v.barcode ? String(v.barcode) : null,
      viTri: i,
    };
  });
  const firstPaid = variants.find((v) => v.priceAud > 0) ?? variants[0];
  const tags = tachTags(p.tags);
  return {
    site: "cwwines",
    url: `${GOC}/products/${p.handle}`,
    shopifyId: p.id ?? null,
    handle: String(p.handle ?? "").trim(),
    title: String(p.title ?? "").trim(),
    description: boThe(p.body_html).slice(0, 12000),
    descriptionHtml: String(p.body_html ?? ""),
    brand: p.vendor ? String(p.vendor).trim() : null,
    productType: p.product_type ? String(p.product_type).trim() : null,
    sku: firstPaid?.sku || null,
    price: firstPaid?.price ?? 0,
    priceAud: firstPaid?.priceAud ?? 0,
    originalPrice: firstPaid?.originalPrice ?? null,
    originalPriceAud: firstPaid?.originalPriceAud ?? null,
    available: variants.some((v) => v.available),
    images: (p.images ?? []).map((i) => urlDayDu(i.src)).filter(Boolean),
    options: (p.options ?? []).map((o) => ({
      name: String(o.name ?? "").trim() || "Title",
      values: (o.values ?? []).map((x) => String(x)),
    })),
    variants,
    tags,
    tagsGoc: tags,
    thuocTinh: {},
    publishedAt: p.published_at ?? null,
    collections: [],
  };
}

async function layTatCaSanPham() {
  const ds = [];
  for (let page = 1; page <= 100; page++) {
    const d = await tai(`${GOC}/products.json?limit=250&page=${page}`, "json");
    const lo = d?.products ?? [];
    if (lo.length === 0) break;
    ds.push(...lo);
    if (lo.length < 250) break;
    await ngu(120);
  }
  return ds;
}

async function layBoSuuTap() {
  const ds = [];
  for (let page = 1; page <= 20; page++) {
    const d = await tai(`${GOC}/collections.json?limit=250&page=${page}`, "json");
    const lo = d?.collections ?? [];
    if (lo.length === 0) break;
    for (const c of lo) {
      ds.push({
        handle: String(c.handle ?? "").trim(),
        title: String(c.title ?? "").trim(),
        description: boThe(c.body_html ?? c.description).slice(0, 4000),
        image: c.image?.src ? urlDayDu(c.image.src) : null,
        shopifyId: c.id ?? null,
        publishedAt: c.published_at ?? null,
        productsCountApi: Number(c.products_count ?? 0) || 0,
      });
    }
    if (lo.length < 250) break;
  }
  return ds.filter((c) => c.handle);
}

async function laySanPhamCuaBo(handle, nghi) {
  const ds = [];
  for (let page = 1; page <= 100; page++) {
    const d = await tai(
      `${GOC}/collections/${encodeURIComponent(handle)}/products.json?limit=250&page=${page}`,
      "json"
    );
    const lo = d?.products ?? [];
    if (lo.length === 0) break;
    ds.push(...lo);
    if (lo.length < 250) break;
    await ngu(nghi);
  }
  return ds;
}

function layLoc(xml) {
  return [...String(xml ?? "").matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((m) => urlDayDu(m[1].replace(/&amp;/g, "&")))
    .filter(Boolean);
}

async function layUrlTuSitemap(loai) {
  const cha = await tai(`${GOC}/sitemap.xml`);
  if (!cha) return [];
  const sitemapCon = layLoc(cha).find((u) => u.includes(`sitemap_${loai}_`));
  if (!sitemapCon) return [];
  const xml = await tai(sitemapCon);
  return layLoc(xml);
}

function layMeta(html, ten) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${ten.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]+content=["']([^"']*)["'][^>]*>|` +
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${ten.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i"
  );
  const m = String(html ?? "").match(re);
  return giaiMaHtml(m?.[1] ?? m?.[2] ?? "").trim();
}

function layTieuDe(html) {
  return (
    layMeta(html, "og:title") ||
    boThe(String(html ?? "").match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") ||
    boThe(String(html ?? "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
  );
}

function layKhoiNoiDung(html, loai) {
  const patterns =
    loai === "blog"
      ? [
          /<article\b[^>]*>[\s\S]*?<\/article>/i,
          /<div\b[^>]*class=["'][^"']*article__body[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
        ]
      : [
          /<main\b[^>]*>[\s\S]*?<\/main>/i,
          /<div\b[^>]*class=["'][^"']*rte[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
        ];
  for (const re of patterns) {
    const m = String(html ?? "").match(re);
    if (m) return m[0];
  }
  return "";
}

async function caoTrangTinh(concurrency) {
  const urls = (await layUrlTuSitemap("pages")).filter((u) => u.includes("/pages/"));
  const rows = await chayTheoLan(urls, concurrency, async (url) => {
    const html = await tai(url);
    if (!html) return null;
    const contentHtml = layKhoiNoiDung(html, "page");
    return {
      handle: new URL(url).pathname.split("/").filter(Boolean).pop(),
      url,
      title: layTieuDe(html),
      description: layMeta(html, "description"),
      image: urlDayDu(layMeta(html, "og:image")) || null,
      content: boThe(contentHtml),
      contentHtml,
    };
  });
  return rows.filter(Boolean);
}

async function caoBlog(concurrency) {
  const cache = new Map();
  if (fs.existsSync(FILE_BLOG)) {
    try {
      for (const bai of JSON.parse(fs.readFileSync(FILE_BLOG, "utf-8"))) {
        if (bai.handle && bai.contentVi) cache.set(bai.handle, bai);
      }
    } catch {}
  }
  const urls = (await layUrlTuSitemap("blogs")).filter(
    (u) => /\/blogs\/news\/.+/.test(u)
  );
  const rows = await chayTheoLan(urls, concurrency, async (url) => {
    const html = await tai(url);
    if (!html) return null;
    const contentHtml = layKhoiNoiDung(html, "blog");
    const ngay =
      String(html).match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1] ||
      layMeta(html, "article:published_time") ||
      null;
    const handle = new URL(url).pathname.split("/").filter(Boolean).pop();
    const title = layTieuDe(html);
    const description = layMeta(html, "description");
    const content = boThe(contentHtml);
    const daDich = cache.get(handle);
    return {
      handle,
      url,
      title,
      titleVi: daDich?.titleVi || (await dichDoanSangViet(title)),
      description,
      descriptionVi:
        daDich?.descriptionVi || (description ? await dichDoanSangViet(description) : ""),
      image: urlDayDu(layMeta(html, "og:image")) || null,
      publishedAt: ngay,
      author: layMeta(html, "article:author") || "C.W. Wines",
      content,
      contentVi: daDich?.contentVi || (content ? await dichDoanSangViet(content) : ""),
      contentHtml,
    };
  });
  return rows.filter(Boolean);
}

function layBienCss(html) {
  const ra = {};
  for (const block of String(html ?? "").matchAll(/:root\s*\{([\s\S]*?)\}/gi)) {
    for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*([^;}{]+);/g)) {
      ra[`--${m[1]}`] = m[2].trim();
    }
  }
  return ra;
}

function layAnhTrongHtml(html) {
  const ds = [];
  for (const m of String(html ?? "").matchAll(/(?:src|data-src)=["']([^"']+)["']/gi)) {
    const u = urlDayDu(m[1]);
    if (/cdn\/shop\/files\//.test(u) && !ds.includes(u)) ds.push(u);
  }
  return ds;
}

function layMenu(html, boSuuTap) {
  const titleByHandle = new Map(boSuuTap.map((b) => [b.handle, b.title]));
  const handles = [];
  for (const m of String(html ?? "").matchAll(/href=["']\/collections\/([^"'?/#]+)[^"']*["']/gi)) {
    const handle = decodeURIComponent(m[1]);
    if (titleByHandle.has(handle) && !handles.includes(handle)) handles.push(handle);
  }
  for (const b of boSuuTap) if (!handles.includes(b.handle)) handles.push(b.handle);
  return handles.map((handle) => ({
    ten: titleByHandle.get(handle) ?? handle,
    tenEn: titleByHandle.get(handle) ?? handle,
    handle,
    cot: [],
  }));
}

function docBanDichDaCo() {
  const map = new Map();
  if (!fs.existsSync(FILE_SP)) return map;
  for (const dong of fs.readFileSync(FILE_SP, "utf-8").split("\n")) {
    if (!dong.trim()) continue;
    try {
      const sp = JSON.parse(dong);
      if (sp.handle && sp.descriptionVi) map.set(sp.handle, sp.descriptionVi);
    } catch {}
  }
  return map;
}

async function dichDoanSangViet(text) {
  const chunks = String(text ?? "").match(/[\s\S]{1,2500}/g) ?? [];
  const ra = [];
  for (const chunk of chunks) {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=" +
      encodeURIComponent(chunk);
    const d = await tai(url, "json", 3);
    const dich = Array.isArray(d?.[0])
      ? d[0].map((x) => (Array.isArray(x) ? x[0] : "")).join("")
      : "";
    if (!dich) return "";
    ra.push(dich);
    await ngu(80);
  }
  return ra.join("").trim();
}

async function dichMoTaSanPham(sanPham, concurrency) {
  const cache = docBanDichDaCo();
  let daDich = 0;
  let loi = 0;
  await chayTheoLan(sanPham, Math.min(3, concurrency), async (sp) => {
    if (!sp.description) {
      sp.descriptionVi = "";
      return;
    }
    if (cache.has(sp.handle)) {
      sp.descriptionVi = cache.get(sp.handle);
      return;
    }
    const dich = await dichDoanSangViet(sp.description);
    if (dich) {
      sp.descriptionVi = dich;
      daDich++;
    } else {
      // Không giả vờ đã dịch: giữ rỗng để seed/storefront biết dùng bản Anh.
      sp.descriptionVi = "";
      loi++;
    }
  });
  return { daDich, tuCache: cache.size, loi };
}

async function layComputedStyleTrinhDuyet() {
  const chrome = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((p) => p && fs.existsSync(p));
  if (!chrome || typeof WebSocket === "undefined") return null;

  const port = 30000 + Math.floor(Math.random() * 15000);
  const thuMucTam = fs.mkdtempSync(path.join(os.tmpdir(), "cwwines-chrome-"));
  const trinhDuyet = spawn(
    chrome,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${thuMucTam}`,
      GOC,
    ],
    { stdio: "ignore" }
  );

  try {
    let target = null;
    for (let i = 0; i < 40; i++) {
      try {
        const ds = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        target = ds.find((x) => x.type === "page" && /cwwines\.com/.test(x.url));
        if (target) break;
      } catch {}
      await ngu(250);
    }
    if (!target) return null;

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    let id = 1;
    const danhGia = (expression) =>
      new Promise((resolve, reject) => {
        const ma = id++;
        const hetGio = setTimeout(() => reject(new Error("Chrome evaluate timeout")), 12000);
        const nhan = (event) => {
          const d = JSON.parse(event.data);
          if (d.id !== ma) return;
          clearTimeout(hetGio);
          ws.removeEventListener("message", nhan);
          resolve(d?.result?.result?.value ?? null);
        };
        ws.addEventListener("message", nhan);
        ws.send(
          JSON.stringify({
            id: ma,
            method: "Runtime.evaluate",
            params: { expression, returnByValue: true, awaitPromise: true },
          })
        );
      });
    await danhGia(
      `new Promise(r => { const x=()=>document.readyState==='complete'&&location.hostname.includes('cwwines.com')?r(true):setTimeout(x,200); x(); })`
    );
    await ngu(1200);
    const result = await danhGia(`(() => {
      const selectors = ['body', '.header-wrapper', '.site-nav__link', '.btn', '.site-footer'];
      return Object.fromEntries(selectors.map((selector) => {
        const el = document.querySelector(selector);
        if (!el) return [selector, null];
        const c = getComputedStyle(el);
        return [selector, {
          color: c.color,
          backgroundColor: c.backgroundColor,
          fontFamily: c.fontFamily,
          fontSize: c.fontSize,
          fontWeight: c.fontWeight,
          lineHeight: c.lineHeight,
          borderRadius: c.borderRadius
        }];
      }));
    })()`);
    ws.close();
    return result;
  } catch (e) {
    console.warn(`  ⚠ Không đọc được computed style qua Chrome: ${String(e?.message ?? e)}`);
    return null;
  } finally {
    trinhDuyet.kill("SIGTERM");
    await ngu(200);
    fs.rmSync(thuMucTam, { recursive: true, force: true });
  }
}

async function caoTheme(boSuuTap) {
  const html = await tai(GOC);
  if (!html) throw new Error("Không tải được trang chủ để cào theme");

  let css = "";
  for (const m of html.matchAll(/<link\b[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>|<link\b[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    const u = urlDayDu(m[1] ?? m[2]);
    if (!/cwwines\.com/.test(u)) continue;
    css += `\n${(await tai(u)) ?? ""}`;
  }
  const cssVariables = { ...layBienCss(css), ...layBienCss(html) };
  const computedTuCss = {
    body: {
      color: cssVariables["--colorTextBody"] ?? "#000000",
      backgroundColor: cssVariables["--colorBody"] ?? "#ffffff",
      fontFamily: `${cssVariables["--typeBasePrimary"] ?? '"Work Sans"'}, sans-serif`,
      fontSize: cssVariables["--typeBaseSize"] ?? "14px",
      fontWeight: cssVariables["--typeBaseWeight"] ?? "300",
      lineHeight: cssVariables["--typeBaseLineHeight"] ?? "1.8",
    },
    header: {
      color: cssVariables["--colorNavText"] ?? "#000000",
      backgroundColor: cssVariables["--colorNav"] ?? "#ffffff",
    },
    button: {
      color: cssVariables["--colorBtnPrimaryText"] ?? "#ffffff",
      backgroundColor: cssVariables["--colorBtnPrimary"] ?? "#111111",
      borderRadius: cssVariables["--buttonRadius"] ?? "0px",
    },
    footer: {
      color: cssVariables["--colorFooterText"] ?? "#000000",
      backgroundColor: cssVariables["--colorFooter"] ?? "#ffffff",
    },
  };
  const anh = layAnhTrongHtml(html);
  const logoTag = html.match(/<img\b[^>]+itemprop=["']logo["'][^>]*>/i)?.[0] ?? "";
  const logo = urlDayDu(logoTag.match(/src=["']([^"']+)["']/i)?.[1]) || anh[0] || "";
  const anhNoiDung = anh
    .filter((u) => u !== logo && !/logo/i.test(u) && !u.includes("{width}"))
    .sort((a, b) => Number(/1800x/.test(b)) - Number(/1800x/.test(a)));
  const computedTrinhDuyet = await layComputedStyleTrinhDuyet();

  return {
    _ghiChu: [
      "Cào tự động từ CSS :root, stylesheet và DOM thật của cwwines.com.",
      "computedStyleBrowser lấy bằng Chrome headless khi máy có Chrome; computedStyleCss là bản dự phòng từ biến CSS thật.",
    ],
    nguon: GOC,
    capNhat: new Date().toISOString().slice(0, 10),
    cssVariables,
    computedStyleBrowser: computedTrinhDuyet,
    computedStyleCss: computedTuCss,
    thuongHieu: {
      ten: "C.W. Wines",
      tenDayDu: "C.W. Wines",
      tieuDe: layMeta(html, "og:title") || "C.W. Wines",
      moTa: layMeta(html, "description"),
      logo,
      hotline: "",
      wineSchool: "",
    },
    mau: {
      primary: cssVariables["--colorBtnPrimary"] ?? "#111111",
      priceColor: cssVariables["--colorPrice"] ?? "#1c1d1d",
      addToCartBg: cssVariables["--colorBtnPrimary"] ?? "#111111",
      addToCartText: cssVariables["--colorBtnPrimaryText"] ?? "#ffffff",
      labelColor: cssVariables["--colorTextSavings"] ?? "#c20000",
      headerCategoryBg: cssVariables["--colorNav"] ?? "#ffffff",
      headerCategoryColor: cssVariables["--colorNavText"] ?? "#000000",
      subheaderBg: cssVariables["--colorAnnouncement"] ?? "#0f0f0f",
      subheaderColor: cssVariables["--colorAnnouncementText"] ?? "#ffffff",
      secondary: cssVariables["--colorTextBody"] ?? "#000000",
      textColor: cssVariables["--colorTextBody"] ?? "#000000",
      textSecondary: "#666666",
      bodyBackground: cssVariables["--colorBody"] ?? "#ffffff",
      borderColor: cssVariables["--colorBorder"] ?? "#e8e8e1",
      footerBg: cssVariables["--colorFooter"] ?? "#ffffff",
      footerColor: cssVariables["--colorFooterText"] ?? "#000000",
      topBannerBg: cssVariables["--colorAnnouncement"] ?? "#0f0f0f",
      productPromotionBg: cssVariables["--colorTextSavings"] ?? "#c20000",
      couponBorder: cssVariables["--colorBorder"] ?? "#e8e8e1",
      couponButton: cssVariables["--colorBtnPrimary"] ?? "#111111",
      salePop: cssVariables["--colorTextSavings"] ?? "#c20000",
      linkColor: cssVariables["--colorLink"] ?? "#000000",
    },
    chuVietiet: {
      than: `${cssVariables["--typeBasePrimary"] ?? '"Work Sans"'}, sans-serif`,
      tieuDeSection: `${cssVariables["--typeHeaderPrimary"] ?? '"EB Garamond"'}, serif`,
    },
    kichThuoc: {
      container: 1300,
      containerPadding: 24,
      tieuDeSection: {
        size: parseInt(cssVariables["--typeHeaderSize"] ?? "36", 10),
        weight: Number(cssVariables["--typeHeaderWeight"] ?? 400),
        lineHeight: cssVariables["--typeHeaderLineHeight"] ?? 1,
      },
      theTenSanPham: { size: 14, weight: 400, lineHeight: 20 },
      theGia: { size: 16, weight: 600, lineHeight: 24 },
      tyLeAnhSanPham: "1/1",
    },
    thanhTrenCung: {
      nen: cssVariables["--colorAnnouncement"] ?? "#0f0f0f",
      dienThoai: "",
      khuyenMai: "AUSTRALIAN WINE, DELIVERED",
      khuyenMaiLink: "/danh-muc/welcome20-discount",
      coDoiNgonNgu: true,
    },
    camKet: [
      "Rượu vang Australia chính hãng",
      "Danh mục từ nhiều nhà rượu",
      "Giao hàng an toàn",
      "Tư vấn chọn rượu",
    ],
    camKetEn: [
      "Authentic Australian wines",
      "A portfolio of trusted producers",
      "Safe delivery",
      "Wine selection advice",
    ],
    anh: {
      slider: anhNoiDung.slice(0, 4),
      bannerCus: anhNoiDung.slice(4, 9),
      bannerHot: anhNoiDung[9] ?? anhNoiDung[0] ?? logo,
      camKetIcon: [],
      thuongHieu: anh.filter((u) => /logo/i.test(u)).slice(0, 14),
    },
    khuyenMai: {
      ma: "WELCOME20",
      tieuDe: "Đơn hàng đầu tiên",
      giamToiDa: "500.000đ",
      donToiThieu: "0đ",
      phanTram: 20,
      giamToiDaVnd: 500000,
      donToiThieuVnd: 0,
      _ghiChu: "Suy ra từ collection handle welcome20-discount; cần xác nhận điều kiện khi deploy.",
    },
    trangChu: [
      { loai: "slider" },
      { loai: "camKet" },
      {
        loai: "sanPhamTab",
        tieuDe: "RƯỢU VANG NỔI BẬT",
        tieuDeEn: "FEATURED WINES",
        xemTatCa: "welcome20-discount",
        tab: boSuuTap.slice(0, 3).map((b) => ({
          ten: b.title,
          tenEn: b.title,
          danhMuc: b.handle,
        })),
      },
    ],
    menu: layMenu(html, boSuuTap),
    footer: {
      cot: [
        {
          tieuDe: "THÔNG TIN",
          tieuDeEn: "INFORMATION",
          muc: [
            { ten: "Giới thiệu", tenEn: "About us", duongDan: "/chinh-sach/about-cw" },
            { ten: "Liên hệ", tenEn: "Contact", duongDan: "/chinh-sach/contact" },
            { ten: "Tin mới", tenEn: "Latest news", duongDan: "/blog" },
          ],
        },
        {
          tieuDe: "SẢN PHẨM",
          tieuDeEn: "PRODUCTS",
          muc: boSuuTap.slice(0, 7).map((b) => ({
            ten: b.title,
            tenEn: b.title,
            duongDan: `/danh-muc/${b.handle}`,
          })),
        },
        {
          tieuDe: "HỖ TRỢ KHÁCH HÀNG",
          tieuDeEn: "CUSTOMER SUPPORT",
          muc: [
            { ten: "Chính sách bảo mật", tenEn: "Privacy policy", duongDan: "/chinh-sach/privacy-policy" },
            { ten: "Điều khoản", tenEn: "Terms & conditions", duongDan: "/chinh-sach/terms-conditions" },
          ],
        },
      ],
      banQuyen: "© Bản quyền thuộc về C.W. Wines",
      banQuyenEn: "© Copyright C.W. Wines",
    },
    chanTuoi: {
      batBuoc: true,
      tuoiToiThieu: 18,
      vi: {
        tieuDe: "VUI LÒNG XÁC NHẬN ĐỘ TUỔI.",
        hoi: "BẠN ĐÃ ĐỦ 18 TUỔI?",
        dong: "ĐỦ 18 TUỔI",
        tu_choi: "CHƯA 18 TUỔI",
        ghiChu: "Website chỉ giới thiệu sản phẩm có cồn tới người từ 18 tuổi.",
      },
      en: {
        tieuDe: "PLEASE CONFIRM YOUR AGE.",
        hoi: "ARE YOU 18 OR OLDER?",
        dong: "18 & ABOVE",
        tu_choi: "UNDER 18",
        ghiChu: "This website presents alcoholic products only to people aged 18 or older.",
      },
    },
  };
}

function duoiAnh(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return /^\.(jpe?g|png|webp|gif|avif)$/.test(ext) ? ext : ".jpg";
  } catch {
    return ".jpg";
  }
}

async function taiAnhSanPham(sanPham, concurrency) {
  fs.mkdirSync(THU_MUC_ANH, { recursive: true });
  const theoUrl = new Map();
  for (const sp of sanPham) {
    sp.images.forEach((url, i) => {
      if (!theoUrl.has(url)) {
        theoUrl.set(url, {
          url,
          file: path.join(
            THU_MUC_ANH,
            `${sp.handle.replace(/[^a-z0-9_-]/gi, "-").slice(0, 120)}-${String(i + 1).padStart(2, "0")}${duoiAnh(url)}`
          ),
        });
      }
    });
  }
  const canTai = [...theoUrl.values()];
  const tepCanCo = new Set(canTai.map((item) => path.basename(item.file)));
  for (const ten of fs.readdirSync(THU_MUC_ANH)) {
    const tep = path.join(THU_MUC_ANH, ten);
    if (!tepCanCo.has(ten) && fs.statSync(tep).isFile()) fs.unlinkSync(tep);
  }

  let thanhCong = 0;
  let boQua = 0;
  let thatBai = 0;
  await chayTheoLan(canTai, Math.max(1, Math.min(concurrency, 10)), async ({ url, file }) => {
    if (fs.existsSync(file) && fs.statSync(file).size > 0) {
      boQua++;
      return;
    }
    for (let lan = 1; lan <= 4; lan++) {
      const ac = new AbortController();
      const hetGio = setTimeout(() => ac.abort(), 45000);
      try {
        const res = await fetch(url, { signal: ac.signal, headers: { "User-Agent": UA } });
        clearTimeout(hetGio);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0) throw new Error("file rỗng");
        fs.writeFileSync(file, buf);
        thanhCong++;
        return;
      } catch (e) {
        clearTimeout(hetGio);
        if (lan === 4) {
          thatBai++;
          console.error(`  ✖ Ảnh ${url} — ${String(e?.message ?? e).slice(0, 80)}`);
        } else {
          await ngu(700 * lan);
        }
      }
    }
  });
  return { tong: canTai.length, thanhCong, boQua, thatBai };
}

async function main() {
  const ts = docThamSo();
  fs.mkdirSync(THU_MUC_DATA, { recursive: true });

  console.log("═".repeat(72));
  console.log(" CÀO cwwines.com — Shopify JSON API + sitemap + HTML");
  console.log("═".repeat(72));

  console.log("\n→ Bước 1: lấy toàn bộ sản phẩm và bộ sưu tập…");
  const [rawProducts, tatCaBoSuuTap] = await Promise.all([
    layTatCaSanPham(),
    layBoSuuTap(),
  ]);
  if (rawProducts.length === 0) throw new Error("Shopify API không trả sản phẩm nào");
  console.log(`  ✓ ${rawProducts.length} sản phẩm · ${tatCaBoSuuTap.length} bộ sưu tập`);

  const banDoSP = new Map();
  let soSanPhamKhongBan = 0;
  for (const raw of rawProducts) {
    const sp = chuanHoaSanPham(raw);
    if (!sp.handle) continue;
    if (!sanPhamBanDuoc(sp)) {
      soSanPhamKhongBan++;
      continue;
    }
    banDoSP.set(sp.handle, sp);
  }
  if (soSanPhamKhongBan > 0) {
    console.log(`  ✓ Loại ${soSanPhamKhongBan} sản phẩm giá 0 khỏi dữ liệu bán hàng`);
  }
  const thuocBo = new Map([...banDoSP.keys()].map((h) => [h, new Set()]));
  const boSuuTap = ts.maxCollections
    ? tatCaBoSuuTap.slice(0, ts.maxCollections)
    : tatCaBoSuuTap;
  if (ts.maxCollections) {
    console.log(`  (chế độ thử: quét quan hệ của ${boSuuTap.length} bộ đầu tiên)`);
  }

  console.log(`\n→ Bước 2: quét từng collection (${ts.concurrency} luồng)…`);
  let xong = 0;
  await chayTheoLan(boSuuTap, ts.concurrency, async (bo) => {
    const ds = await laySanPhamCuaBo(bo.handle, ts.nghi);
    bo.soSanPham = ds.length;
    bo.soSanPhamTrongCatalog = 0;
    for (const p of ds) {
      const handle = String(p.handle ?? "").trim();
      if (!banDoSP.has(handle)) continue;
      bo.soSanPhamTrongCatalog++;
      thuocBo.get(handle).add(bo.handle);
    }
    xong++;
    if (xong % 10 === 0 || xong === boSuuTap.length) {
      console.log(`  … ${xong}/${boSuuTap.length} bộ`);
    }
  });
  for (const [handle, sp] of banDoSP) sp.collections = [...(thuocBo.get(handle) ?? [])];

  console.log("\n→ Bước 3: dịch mô tả sản phẩm sang tiếng Việt…");
  const ketQuaDich = await dichMoTaSanPham([...banDoSP.values()], ts.concurrency);
  console.log(
    `  ✓ ${ketQuaDich.daDich} bản dịch mới · ${ketQuaDich.tuCache} từ cache · ${ketQuaDich.loi} lỗi`
  );

  console.log("\n→ Bước 4: cào trang tĩnh, blog và theme…");
  const [pages, blog, theme] = await Promise.all([
    caoTrangTinh(ts.concurrency),
    caoBlog(ts.concurrency),
    caoTheme(tatCaBoSuuTap),
  ]);
  console.log(`  ✓ ${pages.length} trang tĩnh · ${blog.length} bài blog · theme ${Object.keys(theme.cssVariables).length} biến CSS`);

  console.log("\n→ Bước 5: tải bản sao ảnh sản phẩm…");
  const sanPham = [...banDoSP.values()];
  const ketQuaAnh = await taiAnhSanPham(sanPham, ts.concurrency * 2);
  console.log(
    `  ✓ ${ketQuaAnh.tong - ketQuaAnh.thatBai}/${ketQuaAnh.tong} ảnh ` +
      `(${ketQuaAnh.thanhCong} tải mới, ${ketQuaAnh.boQua} đã có)`
  );

  console.log("\n→ Bước 6: ghi dữ liệu và báo cáo…");
  fs.writeFileSync(FILE_SP, sanPham.map((sp) => JSON.stringify(sp)).join("\n") + "\n", "utf-8");
  fs.writeFileSync(
    FILE_DM,
    JSON.stringify(
      boSuuTap
        .map((b) => ({
          ...b,
          soSanPham: b.soSanPhamTrongCatalog ?? b.soSanPham ?? 0,
        }))
        .sort((a, b) => b.soSanPham - a.soSanPham),
      null,
      2
    ),
    "utf-8"
  );
  fs.writeFileSync(FILE_THEME, JSON.stringify(theme, null, 2), "utf-8");
  fs.writeFileSync(FILE_BLOG, JSON.stringify(blog, null, 2), "utf-8");
  fs.writeFileSync(FILE_PAGES, JSON.stringify(pages, null, 2), "utf-8");

  const tatCaBienThe = sanPham.flatMap((sp) => sp.variants);
  const tatCaGiaAud = tatCaBienThe.map((v) => v.priceAud);
  const baoCao = {
    site: "cwwines.com",
    nen: "shopify",
    luc: new Date().toISOString(),
    tyGiaAudVnd: TY_GIA_AUD_VND,
    maxCollections: ts.maxCollections || null,
    soSanPham: sanPham.length,
    soAnh: new Set(sanPham.flatMap((sp) => sp.images)).size,
    soAnhDaTai: ketQuaAnh.tong - ketQuaAnh.thatBai,
    soBienThe: tatCaBienThe.length,
    soBoSuuTap: boSuuTap.length,
    soBoSuuTapToanSite: tatCaBoSuuTap.length,
    soNhaSanXuat: new Set(sanPham.map((sp) => sp.brand).filter(Boolean)).size,
    nhaSanXuat: [...new Set(sanPham.map((sp) => sp.brand).filter(Boolean))].sort(),
    loaiSanPham: [...new Set(sanPham.map((sp) => sp.productType ?? ""))].sort(),
    soTrangTinh: pages.length,
    soBaiBlog: blog.length,
    soMoTaTiengViet: sanPham.filter((sp) => Boolean(sp.descriptionVi)).length,
    soSanPhamKhongThuocBoNao: sanPham.filter((sp) => sp.collections.length === 0).length,
    soSanPhamKhongCoGia: sanPham.filter((sp) => !sp.variants.some((v) => v.price > 0)).length,
    soSanPhamKhongCoAnh: sanPham.filter((sp) => sp.images.length === 0).length,
    giaAudThapNhat: Math.min(...tatCaGiaAud),
    giaAudCaoNhat: Math.max(...tatCaGiaAud),
    ghiChuTonKho:
      "Shopify public API không cung cấp số lượng; variant available được khởi tạo 100, unavailable là 0.",
  };
  fs.writeFileSync(FILE_BC, JSON.stringify(baoCao, null, 2), "utf-8");

  console.log("\n" + "═".repeat(72));
  console.log(` ✓ ${baoCao.soSanPham} sản phẩm · ${baoCao.soBienThe} biến thể · ${baoCao.soAnh} ảnh`);
  console.log(` ✓ ${baoCao.soBoSuuTap} bộ sưu tập · ${baoCao.soNhaSanXuat} nhà sản xuất`);
  console.log(` ✓ Giá gốc ${baoCao.giaAudThapNhat} → ${baoCao.giaAudCaoNhat} AUD`);
  console.log("═".repeat(72));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
