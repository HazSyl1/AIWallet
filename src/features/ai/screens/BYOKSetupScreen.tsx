// BYOK Setup Screen — configure OpenAI or Anthropic as the active AI provider.

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { saveOpenAIKey, saveAnthropicKey, updateSettings } from '../../settings/settingsSlice';
import { testOpenAIKey } from '../../../services/ai/providers/OpenAIProvider';
import { testAnthropicKey } from '../../../services/ai/providers/AnthropicProvider';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

type Provider = 'openai' | 'anthropic';

const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
};

export default function BYOKSetupScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const settings = useAppSelector((s) => s.settings);
  const [provider, setProvider] = useState<Provider>(settings.byokProvider ?? 'openai');
  const [model, setModel] = useState(settings.byokModel || DEFAULT_MODEL[provider]);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (next: Provider) => {
    setProvider(next);
    if (!settings.byokModel || settings.byokProvider !== next) {
      setModel(DEFAULT_MODEL[next]);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert('API key required', 'Enter an API key to test the connection.');
      return;
    }
    setTesting(true);
    try {
      if (provider === 'openai') {
        await testOpenAIKey(apiKey.trim());
      } else {
        await testAnthropicKey(apiKey.trim());
      }
      Alert.alert('Success', 'Connection verified — the API key works.');
    } catch (err) {
      Alert.alert('Connection failed', err instanceof Error ? err.message : 'Could not verify the key');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('API key required', 'Enter an API key to save.');
      return;
    }
    setSaving(true);
    try {
      if (provider === 'openai') {
        await dispatch(saveOpenAIKey(apiKey.trim()));
      } else {
        await dispatch(saveAnthropicKey(apiKey.trim()));
      }
      await dispatch(
        updateSettings({ byokEnabled: true, byokProvider: provider, byokModel: model.trim() })
      );
      Alert.alert('Saved', 'Cloud AI is now active.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const alreadyConfigured =
    (provider === 'openai' && settings.hasOpenAIKey) ||
    (provider === 'anthropic' && settings.hasAnthropicKey);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>BYOK Setup</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Provider</Text>
          <View style={styles.providerRow}>
            {(['openai', 'anthropic'] as Provider[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.providerButton, provider === p && styles.providerButtonActive]}
                onPress={() => handleProviderChange(p)}
              >
                <Text
                  style={[styles.providerButtonText, provider === p && styles.providerButtonTextActive]}
                >
                  {p === 'openai' ? 'OpenAI' : 'Anthropic'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {alreadyConfigured && (
            <Text style={styles.infoText}>
              A key is already saved for this provider. Saving again will replace it.
            </Text>
          )}

          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder={DEFAULT_MODEL[provider]}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-..."
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.testButton} onPress={handleTestConnection} disabled={testing}>
            {testing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.testButtonText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save & Activate</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    backButton: { padding: 8 },
    title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: colors.surfaceVariant,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    providerRow: { flexDirection: 'row', gap: 12 },
    providerButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surfaceVariant,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    providerButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.successTint.background,
    },
    providerButtonText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    providerButtonTextActive: { color: colors.primary, fontWeight: '600' },
    infoText: { fontSize: 12, color: colors.textTertiary, marginTop: 8 },
    testButton: {
      marginTop: 24,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
    },
    testButtonText: { fontSize: 15, fontWeight: '600', color: colors.primary },
    saveButton: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    saveButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  });
}
