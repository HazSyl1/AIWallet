// Text Capture Screen - free-text input, AI extracts a transaction proposal

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CaptureStackParamList, RootTabParamList } from '../../../core/Navigation';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { generateProposalFromText, clearError, backToInput } from '../captureSlice';
import { updateSettings } from '../../settings/settingsSlice';
import { showAiFallbackPrompt } from '../components/AiFallbackPrompt';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

interface TextCaptureScreenProps {
  onClose: () => void;
}

export default function TextCaptureScreen({ onClose }: TextCaptureScreenProps) {
  const dispatch = useAppDispatch();
  const captureNavigation = useNavigation<StackNavigationProp<CaptureStackParamList>>();
  const navigation = captureNavigation.getParent<BottomTabNavigationProp<RootTabParamList>>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState('');
  const capture = useAppSelector((state) => state.capture);
  const catalog = useAppSelector((state) => state.ai.catalog);
  const handledErrorRef = useRef<string | null>(null);

  const hasInstalledLocalModel = catalog.some((m) => m.isInstalled);

  useEffect(() => {
    if (!capture.error || capture.error === handledErrorRef.current) return;
    handledErrorRef.current = capture.error;

    showAiFallbackPrompt({
      errorKind: capture.errorKind,
      message: capture.error,
      hasInstalledLocalModel,
      onChooseModel: () => navigation?.navigate('Settings', { screen: 'ModelManager' }),
      onSetupByok: () => navigation?.navigate('Settings', { screen: 'BYOKSetup' }),
      onUseLocalModel: () => navigation?.navigate('Settings', { screen: 'ModelManager' }),
      onDisableByok: () => dispatch(updateSettings({ byokEnabled: false })),
      onEnterManually: onClose,
    });
    dispatch(clearError());
  }, [capture.error, capture.errorKind, hasInstalledLocalModel, navigation, dispatch, onClose]);

  const handleGenerate = () => {
    if (!text.trim()) return;
    dispatch(generateProposalFromText(text.trim()));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              dispatch(backToInput());
              onClose();
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Text Input</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Describe the transaction</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder='e.g. "Spent 500 at Swiggy for dinner"'
            placeholderTextColor={colors.textTertiary}
            multiline
            autoFocus
          />

          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleGenerate}
            disabled={!text.trim() || capture.isProcessing}
          >
            {capture.isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Generate</Text>
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: { padding: 4 },
    title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    input: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    generateButton: {
      marginTop: 20,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    generateButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  });
}
