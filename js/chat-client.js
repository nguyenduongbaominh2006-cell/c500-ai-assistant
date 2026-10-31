
(function () {
  "use strict";

  // Phải trùng với region trong functions/index.js
  const REGION = "asia-southeast1";
  const FUNCTION_NAME = "chatWithAI";

  let callable = null;

  function getChatCallable() {
    if (callable) return callable;

    if (!window.firebase || typeof firebase.auth !== "function") {
      throw new Error(
        "Firebase chưa được tải. Hãy kiểm tra cấu hình đăng nhập."
      );
    }

    if (typeof firebase.functions !== "function") {
      throw new Error(
        "Firebase Functions SDK chưa được tải. Hãy kiểm tra firebase-functions-compat.js."
      );
    }

    if (!firebase.auth().currentUser) {
      throw new Error(
        "Bạn cần đăng nhập lại trước khi sử dụng trợ lý AI."
      );
    }

    callable = firebase.app()
      .functions(REGION)
      .httpsCallable(FUNCTION_NAME);

    return callable;
  }

  window.requestOpenAI = async function requestOpenAI(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Không có tin nhắn để gửi.");
    }

    const safeMessages = messages
      .filter(function (message) {
        return message &&
          ["user", "assistant", "model"].includes(message.role) &&
          typeof message.content === "string" &&
          message.content.trim().length > 0 &&
          !message.error;
      })
      .map(function (message) {
        return {
          role: message.role === "model"
            ? "assistant"
            : message.role,
          content: message.content.trim()
        };
      });

    if (
      !safeMessages.length ||
      !safeMessages.some(function (message) {
        return message.role === "user";
      })
    ) {
      throw new Error(
        "Hội thoại cần có ít nhất một tin nhắn của người dùng."
      );
    }

    try {
      const result = await getChatCallable()({
        messages: safeMessages
      });

      const data = result && result.data;

      if (
        !data ||
        typeof data.text !== "string" ||
        !data.text.trim()
      ) {
        throw new Error(
          "Máy chủ OpenAI chưa trả về nội dung hợp lệ."
        );
      }

      return {
        text: data.text,
        model: typeof data.model === "string"
          ? data.model
          : undefined
      };

    } catch (error) {
      const errorMessages = {
        "functions/unauthenticated":
          "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.",
        "functions/not-found":
          "Không tìm thấy Firebase Function chatWithAI. Hãy triển khai Functions.",
        "functions/resource-exhausted":
          "AI đang quá tải hoặc đã chạm hạn mức sử dụng.",
        "functions/failed-precondition":
          "Hãy kiểm tra OPENAI_API_KEY và quyền truy cập model.",
        "functions/unavailable":
          "Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại."
      };

      if (error && errorMessages[error.code]) {
        error.message = errorMessages[error.code] +
          (error.message ? " (" + error.message + ")" : "");
      }

      throw error;
    }
  };
})();
