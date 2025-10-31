// js/firebase.js
const firebaseConfig = {
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

// firebase.js
window.firebaseAuth = firebase.auth();
window.firebaseDB   = firebase.database();
window.App = window.App || {};
window.App.db = window.firebaseDB;  // quan trọng cho unified analytics

