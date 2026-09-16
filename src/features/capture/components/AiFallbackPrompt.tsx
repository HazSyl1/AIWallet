// Fallback prompt shown when AI proposal generation fails — suggests the
// opposite provider mode plus a manual-entry escape hatch, per error kind.

import { Alert } from 'react-native';
import type { CaptureErrorKind } from '../captureSlice';

interface ShowAiFallbackPromptParams {
  errorKind: CaptureErrorKind;
  message: string;
  hasInstalledLocalModel: boolean;
  onChooseModel: () => void;
  onSetupByok: () => void;
  onUseLocalModel: () => void;
  onDisableByok: () => void;
  onEnterManually: () => void;
}

export function showAiFallbackPrompt({
  errorKind,
  message,
  hasInstalledLocalModel,
  onChooseModel,
  onSetupByok,
  onUseLocalModel,
  onDisableByok,
  onEnterManually,
}: ShowAiFallbackPromptParams): void {
  if (errorKind === 'local') {
    Alert.alert('On-device AI unavailable', message, [
      { text: 'Choose a different model', onPress: onChooseModel },
      { text: 'Set up cloud AI', onPress: onSetupByok },
      { text: 'Enter manually', style: 'cancel', onPress: onEnterManually },
    ]);
    return;
  }

  if (errorKind === 'byok') {
    Alert.alert('Cloud AI unavailable', message, [
      hasInstalledLocalModel
        ? { text: 'Use on-device model', onPress: onDisableByok }
        : { text: 'Set up on-device model', onPress: onUseLocalModel },
      { text: 'Change API key / provider', onPress: onSetupByok },
      { text: 'Enter manually', style: 'cancel', onPress: onEnterManually },
    ]);
    return;
  }

  Alert.alert('Could not generate proposal', message, [
    { text: 'Enter manually', style: 'cancel', onPress: onEnterManually },
  ]);
}
