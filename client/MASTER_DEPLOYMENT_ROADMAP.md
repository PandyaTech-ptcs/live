# MASTER GUIDE: App & Database Live Roadmap (Sampurna Margdarshan)

Tamari samaj ma thodi bhul che. **Database Play Store ma ADD NA THAY.**
Aa structure samjo:

1. **Database (Cloud)**: Tamaro Data (Users, Login) ahi rahe. (Neon / AWS)
2. **Server (Cloud)**: Tamaro Code ahi run thay. (Render)
3. **App (Play Store)**: User na mobile ma install thay. (Play Store)

**App** -> connect kare -> **Server** -> connect kare -> **Database**.

Tethi, tamare **5 STEP** karva padshe. Aa "Master Guide" ne follow karo:

---

## Step 1: Database Online Karo (Neon Tech)
Sauthi pehla data store karvani jagya banavo.
1. [Neon.tech](https://neon.tech) par jao -> Sign Up.
2. Project banavo (`divya-darshan-db`).
3. **Internal Connection String** copy karo. (Aa `postgres://...` hase).
   - Aa tamaru **DATABASE ADRESS** che.

## Step 2: Server Online Karo (Render)
Have tamaro backend code online muko.
1. GitHub par code upload karo.
2. [Render.com](https://render.com) par jao -> New Web Service.
3. GitHub repo select karo.
4. **Environment Variables** add karo:
   - `DATABASE_URL` = (Neon vali link paste karo).
   - `JWT_SECRET` = (kai pan lakho).
5. Deploy karo.
6. Upar **URL** malse (e.g. `https://divya-darshan.onrender.com`).
   - Aa tamaru **SERVER ADDRESS** che.

## Step 3: App ma Link Jodo (Connect)
Have App ne kaho ke server kya che.
1. VS Code ma `client/App.js` kholo.
2. `API_URL` badlo:
   ```javascript
   const API_URL = 'https://divya-darshan.onrender.com/api/temples';
   ```
   *(Tamari Render vali link, pachhal /api/temples lagavvu)*.

## Step 4: Final File Banavo (Build)
Have App ni file banavo je Play Store par jashe.
1. Terminal ma `client` folder ma jao.
2. Command run karo:
   ```bash
   eas build --platform android
   ```
3. 15-20 min pachi `.aab` file download karvani link aavshe.

## Step 5: Play Store par Upload
Have aa `.aab` file Play Store par muko.
1. [Google Play Console](https://play.google.com/console) ($25 fee).
2. "Create App" -> "Production" -> "Create New Release".
3. Tamari `.aab` file upload karo.
4. "Submit for Review".

**Bas! Aa rite tamari App Play Store par hase, pan Database Cloud (Neon) par hase, ane banne sathe mali ne kaam karshe.**
