/* ─────────────────────────────────────────────
   Firebase Yapılandırması (bulut skor tablosu için)
   ─────────────────────────────────────────────

   Bu dosya ŞABLONDUR. Gerçek değerlerle doldurup
   aynı dizine `firebase-config.js` adıyla kaydetmelisin.
   `.gitignore`'dan dolayı `firebase-config.js` repoya
   commit'lenmez — API anahtarın güvende kalır.

   KURULUM ADIMLARI
   ────────────────
   1) https://console.firebase.google.com → yeni proje oluştur.
   2) Proje ayarlarında "Web app" ekle, `firebaseConfig` nesnesini kopyala.
   3) Authentication → Sign-in method → "Anonymous" yöntemini Enable et.
      (Kurallarımız `request.auth != null` gerektiriyor; giriş anonim
      olarak arka planda otomatik yapılır.)
   4) Firestore Database → Create database → production mode
      (eur3 veya en yakın lokasyon).
   5) Firestore → Rules sekmesinde aşağıdaki kuralı yapıştır:

      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /users/{userId} {
            allow read: if request.auth != null;
            allow write: if request.auth != null;
          }
        }
      }

   6) Authentication → Settings → Authorized domains listesine sitenin
      domain'ini ekle (örn. `cengelbulmacaa.netlify.app` veya
      `username.github.io`). `localhost` zaten izinli gelir.
   7) Bu dosyayı `firebase-config.js` olarak kaydet ve aşağıdaki
      değerleri konsoldan aldığın gerçek değerlerle değiştir.

   NOT: "window.CB_FIREBASE_CONFIG" adı AYNEN kalmalı. Başka bir isim
   ya da `const firebaseConfig = ...` kullanılırsa oyun Firebase'i
   tanımaz ve yerel moda döner.

   GÜVENLİK UYARISI: Kullanıcı şifreleri istemcide SHA-256 hash'lenir
   ve Firestore'a yazılır. Bu profesyonel bir kimlik doğrulama değildir;
   yarışma skorları için yeterli, ciddi kullanıcı verileri için değil.
   ───────────────────────────────────────────── */
window.CB_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
