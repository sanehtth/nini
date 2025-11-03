// js/firebase.js
const firebaseConfig = {
  // DÁN CONFIG CỦA BẠN TỪ FIREBASE CONSOLE
   apiKey: "AIzaSyDm8achECq0QXN34dp3cLflKzS8Ge78R5E",
  authDomain: "nini-funny.firebaseapp.com",
  databaseURL: "https://nini-funny-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nini-funny",
  storageBucket: "nini-funny.firebasestorage.app",
  messagingSenderId: "158986131827",
  appId: "1:158986131827:web:92e9a212747582d83d4d06"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Xuất biến để main.js dùng
window.firebaseAuth = firebase.auth();
window.firebaseDB = firebase.database();

function sendPasswordReset(email) {
  authMsg.textContent = "Đang gửi email đặt lại...";
  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      authMsg.style.color = "green";
      authMsg.textContent = "Đã gửi email đặt lại mật khẩu!";
    })
    .catch((error) => {
      authMsg.style.color = "#e11d48";
      authMsg.textContent = error.message;
    });
}
