// Model Manager Screen — browse, download, and select on-device AI models

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { fetchModelCatalog, downloadModel, cancelDownload, deleteModel, selectLocalModel } from '../aiSlice';
import { getRecommendedModels, isModelCompatible } from '../../../services/ai/deviceCapability';
import type { ModelPackage } from '../../../shared/types';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${bytes} B`;
}

const TIER_LABEL: Record<string, string> = {
  core: 'Any device',
  ai_lite: 'Recommended: 3GB+ RAM',
  ai_standard: 'Recommended: 6GB+ RAM',
  connected: 'Cloud',
};

export default function ModelManagerScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { catalog, catalogLoading, downloadProgress, deviceCapability } = useAppSelector((s) => s.ai);
  const selectedModelId = useAppSelector((s) => s.settings.selectedModelId);
  const deviceTier = useAppSelector((s) => s.settings.deviceTier);

  useEffect(() => {
    dispatch(fetchModelCatalog());
  }, [dispatch]);

  const recommendedIds = useMemo(
    () => new Set(getRecommendedModels(catalog, deviceTier ?? 'core').map((m) => m.id)),
    [catalog, deviceTier]
  );

  const { downloadedModels, compatibleModels, lockedModels } = useMemo(() => {
    const downloaded: ModelPackage[] = [];
    const compatible: ModelPackage[] = [];
    const locked: ModelPackage[] = [];
    for (const model of catalog) {
      if (model.isInstalled) downloaded.push(model);
      else if (isModelCompatible(model, deviceTier ?? 'core')) compatible.push(model);
      else locked.push(model);
    }
    return { downloadedModels: downloaded, compatibleModels: compatible, lockedModels: locked };
  }, [catalog, deviceTier]);

  const handleDownload = (model: ModelPackage) => {
    if (!isModelCompatible(model, deviceTier ?? 'core')) {
      Alert.alert(
        'Model Locked',
        `${model.name} needs ${TIER_LABEL[model.minTier ?? 'ai_lite']}. Your device doesn't meet this requirement, so it can't run this model locally.`
      );
      return;
    }
    Alert.alert(
      'Download Model',
      `Download ${model.name} (${formatBytes(model.downloadSizeBytes)})? This uses your device storage and network data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            try {
              await dispatch(downloadModel(model.id)).unwrap();
            } catch (err) {
              const name = (err as { name?: string } | undefined)?.name;
              if (name === 'AbortError') {
                Alert.alert('Download Cancelled', `${model.name} download was cancelled.`);
                return;
              }
              const message = (err as { message?: string } | undefined)?.message;
              Alert.alert('Download Failed', message ?? 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCancelDownload = (model: ModelPackage) => {
    dispatch(cancelDownload(model.id));
  };

  const handleSelect = (model: ModelPackage) => {
    dispatch(selectLocalModel(model.id));
  };

  const handleDelete = (model: ModelPackage) => {
    Alert.alert('Remove Model', `Delete ${model.name} from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteModel(model.id)) },
    ]);
  };

  const renderModel = (model: ModelPackage) => {
    const isSelected = selectedModelId === model.id;
    const isRecommended = recommendedIds.has(model.id);
    const isLocked = !model.isInstalled && !isModelCompatible(model, deviceTier ?? 'core');
    const progress = downloadProgress[model.id];

    return (
      <View key={model.id} style={[styles.card, isSelected && styles.cardSelected, isLocked && styles.cardLocked]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {isLocked && <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />}
            <Text style={[styles.cardTitle, isLocked && styles.textLocked]}>{model.name}</Text>
          </View>
          {isSelected && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {model.paramsBillions != null && (
            <Text style={[styles.metaText, isLocked && styles.textLocked]}>{model.paramsBillions}B params</Text>
          )}
          <Text style={[styles.metaText, isLocked && styles.textLocked]}>{formatBytes(model.downloadSizeBytes)}</Text>
          {model.contextLength != null && (
            <Text style={[styles.metaText, isLocked && styles.textLocked]}>
              {model.contextLength.toLocaleString()} ctx
            </Text>
          )}
          {model.supportsVision && (
            <Text style={[styles.metaText, isLocked && styles.textLocked]}>Vision</Text>
          )}
          {model.supportsVoice && (
            <Text style={[styles.metaText, isLocked && styles.textLocked]}>Voice</Text>
          )}
        </View>

        <Text style={[styles.tierText, isRecommended && styles.tierTextGood, isLocked && styles.tierTextLocked]}>
          {isLocked
            ? `Locked — needs ${TIER_LABEL[model.minTier ?? 'ai_lite']}`
            : isRecommended
              ? 'Recommended for your device'
              : TIER_LABEL[model.minTier ?? 'ai_lite']}
        </Text>

        {progress != null && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressPercentText}>{Math.round(progress * 100)}%</Text>
            <TouchableOpacity onPress={() => handleCancelDownload(model)} style={styles.cancelButton}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionsRow}>
          {!model.isInstalled && progress == null && isLocked && (
            <View style={styles.actionButton}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.actionButtonText, { color: colors.textTertiary }]}>Locked</Text>
            </View>
          )}
          {!model.isInstalled && progress == null && !isLocked && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleDownload(model)}>
              <Ionicons name="download-outline" size={16} color={colors.primary} />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>
          )}
          {model.isInstalled && !isSelected && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleSelect(model)}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.actionButtonText}>Use this model</Text>
            </TouchableOpacity>
          )}
          {model.isInstalled && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(model)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.actionButtonText, { color: colors.danger }]}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Model Manager</Text>
        <View style={{ width: 40 }} />
      </View>

      {deviceCapability?.totalMemoryBytes != null && (
        <Text style={styles.deviceInfo}>
          Your device: {formatBytes(deviceCapability.totalMemoryBytes)} RAM
        </Text>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {catalogLoading && catalog.length === 0 && <Text style={styles.emptyText}>Loading models…</Text>}
        {!catalogLoading && catalog.length === 0 && (
          <Text style={styles.emptyText}>No models available. Check your connection and try again.</Text>
        )}

        {downloadedModels.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Downloaded</Text>
            {downloadedModels.map(renderModel)}
          </>
        )}

        {compatibleModels.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Available for your device</Text>
            {compatibleModels.map(renderModel)}
          </>
        )}

        {lockedModels.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Requires a higher-tier device</Text>
            {lockedModels.map(renderModel)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    backButton: { padding: 8 },
    title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    deviceInfo: {
      fontSize: 13,
      color: colors.textSecondary,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: 40,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    cardSelected: {
      borderColor: colors.primary,
    },
    cardLocked: {
      opacity: 0.55,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    textLocked: { color: colors.textTertiary },
    activeBadge: {
      backgroundColor: colors.successTint.background,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    activeBadgeText: { fontSize: 12, fontWeight: '600', color: colors.successTint.text },
    metaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    metaText: { fontSize: 13, color: colors.textSecondary },
    tierText: { fontSize: 12, color: colors.textTertiary, marginTop: 6 },
    tierTextGood: { color: colors.successTint.text, fontWeight: '500' },
    tierTextLocked: { color: colors.textTertiary, fontStyle: 'italic' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    progressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: { height: 6, backgroundColor: colors.primary },
    cancelButton: { padding: 2 },
    progressPercentText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      minWidth: 36,
      textAlign: 'right',
    },
    actionsRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionButtonText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  });
}
