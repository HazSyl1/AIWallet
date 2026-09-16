// Manual Entry Screen - Simple form for adding transactions

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { createTransaction } from '../../transactions/transactionsSlice';
import { fetchAccounts } from '../../accounts/accountsSlice';
import { createDefaultProposal, TransactionType } from '../../../shared/types';
import { rupeesToPaise, formatMoney } from '../../../shared/utils';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

interface ManualEntryScreenProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualEntryScreen({ onClose, onSuccess }: ManualEntryScreenProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { items: accounts } = useAppSelector((state) => state.accounts);
  const { items: categories } = useAppSelector((state) => state.categories);

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    accounts.length > 0 ? accounts[0].id : null
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === transactionType);

  const handleSave = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    setSaving(true);

    try {
      const proposal = {
        ...createDefaultProposal(),
        transactionType,
        amountPaise: rupeesToPaise(parseFloat(amount)),
        merchant: merchant || null,
        categoryId: selectedCategoryId,
        paymentAccountId: selectedAccountId,
        note: note || null,
        occurredAt: new Date().toISOString(),
        source: 'manual' as const,
      };

      await dispatch(createTransaction(proposal)).unwrap();
      await dispatch(fetchAccounts(false)); // Refresh balances

      Alert.alert('Success', 'Transaction added!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form}>
        {/* Transaction Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'expense' && styles.typeButtonActive,
              transactionType === 'expense' && styles.expenseActive,
            ]}
            onPress={() => setTransactionType('expense')}
          >
            <Text
              style={[
                styles.typeButtonText,
                transactionType === 'expense' && styles.typeButtonTextActive,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'income' && styles.typeButtonActive,
              transactionType === 'income' && styles.incomeActive,
            ]}
            onPress={() => setTransactionType('income')}
          >
            <Text
              style={[
                styles.typeButtonText,
                transactionType === 'income' && styles.typeButtonTextActive,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Merchant */}
        <View style={styles.field}>
          <Text style={styles.label}>Merchant / Description</Text>
          <TextInput
            style={styles.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g., Swiggy, Amazon, Salary"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Account Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Account</Text>
          <View style={styles.optionGrid}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.optionChip,
                  selectedAccountId === account.id && styles.optionChipActive,
                ]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    selectedAccountId === account.id && styles.optionChipTextActive,
                  ]}
                >
                  {account.name}
                </Text>
                <Text style={styles.accountBalance}>
                  {formatMoney(account.balancePaise ?? 0)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.optionGrid}>
            {filteredCategories.slice(0, 8).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategoryId === category.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategoryId(category.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategoryId === category.id && styles.categoryChipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            transactionType === 'expense' ? styles.expenseButton : styles.incomeButton,
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save {transactionType === 'expense' ? 'Expense' : 'Income'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      padding: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    form: {
      flex: 1,
      padding: 20,
    },
    typeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 10,
    },
    typeButtonActive: {
      backgroundColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    expenseActive: {
      backgroundColor: colors.dangerTint.background,
    },
    incomeActive: {
      backgroundColor: colors.successTint.background,
    },
    typeButtonText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    typeButtonTextActive: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    currencySymbol: {
      fontSize: 36,
      fontWeight: '300',
      color: colors.textPrimary,
      marginRight: 8,
    },
    amountInput: {
      fontSize: 48,
      fontWeight: '600',
      color: colors.textPrimary,
      minWidth: 150,
      textAlign: 'center',
    },
    field: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
    },
    noteInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionChip: {
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.successTint.background,
    },
    optionChipText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    optionChipTextActive: {
      color: colors.successTint.text,
    },
    accountBalance: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    categoryChip: {
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryChipActive: {
      borderColor: colors.info,
      backgroundColor: colors.infoTint.background,
    },
    categoryChipText: {
      fontSize: 13,
      color: colors.textPrimary,
    },
    categoryChipTextActive: {
      color: colors.infoTint.text,
      fontWeight: '500',
    },
    footer: {
      padding: 20,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    saveButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    expenseButton: {
      backgroundColor: colors.danger,
    },
    incomeButton: {
      backgroundColor: colors.primary,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
  });
}
