// Capture Screen - Entry point for adding transactions

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../../../core/hooks';
import { startCapture } from '../captureSlice';
import { CaptureSource } from '../../../shared/types';
import ManualEntryScreen from './ManualEntryScreen';

interface CaptureOption {
  source: CaptureSource;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const CAPTURE_OPTIONS: CaptureOption[] = [
  {
    source: 'manual',
    icon: 'create-outline',
    title: 'Manual Entry',
    description: 'Fill in transaction details yourself',
    color: '#9C27B0',
  },
  {
    source: 'text',
    icon: 'chatbubble-outline',
    title: 'Text Input',
    description: 'Type naturally: "Spent 500 at Swiggy"',
    color: '#2196F3',
  },
  {
    source: 'voice',
    icon: 'mic-outline',
    title: 'Voice Input',
    description: 'Speak your transaction details',
    color: '#4CAF50',
  },
  {
    source: 'image',
    icon: 'camera-outline',
    title: 'Scan Receipt',
    description: 'Take a photo of a receipt or bill',
    color: '#FF9800',
  },
];

export default function CaptureScreen() {
  const dispatch = useAppDispatch();
  const [showManualEntry, setShowManualEntry] = useState(false);

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
        {CAPTURE_OPTIONS.map((option) => (
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
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Notice */}
      <View style={styles.aiNotice}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  options: {
    padding: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
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
    color: '#333',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  aiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  aiNoticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#2E7D32',
  },
});
