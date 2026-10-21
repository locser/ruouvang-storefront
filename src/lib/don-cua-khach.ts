/**
 * Chuyển đơn hàng thật của Medusa (`GET /store/orders`) sang kiểu `DonTheoDoi`
 * mà trang tài khoản đã dùng để hiển thị. Thuần tuý, không gọi mạng — phần gọi
 * mạng nằm ở `layDonCuaKhach()` trong `khach-hang.ts`.
 */
import type { DonTheoDoi, PhuongThuc, TrangThai } from "@/lib/theo-doi-don";

/** Các trường cần xin thêm ngoài mặc định của Medusa (mặc định không có món và địa chỉ). */
export const TRUONG_DON_CUA_KHACH =
  "+custom_display_id,+metadata,+payment_status,+fulfillment_status,+shipping_total,*items,*shipping_address";

interface DongHang {
  title?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total?: number | string | null;
}

export interface DonMedusa {
  id: string;
  display_id?: number | string | null;
  custom_display_id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  fulfillment_status?: string | null;
  total?: number | string | null;
  shipping_total?: number | string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
  items?: DongHang[] | null;
  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address_1?: string | null;
    city?: string | null;
    province?: string | null;
  } | null;
}

/**
 * Mã đơn hiển thị cho khách: `custom_display_id` do Postgres gán lúc tạo đơn
 * (CW100001, CW100002... — xem migration `dat-ma-don-hang-cw.ts`). Đơn chưa có thì
 * dựng từ `display_id`; thiếu cả hai thì rơi về `id` thô.
 */
export function maDonHienThi(o: {
  id: string;
  display_id?: number | string | null;
  custom_display_id?: string | null;
}): string {
  if (o.custom_display_id) return o.custom_display_id;
  return o.display_id != null && o.display_id !== "" ? `CW${o.display_id}` : o.id;
}

const so = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function layPhuongThuc(o: DonMedusa): PhuongThuc {
  return o.metadata?.phuong_thuc_thanh_toan === "chuyen-khoan" ? "chuyen-khoan" : "cod";
}

/**
 * Quy tắc suy trạng thái. Medusa chỉ có `status` + `payment_status` +
 * `fulfillment_status`, ít chi tiết hơn 7 trạng thái của giao diện nên không suy
 * được `thieu-tien` (chuyển thiếu tiền). Thứ tự ưu tiên: huỷ → giao hàng → thanh toán.
 */
export function suyTrangThai(o: DonMedusa): TrangThai {
  const thanhToan = o.payment_status ?? "";
  const giaoHang = o.fulfillment_status ?? "";

  if (o.status === "canceled") {
    return thanhToan === "refunded" || thanhToan === "partially_refunded" ? "hoan-tien" : "da-huy";
  }
  if (giaoHang === "delivered") return "da-giao";
  if (giaoHang === "shipped" || giaoHang === "partially_shipped" || giaoHang === "partially_delivered") {
    return "dang-giao";
  }
  if (layPhuongThuc(o) === "chuyen-khoan" && thanhToan !== "captured" && thanhToan !== "partially_captured") {
    return "cho-thanh-toan";
  }
  return "chuan-bi";
}

export function chuyenDonMedusa(o: DonMedusa): DonTheoDoi {
  const a = o.shipping_address ?? {};
  const datLuc = o.created_at ?? new Date(0).toISOString();
  const phuongThuc = layPhuongThuc(o);
  const trangThai = suyTrangThai(o);
  const maVanDon = typeof o.metadata?.tracking_code === "string" ? o.metadata.tracking_code : "";

  return {
    ma: maDonHienThi(o),
    phuongThuc,
    trangThai,
    datLuc,
    hoTen: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim(),
    dienThoai: a.phone ?? "",
    diaChi: [a.address_1, a.city, a.province]
      .map((p) => (p ?? "").trim())
      .filter(Boolean)
      .join(", "),
    monHang: (o.items ?? []).map((it) => {
      const soLuong = so(it.quantity) || 1;
      return {
        title: it.title ?? "",
        soLuong,
        thanhTien: it.total != null ? so(it.total) : so(it.unit_price) * soLuong,
      };
    }),
    phiGiaoHang: so(o.shipping_total),
    tong: so(o.total),
    vanChuyen: maVanDon ? { hang: "", maVanDon } : undefined,
    suKien: [
      {
        luc: datLuc,
        noiDung:
          phuongThuc === "chuyen-khoan"
            ? "Đặt hàng thành công, chờ nhận tiền chuyển khoản"
            : "Đặt hàng thành công, chờ nhân viên xác nhận",
      },
    ],
  };
}

/** Mới nhất ở đầu. Đơn thiếu `created_at` xuống cuối. */
export function chuyenDanhSachDon(ds: DonMedusa[]): DonTheoDoi[] {
  const luc = (o: DonMedusa) => Date.parse(o.created_at ?? "") || 0;
  return [...ds].sort((x, y) => luc(y) - luc(x)).map(chuyenDonMedusa);
}
