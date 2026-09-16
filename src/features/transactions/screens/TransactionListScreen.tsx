// Transaction List Screen

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { fetchTransactions } from '../transactionsSlice';
import { formatMoney, formatTransactionDate } from '../../../shared/utils';
import { Transaction } from '../../../shared/types';
import { useTheme } from '../../../shared/theme/ThemeContext';
import type { ThemeColors } from '../../../shared/theme/palette';

export default function TransactionListScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { items, loading, filters } = useAppSelector((state) => state.transactions);

  useEffect(() => {
    dispatch(fetchTransactions(filters));
  }, [filters]);

  const handleRefresh = () => {
    dispatch(fetchTransactions(filters));
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity style={styles.transactionCard}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={item.transactionType === 'expense' ? 'arrow-up' : 'arrow-down'}
          size={20}
          color={item.transactionType === 'expense' ? colors.danger : colors.primary}
        />
      </View>
      <View style={styles.details}>
        <Text style={styles.merchant}>{item.merchant || 'Unknown'}</Text>
        <Text style={styles.meta}>
          {formatTransactionDate(item.occurredAt)} • {item.source}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          item.transactionType === 'expense' ? styles.expense : styles.income,
        ]}
      >
        {item.transactionType === 'expense' ? '-' : '+'}
        {formatMoney(item.amountPaise)}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.iconMuted} />
      <Text style={styles.emptyTitle}>No transactions</Text>
      <Text style={styles.emptySubtitle}>
        Your transactions will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      />
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
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    filterButton: {
      padding: 8,
    },
    list: {
      padding: 16,
    },
    emptyList: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    transactionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    details: {
      flex: 1,
    },
    merchant: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    meta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    amount: {
      fontSize: 16,
      fontWeight: '600',
    },
    expense: {
      color: colors.danger,
    },
    income: {
      color: colors.primary,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
  });
}
