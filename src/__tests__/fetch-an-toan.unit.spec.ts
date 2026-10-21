/**
 * Các ca dưới đây kiểm tra NHÁNH THẬT (không phải mock) khi backend hỏng hoặc
 * thiếu cấu hình. Vì `co-mock.ts` đọc biến môi trường lúc nạp module, nên đặt
 * biến rồi mới nạp lại module, không import ở đầu file.
 */
let layTaiNguyenChatbot: typeof import("@/app/chatbot-widget/[...path]/route").GET;
let goiApiChatbot: typeof import("@/app/chatbot-widget/[...path]/route").POST;
let fetchKhongNem: typeof import("@/lib/fetch-an-toan").fetchKhongNem;
let dungBoLoc: typeof import("@/lib/loc-danh-muc").dungBoLoc;
let locSanPham: typeof import("@/lib/loc-danh-muc").locSanPham;
let timSanPham: typeof import("@/lib/meili").timSanPham;

beforeAll(async () => {
  for (const k of ["CONFIG_MEILI_HOST", "CONFIG_MEILI_MASTER_KEY", "CONFIG_API_CHATBOT_URL"]) delete process.env[k];
  Object.assign(process.env, {
    CONFIG_API_MEDUSA_URL: "http://backend.invalid:9000",
    CONFIG_PUBLISHABLE_KEY_MEDUSA: "pk_test",
  });
  jest.resetModules();
  ({ GET: layTaiNguyenChatbot, POST: goiApiChatbot } = await import(
    "@/app/chatbot-widget/[...path]/route"
  ));
  ({ fetchKhongNem } = await import("@/lib/fetch-an-toan"));
  ({ dungBoLoc, locSanPham } = await import("@/lib/loc-danh-muc"));
  ({ timSanPham } = await import("@/lib/meili"));
});

describe("B6 — dịch vụ phụ trợ hỏng phải suy giảm êm", () => {
  test("fetch lỗi mạng hoặc trả 5xx đều trở thành null", async () => {
    const loiMang = jest.fn().mockRejectedValue(new Error("ENOTFOUND"));
    const loiMayChu = jest.fn().mockResolvedValue(new Response("hỏng", { status: 503 }));

    await expect(fetchKhongNem(loiMang, "http://chatbot/widget.js")).resolves.toBeNull();
    await expect(fetchKhongNem(loiMayChu, "http://chatbot/widget.js")).resolves.toBeNull();
  });

  test("route widget trả JavaScript rỗng 200 khi upstream không tồn tại", async () => {
    const fetchCu = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("ENOTFOUND"));
    try {
      const phanHoi = await layTaiNguyenChatbot(
        new Request("http://localhost:8900/chatbot-widget/widget.js"),
        { params: Promise.resolve({ path: ["widget.js"] }) }
      );
      expect(phanHoi.status).toBe(200);
      expect(phanHoi.headers.get("content-type")).toContain("application/javascript");
    } finally {
      global.fetch = fetchCu;
    }
  });

  test("cấu hình rewrite không được chặn route suy giảm êm của chatbot", async () => {
    const nextConfig = require("../../next.config.js");
    const rewrites = await nextConfig.rewrites();
    expect(rewrites.some((muc: { source: string }) => muc.source.includes("chatbot"))).toBe(
      false
    );
  });

  test("Meilisearch thiếu cấu hình trả giá trị rỗng an toàn", async () => {
    const luaChon = {
      handleDanhMuc: "stonehaven",
      trang: 1,
      sapXep: "lien-quan" as const,
      khoangGia: null,
      thuocTinh: {},
    };
    expect(dungBoLoc(luaChon)).toContain('category_path = "stonehaven"');
    await expect(locSanPham(luaChon)).resolves.toBeNull();

    const baoLoiCu = console.error;
    console.error = jest.fn();
    try {
      await expect(timSanPham("Stonehaven")).resolves.toEqual({ sanPham: [], tong: 0 });
    } finally {
      console.error = baoLoiCu;
    }
  });
});

