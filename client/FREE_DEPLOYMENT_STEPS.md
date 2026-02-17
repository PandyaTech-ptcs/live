# Step-by-Step Free Deployment Guide (Mofat ma App Live Karvani Rit)

Aa guide tamne tamari app (Backend + Database) ne **FREE** ma online karva mate madada karshe.
Aapne **Neon** (Database mate) ane **Render** (Server mate) no upyog karishu.

## Phase 1: Database Setup (Neon Tech)
Sauthi pehla database banavishu jethi aapne Connection URL male.

1. **Website par jao**: [neon.tech](https://neon.tech/)
2. **Sign Up**: "Sign up" par click karo ane "Continue with Google" select karo.
3. **Create Project**:
    - **Name**: `divya-darshan-db`
    - **Region**: Mumbai (India) select karo (speed sari aavshe).
    - **Postgres Version**: 15 or 16 (default).
    - "Create Project" par click karo.
4. **Get Connection String**:
    - Dashboard par tamne ek box dekhase jema `postgres://...` thi sharu thati link hase.
    - Aa link ne **Copy** karo ane note kari rakho. Aa tamari **DATABASE_URL** che.

## Phase 2: Code Upload (GitHub)
Tamaro code GitHub par hovo jaruri che.

1. Terminal ma jao (VS Code ma).
2. Code save (commit) karo:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```
   *(Jo tame pehli var git vaparata hovo, to GitHub par navi repository banavi ne remote add karvu padshe.)*

## Phase 3: Backend Server Setup (Render)
Have aapne server banavishu je tamaro code run karshe.

1. **Website par jao**: [render.com](https://render.com/)
2. **Login**: GitHub thi login karo.
3. **New Service**:
    - Dashboard par "New +" button dabavo.
    - **"Web Service"** select karo.
4. **Connect Repository**:
    - Tamari `divya-darshan` repository list ma dekhase. "Connect" click karo.
5. **Configure Details**:
    - **Name**: `divya-darshan-api`
    - **Region**: Singapore (India thi nazik).
    - **Branch**: `main`
    - **Root Directory**: `server` (Khas dhyan rakho: tamaro server code `server` folder ma che).
    - **Runtime**: Node
    - **Build Command**: `npm install`
    - **Start Command**: `node index.js`
    - **Instance Type**: **Free** ($0 / month) select karo.
6. **Environment Variables** (Mahatvana Settings):
    - Page niche scroll karo ane "Environment Variables" section shodho.
    - "Add Environment Variable" par click karo.
    - Add karo:
        - **Key**: `DATABASE_URL` , **Value**: (Neon vali link ahi paste karo)
        - **Key**: `JWT_SECRET` , **Value**: `kainePanLakiShakoCho123`
        - **Key**: `PORT` , **Value**: `10000`
7. **Deploy**:
    - "Create Web Service" button dabavo.
    - Thodi var rah judo. Log ma "Server running on port 10000" aavshe.
    - Upar dava (left) khuna ma ek URL hashe (e.g., `https://divya-darshan-api.onrender.com`). Aa link copy karo.

## Phase 4: Frontend Update (App.js)
Have server online che, to app ne kaho ke te online server sathe  vaat kare.

1. Tamari `client/App.js` file kholo.
2. `API_URL` variable shodho ane badlo:
   ```javascript
   // Old (delete or comment out)
   // const API_URL = 'https://....ngrok-free.app/api/temples';

   // New (Render vali link)
   const API_URL = 'https://divya-darshan-api.onrender.com/api/temples';
   ```
   *(Tamari link `https` hovi joie ane pachu `/api/temples` lagavvu)*
3. Save karo.

## Phase 5: App Build & Publish
Have final app banavo je Play Store par jashe.

1. Terminal ma `client` folder ma jao:
   ```bash
   cd client
   ```
2. Build command run karo:
   ```bash
   eas build --platform android
   ```
3. Build puru thaya pachhi `.aab` file download karo ane Play Store Console par upload karo.

**Abhinandan! Tamari App have Live Database sathe connect thai gai che.**
