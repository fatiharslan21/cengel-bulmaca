/* ─────────────────────────────────────────────
   Firebase Yapılandırma Şablonu
   ─────────────────────────────────────────────
   1) https://console.firebase.google.com adresinde yeni proje oluşturun.
   2) Bu projeye bir "Web App" ekleyin → config'i kopyalayın.
   3) Authentication → Sign-in method → Google → Etkinleştir.
   4) Firestore Database → Create database (production veya test modu).
   5) Bu dosyayı firebase-config.js olarak kopyalayın ve kendi değerlerinizi yazın.

   Firestore kuralları (basit öneri — production için sıkılaştırın):

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ───────────────────────────────────────────── */
window.CB_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
