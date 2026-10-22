const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const OpenAI = require("openai");

initializeApp();

// Khóa bí mật được lưu tại Firebase Secret Manager.
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// Có thể thay model tại đây nếu muốn dùng model khác.
const MODEL = "gpt-6-luna";
const REGION = "asia-southeast1";

exports.chatWithAI = onCall(
  {
    region: REGION,
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 120,
    memory: "256MiB"
  },
  async (request) => {
    // Chỉ cho phép thành viên đã đăng nhập sử dụng chatbot.
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Vui lòng đăng nhập để sử dụng C500 AI."
      );
    }

    const rawMessages = request.data?.messages;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Không tìm thấy nội dung hội thoại."
      );
    }

    // Giới hạn dữ liệu đầu vào để tránh yêu cầu quá lớn.
    if (rawMessages.length > 40) {
      throw new HttpsError(
        "invalid-argument",
        "Hội thoại quá dài. Vui lòng bắt đầu cuộc trò chuyện mới."
      );
    }

    // Chấp nhận cả định dạng cũ của Gemini và định dạng OpenAI.
    const messages = rawMessages.map((item) => {
      let role = item?.role;
      let content = "";

      if (Array.isArray(item?.parts)) {
        content = item.parts
          .map((part) =>
            typeof part?.text === "string" ? part.text : ""
          )
          .join("\n");
      } else if (typeof item?.content === "string") {
        content = item.content;
      } else if (typeof item?.text === "string") {
        content = item.text;
      }

      // Gemini dùng "model", OpenAI dùng "assistant".
      if (role === "model") {
        role = "assistant";
      }

      if (role !== "user" && role !== "assistant") {
        return null;
      }

      content = content.trim();

      if (!content) {
        return null;
      }

      if (content.length > 12000) {
        throw new HttpsError(
          "invalid-argument",
          "Một tin nhắn vượt quá giới hạn 12.000 ký tự."
        );
      }

      return { role, content };
    }).filter(Boolean);

    if (
      messages.length === 0 ||
      !messages.some((message) => message.role === "user")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Hội thoại cần có ít nhất một tin nhắn của người dùng."
      );
    }

    try {
      // Khóa API chỉ được sử dụng ở máy chủ, không gửi về trình duyệt.
      const client = new OpenAI({
        apiKey: OPENAI_API_KEY.value()
      });

      const response = await client.responses.create({
        model: MODEL,

        instructions:
          "Bạn là C500 AI Assistant, một trợ lý học tập thân thiện, " +
          "rõ ràng và có trách nhiệm. Ưu tiên trả lời bằng tiếng Việt " +
          "khi người dùng viết tiếng Việt; sử dụng tiếng Anh khi được yêu cầu. " +
          "Không tự nhận là cơ quan nhà nước hoặc người thật. " +
          "Nếu không chắc chắn, hãy nói rõ giới hạn.",

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
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("OpenAI request failed:", {
        name: error?.name,
        status: error?.status,
        message: error?.message
      });

      if (error?.status === 401 || error?.status === 403) {
        throw new HttpsError(
          "failed-precondition",
          "Khóa OpenAI hoặc quyền truy cập mô hình chưa hợp lệ."
        );
      }

      if (error?.status === 429) {
        throw new HttpsError(
          "resource-exhausted",
          "AI đang quá tải hoặc đã chạm giới hạn sử dụng. Vui lòng thử lại sau."
        );
      }

      throw new HttpsError(
        "unavailable",
        "Không thể kết nối AI lúc này. Vui lòng thử lại sau."
      );
    }
  }
);
