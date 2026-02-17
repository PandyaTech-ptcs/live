# Play Store Deployment Guide (Play Store Ma App Add Karvana Pagla)

Tamari application ne Google Play Store ma add karva mate niche mujab na steps follow karo.

## Prerequisites (Jaruri vastu)
1. **Google Play Developer Account**: Play Store par app upload karva mate tamare developer account hovu jaruri che (fee: $25 one-time).
2. **Expo Account**: App build karva mate Expo account hovu jaruri che (free). If nathi, to [expo.dev](https://expo.dev/) par sign up karo.

## Steps (Pagla)

### 1. EAS CLI Install Karo
Terminal ma niche no command run karo:
```bash
npm install -g eas-cli
```

### 2. EAS ma Login Karo
Pachi niche no command run karo ane tamara Expo credentials thi login karo:
```bash
eas login
```

### 3. Project Configuration
Have project configure karva mate aa command run karo:
```bash
eas build:configure
```
Jyare puche tyare **Android** select karo. Aa process `eas.json` file create karshe ane `app.json` ma project ID set karshe.

### 4. Build Android Bundle (.aab)
Play store ma upload karva mate `.aab` file hovi joiye. Te banava mate:
```bash
eas build --platform android
```
Wait karo, build thava ma thodo time lagshe. Pachi tamne ek link malshe jya thi tame `.aab` file download kari shaksho.

### 5. Google Play Console par Upload Karo
1. [Google Play Console](https://play.google.com/console/) par jao.
2. Login karo ane **Create App** par click karo.
3. App details (Name, Language) fill karo.
4. **Production** track select karo.
5. Have je `.aab` file download kari hati, te upload karo.
6. Screenshots, Description, Privacy Policy vagere details add karo.
7. Review mate submit karo.

## English Version

To publish your app on the Google Play Store, follow these steps:

1.  **Install EAS CLI**: Run `npm install -g eas-cli`.
2.  **Login to EAS**: Run `eas login` and sign in with your Expo account.
3.  **Configure Project**: Run `eas build:configure`. Select **Android** when prompted. This will generate `eas.json` and link your project ID in `app.json`.
4.  **Build Android Bundle**: Run `eas build --platform android`. Wait for the build to complete and download the `.aab` file from the link provided or your Expo dashboard.
5.  **Upload to Play Console**:
    *   Go to [Google Play Console](https://play.google.com/console/).
    *   Create a new app.
    *   Fill in required details.
    *   Upload the downloaded `.aab` file to the **Production** track.
    *   Add screenshots, description, and submit for review.
