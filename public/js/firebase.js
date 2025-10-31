// js/firebase.js
const firebaseConfig = {
  // DÁN CONFIG CỦA BẠN TỪ FIREBASE CONSOLE
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Xuất biến để main.js dùng
window.firebaseAuth = auth;
window.firebaseDB = db;