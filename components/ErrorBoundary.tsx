// components/ErrorBoundary.tsx
// Catches React crashes and sends to PostHog

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ErrorEvents } from '../services/analytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    // Send to PostHog
    ErrorEvents.captureCrash(error, 'ErrorBoundary');
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Get error details
      const errorMessage = this.state.error?.message || 'Unknown error';
      const errorStack = this.state.error?.stack || '';
      const componentStack = this.state.errorInfo?.componentStack || '';
      
      // Extract useful info from stack
      const stackLines = errorStack.split('\n').slice(0, 5).join('\n');
      const componentLines = componentStack.split('\n').slice(0, 5).join('\n');
      
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          
          {/* ALWAYS show error details for debugging */}
          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorLabel}>Stack Trace:</Text>
            <Text style={styles.errorText}>
              {stackLines || 'No stack available'}
            </Text>
            
            {componentLines ? (
              <>
                <Text style={[styles.errorLabel, { marginTop: 12 }]}>Component:</Text>
                <Text style={styles.errorText}>{componentLines}</Text>
              </>
            ) : null}
          </ScrollView>
          
          <TouchableOpacity style={styles.button} onPress={this.handleReload}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          
          <Text style={styles.note}>
            Screenshot this error and share it for debugging.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#374151',
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