/**
 * Lỗi thật ngày 09/10/2026: khách bấm vào bong bóng chat trên
 * ruouvang.polarisvn.holdings và chỉ nhận "Không thể kết nối đến máy chủ".
 *
 * Route proxy chỉ export `GET`, nên `POST /v1/chat/session` bị Next.js trả 405
 * trước khi tới chatbot. Đường tài nguyên tĩnh thì lại nuốt mọi lỗi thành 200
 * rỗng — với API thì đó là che lỗi, vì `widget.js` dựa vào 401 để mở lại phiên.
 */
describe("proxy chatbot — đường API phải trung thực, đường tài nguyên vẫn suy giảm êm", () => {
  const thamSo = (...path: string[]) => ({ params: Promise.resolve({ path }) });
  let fetchCu: typeof global.fetch;

  beforeEach(() => {
    fetchCu = global.fetch;
  });
  afterEach(() => {
    global.fetch = fetchCu;
  });

  test("POST /v1/chat/session chuyển tiếp method, thân và khoá widget", async () => {
    const gia = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ session_token: "tok", conversation_id: "c1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    global.fetch = gia as unknown as typeof global.fetch;

    const phanHoi = await goiApiChatbot(
      new Request("http://localhost:8900/chatbot-widget/v1/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Chatbot-Key": "pk_live_abc" },
        body: JSON.stringify({ visitorId: "kt" }),
      }),
      thamSo("v1", "chat", "session")
    );

    expect(phanHoi.status).toBe(200);
    await expect(phanHoi.json()).resolves.toMatchObject({ session_token: "tok" });

    const [url, init] = gia.mock.calls[0];
    expect(String(url)).toBe("http://chatbot-api-service:3000/v1/chat/session");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ visitorId: "kt" }));
    expect(init.headers["x-chatbot-key"]).toBe("pk_live_abc");
  });

  test("401 của chatbot phải đi qua nguyên vẹn để widget tự mở lại phiên", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized API Key" }), { status: 401 })
    ) as unknown as typeof global.fetch;

    const phanHoi = await goiApiChatbot(
      new Request("http://localhost:8900/chatbot-widget/v1/chat/message", {
        method: "POST",
        body: "{}",
      }),
      thamSo("v1", "chat", "message")
    );

    expect(phanHoi.status).toBe(401);
  });

  test("GET /v1/chat/history chuyển tiếp tiêu đề authorization", async () => {
    const gia = jest.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    global.fetch = gia as unknown as typeof global.fetch;

    await layTaiNguyenChatbot(
      new Request("http://localhost:8900/chatbot-widget/v1/chat/history", {
        headers: { Authorization: "Bearer tok" },
      }),
      thamSo("v1", "chat", "history")
    );

    expect(gia.mock.calls[0][1].headers.authorization).toBe("Bearer tok");
  });

  test("chatbot chết thì đường API trả 502, KHÔNG giả vờ 200 rỗng", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("ENOTFOUND")) as unknown as typeof global.fetch;

    const phanHoi = await goiApiChatbot(
      new Request("http://localhost:8900/chatbot-widget/v1/chat/session", {
        method: "POST",
        body: "{}",
      }),
      thamSo("v1", "chat", "session")
    );

    expect(phanHoi.status).toBe(502);
  });

  test("POST vào tài nguyên tĩnh trả 405, không gọi lên chatbot", async () => {
    const gia = jest.fn();
    global.fetch = gia as unknown as typeof global.fetch;

    const phanHoi = await goiApiChatbot(
      new Request("http://localhost:8900/chatbot-widget/widget.js", { method: "POST" }),
      thamSo("widget.js")
    );

    expect(phanHoi.status).toBe(405);
    expect(gia).not.toHaveBeenCalled();
  });
});
