// Review Proposal Screen - user reviews/edits an AI-generated transaction before confirming

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
import { updateProposalField, startConfirming, setError, backToInput, resetCapture } from '../captureSlice';
import { createTransaction } from '../../transactions/transactionsSlice';
import { fetchAccounts } from '../../accounts/accountsSlice';
import { paiseToRupees, rupeesToPaise, formatMoney } from '../../../shared/utils';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

interface ReviewProposalScreenProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewProposalScreen({ onClose, onSuccess }: ReviewProposalScreenProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { proposal } = useAppSelector((state) => state.capture);
  const { items: accounts } = useAppSelector((state) => state.accounts);
  const { items: categories } = useAppSelector((state) => state.categories);
  const [amountText, setAmountText] = useState(
    proposal ? String(paiseToRupees(proposal.amountPaise)) : ''
  );
  const [saving, setSaving] = useState(false);

  if (!proposal) return null;

  const isUncertain = (field: string) => proposal.uncertainFields.includes(field);
  const filteredCategories = categories.filter((c) => c.type === proposal.transactionType);

  const handleAmountChange = (value: string) => {
    setAmountText(value);
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      dispatch(updateProposalField({ field: 'amountPaise', value: rupeesToPaise(parsed) }));
    }
  };

  const handleConfirm = async () => {
    if (!proposal.amountPaise || proposal.amountPaise <= 0) {
      Alert.alert('Missing amount', 'Please enter a valid amount before confirming.');
      return;
    }
    if (!proposal.paymentAccountId) {
      Alert.alert('Missing account', 'Please select an account before confirming.');
      return;
    }

    setSaving(true);
    dispatch(startConfirming());
    try {
      await dispatch(createTransaction(proposal)).unwrap();
      await dispatch(fetchAccounts(false));
      dispatch(resetCapture());
      onSuccess();
    } catch (err) {
      dispatch(
        setError({
          message: err instanceof Error ? err.message : 'Failed to save transaction',
          kind: 'generic',
        })
      );
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => dispatch(backToInput())} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Review</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {proposal.confidence < 0.7 && (
        <View style={styles.confidenceBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={styles.confidenceBannerText}>
            Some fields need your review — highlighted below
          </Text>
        </View>
      )}

      <ScrollView style={styles.form}>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={[styles.amountInput, isUncertain('amountPaise') && styles.uncertainText]}
            value={amountText}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Merchant / Description</Text>
          <TextInput
            style={[styles.input, isUncertain('merchant') && styles.uncertainInput]}
            value={proposal.merchant ?? ''}
            onChangeText={(v) => dispatch(updateProposalField({ field: 'merchant', value: v || null }))}
            placeholder="e.g., Swiggy, Amazon"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Account</Text>
          <View style={styles.optionGrid}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.optionChip,
                  proposal.paymentAccountId === account.id && styles.optionChipActive,
                  isUncertain('paymentAccountId') &&
                    proposal.paymentAccountId !== account.id &&
                    styles.uncertainChip,
                ]}
                onPress={() => dispatch(updateProposalField({ field: 'paymentAccountId', value: account.id }))}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    proposal.paymentAccountId === account.id && styles.optionChipTextActive,
                  ]}
                >
                  {account.name}
                </Text>
                <Text style={styles.accountBalance}>{formatMoney(account.balancePaise ?? 0)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.optionGrid}>
            {filteredCategories.slice(0, 8).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  proposal.categoryId === category.id && styles.categoryChipActive,
                  isUncertain('categoryId') &&
                    proposal.categoryId !== category.id &&
                    styles.uncertainChip,
                ]}
                onPress={() => dispatch(updateProposalField({ field: 'categoryId', value: category.id }))}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    proposal.categoryId === category.id && styles.categoryChipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={proposal.note ?? ''}
            onChangeText={(v) => dispatch(updateProposalField({ field: 'note', value: v || null }))}
            placeholder="Add a note..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm & Save</Text>
          )}
        </TouchableOpacity>
      </View>
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: { padding: 4 },
    closeButton: { padding: 4 },
    title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    confidenceBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    confidenceBannerText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    form: { flex: 1, padding: 20 },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
    },
    currencySymbol: { fontSize: 36, fontWeight: '300', color: colors.textPrimary, marginRight: 8 },
    amountInput: {
      fontSize: 48,
      fontWeight: '600',
      color: colors.textPrimary,
      minWidth: 150,
      textAlign: 'center',
    },
    uncertainText: { color: colors.warning },
    field: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    input: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.textPrimary,
    },
    uncertainInput: { borderWidth: 2, borderColor: colors.warning },
    noteInput: { minHeight: 80, textAlignVertical: 'top' },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: {
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionChipActive: { borderColor: colors.primary, backgroundColor: colors.successTint.background },
    uncertainChip: { borderColor: colors.warning },
    optionChipText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    optionChipTextActive: { color: colors.successTint.text },
    accountBalance: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    categoryChip: {
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryChipActive: { borderColor: colors.info, backgroundColor: colors.infoTint.background },
    categoryChipText: { fontSize: 13, color: colors.textPrimary },
    categoryChipTextActive: { color: colors.infoTint.text, fontWeight: '500' },
    footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: colors.border },
    confirmButton: {
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    confirmButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  });
}
