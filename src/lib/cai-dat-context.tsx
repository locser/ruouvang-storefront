"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CaiDat } from "@/lib/lay-cai-dat";
import { nganHangTuCaiDat, type NganHang } from "@/lib/chuyen-khoan";

/**
 * Cấu hình shop lấy từ Medusa (hotline, ngân hàng) và chatbot (widget_key), xem lib/lay-cai-dat.ts. Layout gốc (server) đọc
 * rồi đặt vào đây; component client lấy qua hook, KHÔNG đọc process.env.
 */
const CaiDatContext = createContext<CaiDat>({});

export function CaiDatProvider({ caiDat, children }: { caiDat: CaiDat; children: ReactNode }) {
  return <CaiDatContext.Provider value={caiDat}>{children}</CaiDatContext.Provider>;
}

export const useCaiDat = (): CaiDat => useContext(CaiDatContext);

export function useNganHang(): NganHang {
  const cd = useCaiDat();
  return useMemo(() => nganHangTuCaiDat(cd), [cd]);
}

/** Liên kết zalo.me từ số Zalo đã khai; rỗng nếu chưa khai. */
export function useZaloLink(): string {
  const so = (useCaiDat().zalo_phone ?? "").replace(/\D/g, "");
  return so ? `https://zalo.me/${so}` : "";
}
