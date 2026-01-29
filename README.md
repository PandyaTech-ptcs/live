# Somnath Temple Live Aarti App

This project consists of a backend server and a mobile client app to show Live Aarti.

## Prerequisites
- Node.js installed
- Expo Go app on your phone (for testing on real device) OR Android Studio (Emulator)

## How to Run

### Step 1: Start the Server (Backend)
The server provides the Video ID and Aarti details.
1. Open a terminal.
2. Go to the server folder:
   ```bash
   cd server
   ```
3. Install dependencies (if not done):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
   *Keep this terminal open.* it will show your Local and Network IP addresses.

### Step 2: Start the Client (Mobile App)
1. Open a **new** terminal.
2. Go to the client folder:
   ```bash
   cd client
   ```
3. Install dependencies (if not done):
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npx expo start
   ```
5. Scan the QR code with your phone (using Expo Go app) OR press `a` for Android Emulator.

## Important Notes for Testing
- **Video ID**: I have set a default "Recorded Aarti" video so you can see it working immediately. To show the actual **LIVE** video, you need to update `server/index.js` with the current live video ID from YouTube.
- **Real Device Testing**: If testing on a real phone, ensure your phone and computer are on the same Wi-Fi. The app will try to connect to your computer.

Jay Somnath!
