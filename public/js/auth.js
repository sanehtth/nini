// auth.js
// Chức năng: Đăng nhập / Đăng ký / Quên mật khẩu, có kiểm tra email tồn tại
const auth = firebase.auth();
const db   = firebase.database();

// Kiểm tra email đã có tài khoản chưa
async function emailExists(email){
  const snap = await db.ref("users")
    .orderByChild("profile/email")
    .equalTo(email)
    .once("value");
  return snap.exists();
}

// Đăng ký tài khoản mới
async function signup(email, password){
  if (!email || !password) throw new Error("Nhập đủ email và mật khẩu.");
  if (await emailExists(email)) {
    throw new Error("Email đã đăng ký. Hãy đăng nhập hoặc dùng Quên mật khẩu.");
  }

  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const uid  = cred.user.uid;
  const now  = new Date().toISOString().split("T")[0];

  // Khởi tạo cấu trúc dữ liệu chuẩn
  await db.ref("users/" + uid).set({
    profile: { email, joined: now, consent_insight: false },
    stats:   { xp: 0, coin: 0, badge: 1 },
    metrics: { pi: 0, fi: 0, pi_star: 0 },
    skills:  { listening: 0, speaking: 0, reading: 0, writing: 0 },
    traits:  { creativity: 0, competitiveness: 0, sociability: 0,
               playfulness: 0, self_improvement: 0, perfectionism: 0 },
    weekly: {},
    gameProgress: {}
  });

  // Gắn cờ "vừa đăng ký" + mở quiz trong index (SPA)
  try { localStorage.setItem("justSignedUp", "1"); } catch(e){}
  location.href = "index.html#quiz";

  return cred;
}

// Đăng nhập
function login(email, password){
  if (!email || !password) return Promise.reject(new Error("Nhập đủ email và mật khẩu."));
  return auth.signInWithEmailAndPassword(email, password);
}

// Quên mật khẩu
async function resetPassword(email){
  if (!email) throw new Error("Nhập email trước.");
  await auth.sendPasswordResetEmail(email);
}

// Export cho main.js dùng
window.AuthUI = { emailExists, signup, login, resetPassword };
