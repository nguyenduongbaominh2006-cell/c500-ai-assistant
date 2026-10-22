
/**
 * C500 AI Assistant — Firebase Configuration
 *
 * Lưu ý bảo mật:
 * - Không lưu mật khẩu quản trị trong mã nguồn.
 * - Không tự động tạo tài khoản quản trị từ trình duyệt.
 * - Phân quyền thực tế phải được thực thi bằng Firestore Security Rules
 *   hoặc backend đáng tin cậy, không chỉ bằng kiểm tra ở giao diện.
 */

// ==================== FIREBASE CONFIGURATION ====================

const firebaseConfig = {
    apiKey: "AIzaSyDWeQWEjKh9zXyJhbHRZNe4MH-nEao87mU",
    authDomain: "c500-ai-assistant.firebaseapp.com",
    databaseURL: "https://c500-ai-assistant-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "c500-ai-assistant",
    storageBucket: "c500-ai-assistant.appspot.com",
    messagingSenderId: "1073706440068",
    appId: "1:1073706440068:web:925e386e20f2acc2aab9d1"
};

// ==================== INITIALIZE FIREBASE ====================

// Tránh khởi tạo lại ứng dụng nếu Firebase đã được khởi tạo.
if (typeof firebase === "undefined") {
    throw new Error(
        "Firebase SDK chưa được tải. Hãy kiểm tra các thẻ script Firebase trong HTML."
    );
}

const firebaseApp = firebase.apps.length > 0
    ? firebase.app()
    : firebase.initializeApp(firebaseConfig);

// Các biến này được sử dụng bởi login.html, setup.html,
// index.html và những trang khác trong dự án.
const auth = firebaseApp.auth();
const db = firebaseApp.firestore();

// Email quản trị dùng cho điều hướng giao diện hiện tại.
// Đây KHÔNG phải cơ chế xác thực quyền quản trị ở phía máy chủ.
const MANAGEMENT_EMAIL = "nguyenduongbaominh2006@gmail.com";

// ==================== CONFIGURATION CHECK ====================

if (
    !firebaseConfig.projectId ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.apiKey
) {
    throw new Error(
        "Cấu hình Firebase chưa đầy đủ. Hãy kiểm tra firebase-config.js."
    );
}

// Không đặt mật khẩu quản trị trong file này.
// Không tự động tạo tài khoản quản trị.
// Không tự động ghi hồ sơ quản trị vào Firestore.
// Không bỏ qua lỗi xác thực hoặc lỗi cơ sở dữ liệu một cách im lặng.
