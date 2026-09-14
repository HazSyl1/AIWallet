// Dashboard Screen - Main home screen with summary

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { fetchAccounts } from '../../accounts/accountsSlice';
import { fetchRecentTransactions } from '../../transactions/transactionsSlice';
import { formatMoney } from '../../../shared/utils';

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { totalBalance, loading: accountsLoading } = useAppSelector((state) => state.accounts);
  const { items: recentTransactions, loading: txLoading } = useAppSelector(
    (state) => state.transactions
  );

  const loading = accountsLoading || txLoading;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchAccounts(false)),
      dispatch(fetchRecentTransactions(5)),
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>AI Wallet</Text>
          <Text style={styles.subtitle}>Your local-first expense tracker</Text>
        </View>

        {/* Total Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>{formatMoney(totalBalance)}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickActions}>
            <QuickActionButton icon="T" label="Text" color="#2196F3" />
            <QuickActionButton icon="V" label="Voice" color="#4CAF50" />
            <QuickActionButton icon="I" label="Image" color="#FF9800" />
            <QuickActionButton icon="M" label="Manual" color="#9C27B0" />
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Add your first transaction using the + button
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => (
              <View key={tx.id} style={styles.transactionItem}>
                <View style={styles.txLeft}>
                  <Text style={styles.txMerchant}>{tx.merchant || 'Unknown'}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.occurredAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    tx.transactionType === 'expense'
                      ? styles.txExpense
                      : styles.txIncome,
                  ]}
                >
                  {tx.transactionType === 'expense' ? '-' : '+'}
                  {formatMoney(tx.amountPaise)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Quick action button component
function QuickActionButton({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.quickAction}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Text style={styles.quickActionIconText}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: '#4CAF50',
    margin: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flex: 1,
  },
  txMerchant: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  txDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  txExpense: {
    color: '#F44336',
  },
  txIncome: {
    color: '#4CAF50',
  },
});
