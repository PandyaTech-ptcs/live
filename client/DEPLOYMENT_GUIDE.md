# Free Hosting Guide (Mofat ma Server ane Database Kevi Rite Rakhvu)

Jo tamare **ek dam free** ma application host karvi hoy, to niche mujab nu combination best che.
Karan ke:
1. **Render** nu database 30-90 divas pachhi delete thai jay che (Free ma).
2. **Railway** free nathi (thodu trial aape che).

Tethi, **Best Free Option** aa che:
- **Server (Code)**: Render (Lifetime Free)
- **Database (Data)**: Neon Tech (Lifetime Free - 0.5 GB)

## Step 1: Database Setup (Neon Tech)
1. **[Neon.tech](https://neon.tech/)** par jao ane "Sign up" karo (Google thi).
2. "Create Project" par click karo.
   - Name: `divya-darshan-db`
   - Version: 14/15/16 (gamtete chale).
3. Project banine dashboard aavshe. Tyathi **Connection String** copy karo.
   - Aa `postgres://...` thi sharu thashe.
   - Aa tamaro `DB_URL` che.

## Step 2: Server Setup (Render)
1. **[Render Dashboard](https://dashboard.render.com/)** par login karo.
2. "New +" click karo -> **Web Service**.
3. Tamari GitHub repository select karo.
4. Settings:
   - **Name**: `divya-darshan-api`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Plan**: Free (0$ / month)
5. **Environment Variables** (Khub Jaruri):
   - Scroll karo "Environment Variables" section ma.
   - **Add Environment Variable** click karo.
   - Key: `DB_URL`
   - Value: (Neon mathi copy kareli Connection String ahia paste karo).
   - Key: `JWT_SECRET`
   - Value: (Koi pan secret password, e.g. `mysecret123`).
6. "Create Web Service" click karo.

## Step 3: App Update
1. Render par service deploy thay etle upar **URL** malshe (`https://...onrender.com`).
2. Tamara `client/App.js` ma `API_URL` badlo.
3. Have EAS Build (`eas build --platform android`) run karo.

## Summary
- **Neon**: Tamaro data hamesha free ma sachvashe.
- **Render**: Tamaro code free ma run thashe.
- **Railway**: Saro che, pan free nathi.
