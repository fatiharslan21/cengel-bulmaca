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
    apiKey: "AIzaSyDoUk9ENTW5UALblV3kAIdmdEp9GPhNQI8",          // Adım 2'den
    authDomain: "cengel-bulmaca.firebaseapp.com",
    projectId: "cengel-bulmaca",
    storageBucket: "cengel-bulmaca.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123:web:abc123"
};
