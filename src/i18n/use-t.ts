"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, laLocale, type Locale } from "./config";
import { translate, type Vars } from "./translate";

function dangKy(callback: () => void) {
  const mo = new MutationObserver(callback);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => mo.disconnect();
}

function docLocale(): Locale {
  const l = document.documentElement.lang;
  return laLocale(l) ? l : DEFAULT_LOCALE;
}

/** Ngôn ngữ đang chọn (theo `<html lang>`); phía server luôn là ngôn ngữ gốc. */
export function useLocale(): Locale {
  return useSyncExternalStore(dangKy, docLocale, () => DEFAULT_LOCALE);
}

/**
 * Dịch ra CHUỖI THƯỜNG, dùng cho thuộc tính HTML mà `<T>` không bọc được
 * (placeholder, aria-label, title…). Chỉ dùng trong Client Component.
 */
export function useT(): (key: string, vars?: Vars) => string {
  const locale = useLocale();
  return useCallback((key, vars) => translate(locale, key, vars), [locale]);
}
