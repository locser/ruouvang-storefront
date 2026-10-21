import "server-only"

/**
 * Cấu hình công khai của shop, ghép từ HAI nguồn độc lập:
 *
 *  (a) Dữ liệu cửa hàng (hotline, Zalo, ngân hàng) từ Medusa:
 *        GET {CONFIG_API_MEDUSA_URL}/store/app-settings   (header x-publishable-api-key)
 *  (b) Khoá nhúng chatbot (`widget_key`) từ chatbot:
 *        GET {CONFIG_API_CHATBOT_URL}/v1/public/config?tenant_id={CONFIG_TENANT_ID}  ->  settings.widget_key
 *
 * Hai nguồn gọi song song và không phụ thuộc nhau: nguồn nào lỗi thì chỉ mất phần
 * của nó (chatbot sập vẫn còn hotline/ngân hàng, và ngược lại). Mỗi nguồn có cache
 * riêng ~30 giây, timeout 3 giây; lỗi thì trả bản cache cũ nếu có, không thì rỗng.
 * Không bao giờ ném lỗi.
 */
export interface CaiDat {
  hotline?: string;
  zalo_phone?: string;
  widget_key?: string;
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  bank_bin?: string;
}

const TTL_MS = 30_000;
const TIMEOUT_MS = 3_000;

/** Khoá được nhận từ Medusa; bất cứ khoá nào khác trong phản hồi đều bị bỏ. */
const KHOA_CUA_HANG = [
  "hotline",
  "zalo_phone",
  "bank_name",
  "bank_account",
  "bank_account_name",
  "bank_bin",
] as const;

type Cache = { luc: number; khoa: string; gia_tri: CaiDat };
let cacheCuaHang: Cache | null = null;
let cacheChatbot: Cache | null = null;

export function xoaCacheCaiDat(): void {
  cacheCuaHang = null;
  cacheChatbot = null;
}

async function layJson(url: string, headers: Record<string, string>): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json", ...headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Đọc một nguồn có cache; lỗi thì dùng bản cache cũ (cùng khoá) hoặc `{}`. */
async function docNguon(
  cache: Cache | null,
  khoa: string,
  lay: () => Promise<CaiDat>,
  ghi: (c: Cache) => void
): Promise<CaiDat> {
  const now = Date.now();
  if (cache && cache.khoa === khoa && now - cache.luc < TTL_MS) return cache.gia_tri;
  try {
    const gia_tri = await lay();
    ghi({ luc: now, khoa, gia_tri });
    return gia_tri;
  } catch {
    return cache && cache.khoa === khoa ? cache.gia_tri : {};
  }
}

function docCuaHang(): Promise<CaiDat> {
  const goc = (process.env.CONFIG_API_MEDUSA_URL || "http://backend:9000").replace(/\/+$/, "");
  const khoaApi = process.env.CONFIG_PUBLISHABLE_KEY_MEDUSA || "";
  return docNguon(
    cacheCuaHang,
    `${goc}|${khoaApi}`,
    async () => {
      const body = await layJson(`${goc}/store/app-settings`, { "x-publishable-api-key": khoaApi });
      const raw = body?.settings && typeof body.settings === "object" ? body.settings : {};
      const gia_tri: CaiDat = {};
      for (const k of KHOA_CUA_HANG) {
        if (typeof raw[k] === "string") gia_tri[k] = raw[k];
      }
      return gia_tri;
    },
    (c) => {
      cacheCuaHang = c;
    }
  );
}

function docChatbot(): Promise<CaiDat> {
  const goc = (process.env.CONFIG_API_CHATBOT_URL || "http://localhost:13000").replace(/\/+$/, "");
  const tenant = process.env.CONFIG_TENANT_ID || "";
  return docNguon(
    cacheChatbot,
    `${goc}|${tenant}`,
    async () => {
      const body = await layJson(`${goc}/v1/public/config?tenant_id=${encodeURIComponent(tenant)}`, {});
      const wk = body?.settings?.widget_key;
      return typeof wk === "string" && wk ? { widget_key: wk } : {};
    },
    (c) => {
      cacheChatbot = c;
    }
  );
}

export async function layCaiDat(): Promise<CaiDat> {
  const [cuaHang, chatbot] = await Promise.all([docCuaHang(), docChatbot()]);
  return { ...cuaHang, ...chatbot };
}
