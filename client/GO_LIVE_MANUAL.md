# 🚀 FINAL PRODUCTION MANUAL (Long-Term Setup Guide)

Aa file tamara **Live Project** mate no "Naksho" (Map) che.
Jo tame aa steps follow karsho, to tamari App **Kayam (Lifetime)** mate chalu raheshe.

---

## 🛑 Step 1: Permanent Database (Neon)
*Data kyarey delete na thay te mate.*

1. **[Neon.tech](https://neon.tech)** par jao ane Sign Up karo.
2. Navo Project banavo: `divya-darshan-prod`.
3. Dashboard parthi **Connection String** copy karo.
   - Example: `postgres://neondb_owner:AbCd123@ep-cool-frog-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
   - **Aa link sachvi rakho.**

---

## ☁️ Step 2: Permanent Server (Render)
*App ne chalava mate nu engine.*

1. **[Render.com](https://render.com)** par jao.
2. **"New Web Service"** banavo -> GitHub Repo select karo.
3. **Settings**:
   - Build Command: `npm install`
   - Start Command: `node index.js`
4. **Environment Variables** (Add karva khub jaruri):
   - `DATABASE_URL` = (Upar Step 1 ma maleli Neon vali link).
   - `JWT_SECRET` = (Gametete random password).
5. Deploy thaya pachi upar **URL** malse.
   - Example: `https://divya-darshan-api.onrender.com`
   - **Aa link copy karo.**

---

## 🔗 Step 3: Link App to Server
*Have App ne kaho ke server kya che.*

1. Tamara computer ma `client/App.js` kholo.
2. Line 33 pase `API_URL` badlo:

```javascript
// ✅ PRODUCTION MODE (Aa line uncomment kari nayakho)
const API_URL = 'https://divya-darshan-api.onrender.com/api/temples'; 

// ❌ TESTING MODE (Aa line comment kari do)
// const API_URL = 'https://....ngrok-free.app/api/temples';
```

---

## 📦 Step 4: Build for Play Store
*Final App banavo.*

1. Terminal ma `client` folder ma jao.
2. Command run karo:
   ```bash
   eas build --platform android
   ```
   *(Jo login karvanu ke, to `eas login` kari ne email/password nakho)*.
3. 20 minute pachi tamne `.aab` file download karvani link malse.

---

## 🚀 Step 5: Upload to Play Store
1. [Play Console](https://play.google.com/console) par jao.
2. "Production" -> "Create Request" -> Upload `.aab`.
3. Review mate moklo.

---

## ✅ Tamari App Have "Lifetime" Chalse
- **Habe computer chalu rakhvani jarur nathi.**
- **Ngrok restart karvani jarur nathi.**
- **Database data kayam sachvai rese.**
