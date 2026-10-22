
(function () {
  "use strict";

  const WORKER_URL =
    "https://c500-ai-api.nguyenduongbaominh2006.workers.dev/";

  window.requestOpenAI = async function requestOpenAI(messages) {
    if (!window.firebase || typeof firebase.auth !== "function") {
      throw new Error("Firebase chưa được tải. Hãy kiểm tra cấu hình đăng nhập.");
    }

    const user = firebase.auth().currentUser;

    if (!user) {
      throw new Error("Bạn cần đăng nhập lại trước khi sử dụng trợ lý AI.");
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Không có tin nhắn để gửi.");
    }

    const idToken = await user.getIdToken();

    const safeMessages = messages
      .filter(message =>
        message &&
        ["user", "assistant", "model"].includes(message.role) &&
        typeof message.content === "string" &&
        !message.error
      )
      .map(message => ({
        role: message.role,
        content: message.content
      }));

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + idToken
      },
      body: JSON.stringify({
        messages: safeMessages
      })
    });

    let data;

    try {
      data = await response.json();
    } catch (_) {
      throw new Error("Máy chủ AI trả về phản hồi không hợp lệ.");
    }

    if (!response.ok) {
      const error = new Error(
        data && data.error
          ? data.error
          : "Yêu cầu AI thất bại (HTTP " + response.status + ")."
      );
      error.code = response.status === 429
        ? "resource-exhausted"
        : "worker-error";
      throw error;
    }

    if (!data || typeof data.text !== "string" || !data.text.trim()) {
      throw new Error("Máy chủ AI chưa trả về nội dung hợp lệ.");
    }

    return { text: data.text };
  };
})();
