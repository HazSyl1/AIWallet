import * as Crypto from 'expo-crypto';

if (!globalThis.crypto) {
  globalThis.crypto = Crypto as any;
}

import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';

// Temporary diagnostic: LogBox's own "Call Stack" display has proven
// unreliable (always points at ErrorBoundary regardless of true throw
// site). Install a global handler to print the real JS stack straight
// to the Metro terminal.
const g: any = globalThis as any;
if (g.ErrorUtils) {
  const originalHandler = g.ErrorUtils.getGlobalHandler?.();
  g.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    console.log('[GLOBAL ERROR]', isFatal ? '(fatal)' : '(soft)', error?.message);
    console.log('[GLOBAL ERROR STACK]', error?.stack);
    originalHandler?.(error, isFatal);
  });
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
