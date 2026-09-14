# AI Wallet - Local-First Expense Tracker

## Project Overview
A React Native (Expo) app for tracking expenses/income with AI-powered transaction capture.
Target: iOS/Android, India market, English/INR only.

## Key Principle
**AI never commits without user confirmation.** All AI proposals must be reviewed and confirmed.

## Tech Stack
- **Framework:** React Native with Expo
- **State:** Redux Toolkit with async thunks
- **Database:** expo-sqlite (encrypted)
- **Secure Storage:** expo-secure-store
- **Navigation:** React Navigation (bottom tabs + stacks)
- **AI (planned):** llama.rn for local inference

## Project Structure
```
src/
├── app/           # Store, navigation, root app
├── features/      # Feature modules (transactions, accounts, etc.)
├── services/      # Database, AI, OCR, Voice adapters
├── shared/        # Types, utils, hooks
└── components/    # Shared UI components
```

## Important Files
- `src/services/database/migrations.ts` - Schema migrations
- `src/shared/types/transaction.ts` - TransactionProposal schema
- `src/features/capture/captureSlice.ts` - Capture flow state

## Commands
- `npm start` - Start Expo dev server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS

## Conventions
- All amounts in paise (minor units): ₹450.50 = 45050
- Dates in ISO 8601 format
- UUIDs for all entity IDs

@AGENTS.md
