# ⛽ Fillr — React Native / Expo App

Find the cheapest fuel near you. Dark minimal UI. No Mac required.

---

## Quick Start (Test on your phone TODAY)

### Step 1 — Install Expo Go on your iPhone
Download **Expo Go** from the App Store (it's free).

### Step 2 — Install Node.js on your computer
Download from https://nodejs.org (choose LTS version)

### Step 3 — Install dependencies
Open Terminal (Mac/Linux) or Command Prompt (Windows), navigate to this folder:
```bash
cd fillr
npm install
```

### Step 4 — Start the development server
```bash
npx expo start
```

### Step 5 — Open on your phone
- A QR code will appear in the terminal
- Open your iPhone Camera app and point it at the QR code
- Tap the notification that appears → opens in Expo Go
- The app loads live on your phone ✅

---

## Project Structure

```
fillr/
├── app/
│   ├── _layout.tsx          # Expo Router root layout
│   └── index.tsx            # Main app with tab navigation
├── src/
│   ├── theme.ts             # Colors, spacing, radii
│   ├── hooks/
│   │   ├── useLocation.ts   # GPS location hook
│   │   └── useFuelStore.ts  # Stations state & search logic
│   ├── services/
│   │   └── fuelService.ts   # OpenStreetMap API + price logic
│   └── components/
│       ├── HomeMapScreen.tsx         # Map with price pins + Search button
│       ├── StationsListScreen.tsx    # Ranked station list
│       ├── SettingsScreen.tsx        # Preferences
│       └── LocationPermissionScreen.tsx
├── app.json                 # Expo config
└── package.json
```

---

## Features

- 🗺️ **Full-screen map** with your location and price pins
- ⛽ **Search Fuel button** — searches within your chosen radius
- 💰 **Cheapest station hero card** pops up after search
- 📋 **Ranked list** sorted cheapest first with one-tap directions
- 🗣️ **Fuel type filter** — Regular, Midgrade, Premium, Diesel
- 📍 **Adjustable radius** — 5, 10, 15, 25 km
- 🌙 **Dark minimal UI** matching the social post aesthetic

---

## Upgrading to Real Prices

Gas station locations come from OpenStreetMap (free, no key needed).
Prices are estimated by region.

To get live prices:
1. Sign up at **collectapi.com** (~$9/month)
2. In `src/services/fuelService.ts`, replace `fetchNearbyStations` with their API
3. Their endpoint: `https://api.collectapi.com/gasPrice/...`

---

## Publishing to App Store / Google Play

Use **Expo EAS Build** — builds your app in the cloud, no Mac needed:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios      # Builds .ipa for App Store
eas build --platform android  # Builds .aab for Google Play
```

Sign up at https://expo.dev (free tier available)

---

## Customisation

| What | File |
|---|---|
| Colours / accent green | `src/theme.ts` |
| Search radius options | `src/components/StationsListScreen.tsx` |
| Price data source | `src/services/fuelService.ts` |
| Map style | `src/components/HomeMapScreen.tsx` → `mapType` prop |
| App name & icon | `app.json` |

---

*Built with React Native, Expo, and react-native-maps.*
