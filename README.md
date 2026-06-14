# FitTrack AI 🏃‍♂️

A full-featured AI-powered fitness tracker mobile app built with React Native + Expo.

## Features

### 📷 AI Food Scanner
- Take a photo or pick from your library
- Powered by Claude AI (Haiku model) for instant food recognition
- Analyzes: calories, protein, carbs, fat, fiber, sugar
- Health score + nutritional tips
- Ingredient detection
- Categorize by meal type (breakfast/lunch/dinner/snack)

### 🚶 Step Tracking
- Real-time step counting via device pedometer (Expo Pedometer)
- Distance (km), calories burned, active minutes
- 7-day step history bar chart
- Visual progress ring with gradient

### 🏋️ Exercise Logging
- 20+ preset exercises across 4 categories: Strength, Cardio, Flexibility, Sports
- Custom exercise entry
- Track sets, reps, weight for strength training
- Auto calorie burn calculation

### 🏠 Dashboard
- Daily calorie balance (eaten vs. burned)
- Macro rings (protein/carbs/fat)
- Step progress ring
- Water intake tracker
- Today's food & exercise log

### 📅 History
- 14-day log history
- Weekly summary stats
- Expandable daily detail view

### 👤 Profile & Settings
- Personal info (age, weight, height, gender)
- Activity level & TDEE calculator
- Custom daily goals
- Claude API key management

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo`
- Expo Go app on your phone (or a simulator)

### Installation

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go to run on your device.

### API Key Setup

1. Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Open the app → tap **Profile** tab
3. Enter your API key under **AI Settings**
4. Go to **Scan** tab and start analyzing food!

## Tech Stack

| Package | Purpose |
|---|---|
| Expo 51 | App framework |
| React Native | UI |
| `@anthropic-ai/sdk` | Claude AI food analysis |
| `expo-camera` | Food photo capture |
| `expo-image-picker` | Photo library access |
| `expo-pedometer` | Step counting |
| `expo-linear-gradient` | UI gradients |
| `react-native-svg` | Macro/step rings |
| `@react-navigation/bottom-tabs` | Tab navigation |
| `@react-native-async-storage/async-storage` | Local data persistence |

## App Structure

```
src/
├── screens/
│   ├── HomeScreen.tsx       # Dashboard
│   ├── FoodScanScreen.tsx   # AI food scanner
│   ├── ExerciseScreen.tsx   # Exercise logging
│   ├── StepsScreen.tsx      # Step tracking
│   ├── HistoryScreen.tsx    # Past logs
│   └── ProfileScreen.tsx    # Profile & settings
├── components/
│   ├── MacroRing.tsx        # SVG macro progress ring
│   ├── StepRing.tsx         # SVG step progress ring
│   ├── ProgressBar.tsx      # Horizontal progress bar
│   ├── FoodLogItem.tsx      # Food entry list item
│   └── ExerciseLogItem.tsx  # Exercise entry list item
├── services/
│   ├── aiService.ts         # Claude API integration
│   └── storageService.ts    # AsyncStorage CRUD
├── types/index.ts           # TypeScript interfaces
└── theme/index.ts           # Colors, spacing, typography
```
