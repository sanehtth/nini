// auth.js
const auth = firebase.auth();
const db   = firebase.database();

// 🟢 Đăng ký tài khoản mới
async function signup(email, password) {
  const snapshot = await db.ref("users").orderByChild("profile/email").equalTo(email).once("value");
  if (snapshot.exists()) throw new Error("Email đã được đăng ký! Vui lòng đăng nhập hoặc quên mật khẩu.");
  
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const uid = cred.user.uid;
  const now = new Date().toISOString().split('T')[0];
  await db.ref('users/' + uid).set({
    profile: { email, joined: now, consent_insight: false },
    stats:   { xp:0, coin:0, badge:1 },
    metrics: { pi:0, fi:0, pi_star:0 },
    skills:  { listening:0, speaking:0, reading:0, writing:0 },
    traits:  { creativity:0, competitiveness:0, sociability:0,
               playfulness:0, self_improvement:0, perfectionism:0 },
    weekly: {},
    gameProgress: {}
  });
  alert("Đăng ký thành công! Hãy làm bài trắc nghiệm đầu tiên.");
  return cred;
}

// 🔵 Đăng nhập
async function login(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// 🟠 Quên mật khẩu
async function resetPassword(email) {
  await auth.sendPasswordResetEmail(email);
  alert("Email khôi phục mật khẩu đã được gửi!");
}

// Gán vào window để main.js dùng
window.AuthUI = { emailExists, signup, login, resetPassword };
