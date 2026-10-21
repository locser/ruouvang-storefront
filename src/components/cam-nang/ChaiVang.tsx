import type { CSSProperties, ReactNode } from "react";

/**
 * Ảnh minh hoạ chai/ly vang vẽ bằng SVG — dùng khi bài viết chưa có ảnh thật,
 * và cho khung hero của trang Cẩm nang.
 *
 * `SpriteChai` khai báo hình MỘT LẦN trong trang; mỗi `ChaiVang` chỉ `<use>` lại
 * nên không nhân bản đường vẽ. Màu thân chai và nắp đi qua biến CSS `--glass`,
 * `--cap` (kế thừa vào bên trong `<use>`).
 */
export function SpriteChai() {
  return (
    <svg
      width="0"
      height="0"
      className="absolute"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="cn-shine" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".22" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".38" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".25" />
        </linearGradient>
      </defs>
      <symbol id="cn-bottle" viewBox="0 0 60 200">
        <rect x="25" y="0" width="10" height="34" rx="2" fill="var(--cap,#C9B48C)" />
        <path
          d="M25 30h10v34c0 14 15 22 15 46v78a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8v-78c0-24 15-32 15-46Z"
          fill="var(--glass,#2A1216)"
        />
        <path
          d="M25 30h10v34c0 14 15 22 15 46v78a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8v-78c0-24 15-32 15-46Z"
          fill="url(#cn-shine)"
        />
        <rect x="13" y="112" width="34" height="54" fill="#F3ECDD" />
        <rect x="18" y="122" width="24" height="1.6" fill="#B08D57" />
        <rect x="21" y="130" width="18" height="1" fill="#6B1E2E" opacity=".7" />
        <rect x="21" y="136" width="18" height="1" fill="#6B1E2E" opacity=".45" />
        <rect x="24" y="150" width="12" height="1" fill="#6B1E2E" opacity=".35" />
      </symbol>
      <symbol id="cn-glass" viewBox="0 0 60 200">
        <path d="M12 6h36c0 46-6 80-18 86C18 86 12 52 12 6Z" fill="var(--glass,#6B1E2E)" opacity=".92" />
        <path d="M12 6h36c0 12-1 22-2 31H14c-1-9-2-19-2-31Z" fill="#fff" opacity=".18" />
        <rect x="29" y="92" width="2" height="82" fill="#B08D57" />
        <ellipse cx="30" cy="180" rx="16" ry="4" fill="#B08D57" />
      </symbol>
    </svg>
  );
}

/** Nền khung ảnh — gradient ấm, đủ tối/sáng để chai nổi lên. */
export type NenAnh = "giay" | "ruou" | "vang" | "hong" | "muc";

const NEN: Record<NenAnh, string> = {
  giay: "bg-[radial-gradient(120%_90%_at_50%_18%,#FBF6EA_0%,#EADFCB_100%)]",
  ruou: "bg-[radial-gradient(110%_90%_at_50%_12%,#7A2436_0%,#3A0F1A_70%,#220A10_100%)]",
  vang: "bg-[radial-gradient(120%_90%_at_50%_18%,#F6EBD0_0%,#DCC590_100%)]",
  hong: "bg-[radial-gradient(120%_90%_at_50%_18%,#F8EAE5_0%,#E6CAC6_100%)]",
  muc: "bg-[radial-gradient(120%_90%_at_50%_12%,#3A3432_0%,#1C1A19_80%)]",
};

/** Khung ảnh: gradient nền + (ảnh thật hoặc chai SVG) căn giữa. */
export function KhungAnh({
  nen = "giay",
  className = "",
  children,
}: {
  nen?: NenAnh;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative grid place-items-center overflow-hidden ${NEN[nen]} ${className}`}
    >
      {children}
    </div>
  );
}

export function ChaiVang({
  kieu = "chai",
  thuy,
  nap,
  cao = "68%",
  className = "",
}: {
  kieu?: "chai" | "ly";
  /** Màu thân chai/ly. */
  thuy: string;
  /** Màu nắp (chỉ áp cho chai). */
  nap?: string;
  /** Chiều cao theo khung chứa. */
  cao?: string;
  className?: string;
}) {
  const kieuCss = {
    "--glass": thuy,
    "--cap": nap ?? "#B08D57",
    height: cao,
  } as CSSProperties;

  return (
    <svg
      viewBox="0 0 60 200"
      style={kieuCss}
      className={`w-auto drop-shadow-[0_18px_22px_rgba(28,26,25,0.28)] transition-transform duration-700 ease-cellar group-hover:-translate-y-1.5 group-hover:scale-[1.02] motion-reduce:transition-none ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <use href={kieu === "ly" ? "#cn-glass" : "#cn-bottle"} />
    </svg>
  );
}
