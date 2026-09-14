// Accounts Screen

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { fetchAccounts } from '../accountsSlice';
import { formatMoney } from '../../../shared/utils';
import { Account } from '../../../shared/types';

const ACCOUNT_ICONS: Record<string, string> = {
  cash: 'cash-outline',
  bank: 'business-outline',
  card: 'card-outline',
  wallet: 'wallet-outline',
};

export default function AccountsScreen() {
  const dispatch = useAppDispatch();
  const { items, totalBalance, loading } = useAppSelector((state) => state.accounts);

  useEffect(() => {
    dispatch(fetchAccounts(false));
  }, []);

  const handleRefresh = () => {
    dispatch(fetchAccounts(false));
  };

  const renderAccount = ({ item }: { item: Account }) => (
    <TouchableOpacity style={styles.accountCard}>
      <View style={[styles.iconContainer, { backgroundColor: item.color || '#4CAF50' }]}>
        <Ionicons
          name={ACCOUNT_ICONS[item.type] as any || 'wallet-outline'}
          size={24}
          color="#fff"
        />
      </View>
      <View style={styles.details}>
        <Text style={styles.accountName}>{item.name}</Text>
        <Text style={styles.accountType}>{item.type}</Text>
      </View>
      <Text style={styles.balance}>{formatMoney(item.balancePaise ?? 0)}</Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.totalCard}>
      <Text style={styles.totalLabel}>Total Balance</Text>
      <Text style={styles.totalAmount}>{formatMoney(totalBalance)}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No accounts</Text>
      <Text style={styles.emptySubtitle}>Add an account to start tracking</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Account List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderAccount}
        ListHeaderComponent={items.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  addButton: {
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
  totalCard: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  totalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  totalAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  accountCard: {
    backgroundColor: '#fff',
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
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  accountType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  balance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
