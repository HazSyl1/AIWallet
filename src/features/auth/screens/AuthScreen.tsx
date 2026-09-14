import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../../core/hooks';
import { signIn, signUp, clearError } from '../authSlice';

interface AuthScreenProps {
  onClose: () => void;
}

export default function AuthScreen({ onClose }: AuthScreenProps) {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const thunk = mode === 'signin' ? signIn : signUp;
    const result = await dispatch(thunk({ email: email.trim(), password }));

    if (result.meta.requestStatus === 'fulfilled') {
      Alert.alert(
        mode === 'signin' ? 'Signed in' : 'Account created',
        mode === 'signup'
          ? 'Check your email to confirm your account, then sign in.'
          : 'Sync is now enabled.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  };

  const toggleMode = () => {
    dispatch(clearError());
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Sign in to enable backup & sync'
              : 'Create an account to back up your data'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#999"
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMode} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip — use without sync</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 6 },
  form: {},
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  error: { color: '#F44336', fontSize: 13, marginBottom: 12 },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggleButton: { alignItems: 'center', marginTop: 20 },
  toggleText: { color: '#4CAF50', fontSize: 14 },
  skipButton: { alignItems: 'center', marginTop: 12 },
  skipText: { color: '#999', fontSize: 13 },
});
