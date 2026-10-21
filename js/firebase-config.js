const firebaseConfig = {
    apiKey: "AIzaSyDWeQWEjKh9zXyJhbHRZNe4MH-nEao87mU",
    authDomain: "c500-ai-assistant.firebaseapp.com",
    databaseURL: "https://c500-ai-assistant-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "c500-ai-assistant",
    storageBucket: "c500-ai-assistant.appspot.com",
    messagingSenderId: "1073706440068",
    appId: "1:1073706440068:web:925e386e20f2acc2aab9d1"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const MANAGEMENT_EMAIL = "nguyenduongbaominh2006@gmail.com";
const ADMIN_DEFAULT_PASSWORD = "minh2302";

// Tự động khởi tạo tài khoản Admin với mật khẩu minh2302 nếu chưa có trên hệ thống
auth.fetchSignInMethodsForEmail(MANAGEMENT_EMAIL).then(async (methods) => {
    if (methods.length === 0) {
        try {
            await auth.createUserWithEmailAndPassword(MANAGEMENT_EMAIL, ADMIN_DEFAULT_PASSWORD);
            await db.collection('users').doc("admin_system_id").set({
                fullName: "Quản trị viên C500",
                studentClass: "Ban Quản Trị",
                major: "Quản lý An ninh mạng",
                dob: "01/01/2006",
                email: MANAGEMENT_EMAIL
            });
            console.log("Đã khởi tạo sẵn tài khoản Admin thành công!");
        } catch(e) { console.error(e); }
    }
}).catch(err => console.log(err));
