"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Product } from "@/lib/data";
import { tonKhoGiaLap } from "@/lib/ton-kho";
import { tinhUuDai, type MaGiam, type UuDai } from "@/lib/khuyen-mai";
import type { ThongDiep } from "@/lib/khuyen-mai-text";

/**
 * Trần số lượng cho MỘT dòng hàng — SỬA BUG-R08 (kiểm thử 05/08/2026).
 *
 * Trước đây trần cứng là 99 chai, không đếm xỉa tồn kho: khách bấm nút “+” ba
 * mươi lần là đặt được đơn 69.900.000đ cho một chai mà cửa hàng có thể chỉ còn
 * hai. Rượu vang là hàng hiếm theo niên vụ, nhận đơn rồi phải huỷ là rủi ro vận
 * hành thật.
 *
 * ⚠️ `tonKhoGiaLap` vẫn là số GIẢ LẬP (xem ghi chú trong `lib/ton-kho.ts`).
 * Khi nối tồn kho thật của Medusa thì chỉ cần thay đúng hàm này.
 */
export function tranSoLuong(idSanPham: string): number {
  const ton = tonKhoGiaLap(idSanPham);
  if (!ton.conHang) return 0;
  return Math.min(99, ton.soLuong);
}

/**
 * Trần số lượng theo TỒN KHO THẬT của Medusa — thay cho `tranSoLuong` ở trên.
 *
 * Ngày 07/08/2026 đã chạy `nap-ton-kho.sql` cho shop này: 185 biến thể có
 * `inventory_level` thật và `manage_inventory = true`, nên không cần bịa số nữa.
 *
 * Quy ước ba trạng thái, ĐỪNG gộp lại:
 *   `null`/`undefined` → shop không theo dõi kho món này ⇒ bán không giới hạn
 *   `0`                → hết hàng thật                   ⇒ chặn
 *   `n > 0`            → còn n cái                       ⇒ trần là n
 *
 * ⚠️ Vẫn giữ `tranSoLuong` ở trên vì các món CŨ đã nằm sẵn trong localStorage
 * của khách không có trường `tonKho`. Với chúng thì rơi về số cũ còn hơn là
 * chặn sạch giỏ hàng của khách đang mua dở.
 */
export function tranTheoTonKhoThat(tonKho: number | null | undefined, idSanPham: string): number {
  if (tonKho === null || tonKho === undefined) {
    // Không có số thật (món cũ trong localStorage) → dùng số cũ để không phá
    // giỏ hàng đang có. Sẽ tự hết sau khi khách thêm lại món đó.
    return tranSoLuong(idSanPham);
  }
  if (tonKho <= 0) return 0;
  return Math.min(99, tonKho);
}

/**
 * Khoá lưu giỏ hàng trong localStorage của trình duyệt.
 *
 * ⚠️ SỬA BUG-R11 (kiểm thử 05/08/2026): khoá cũ là `hasaki_gio_hang` — chép
 * nguyên từ storefront mỹ phẩm Hasaki. Khách mở cả hai website trên cùng một
 * trình duyệt sẽ bị ghi đè giỏ hàng lẫn nhau: chai rượu lẫn với kem chống nắng,
 * hoặc mất sạch giỏ. Mỗi thương hiệu phải có khoá riêng.
 */
export const KHOA_LUU_TRU = "cwwines_gio_hang";

/** Khoá cũ — chỉ đọc MỘT LẦN để chuyển giỏ của khách cũ sang khoá mới. */
const KHOA_CU = "hasaki_gio_hang";

/** Khoá sessionStorage giữ đơn hàng vừa đặt, dùng cho trang cảm ơn. */
export const KHOA_DON_VUA_DAT = "cwwines_don_vua_dat";

/** Khoá lưu mã giảm giá khách đã nhập, để giữ qua F5 như giỏ hàng. */
const KHOA_MA_GIAM = "cwwines_ma_giam_gia";

export interface MonHangTrongGio {
  id: string;
  handle: string;
  title: string;
  thumbnail: string;
  sku: string;
  price: number;
  originalPrice?: number;
  soLuong: number;
  /**
   * Tồn kho thật lúc bỏ vào giỏ. Lưu kèm để trang giỏ hàng chặn được nút “+”
   * mà không phải gọi lại Medusa cho từng dòng.
   *
   * ⚠️ Đây là ẢNH CHỤP tại thời điểm thêm, có thể cũ. Trước khi CHỐT ĐƠN vẫn
   * phải đọc lại tồn kho từ Medusa — quy tắc §6.4 của ADMIN_GUIDE.
   */
  tonKho?: number | null;
}

