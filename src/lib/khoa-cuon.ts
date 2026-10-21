"use client";

/**
 * Khoá cuộn nền khi có lớp phủ (menu mobile, bảng lọc, hộp xác nhận tuổi).
 *
 * `overflow: hidden` trên body KHÔNG đủ trên iOS Safari: trang phía sau vẫn trôi
 * khi kéo ngón tay trên lớp phủ, và thanh địa chỉ co giãn làm khung nhảy. Cách
 * chắc chắn là ghim body bằng `position: fixed` rồi trả lại đúng vị trí cuộn
 * khi mở khoá — nên phải nhớ `scrollY` ở đây.
 *
 * Có đếm tham chiếu: nhiều lớp phủ cùng mở thì chỉ mở khoá khi lớp cuối đóng,
 * và vị trí cuộn chỉ được lưu một lần (lúc khoá đầu tiên).
 *
 * Dùng: `useEffect(() => (mo ? khoaCuon() : undefined), [mo])`.
 */
let dem = 0;
let viTriDaLuu = 0;

export function khoaCuon(): () => void {
  if (dem++ === 0) {
    viTriDaLuu = window.scrollY;
    document.body.style.top = `-${viTriDaLuu}px`;
    document.body.classList.add("khoa-cuon");
  }

  let daMo = false;
  return () => {
    if (daMo) return;
    daMo = true;
    if (--dem === 0) {
      document.body.classList.remove("khoa-cuon");
      document.body.style.top = "";
      window.scrollTo(0, viTriDaLuu);
    }
  };
}
