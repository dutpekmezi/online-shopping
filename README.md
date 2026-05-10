# Online Shopping (React Router + Vite + TypeScript)

Bu projeye Firebase Authentication tabanlı login/register + Google login altyapısı eklendi.

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` içine Firebase Console > Project Settings > Web App bölümündeki public değerleri girin:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Çalıştırma

```bash
npm run dev
```


## Firestore ürün kataloğu

Ürün listeleme `/shop` ve `/collections` sayfalarında doğrudan Cloud Firestore'daki `products` koleksiyonundan okunur. Uygulama, elle eklenen dokümanlarda `createdAt` alanı yoksa ürünü yine gösterir ve tarih alanı olan ürünleri en yeni önce sıralar.

### Gerekli koleksiyon

Firebase Console > Cloud Firestore > Data ekranında `products` koleksiyonu oluşturun. Her ürün dokümanında en az şu alanları kullanın:

- `title` (string)
- `description` (string)
- `category` (string)
- `imageUrl` (string, örn. `https://...` veya repodaki görseller için `App/Images/MainSectionImage.JPG`)

Opsiyonel alanlar:

- `productId` (string, yoksa doküman id'si kullanılır)
- `basePrice` (string)
- `pricingState` (map)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Firestore güvenlik kuralları

Console'daki varsayılan kural tüm okuma/yazmaları kapatır. Ürünlerin client tarafından okunabilmesi için `app/firestore.rules` dosyasındaki kuralları Firebase'e yayınlayın:

```bash
firebase deploy --only firestore:rules
```

Beklenen davranış: `products` koleksiyonu herkese okunabilir, yazma/güncelleme/silme sadece `admin: true` custom claim'e sahip kullanıcılarla sınırlıdır.

## Firebase Console ayarları

1. **Authentication > Sign-in method**
   - Email/Password: Enable
   - Google: Enable
2. **Authentication > Settings > Authorized domains**
   - Local geliştirme domain'ini ekleyin (örn. `localhost`)

## Route yapısı

- `/login`: Email/password ve Google login
- `/register`: Email/password register
- `/account`: Authenticated kullanıcı sayfası (protected)
- `/admin`: Sadece admin claim olan kullanıcılar (protected + admin guard)
- `/unauthorized`: Admin olmayan kullanıcıların yönlendiği sayfa

## Admin kullanıcı tanımlama (Custom Claims)

> Firebase Admin SDK client tarafında kullanılmaz. Sadece güvenli backend/script tarafında kullanılır.

1. Firebase service account JSON dosyanızı güvenli bir yerde saklayın.
2. Ortam değişkeni verin:

```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/full/path/to/service-account.json
```

3. Admin claim verin:

```bash
npm run set-admin-claim -- admin@example.com
```

Bu komut `scripts/set-admin-claim.mjs` dosyasını çalıştırır ve ilgili kullanıcıya `admin: true` claim'i atar.

> Kullanıcının yeni claim'i alması için logout/login yapması gerekir.

## Güvenlik notları

- Firebase Web config değerleri public'tir, `VITE_*` değişkenlerinden okunur.
- Secret/private key client tarafına konulmamıştır.
- Admin yetkisi client state ile değil `custom claims` ile kontrol edilir.
- UI gizleme dışında route-level guard uygulanmıştır.
- **Gerçek admin güvenliği tam olarak sadece client ile garanti edilemez.**
- **UI ve route koruması yapılır ama gerçek admin yetkisi için backend/Firebase Admin SDK gerekir.**
