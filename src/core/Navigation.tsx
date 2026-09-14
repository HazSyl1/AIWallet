// Navigation Configuration

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens (we'll create these next)
import DashboardScreen from '../features/dashboard/screens/DashboardScreen';
import TransactionListScreen from '../features/transactions/screens/TransactionListScreen';
import CaptureScreen from '../features/capture/screens/CaptureScreen';
import AccountsScreen from '../features/accounts/screens/AccountsScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';

// Stack params for each tab
export type DashboardStackParamList = {
  DashboardMain: undefined;
  TransactionDetail: { id: string };
};

export type TransactionsStackParamList = {
  TransactionList: undefined;
  TransactionDetail: { id: string };
};

export type CaptureStackParamList = {
  CaptureMain: undefined;
  TextCapture: undefined;
  VoiceCapture: undefined;
  ImageCapture: undefined;
  ReviewProposal: undefined;
};

export type AccountsStackParamList = {
  AccountsList: undefined;
  AccountDetail: { id: string };
  AccountForm: { id?: string };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ModelManager: undefined;
  BYOKSetup: undefined;
  Categories: undefined;
  ImportExport: undefined;
  About: undefined;
};

// Bottom tab params
export type RootTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Capture: undefined;
  Accounts: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Stack navigators for each tab
const DashboardStack = createStackNavigator<DashboardStackParamList>();
const TransactionsStack = createStackNavigator<TransactionsStackParamList>();
const CaptureStack = createStackNavigator<CaptureStackParamList>();
const AccountsStack = createStackNavigator<AccountsStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();

// Dashboard Stack
function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
    </DashboardStack.Navigator>
  );
}

// Transactions Stack
function TransactionsStackScreen() {
  return (
    <TransactionsStack.Navigator screenOptions={{ headerShown: false }}>
      <TransactionsStack.Screen name="TransactionList" component={TransactionListScreen} />
    </TransactionsStack.Navigator>
  );
}

// Capture Stack
function CaptureStackScreen() {
  return (
    <CaptureStack.Navigator screenOptions={{ headerShown: false }}>
      <CaptureStack.Screen name="CaptureMain" component={CaptureScreen} />
    </CaptureStack.Navigator>
  );
}

// Accounts Stack
function AccountsStackScreen() {
  return (
    <AccountsStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountsStack.Screen name="AccountsList" component={AccountsScreen} />
    </AccountsStack.Navigator>
  );
}

// Settings Stack
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

// Tab icon mapping
const TAB_ICONS: Record<keyof RootTabParamList, { focused: string; unfocused: string }> = {
  Dashboard: { focused: 'home', unfocused: 'home-outline' },
  Transactions: { focused: 'list', unfocused: 'list-outline' },
  Capture: { focused: 'add-circle', unfocused: 'add-circle-outline' },
  Accounts: { focused: 'wallet', unfocused: 'wallet-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

export default function Navigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = focused
              ? TAB_ICONS[route.name].focused
              : TAB_ICONS[route.name].unfocused;
            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardStackScreen} />
        <Tab.Screen name="Transactions" component={TransactionsStackScreen} />
        <Tab.Screen
          name="Capture"
          component={CaptureStackScreen}
          options={{
            tabBarLabel: 'Add',
          }}
        />
        <Tab.Screen name="Accounts" component={AccountsStackScreen} />
        <Tab.Screen name="Settings" component={SettingsStackScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
