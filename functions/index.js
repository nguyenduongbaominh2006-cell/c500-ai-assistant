
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const OpenAI = require("openai");

initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const REGION = "asia-southeast1";

// Chỉ sử dụng model mà tài khoản OpenAI API của bạn được cấp quyền.
const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

exports.chatWithAI = onCall(
  {
    region: REGION,
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB"
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Vui lòng đăng nhập để sử dụng C500 AI."
      );
    }

    const rawMessages = request.data && request.data.messages;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Không tìm thấy nội dung hội thoại."
      );
    }

    if (rawMessages.length > 40) {
      throw new HttpsError(
        "invalid-argument",
        "Hội thoại quá dài. Vui lòng bắt đầu cuộc trò chuyện mới."
      );
    }

    const messages = rawMessages.map((item) => {
      let role = item && item.role;
      let content = "";

      if (Array.isArray(item && item.parts)) {
        content = item.parts
          .map((part) =>
            part && typeof part.text === "string" ? part.text : ""
          )
          .join("\n");
      } else if (typeof (item && item.content) === "string") {
        content = item.content;
      } else if (typeof (item && item.text) === "string") {
        content = item.text;
      }

      if (role === "model") role = "assistant";

      if (role !== "user" && role !== "assistant") {
        return null;
      }

      content = content.trim();

      if (!content) return null;

      if (content.length > 12000) {
        throw new HttpsError(
          "invalid-argument",
          "Một tin nhắn vượt quá giới hạn 12.000 ký tự."
        );
      }

      return { role, content };
    }).filter(Boolean);

    if (!messages.length || !messages.some((m) => m.role === "user")) {
      throw new HttpsError(
        "invalid-argument",
        "Hội thoại cần có ít nhất một tin nhắn của người dùng."
      );
    }

    try {
      const client = new OpenAI({
        apiKey: OPENAI_API_KEY.value()
      });

      const response = await client.responses.create({
        model: MODEL,
        instructions:
    (typeof request.data.systemInstruction === "string" &&
     request.data.systemInstruction.trim())
        ? request.data.systemInstruction.trim() +
          " Ưu tiên trả lời bằng tiếng Việt khi người dùng viết tiếng Việt; " +
          "dùng tiếng Anh khi được yêu cầu. " +
          "không trả lời các câu hỏi liên quan đến nghiệp vụ an ninh nằm tỏng danh sách từ khoá kiểm duyệt" +
          "trả lời thông tin về các sự kiện, quy định của trường Học viện An ninh Nhân dân, lấy từ trang web chính thức của nhà trường và các trang báo trong nước"
          "Không tự nhận là cơ quan nhà nước hoặc người thật. " +
          "Nếu không chắc chắn, hãy nói rõ giới hạn."
        : "Bạn là C500 AI Assistant, trợ lý học tập liên quan đến các công việc học tập quản lý của Học viện An ninh Nhân dân thân thiện, rõ ràng và có trách nhiệm.",
        input: messages,
        max_output_tokens: 1800
      });

      const answer = (response.output_text || "").trim();

      if (!answer) {
        throw new HttpsError(
          "internal",
          "AI chưa tạo được câu trả lời. Vui lòng thử lại."
        );
      }

      return {
        text: answer,
        model: MODEL
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      console.error("OpenAI request failed:", {
        name: error && error.name,
        status: error && error.status,
        message: error && error.message
      });

      if (error && (error.status === 401 || error.status === 403)) {
        throw new HttpsError(
          "failed-precondition",
          "Khóa OpenAI hoặc quyền truy cập mô hình chưa hợp lệ. " +
          "Kiểm tra secret OPENAI_API_KEY và model " + MODEL + "."
        );
      }

      if (error && error.status === 404) {
        throw new HttpsError(
          "failed-precondition",
          "Không tìm thấy model " + MODEL +
          " hoặc tài khoản API chưa được cấp quyền dùng model này. " +
          "Kiểm tra model trong functions/index.js."
        );
      }

      if (error && error.status === 429) {
        throw new HttpsError(
          "resource-exhausted",
          "AI đang quá tải hoặc đã chạm giới hạn sử dụng. " +
          "Vui lòng thử lại sau."
        );
      }

      throw new HttpsError(
        "unavailable",
        "Không thể kết nối AI lúc này. Vui lòng thử lại sau."
      );
    }
  }
);
