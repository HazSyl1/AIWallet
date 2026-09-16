// Settings Screen

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { SettingsStackParamList } from '../../../core/Navigation';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { resetDatabase } from '../../../services/database';
import { fetchAccounts } from '../../accounts/accountsSlice';
import { fetchCategories } from '../../categories/categoriesSlice';
import { fetchTransactions } from '../../transactions/transactionsSlice';
import { fetchSettings, updateSettings } from '../settingsSlice';
import { signOut, runBackup, runRestore } from '../../auth/authSlice';
import AuthScreen from '../../auth/screens/AuthScreen';
import { formatDate } from '../../../shared/utils/date';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

interface SettingItem {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const settings = useAppSelector((state) => state.settings);
  const { user, syncStatus, lastSyncedAt } = useAppSelector((state) => state.auth);
  const [showAuth, setShowAuth] = useState(false);

  const handleThemeChange = () => {
    Alert.alert('Theme', 'Choose your preferred appearance', [
      { text: 'Light', onPress: () => dispatch(updateSettings({ theme: 'light' }) as any) },
      { text: 'Dark', onPress: () => dispatch(updateSettings({ theme: 'dark' }) as any) },
      { text: 'System', onPress: () => dispatch(updateSettings({ theme: 'system' }) as any) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all transactions, accounts, and categories, then reload sample data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              // Reload all data
              await Promise.all([
                dispatch(fetchSettings() as any),
                dispatch(fetchAccounts(false) as any),
                dispatch(fetchCategories() as any),
                dispatch(fetchTransactions() as any),
              ]);
              Alert.alert('Success', 'Data has been reset with sample transactions.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset database');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'You will still have your local data. Sign back in to re-enable sync.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(signOut() as any) },
    ]);
  };

  const handleBackup = () => {
    if (!user) { setShowAuth(true); return; }
    Alert.alert('Back Up Now', 'This will upload all your data to the cloud.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Back Up', onPress: () => dispatch(runBackup(user.id) as any) },
    ]);
  };

  const handleRestore = () => {
    if (!user) { setShowAuth(true); return; }
    Alert.alert('Restore from Cloud', 'This will replace your local data with your cloud backup.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', style: 'destructive', onPress: () => dispatch(runRestore(user.id) as any) },
    ]);
  };

  const sections: SettingSection[] = [
    {
      title: 'Account & Sync',
      items: user
        ? [
            {
              icon: 'person-circle-outline',
              title: user.email ?? 'Signed in',
              subtitle: lastSyncedAt
                ? `Last synced ${formatDate(lastSyncedAt)}`
                : syncStatus === 'syncing' ? 'Syncing…' : 'Never synced',
            },
            {
              icon: 'cloud-upload-outline',
              title: 'Back Up Now',
              subtitle: 'Upload your data to the cloud',
              onPress: handleBackup,
            },
            {
              icon: 'cloud-download-outline',
              title: 'Restore from Cloud',
              subtitle: 'Replace local data with cloud backup',
              onPress: handleRestore,
            },
            {
              icon: 'log-out-outline',
              title: 'Sign Out',
              onPress: handleSignOut,
            },
          ]
        : [
            {
              icon: 'cloud-outline',
              title: 'Sign In / Sign Up',
              subtitle: 'Enable backup and sync',
              onPress: () => setShowAuth(true),
            },
          ],
    },
    {
      title: 'AI & Models',
      items: [
        {
          icon: 'hardware-chip-outline',
          title: 'Model Manager',
          subtitle: settings.deviceTier === 'core' ? 'No model installed' : 'Manage AI models',
          onPress: () => navigation.navigate('ModelManager'),
        },
        {
          icon: 'key-outline',
          title: 'BYOK Setup',
          subtitle: settings.hasOpenAIKey || settings.hasAnthropicKey
            ? 'API key configured'
            : 'Connect OpenAI or Anthropic',
          onPress: () => navigation.navigate('BYOKSetup'),
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          icon: 'folder-outline',
          title: 'Categories',
          subtitle: 'Manage expense and income categories',
          onPress: () => console.log('Categories'),
        },
        {
          icon: 'swap-horizontal-outline',
          title: 'Import / Export',
          subtitle: 'XLSX import and export',
          onPress: () => console.log('Import/Export'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'moon-outline',
          title: 'Theme',
          subtitle: settings.theme ?? 'system',
          onPress: handleThemeChange,
        },
        {
          icon: 'wallet-outline',
          title: 'Default Account',
          subtitle: settings.defaultAccountId ? 'Set' : 'Not set',
          onPress: () => console.log('Default Account'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-circle-outline',
          title: 'About AI Wallet',
          subtitle: 'Version 1.0.0',
          onPress: () => console.log('About'),
        },
        {
          icon: 'shield-checkmark-outline',
          title: 'Privacy',
          subtitle: 'Your data stays on your device',
          onPress: () => console.log('Privacy'),
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          icon: 'trash-outline',
          title: 'Reset All Data',
          subtitle: 'Delete all transactions and reload sample data',
          onPress: handleReset,
        },
      ],
    },
  ];

  const renderItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.title}
      style={styles.settingItem}
      onPress={item.onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      {item.rightElement || (
        <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderItem)}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            AI Wallet - Local-First Expense Tracker
          </Text>
          <Text style={styles.footerSubtext}>
            All data stored locally on your device
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showAuth} animationType="slide" presentationStyle="pageSheet">
        <AuthScreen onClose={() => setShowAuth(false)} />
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
    scrollView: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginLeft: 20,
      marginBottom: 8,
    },
    sectionContent: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingIcon: {
      width: 32,
      alignItems: 'center',
    },
    settingContent: {
      flex: 1,
      marginLeft: 12,
    },
    settingTitle: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    settingSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    footer: {
      alignItems: 'center',
      padding: 32,
    },
    footerText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    footerSubtext: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 4,
    },
  });
}
