
(function () {
  "use strict";

  /**
   * Gọi Firebase Cloud Function chatWithAI.
   *
   * Hỗ trợ định dạng hội thoại cũ:
   * [{ role: "user"|"model", parts: [{ text: "..." }] }]
   *
   * Và định dạng:
   * [{ role: "user"|"assistant", content: "..." }]
   */
  window.requestOpenAI = async function requestOpenAI(chat) {
    if (
      !window.firebase ||
      typeof firebase.functions !== "function"
    ) {
      throw new Error(
        "Firebase Functions chưa được tải. " +
        "Hãy kiểm tra firebase-functions-compat.js."
      );
    }

    if (!Array.isArray(chat) || chat.length === 0) {
      throw new Error("Nội dung hội thoại không hợp lệ.");
    }

    // Sử dụng vùng triển khai giống functions/index.js.
    const callable = firebase
      .app()
      .functions("asia-southeast1")
      .httpsCallable("chatWithAI");

    const result = await callable({
      messages: chat
    });

    const data = result && result.data
      ? result.data
      : {};

    if (
      typeof data.text !== "string" ||
      data.text.trim() === ""
    ) {
      throw new Error(
        "Máy chủ AI không trả về câu trả lời hợp lệ."
      );
    }

    return data;
  };
})();
