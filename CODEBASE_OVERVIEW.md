# AI Wallet — Codebase Overview & Style Notes

A snapshot of what actually exists in this repo today (as opposed to what CLAUDE.md's aspirational structure describes), plus concrete code-style cleanup suggestions.

## Tech stack

- **Expo SDK 57** / React Native 0.86.3, Expo Go for dev testing
- **Redux Toolkit** (async thunks) for state
- **Drizzle ORM** over `expo-sqlite` for local storage, `expo-secure-store` for the DB encryption key
- **Supabase** for optional cloud backup/sync (fully implemented, not a stub)
- **React Navigation** (bottom tabs, one stack per tab, headers hidden everywhere)
- No test runner, no linter/formatter, no CI — `tsconfig.json`'s `strict: true` is the only automated guardrail

## Real directory structure

```
src/
├── core/            App.tsx, Navigation.tsx, ErrorBoundary.tsx, hooks.ts, store.ts
├── features/
│   ├── accounts/      accountsSlice.ts, screens/AccountsScreen.tsx
│   ├── auth/           authSlice.ts, screens/AuthScreen.tsx
│   ├── capture/        captureSlice.ts, screens/{CaptureScreen,ManualEntryScreen}.tsx
│   ├── categories/     categoriesSlice.ts   (no screen — managed inline elsewhere)
│   ├── dashboard/      screens/DashboardScreen.tsx  (reads other slices, no slice of its own)
│   ├── settings/       settingsSlice.ts, screens/SettingsScreen.tsx
│   └── transactions/   transactionsSlice.ts, screens/TransactionListScreen.tsx
├── services/
│   ├── database/       schema.ts, drizzle.ts, migrate.ts, seed.ts, repositories/*Drizzle.ts
│   ├── security/        SecureStorageService.ts
│   └── supabase/        client.ts, auth.ts, sync.ts  (auth + outbox-style sync queue + backup/restore)
└── shared/
    ├── types/   account, budget, category, common, feedback, import, settings, transaction
    └── utils/   money.ts, date.ts, fingerprint.ts
```

> **Note:** CLAUDE.md documents `src/app/` and `src/components/` — neither exists. The real root is `src/core/`, and there is no shared UI component library; every screen owns its own `StyleSheet.create`.

## Feature status

| Feature | Status |
|---|---|
| Accounts, Transactions, Categories, Settings | Implemented, backed by real SQLite tables via Drizzle |
| Manual transaction entry | Implemented (`ManualEntryScreen.tsx`) |
| Text / Voice / Image AI capture | **Stubbed** — `CaptureScreen.tsx` has UI for all four modes, but only `manual` is wired up; the rest hit `// TODO: Implement other capture modes` (CaptureScreen.tsx:61) |
| AI inference (llama.rn, BYOK) | **Not built** — `settingsSlice` already tracks `hasOpenAIKey`/`hasAnthropicKey` and `SecureStorageService` can store keys, but there's no `src/services/ai/` anywhere |
| Cloud backup/sync (Supabase) | Fully implemented — sign in/up, outbox sync queue with retry (`MAX_ATTEMPTS = 3`), backup/restore |
| Budgets, Import/Export | Types exist (`shared/types/budget.ts`, `import.ts`); no screens or slices |
| Dark theme | Implemented — `shared/theme/palette.ts` + `ThemeContext`, all screens converted, Settings → Theme picker wired |

## Code style findings

**1. Two incompatible thunk error-handling shapes, sometimes in the same file.**
`accountsSlice`/`categoriesSlice`/`transactionsSlice` throw and read `action.error.message` in `.rejected`. `authSlice` and half of `settingsSlice` use `rejectWithValue` and read `action.payload` instead. Pick one convention (recommend `rejectWithValue` — it lets you return typed, user-facing error messages instead of whatever `Error.message` happens to say) and apply it everywhere.

**2. Duplicated `getUserId` helper**, copied verbatim into `accountsSlice.ts:34` and `categoriesSlice.ts:42`. Should be one function in `shared/utils/` or a memoized selector.

**3. `as any` used defensively, not out of necessity.** `SettingsScreen.tsx` already imports the typed `useAppDispatch` hook (`core/hooks.ts`) but still casts every `dispatch(thunk() as any)` call (lines 50-53, 69, 77, 85) — the cast is redundant once the typed hook is used. `App.tsx` dispatches off the raw `store.dispatch`, which is why *it* needs the cast; `SettingsScreen.tsx` doesn't. Separately, `Ionicons name={x as any}` is repeated in 4 files (`Navigation.tsx:132`, `SettingsScreen.tsx:218`, `CaptureScreen.tsx:83`, `AccountsScreen.tsx:35`) because icon names aren't typed against Ionicons' name union anywhere — worth a single shared `IconName` type instead of casting at every call site.

**4. Inconsistent offline-sync gating.** `accountsSlice`/`categoriesSlice` only call `enqueueSync` when a user is signed in; `transactionsSlice`'s create/update/delete thunks call it unconditionally. Likely a real bug (queuing sync work for signed-out users), not just a style nit.

**5. Insecure key generation.** `SecureStorageService.generateSecureKey()` generates the *database encryption key* with `Math.random()`, with its own comment admitting it should use `expo-crypto` — which is already a project dependency (used in `index.ts` for the crypto polyfill). This is worth fixing for real, not just noting stylistically.

**6. Debug scaffolding left in the runtime path.** `index.ts` installs a permanent `ErrorUtils.setGlobalHandler` purely to `console.log` stack traces, labeled "Temporary diagnostic" but still wired into app startup. `ErrorBoundary.tsx`'s `componentDidCatch` also has leftover verbose `console.log`s from the same debugging session. Both should be removed now that the underlying crash is fixed.

**7. Unimplemented settings rows silently no-op.** `SettingsScreen.tsx` has six `onPress: () => console.log(...)` stubs (Model Manager, BYOK Setup, Categories, Import/Export, Default Account, About, Privacy) that look tappable but do nothing visible — no "Coming soon" affordance, no disabled state.

**8. Two uncoordinated color systems.** ~138 hex literals repeated across screen `StyleSheet.create` blocks, *and* `shared/types/category.ts` independently hardcodes its own default-category palette. Neither references the other. The in-progress dark theme work introduces a single `shared/theme/palette.ts` as the first shared source of truth — `category.ts`'s palette should eventually be reconciled against it too.

**9. No tests, no lint, no CI.** Not urgent, but worth flagging: `tsconfig.json strict: true` is currently the only thing catching bugs before runtime. Even a minimal ESLint config (`eslint-config-expo` ships with Expo SDK 57) plus one smoke test around the money/date utils would catch regressions cheaply.

## Suggested cleanup order

1. Fix the `Math.random()` key-generation bug (real security issue, small fix).
2. Standardize thunk error handling on `rejectWithValue` across all six slices.
3. Remove the leftover diagnostic logging in `index.ts` / `ErrorBoundary.tsx`.
4. Extract shared `getUserId` and a typed `IconName`, drop the now-redundant `as any` casts.
5. Add `eslint-config-expo` + a `"lint"` script — cheapest way to stop new inconsistencies from accumulating.
6. Everything else (budgets, import/export, AI capture, test coverage) is net-new feature work, not cleanup — track separately.
