
/*
 * Frontend adapter for Firebase Callable Cloud Function.
 * Include firebase-functions-compat.js before this file.
 *
 * Usage:
 *   const result = await requestOpenAI(messages);
 *   const answerText = result.text;
 */
(function () {
  "use strict";

  window.requestOpenAI = async function requestOpenAI(chat) {
    if (!window.firebase || typeof firebase.functions !== "function") {
      throw new Error(
        "Firebase Functions chưa được tải. Kiểm tra firebase-functions-compat.js."
      );
    }

    let functions;

    try {
      functions = firebase.app().functions("asia-southeast1");
    } catch (error) {
      throw new Error(
        "Không khởi tạo được Firebase Functions ở vùng asia-southeast1: " +
        (error.message || error)
      );
    }

    const callable = functions.httpsCallable("chatWithAI", {
      timeout: 120000
    });

    let result;

    try {
      result = await callable({ messages: chat });
    } catch (error) {
      const code = error && error.code ? error.code : "unknown";
      const message = error && error.message
        ? error.message
        : "Không rõ nguyên nhân";

      const wrapped = new Error(
        String(code).includes("not-found")
          ? "Không tìm thấy Cloud Function chatWithAI ở vùng asia-southeast1. " +
            "Hãy kiểm tra firebase functions:list và deploy Functions. "
          : "Firebase Function lỗi (" + code + "): " + message
      );

      wrapped.code = code;
      throw wrapped;
    }

    const data = result && result.data ? result.data : {};

    if (!data.text || typeof data.text !== "string") {
      throw new Error("Máy chủ AI trả về dữ liệu không hợp lệ.");
    }

    return data;
  };
})();
