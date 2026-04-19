# Çengel Bulmaca Backend (Opsiyonel)

Bu backend açık olduğunda kayıt/giriş ve skorlar `backend/users.json` dosyasına yazılır.

## Kurulum

```bash
cd backend
npm install
npm start
```

Varsayılan adres: `http://localhost:8787`

## Frontend ile bağlantı

Tarayıcıda uygulamayı aynı origin altında çalıştırıyorsan ekstra ayar gerekmez.
Farklı origin kullanıyorsan sayfada şunu tanımlayabilirsin:

```html
<script>window.CB_API_BASE = 'http://localhost:8787';</script>
```

## API uçları

- `GET /api/health`
- `POST /api/register` `{ key, username, passHash }`
- `POST /api/login` `{ key, passHash }`
- `GET /api/user/:key`
- `POST /api/score` `{ key, puzzleId, score, time, hints, difficulty, dailyKey }`
- `GET /api/leaderboard?n=50`
