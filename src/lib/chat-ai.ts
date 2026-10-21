/**
 * Mở khung chat AI của dock liên hệ (DockLienHe lắng nghe sự kiện này).
 * Có `cauHoi` thì câu đó được gửi vào ô chat như khách tự gõ rồi bấm Gửi.
 */
export function moChatAI(cauHoi?: string) {
  window.dispatchEvent(new CustomEvent("cwwines:mo-chat-ai", { detail: { cauHoi } }));
}
