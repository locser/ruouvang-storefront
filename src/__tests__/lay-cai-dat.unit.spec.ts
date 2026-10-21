import { layCaiDat, xoaCacheCaiDat } from "@/lib/lay-cai-dat";

const CUA_HANG = { settings: { hotline: "1900 1234", zalo_phone: "0912345678", bank_bin: "970436", smtp_pass: "khong-duoc-lot" } };
const CHATBOT = { settings: { widget_key: "wk_abc", deepseek_api_key: "khong-duoc-lot" } };

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

/** Giả lập fetch: trả theo đích gọi (Medusa hay chatbot). */
function gia(cuaHang: () => Response | Promise<Response>, chatbot: () => Response | Promise<Response>) {
  return jest.spyOn(global, "fetch").mockImplementation(async (url: any) =>
    String(url).includes("/store/app-settings") ? cuaHang() : chatbot()
  );
}

describe("layCaiDat (Medusa + chatbot, hai nguồn độc lập)", () => {
  beforeEach(() => {
    xoaCacheCaiDat();
    process.env.CONFIG_API_MEDUSA_URL = "http://medusa.test:9000/";
    process.env.CONFIG_PUBLISHABLE_KEY_MEDUSA = "pk_test";
    process.env.CONFIG_API_CHATBOT_URL = "http://chatbot.test:13000";
    process.env.CONFIG_TENANT_ID = "cwwines";
  });
  afterEach(() => jest.restoreAllMocks());

  it("ghép khoá cửa hàng từ Medusa và widget_key từ chatbot, gọi đúng URL và header", async () => {
    const f = gia(() => json(CUA_HANG), () => json(CHATBOT));
    const cd = await layCaiDat();
    expect(cd).toEqual({ hotline: "1900 1234", zalo_phone: "0912345678", bank_bin: "970436", widget_key: "wk_abc" });
    const goi = f.mock.calls.map((c) => [String(c[0]), (c[1] as any).headers]);
    const medusa = goi.find(([u]) => u.includes("medusa.test"))!;
    expect(medusa[0]).toBe("http://medusa.test:9000/store/app-settings");
    expect(medusa[1]["x-publishable-api-key"]).toBe("pk_test");
    expect(goi.find(([u]) => u.includes("chatbot.test"))![0]).toBe(
      "http://chatbot.test:13000/v1/public/config?tenant_id=cwwines"
    );
  });

  it("chatbot sập: vẫn còn khoá cửa hàng, thiếu widget_key", async () => {
    gia(() => json(CUA_HANG), () => {
      throw new Error("ECONNREFUSED");
    });
    const cd = await layCaiDat();
    expect(cd.hotline).toBe("1900 1234");
    expect(cd.widget_key).toBeUndefined();
  });

  it("Medusa sập: vẫn còn widget_key", async () => {
    gia(() => json({}, false, 500), () => json(CHATBOT));
    expect(await layCaiDat()).toEqual({ widget_key: "wk_abc" });
  });

  it("cả hai sập và chưa có cache: trả rỗng, không ném", async () => {
    gia(() => Promise.reject(new Error("x")), () => Promise.reject(new Error("y")));
    expect(await layCaiDat()).toEqual({});
  });

  it("cache 30 giây: lần hai không gọi mạng", async () => {
    const f = gia(() => json(CUA_HANG), () => json(CHATBOT));
    await layCaiDat();
    await layCaiDat();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("lỗi sau khi hết hạn cache: trả bản cache cũ của nguồn đó", async () => {
    gia(() => json(CUA_HANG), () => json(CHATBOT));
    const now = Date.now();
    const dong = jest.spyOn(Date, "now").mockReturnValue(now);
    await layCaiDat();
    dong.mockReturnValue(now + 31_000);
    jest.restoreAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(now + 31_000);
    gia(() => Promise.reject(new Error("x")), () => json({ settings: { widget_key: "wk_moi" } }));
    const cd = await layCaiDat();
    expect(cd.hotline).toBe("1900 1234");
    expect(cd.widget_key).toBe("wk_moi");
  });

  it("chỉ nhận khoá công khai, không lọt smtp_pass hay khoá bí mật khác", async () => {
    gia(() => json(CUA_HANG), () => json(CHATBOT));
    const cd = JSON.stringify(await layCaiDat());
    expect(cd).not.toContain("khong-duoc-lot");
  });
});