interface GioHangContextValue {
  danhSach: MonHangTrongGio[];
  /** Đã đọc xong localStorage hay chưa — dùng để tránh nhấp nháy khi hydrate. */
  daTaiXong: boolean;
  /**
   * Thêm hàng vào giỏ.
   *
   * ⚠️ TRẢ VỀ KẾT QUẢ, đừng bỏ qua — SỬA BUG-R24 (07/08/2026).
   *
   * Trước đây hàm này trả `void`, nên khi nó bỏ qua (hết hàng, hoặc đã chạm
   * trần tồn kho) thì nút bấm KHÔNG CÁCH NÀO BIẾT — vẫn hiện “Đã thêm ✓” và
   * vẫn chuyển sang trang giỏ hàng. Khách bấm bốn món, đếm được ba, tưởng giỏ
   * hàng chỉ chứa được ba dòng.
   *
   * Đo thật trên trang chủ: bấm 8 nút “Thêm vào giỏ” khác nhau → giỏ chỉ nhận
   * 7 dòng, một món biến mất không một lời báo.
   */
  themVaoGio: (product: Product, soLuong?: number) => KetQuaThem;
  doiSoLuong: (id: string, soLuong: number) => void;
  xoaKhoiGio: (id: string) => void;
  xoaHet: () => void;
  /** Tổng tiền theo giá bán hiện tại. */
  tongTien: number;
  /** Tổng tiền theo giá gốc (chưa giảm) — dùng để tính số tiền tiết kiệm. */
  tongTienGoc: number;
  /** Số tiền được giảm so với giá gốc. */
  tongGiamGia: number;
  /** Tổng số lượng sản phẩm (đã cộng dồn số lượng từng dòng). */
  tongSoLuong: number;

  // ── Mã giảm giá — SỬA BUG-R20 ──────────────────────────────────────────
  /** Mã giảm giá đang áp dụng, null nếu chưa nhập mã nào. */
  maGiamGia: string | null;
  /**
   * Thử áp dụng một mã. Không dùng được thì trả khoá i18n + tham số của lý do để hiện ngay
   * dưới ô nhập — không im lặng bỏ qua (xem BUG-R38 về phản hồi khi nhập sai).
   */
  apDungMa: (ma: string) => Promise<{ ok: boolean; loi?: ThongDiep }>;
  /** Gỡ mã đang áp dụng. */
  boMa: () => void;
  /** Số tiền được giảm nhờ mã (đã chặn trần theo điều kiện công bố). */
  tienGiamMa: number;
  /** Số tiền khách phải trả sau mọi ưu đãi (thùng 6 chai, mã, miễn phí giao). */
  tongThanhToan: number;
  /** Chi tiết toàn bộ ưu đãi của giỏ hiện tại — xem lib/khuyen-mai.ts. */
  uuDai: UuDai;
}

/** Kết quả của một lần bấm “Thêm vào giỏ”. */
export interface KetQuaThem {
  /** true khi giỏ thật sự nhận thêm hàng. */
  ok: boolean;
  /** Khoá i18n (+ tham số) của lý do thất bại, hiện ngay cho khách khi `ok` là false. */
  loi?: { k: string; v?: Record<string, string | number> };
}

const GioHangContext = createContext<GioHangContextValue | null>(null);

/** Đọc và làm sạch dữ liệu giỏ hàng lấy từ localStorage. */
function docTuLocalStorage(): MonHangTrongGio[] {
  try {
    // Đọc khoá mới trước; chưa có thì lấy nốt giỏ còn kẹt ở khoá cũ rồi xoá đi,
    // để khách đang dở giỏ không mất hàng khi ta đổi tên khoá.
    let raw = window.localStorage.getItem(KHOA_LUU_TRU);
    if (!raw) {
      const cu = window.localStorage.getItem(KHOA_CU);
      if (cu) {
        raw = cu;
        window.localStorage.removeItem(KHOA_CU);
      }
    }
    if (!raw) return [];

    const duLieu = JSON.parse(raw);
    if (!Array.isArray(duLieu)) return [];

    return duLieu
      .filter(
        (m: unknown): m is MonHangTrongGio =>
          typeof m === "object" &&
          m !== null &&
          typeof (m as MonHangTrongGio).id === "string" &&
          typeof (m as MonHangTrongGio).price === "number" &&
          typeof (m as MonHangTrongGio).soLuong === "number"
      )
      .map((m) => ({
        ...m,
        soLuong: Math.max(
          1,
          Math.min(tranTheoTonKhoThat(m.tonKho, m.id) || 1, Math.floor(m.soLuong))
        ),
      }));
  } catch {
    // JSON hỏng hoặc trình duyệt chặn localStorage — coi như giỏ rỗng.
    return [];
  }
}

