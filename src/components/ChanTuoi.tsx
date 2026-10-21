"use client";

import { useEffect, useState } from "react";
import { khoaCuon } from "@/lib/khoa-cuon";
import T from "./T";
import DoiNgonNgu from "./DoiNgonNgu";
import Logo from "./Logo";

const KHOA_LUU = "cwwines-du-18";

/**
 * Hộp xác nhận đủ 18 tuổi — bản dựng lại của cổng chặn tuổi trên cwwines.com.
 *
 * Đây KHÔNG phải trang trí: Luật Phòng, chống tác hại của rượu, bia 2019 cấm
 * quảng cáo rượu tới người chưa đủ 18 tuổi, nên site gốc chặn toàn bộ nội dung
 * sau một hộp thoại bắt buộc. Bản này tiếp tục hành vi đó.
 *
 * ⚠️ Render ở phía TRÌNH DUYỆT sau khi đã gắn kết (`daGan`), không render thẳng
 * lúc dựng HTML. Máy chủ không đọc được `localStorage`, nên nếu vẽ hộp ngay
 * lượt đầu thì khách đã xác nhận rồi vẫn thấy hộp loé lên một nhịp trước khi
 * biến mất — và React sẽ báo lệch hydrate.
 */
export default function ChanTuoi() {
  const [daGan, setDaGan] = useState(false);
  const [hien, setHien] = useState(false);
  const [tuChoi, setTuChoi] = useState(false);

  useEffect(() => {
    setDaGan(true);
    try {
      if (window.localStorage.getItem(KHOA_LUU) !== "1") setHien(true);
    } catch {
      // Chế độ riêng tư chặn localStorage — cứ hỏi lại, thà hỏi thừa còn hơn bỏ.
      setHien(true);
    }
  }, []);

  useEffect(() => (hien ? khoaCuon() : undefined), [hien]);

  if (!daGan || !hien) return null;

  const dongY = () => {
    try {
      window.localStorage.setItem(KHOA_LUU, "1");
    } catch {
      /* không lưu được thì thôi, lần sau hỏi lại */
    }
    setHien(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chan-tuoi-hoi"
      className="nen-toi fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/95 px-4 py-8 backdrop-blur-sm"
    >
      <div className="hien-dan relative w-full max-w-xl bg-ink px-6 py-12 text-center text-page sm:px-14 sm:py-16">
        {/* Khung đồng mảnh lùi vào trong — chi tiết duy nhất của hộp */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 border border-copper/50"
        />

        <div className="relative">
          <div className="mb-6 flex justify-center">
            <DoiNgonNgu />
          </div>
          <div className="mb-10 flex justify-center">
            <Logo nenToi khauHieu />
          </div>

          {tuChoi ? (
            <>
              <p className="font-display text-[26px] leading-snug sm:text-[30px]">
                <T k="age_gate.denied" />
              </p>
              <button
                type="button"
                onClick={() => setTuChoi(false)}
                className="btn-den mt-10"
              >
                <T k="age_gate.back" />
              </button>
            </>
          ) : (
            <>
              <p className="nhan-nho"><T k="age_gate.title" /></p>

              <h2
                id="chan-tuoi-hoi"
                className="mt-8 font-display text-[32px] font-normal leading-tight !text-page sm:text-[40px]"
              >
                <T k="age_gate.question" />
              </h2>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={dongY}
                  autoFocus
                  className="btn-dong w-full !py-2.5 sm:w-auto sm:min-w-[190px]"
                >
                  <T k="age_gate.confirm" />
                </button>
                <button
                  type="button"
                  onClick={() => setTuChoi(true)}
                  className="btn-den w-full !py-2.5 sm:w-auto sm:min-w-[190px]"
                >
                  <T k="age_gate.deny" />
                </button>
              </div>

              <p className="mt-10 text-[12px] leading-relaxed text-page/50">
                <T k="age_gate.note" />
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
