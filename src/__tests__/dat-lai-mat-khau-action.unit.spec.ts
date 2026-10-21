export {}; // biến file thành module để không đụng tên với các spec khác (CAC_BIEN)

const TOKEN = "eyJ.token-bi-mat.chu-ky";

function form(du: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(du)) f.set(k, v);
  return f;
}

// Mỗi ca resetModules và đặt đủ biến cấu hình backend.
const CAC_BIEN = ["CONFIG_PUBLISHABLE_KEY_MEDUSA", "CONFIG_API_MEDUSA_URL"] as const;

async function chay(du: Record<string, string>) {
  const cu = Object.fromEntries(CAC_BIEN.map((k) => [k, process.env[k]]));
  jest.resetModules();
  process.env.CONFIG_PUBLISHABLE_KEY_MEDUSA = "pk_test";
  process.env.CONFIG_API_MEDUSA_URL = "http://backend.invalid:9000";
  try {
    const { xuLyDatLaiMatKhau } = await import("@/app/dat-lai-mat-khau/actions");
    const { TRANG_THAI_DAU } = await import("@/app/dat-lai-mat-khau/trang-thai");
    return await xuLyDatLaiMatKhau(TRANG_THAI_DAU, form(du));
  } finally {
    for (const k of CAC_BIEN) {
      if (cu[k] === undefined) delete process.env[k];
      else process.env[k] = cu[k];
    }
  }
}

describe("xuLyDatLaiMatKhau", () => {
  let fetchSpy: jest.SpyInstance;
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
  });
  afterEach(() => fetchSpy.mockRestore());

  const hopLe = { token: TOKEN, matKhau: "matkhaumoi1", nhapLai: "matkhaumoi1" };

  it("thiếu token → báo link không hợp lệ, không gọi mạng", async () => {
    const kq = await chay({ ...hopLe, token: "" });
    expect(kq).toEqual({ trangThai: "loi", thongBao: "auth.err_rp_token" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mật khẩu ngắn hoặc không khớp → báo lỗi tương ứng, không gọi mạng", async () => {
    expect((await chay({ ...hopLe, matKhau: "abc", nhapLai: "abc" })).thongBao).toBe("auth.err_rp_short");
    expect((await chay({ ...hopLe, nhapLai: "khac-hoan-toan" })).thongBao).toBe("auth.err_rp_mismatch");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("thành công: gọi đúng endpoint với Bearer token và chỉ gửi mật khẩu trong body", async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200 } as Response);
    const kq = await chay(hopLe);
    expect(kq).toEqual({ trangThai: "ok", thongBao: "auth.rp_ok" });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/customer\/emailpass\/update$/);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(init.body)).toEqual({ password: "matkhaumoi1" });
  });

  it("token sai/hết hạn (401) → báo link hết hạn", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 401 } as Response);
    expect((await chay(hopLe)).thongBao).toBe("auth.err_rp_token");
  });

  it("backend lỗi 500 hoặc mất mạng → báo hệ thống bận, kết quả không chứa token", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);
    const a = await chay(hopLe);
    expect(a.thongBao).toBe("auth.err_reset_busy");
    fetchSpy.mockRejectedValue(new Error("mạng"));
    const b = await chay(hopLe);
    expect(b.thongBao).toBe("auth.err_reset_busy");
    expect(JSON.stringify([a, b])).not.toContain(TOKEN);
  });
});
