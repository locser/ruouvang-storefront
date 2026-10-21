export type HamFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

/** Lỗi mạng, timeout và phản hồi lỗi đều trở thành `null`, không ném lên route. */
export async function fetchKhongNem(
  hamFetch: HamFetch,
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response | null> {
  try {
    const phanHoi = await hamFetch(input, init);
    return phanHoi.ok ? phanHoi : null;
  } catch {
    return null;
  }
}
