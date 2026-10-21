import {
  chuyenDanhSachDon,
  chuyenDonMedusa,
  suyTrangThai,
  TRUONG_DON_CUA_KHACH,
  type DonMedusa,
} from "@/lib/don-cua-khach";

// Dữ liệu dựng theo phản hồi thật của GET /store/orders (đơn #6, 2026-10-20).
const DON: DonMedusa = {
  id: "order_6",
  display_id: 6,
  status: "pending",
  payment_status: "authorized",
  fulfillment_status: "not_fulfilled",
  total: 575000,
  shipping_total: 50000,
  created_at: "2026-10-20T08:25:00.000Z",
  metadata: { phuong_thuc_thanh_toan: "cod" },
  items: [{ title: "Altus Clare Valley Riesling 2025", quantity: 1, unit_price: 525000, total: 525000 }],
  shipping_address: {
    first_name: "truong_",
    last_name: "",
    phone: "0945668878",
    address_1: "391 Tran Hung Dao,",
    city: "Quận 1",
    province: "TP.HCM",
  },
};

describe("chuyenDonMedusa", () => {
  it("chuyển đủ các trường hiển thị", () => {
    const d = chuyenDonMedusa(DON);
    expect(d.ma).toBe("CW6");
    expect(d.phuongThuc).toBe("cod");
    expect(d.trangThai).toBe("chuan-bi");
    expect(d.hoTen).toBe("truong_");
    expect(d.dienThoai).toBe("0945668878");
    expect(d.diaChi).toBe("391 Tran Hung Dao,, Quận 1, TP.HCM");
    expect(d.monHang).toEqual([{ title: "Altus Clare Valley Riesling 2025", soLuong: 1, thanhTien: 525000 }]);
    expect(d.phiGiaoHang).toBe(50000);
    expect(d.tong).toBe(575000);
    expect(d.datLuc).toBe("2026-10-20T08:25:00.000Z");
    expect(d.suKien).toHaveLength(1);
  });

  it("thiếu món, địa chỉ, metadata vẫn không ném lỗi", () => {
    const d = chuyenDonMedusa({ id: "order_x" });
    expect(d.ma).toBe("order_x");
    expect(d.monHang).toEqual([]);
    expect(d.hoTen).toBe("");
    expect(d.diaChi).toBe("");
    expect(d.tong).toBe(0);
    expect(d.phuongThuc).toBe("cod");
  });

  it("mã đơn: ưu tiên custom_display_id, rồi CW+display_id, rồi id", () => {
    expect(chuyenDonMedusa({ ...DON, custom_display_id: "CW100001" }).ma).toBe("CW100001");
    expect(chuyenDonMedusa({ id: "order_x", display_id: 100002 }).ma).toBe("CW100002");
    expect(chuyenDonMedusa({ id: "order_x" }).ma).toBe("order_x");
  });

  it("thành tiền lấy từ đơn giá x số lượng khi không có total của dòng", () => {
    const d = chuyenDonMedusa({
      ...DON,
      items: [{ title: "A", quantity: 3, unit_price: 100000 }],
    });
    expect(d.monHang[0].thanhTien).toBe(300000);
  });

  it("có mã vận đơn trong metadata thì điền vanChuyen", () => {
    const d = chuyenDonMedusa({ ...DON, metadata: { ...DON.metadata, tracking_code: "VPH-1" } });
    expect(d.vanChuyen).toEqual({ hang: "", maVanDon: "VPH-1" });
    expect(chuyenDonMedusa(DON).vanChuyen).toBeUndefined();
  });
});

describe("suyTrangThai", () => {
  const ck = { phuong_thuc_thanh_toan: "chuyen-khoan" };

  it.each([
    ["COD chưa giao", { ...DON }, "chuan-bi"],
    ["chuyển khoản chưa nhận tiền", { ...DON, metadata: ck, payment_status: "awaiting" }, "cho-thanh-toan"],
    ["chuyển khoản đã nhận tiền", { ...DON, metadata: ck, payment_status: "captured" }, "chuan-bi"],
    ["đang giao", { ...DON, fulfillment_status: "shipped" }, "dang-giao"],
    ["đã giao", { ...DON, fulfillment_status: "delivered" }, "da-giao"],
    ["huỷ chưa thanh toán", { ...DON, status: "canceled" }, "da-huy"],
    ["huỷ và đã hoàn tiền", { ...DON, status: "canceled", payment_status: "refunded" }, "hoan-tien"],
    ["huỷ dù trạng thái giao là đã giao", { ...DON, status: "canceled", fulfillment_status: "delivered" }, "da-huy"],
  ] as const)("%s", (_ten, don, mong) => {
    expect(suyTrangThai(don as DonMedusa)).toBe(mong);
  });
});

describe("chuyenDanhSachDon", () => {
  it("mới nhất ở đầu, đơn thiếu ngày xuống cuối", () => {
    const ds = chuyenDanhSachDon([
      { ...DON, id: "a", display_id: 1, created_at: "2026-10-20T07:00:00Z" },
      { ...DON, id: "b", display_id: 2, created_at: undefined },
      { ...DON, id: "c", display_id: 3, created_at: "2026-10-20T09:00:00Z" },
    ]);
    expect(ds.map((d) => d.ma)).toEqual(["CW3", "CW1", "CW2"]);
  });

  it("danh sách rỗng", () => {
    expect(chuyenDanhSachDon([])).toEqual([]);
  });
});

describe("TRUONG_DON_CUA_KHACH", () => {
  it("xin thêm món, địa chỉ và trạng thái thanh toán/giao hàng", () => {
    for (const f of ["*items", "*shipping_address", "+payment_status", "+fulfillment_status", "+metadata"]) {
      expect(TRUONG_DON_CUA_KHACH).toContain(f);
    }
  });
});
