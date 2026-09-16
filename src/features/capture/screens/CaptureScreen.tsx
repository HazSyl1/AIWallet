// Capture Screen - Entry point for adding transactions

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../../../core/hooks';
import { startCapture } from '../captureSlice';
import { CaptureSource } from '../../../shared/types';
import ManualEntryScreen from './ManualEntryScreen';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

interface CaptureOption {
  source: CaptureSource;
  icon: string;
  title: string;
  description: string;
  color: string;
}

export default function CaptureScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const captureOptions = useMemo<CaptureOption[]>(
    () => [
      {
        source: 'manual',
        icon: 'create-outline',
        title: 'Manual Entry',
        description: 'Fill in transaction details yourself',
        color: colors.accentPurple,
      },
      {
        source: 'text',
        icon: 'chatbubble-outline',
        title: 'Text Input',
        description: 'Type naturally: "Spent 500 at Swiggy"',
        color: colors.info,
      },
      {
        source: 'voice',
        icon: 'mic-outline',
        title: 'Voice Input',
        description: 'Speak your transaction details',
        color: colors.primary,
      },
      {
        source: 'image',
        icon: 'camera-outline',
        title: 'Scan Receipt',
        description: 'Take a photo of a receipt or bill',
        color: colors.warning,
      },
    ],
    [colors]
  );

  const handleSelectMode = (source: CaptureSource) => {
    dispatch(startCapture(source));

    if (source === 'manual') {
      setShowManualEntry(true);
    } else {
      // TODO: Implement other capture modes
      console.log('Selected capture mode:', source);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add Transaction</Text>
        <Text style={styles.subtitle}>Choose how you want to add</Text>
      </View>

      {/* Capture Options */}
      <View style={styles.options}>
        {captureOptions.map((option) => (
          <TouchableOpacity
            key={option.source}
            style={styles.optionCard}
            onPress={() => handleSelectMode(option.source)}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
              <Ionicons name={option.icon as any} size={28} color="#fff" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.iconMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Notice */}
      <View style={styles.aiNotice}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.successTint.text} />
        <Text style={styles.aiNoticeText}>
          AI suggestions are always reviewed by you before saving
        </Text>
      </View>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ManualEntryScreen
          onClose={() => setShowManualEntry(false)}
          onSuccess={() => setShowManualEntry(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    options: {
      padding: 16,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionContent: {
      flex: 1,
      marginLeft: 16,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    aiNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successTint.background,
      margin: 16,
      padding: 16,
      borderRadius: 12,
    },
    aiNoticeText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 13,
      color: colors.successTint.text,
    },
  });
}
