# AWS Database Guide (AWS ma Database Kevi Rite Banavvo)

Ha, tame **AWS (Amazon Web Services)** no upyog kari shako cho. AWS duniya nu sauthi motu cloud platform che.

## AWS RDS (Relational Database Service)
AWS ma database mate **RDS** service vapray che.

### Pros (Fayda)
1. **Reliable**: Khub j surakshit ane stable che.
2. **Standard**: Industry ma sauthi vadhu vapray che.
3. **Free Tier**: Nava account mate 12 mahina sudhi free (750 hours/month) male che.

### Cons (Gair-Fayda)
1. **Limited Free**: Fakt **1 varsh (12 months)** mate j free che. Pachi tamare paise bharva padshe (mahine ₹1000-₹1500 thai shake).
2. **Complex**: Setup karvu thodu aghru che (VPC, Security Groups, Public Access allow karvu pade).
3. **Credit Card**: Sign up vakhate Credit/Debit card muko farajiyat che (₹2 kapase verify karva mate).

---

## Comparison (Sarkhamani)

| Feature | Neon Tech (Recommended) | AWS RDS |
| :--- | :--- | :--- |
| **Cost** | **Lifetime Free** (0.5 GB sudhi) | **1 Year Free**, pachi paise |
| **Setup** | Khub j saral (2 min) | Aghru (15-20 min) |
| **Card?** | Jarur nathi | **Yes**, Credit Card jaruri |
| **Performance** | Sari che (Serverless) | Khub j sari (Dedicated) |

---

## Jo AWS j Vaparvu Hoy to Steps:

1. **AWS Console** ma login karo.
2. Search bar ma **"RDS"** lakho.
3. **"Create database"** button dabavo.
4. **"Standard create"** select karo.
5. **Engine Options**: **PostgreSQL** select karo.
6. **Templates**: **Free tier** select karo.
7. **Settings**:
   - **DB instance identifier**: `divya-darshan-db`
   - **Master username**: `postgres`
   - **Master password**: Tamaro password set karo.
8. **Connectivity**:
   - **Public access**: **Yes** (Aa khub jaruri che, nahitar Render server connect nahi kari shake).
   - **VPC Security Group**: "Create new" rakho.
9. **Create Database** click karo (Aa banva ma 5-10 min lagshe).
10. Database bani jay pachi, tena par click karo ane **Endpoint** (Link) copy karo.

**Endpoint example**: `divya-darshan-db.c1xxxxxx.ap-south-1.rds.amazonaws.com`

Have tamare tamari Connection String banavi padshe:
`postgres://username:password@endpoint:5432/postgres`

Aa link ne Render ma `DATABASE_URL` tarike muko.
