/* ─────────────────────────────────────────────
   Firebase Yapılandırma Şablonu (OPSİYONEL)
   ─────────────────────────────────────────────
   Oyun Firebase olmadan da çalışır - o zaman skorlar sadece
   senin tarayıcında saklanır. Bulut scoreboard istiyorsan:

   1) https://console.firebase.google.com > yeni proje
   2) Web app ekle, config'i kopyala
   3) Authentication > Sign-in method > Anonymous > Enable
   4) Firestore Database > Create (eur3 lokasyon)
   5) Firestore > Rules'a şunu yapıştır:

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }

   6) Authentication > Settings > Authorized domains'e
      sitenin domain'ini ekle (örn. cengelbulmacaa.netlify.app)
   7) Bu dosyayı firebase-config.js olarak kaydet ve değerleri doldur.

   ÖNEMLİ: "window.CB_FIREBASE_CONFIG" adı DEĞİŞMEMELİ.
   "const firebaseConfig = ..." yazma, çalışmaz!
   ───────────────────────────────────────────── */
window.CB_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
