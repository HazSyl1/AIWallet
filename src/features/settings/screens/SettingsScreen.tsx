// Settings Screen

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { resetDatabase } from '../../../services/database';
import { fetchAccounts } from '../../accounts/accountsSlice';
import { fetchCategories } from '../../categories/categoriesSlice';
import { fetchTransactions } from '../../transactions/transactionsSlice';
import { fetchSettings } from '../settingsSlice';
import { signOut, runBackup, runRestore } from '../../auth/authSlice';
import AuthScreen from '../../auth/screens/AuthScreen';

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
  const settings = useAppSelector((state) => state.settings);
  const { user, syncStatus, lastSyncedAt } = useAppSelector((state) => state.auth);
  const [showAuth, setShowAuth] = useState(false);

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
                ? `Last synced ${new Date(lastSyncedAt).toLocaleDateString()}`
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
          onPress: () => console.log('Model Manager'),
        },
        {
          icon: 'key-outline',
          title: 'BYOK Setup',
          subtitle: settings.hasOpenAIKey || settings.hasAnthropicKey
            ? 'API key configured'
            : 'Connect OpenAI or Anthropic',
          onPress: () => console.log('BYOK Setup'),
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
          onPress: () => console.log('Theme'),
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
        <Ionicons name={item.icon as any} size={22} color="#666" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      {item.rightElement || (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
