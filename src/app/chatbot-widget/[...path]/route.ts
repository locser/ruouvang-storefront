import { fetchKhongNem } from "@/lib/fetch-an-toan";

export const dynamic = "force-dynamic";

/**
 * Tài nguyên tĩnh của widget (`widget.js`, `widget.css`, `widget/index.html`).
 * Chatbot chết thì trang bán hàng vẫn phải mở được, nên chờ ngắn rồi suy giảm êm.
 */
const HET_GIO_TAI_NGUYEN_MS = 3_000;

/**
 * Lời gọi API chat. Một lượt trả lời của LLM đo thật 10–30 giây, có lúc hơn.
 *
 * KHÔNG dùng chung mốc 3 giây của tài nguyên tĩnh: đó đúng là lỗi khiến mọi tin
 * nhắn chết giữa đường và khách chỉ thấy "Không thể kết nối đến máy chủ".
 */
const HET_GIO_API_MS = 120_000;

/**
 * Tiêu đề được phép chuyển tiếp lên chatbot.
 *
 * `authorization` mang token phiên, `x-chatbot-key` mang khoá widget — thiếu
 * một trong hai là chatbot trả 401 cho mọi lượt. Bản cũ chỉ chuyển `accept`.
 */
const TIEU_DE_CHUYEN_TIEP = ["accept", "authorization", "content-type", "x-chatbot-key"];

function gocChatbot(): string {
  return (process.env.CONFIG_API_CHATBOT_URL || "http://chatbot-api-service:3000").replace(/\/+$/, "");
}

/**
 * Đường dẫn API (`v1/...`) phải proxy TRUNG THỰC: giữ nguyên mã trạng thái và
 * phát phản hồi theo luồng.
 *
 * Riêng 401 là tín hiệu `widget.js` dùng để tự mở lại phiên; nuốt nó thành 200
 * rỗng như đường tài nguyên tĩnh là widget treo mãi ở câu báo mất kết nối.
 */
function laDuongDanApi(duongDan: string): boolean {
  return duongDan === "v1" || duongDan.startsWith("v1/");
}

function taoUrl(duongDan: string, request: Request): URL {
  const url = new URL(`${gocChatbot()}/${duongDan}`);
  url.search = new URL(request.url).search;
  return url;
}

function tieuDeGuiLen(request: Request): Record<string, string> {
  const tieuDe: Record<string, string> = {};
  for (const ten of TIEU_DE_CHUYEN_TIEP) {
    const giaTri = request.headers.get(ten);
    if (giaTri) tieuDe[ten] = giaTri;
  }
  if (!tieuDe.accept) tieuDe.accept = "*/*";
  return tieuDe;
}

function phanHoiRong(laJavascript: boolean): Response {
  if (!laJavascript) return new Response(null, { status: 204 });
  return new Response("/* Chatbot tạm thời không khả dụng. */\n", {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Chatbot không phản hồi — nói thật bằng 502 chứ không giả vờ thành công. */
function phanHoiKhongKetNoi(): Response {
  return new Response(JSON.stringify({ error: "Chatbot tạm thời không phản hồi." }), {
    status: 502,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Chuyển tiếp một lời gọi API chat lên chatbot, giữ nguyên trạng thái và luồng. */
async function goiApi(request: Request, duongDan: string): Promise<Response> {
  const dieuKhien = new AbortController();
  const hetGio = setTimeout(() => dieuKhien.abort(), HET_GIO_API_MS);
  try {
    // Thân tin nhắn chat chỉ vài trăm byte nên đọc hẳn ra chuỗi: chuyển tiếp
    // ReadableStream của request đòi `duplex: "half"`, không phải runtime nào
    // cũng nhận. Thân PHẢN HỒI thì vẫn phát theo luồng — xem `phanHoi.body`.
    const than = request.method === "GET" ? undefined : await request.text();

    const phanHoi = await fetch(taoUrl(duongDan, request), {
      method: request.method,
      headers: tieuDeGuiLen(request),
      body: than && than.length > 0 ? than : undefined,
      cache: "no-store",
      signal: dieuKhien.signal,
    });

    return new Response(phanHoi.body, {
      status: phanHoi.status,
      headers: {
        "Content-Type":
          phanHoi.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        // Tắt bộ đệm của nginx/NPM: `/v1/chat/message` trả `text/event-stream`,
        // bị đệm là khách ngồi chờ hết câu rồi mới thấy chữ đầu tiên.
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return phanHoiKhongKetNoi();
  } finally {
    clearTimeout(hetGio);
  }
}

/** Lấy tài nguyên tĩnh của widget, hỏng thì suy giảm êm chứ không làm sập trang. */
async function layTaiNguyen(request: Request, duongDan: string): Promise<Response> {
  const laJavascript = duongDan.endsWith(".js");
  const dieuKhien = new AbortController();
  const hetGio = setTimeout(() => dieuKhien.abort(), HET_GIO_TAI_NGUYEN_MS);
  try {
    const phanHoi = await fetchKhongNem(fetch, taoUrl(duongDan, request), {
      headers: { Accept: request.headers.get("accept") || "*/*" },
      cache: "no-store",
      signal: dieuKhien.signal,
    });
    if (!phanHoi) return phanHoiRong(laJavascript);

    return new Response(await phanHoi.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type":
          phanHoi.headers.get("content-type") ||
          (laJavascript ? "application/javascript; charset=utf-8" : "application/octet-stream"),
        "Cache-Control": phanHoi.headers.get("cache-control") || "public, max-age=300",
      },
    });
  } finally {
    clearTimeout(hetGio);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  const duongDan = path.join("/");
  // `GET /v1/chat/history` cũng đi đường API — nó cần tiêu đề `authorization`.
  if (laDuongDanApi(duongDan)) return goiApi(request, duongDan);
  return layTaiNguyen(request, duongDan);
}

/**
 * `POST /v1/chat/session`, `/v1/chat/message`, `/v1/chat/xoa-lich-su`.
 *
 * Thiếu hàm này là Next.js trả 405 cho mọi lượt POST — lỗi gốc khiến chatbot
 * trên web rượu vang không mở nổi một phiên nào.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  const duongDan = path.join("/");
  // Tài nguyên tĩnh không nhận POST — trả 405 đúng nghĩa thay vì gọi lên chatbot.
  if (!laDuongDanApi(duongDan)) return new Response(null, { status: 405 });
  return goiApi(request, duongDan);
}
