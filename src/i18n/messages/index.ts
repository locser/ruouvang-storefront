import type { Locale } from "../config";
import vi from "./vi.json";
import en from "./en.json";

/**
 * Bảng dịch theo ngôn ngữ. Kiểu `Record<Locale, …>` bắt buộc mọi ngôn ngữ trong
 * `LOCALES` phải có mặt ở đây — thêm ngôn ngữ mà quên đăng ký là lỗi biên dịch.
 */
export const MESSAGES: Record<Locale, Record<string, string>> = { vi, en };
