import {
  anSdt,
  chuanHoaMa,
  chuanHoaSdt,
  sdtHopLe,
} from "@/lib/theo-doi-don";

describe("chuẩn hoá đầu vào", () => {
  it("mã đơn: bỏ dấu, hạ/hoa, bỏ tiền tố CW", () => {
    expect(chuanHoaMa("CW-100484")).toBe("100484");
    expect(chuanHoaMa(" cw100484 ")).toBe("100484");
    expect(chuanHoaMa("100484")).toBe("100484");
  });

  it("số điện thoại: +84 / 84 / dấu cách đều về dạng 0xxxxxxxxx", () => {
    expect(chuanHoaSdt("+84 912 345 678")).toBe("0912345678");
    expect(chuanHoaSdt("0912.345.678")).toBe("0912345678");
    expect(chuanHoaSdt("84912345678")).toBe("0912345678");
  });

  it("sdtHopLe chỉ nhận 10 số bắt đầu bằng 0", () => {
    expect(sdtHopLe("0912345678")).toBe(true);
    expect(sdtHopLe("+84912345678")).toBe(true);
    expect(sdtHopLe("091234567")).toBe(false);
    expect(sdtHopLe("abc")).toBe(false);
  });

  it("anSdt giấu phần giữa", () => {
    expect(anSdt("0912345678")).toBe("09•• ••• 678");
  });
});
