import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null; componentStack: string | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('[ErrorBoundary] message:', error?.message);
    console.log('[ErrorBoundary] stack:', error?.stack);
    console.log('[ErrorBoundary] componentStack:', info?.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Crashed</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
          {this.state.componentStack && (
            <Text style={styles.stack}>{this.state.componentStack}</Text>
          )}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F44336', marginBottom: 12 },
  message: { fontSize: 15, color: '#333', marginBottom: 16 },
  stack: { fontSize: 12, color: '#666', marginBottom: 16 },
});