/** Mã giảm đã được Medusa xác nhận cho giỏ hiện tại. */
interface MaServer {
  ma: string;
  giamHang: number;
  giamGiao: number;
}

/** Hỏi Medusa số tiền mã giảm cho giỏ hiện tại (qua /api/ma-giam-gia). */
async function kiemMaTrenServer(
  dsMon: MonHangTrongGio[],
  ma: string
): Promise<{ ok: true; giamHang: number; giamGiao: number } | { ok: false }> {
  const res = await fetch("/api/ma-giam-gia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      monHang: dsMon.map((m) => ({ handle: m.handle, sku: m.sku, soLuong: m.soLuong })),
      maGiamGia: ma,
    }),
  });
  const data = (await res.json().catch(() => ({ ok: false }))) as {
    ok: boolean;
    giamHang?: number;
    giamGiao?: number;
  };
  return data.ok
    ? { ok: true, giamHang: Number(data.giamHang ?? 0), giamGiao: Number(data.giamGiao ?? 0) }
    : { ok: false };
}

export function GioHangProvider({ children }: { children: React.ReactNode }) {
  const [danhSach, setDanhSach] = useState<MonHangTrongGio[]>([]);
  const [daTaiXong, setDaTaiXong] = useState(false);
  const [maGiamGia, setMaGiamGia] = useState<string | null>(null);
  /** Số tiền mã giảm do Medusa tính cho đúng giỏ hiện tại; null nếu chưa có mã hợp lệ. */
  const [maServer, setMaServer] = useState<MaServer | null>(null);
  const maGiamGiaRef = useRef<string | null>(null);

  /**
   * Bản sao của `danhSach` để đọc ĐỒNG BỘ bên trong `themVaoGio`.
   *
   * Vì sao cần: `themVaoGio` phải trả lời NGAY “có thêm được không” để nút bấm
   * hiện đúng thông báo. Nhưng state của React chỉ đọc được giá trị mới ở lần
   * render sau, còn `themVaoGio` khai `useCallback(..., [])` nên nếu đọc thẳng
   * biến `danhSach` sẽ luôn thấy giá trị của lần render ĐẦU TIÊN (giỏ rỗng).
   *
   * Ref thì luôn trỏ tới giá trị mới nhất, nên dùng nó để kiểm tra. Việc GHI
   * vào giỏ vẫn đi qua `setDanhSach(truoc => ...)` như cũ — không đổi.
   */
  const danhSachRef = useRef<MonHangTrongGio[]>([]);
  useEffect(() => {
    danhSachRef.current = danhSach;
  }, [danhSach]);

  // Đọc localStorage trong useEffect (không đọc lúc render) để HTML phía server
  // và lần render đầu phía client giống hệt nhau, tránh lỗi lệch hydration.
  useEffect(() => {
    setDanhSach(docTuLocalStorage());
    try {
      setMaGiamGia(window.localStorage.getItem(KHOA_MA_GIAM));
    } catch {
      // Trình duyệt chặn localStorage — coi như chưa nhập mã nào.
    }
    setDaTaiXong(true);
  }, []);

  // Ghi lại mỗi khi giỏ đổi, nhưng chỉ sau khi đã đọc xong lần đầu
  // (nếu ghi sớm sẽ đè mất giỏ cũ bằng mảng rỗng).
  useEffect(() => {
    if (!daTaiXong) return;
    try {
      window.localStorage.setItem(KHOA_LUU_TRU, JSON.stringify(danhSach));
    } catch {
      // Trình duyệt chặn localStorage (chế độ ẩn danh) — bỏ qua, giỏ vẫn chạy trong phiên.
    }
  }, [danhSach, daTaiXong]);

  // Mã giảm giá giữ riêng một khoá, để xoá giỏ không làm mất mã và ngược lại.
  useEffect(() => {
    if (!daTaiXong) return;
    try {
      if (maGiamGia) window.localStorage.setItem(KHOA_MA_GIAM, maGiamGia);
      else window.localStorage.removeItem(KHOA_MA_GIAM);
    } catch {
      // Trình duyệt chặn localStorage — mã vẫn có hiệu lực trong phiên này.
    }
  }, [maGiamGia, daTaiXong]);

  // Giỏ đổi (thêm, sửa số lượng, xoá) thì hỏi lại Medusa số tiền giảm. Đợi 400ms để không gọi dồn.
  useEffect(() => {
    maGiamGiaRef.current = maGiamGia;
  }, [maGiamGia]);
  const khoaGio = useMemo(
    () => JSON.stringify(danhSach.map((m) => [m.handle, m.sku, m.soLuong])),
    [danhSach]
  );
  useEffect(() => {
    if (!daTaiXong) return;
    const ma = maGiamGiaRef.current;
    if (!ma || danhSachRef.current.length === 0) {
      setMaServer(null);
      return;
    }
    let huy = false;
    const hen = window.setTimeout(async () => {
      const kq = await kiemMaTrenServer(danhSachRef.current, ma).catch(() => ({ ok: false as const }));
      if (huy) return;
      if (kq.ok) {
        setMaServer({ ma, giamHang: kq.giamHang, giamGiao: kq.giamGiao });
      } else {
        setMaServer(null);
        setMaGiamGia(null);
      }
    }, 400);
    return () => {
      huy = true;
      window.clearTimeout(hen);
    };
  }, [khoaGio, daTaiXong]);

  const themVaoGio = useCallback((product: Product, soLuong = 1): KetQuaThem => {
    const themVao = Math.max(1, Math.floor(soLuong));
    // Tồn kho THẬT từ Medusa; rơi về số cũ chỉ khi sản phẩm không mang trường này.
    const tran = tranTheoTonKhoThat(product.tonKho, product.id);

    // Hết hàng. Giao diện lẽ ra đã khoá nút, đây là chốt hai — nhưng KHÔNG
    // được im lặng: trả lý do về để nút nói cho khách biết.
    if (tran <= 0) {
      return {
        ok: false,
        loi: { k: "cart.out_of_stock" },
      };
    }

    // Đã có sẵn trong giỏ và đang ở đúng trần tồn kho → bấm thêm cũng không
    // tăng được nữa. Đây là trường hợp trước đây gây hiểu nhầm nhiều nhất:
    // nút báo “Đã thêm ✓” mà số lượng đứng yên.
    const dangCo = danhSachRef.current.find((m) => m.id === product.id);
    if (dangCo && dangCo.soLuong >= tran) {
      return {
        ok: false,
        loi: { k: "cart.only_left_all_in_cart", v: { tran } },
      };
    }

    setDanhSach((truoc) => {
      const viTri = truoc.findIndex((m) => m.id === product.id);

      if (viTri >= 0) {
        const sau = [...truoc];
        sau[viTri] = {
          ...sau[viTri],
          soLuong: Math.min(tran, sau[viTri].soLuong + themVao),
        };
        return sau;
      }

      return [
        ...truoc,
        {
          id: product.id,
          handle: product.handle,
          title: product.title,
          thumbnail: product.thumbnail,
          sku: product.sku,
          price: product.price,
          originalPrice: product.originalPrice,
          soLuong: Math.min(tran, themVao),
          tonKho: product.tonKho ?? null,
        },
      ];
    });

    return { ok: true };
  }, []);

  const doiSoLuong = useCallback((id: string, soLuong: number) => {
    const moi = Math.floor(soLuong);
    // Trần theo tồn kho THẬT đã lưu kèm món hàng; món cũ chưa có thì rơi về số cũ.
    const mon = danhSachRef.current.find((m) => m.id === id);
    const tran = tranTheoTonKhoThat(mon?.tonKho, id) || 1;

    setDanhSach((truoc) => {
      // Giảm xuống dưới 1 thì bỏ luôn dòng đó khỏi giỏ.
      if (moi < 1) return truoc.filter((m) => m.id !== id);

      return truoc.map((m) =>
        m.id === id ? { ...m, soLuong: Math.min(tran, moi) } : m
      );
    });
  }, []);

  const xoaKhoiGio = useCallback((id: string) => {
    setDanhSach((truoc) => truoc.filter((m) => m.id !== id));
  }, []);

  const xoaHet = useCallback(() => {
    setDanhSach([]);
    // Đơn đã đặt xong thì mã ưu đãi cũng hết hiệu lực cho đơn sau.
    setMaGiamGia(null);
  }, []);

  const tongTien = useMemo(
    () => danhSach.reduce((tong, m) => tong + m.price * m.soLuong, 0),
    [danhSach]
  );

  const tongTienGoc = useMemo(
    () =>
      danhSach.reduce(
        (tong, m) => tong + (m.originalPrice ?? m.price) * m.soLuong,
        0
      ),
    [danhSach]
  );

  const tongSoLuong = useMemo(
    () => danhSach.reduce((tong, m) => tong + m.soLuong, 0),
    [danhSach]
  );

  // Thùng 6 chai, phí giao và tiết kiệm vẫn tính trên trình duyệt; riêng số tiền mã giảm lấy từ Medusa.
  const uuDai = useMemo<UuDai>(() => {
    const goc = tinhUuDai(danhSach, null);
    if (!maServer) return goc;
    const giamHang = Math.min(maServer.giamHang, goc.tamTinhSauThung);
    const phiGiao = Math.max(0, goc.phiGiao - maServer.giamGiao);
    // Mã chỉ giảm phí giao (không giảm tiền hàng) hiện là "Miễn phí giao hàng" thay vì "−0đ".
    const ma: MaGiam = giamHang > 0
      ? { ma: maServer.ma, kieu: "tien", giaTri: giamHang, hetHan: "" }
      : { ma: maServer.ma, kieu: "qua-tang", giaTri: 0, hetHan: "", moTaKhoa: "promo.val_free_ship" };
    return {
      ...goc,
      ma: { ma, hopLe: true, giam: giamHang, tangQua: false },
      giamMa: giamHang,
      phiGiao,
      tongThanhToan: Math.max(0, goc.tamTinhSauThung - giamHang) + phiGiao,
      tietKiem: goc.thung.giam + giamHang + (goc.phiGiao - phiGiao) + (goc.mienPhiGiao ? goc.phiGiaoGoc : 0),
    };
  }, [danhSach, maServer]);
  const tienGiamMa = uuDai.giamMa;

  /** Áp mã qua Medusa; trả lý do để hiện cạnh ô nhập nếu mã không dùng được. */
  const apDungMa = useCallback(
    async (ma: string): Promise<{ ok: boolean; loi?: ThongDiep }> => {
      const sach = (ma || "").trim().toUpperCase();
      if (!sach) return { ok: false, loi: { k: "promo.err_empty" } };
      if (danhSach.length === 0) return { ok: false, loi: { k: "promo.err_unknown" } };

      const kq = await kiemMaTrenServer(danhSach, sach).catch(() => ({ ok: false as const }));
      if (!kq.ok) return { ok: false, loi: { k: "promo.err_unknown" } };

      setMaServer({ ma: sach, giamHang: kq.giamHang, giamGiao: kq.giamGiao });
      setMaGiamGia(sach);
      return { ok: true };
    },
    [danhSach]
  );

  const boMa = useCallback(() => {
    setMaGiamGia(null);
    setMaServer(null);
  }, []);

  const giaTri = useMemo<GioHangContextValue>(
    () => ({
      danhSach,
      daTaiXong,
      themVaoGio,
      doiSoLuong,
      xoaKhoiGio,
      xoaHet,
      tongTien,
      tongTienGoc,
      tongGiamGia: Math.max(0, tongTienGoc - tongTien),
      tongSoLuong,
      maGiamGia,
      apDungMa,
      boMa,
      tienGiamMa,
      tongThanhToan: uuDai.tongThanhToan,
      uuDai,
    }),
    [
      danhSach,
      daTaiXong,
      themVaoGio,
      doiSoLuong,
      xoaKhoiGio,
      xoaHet,
      tongTien,
      tongTienGoc,
      tongSoLuong,
      maGiamGia,
      apDungMa,
      boMa,
      tienGiamMa,
      uuDai,
    ]
  );

  return (
    <GioHangContext.Provider value={giaTri}>{children}</GioHangContext.Provider>
  );
}

export function useGioHang(): GioHangContextValue {
  const ctx = useContext(GioHangContext);
  if (!ctx) {
    throw new Error("useGioHang phải được dùng bên trong <GioHangProvider>");
  }
  return ctx;
}

/** Định dạng tiền: re-export từ `lib/tien` (có theo ngôn ngữ). */
export { dinhDangTien } from "@/lib/tien";
