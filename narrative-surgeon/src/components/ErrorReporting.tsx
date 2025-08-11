import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useErrorHandler, AppError } from '../utils/errorHandling';

interface ErrorReportingProps {
  visible: boolean;
  onClose: () => void;
}

export const ErrorReportingDashboard: React.FC<ErrorReportingProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const { getStoredErrors, clearStoredErrors, getErrorStats } = useErrorHandler();
  const [errors, setErrors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedError, setSelectedError] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      loadErrors();
    }
  }, [visible]);

  const loadErrors = () => {
    const storedErrors = getStoredErrors();
    setErrors(storedErrors);
    setStats(getErrorStats());
  };

  const handleClearErrors = () => {
    Alert.alert(
      'Clear Error Log',
      'Are you sure you want to clear all stored errors? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearStoredErrors();
            loadErrors();
          },
        },
      ]
    );
  };

  const handleExportErrors = () => {
    const errorData = {
      exportDate: new Date().toISOString(),
      stats,
      errors: errors.slice(-50), // Export last 50 errors
    };

    const dataStr = JSON.stringify(errorData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `narrative-surgeon-errors-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Error Reporting Dashboard
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Statistics Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Error Statistics
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.totalErrors || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Total Errors
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#dc3545' }]}>
                  {stats.recentErrors || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Last 24h
                </Text>
              </View>
            </View>

            {/* Error Types */}
            {stats.errorsByType && Object.keys(stats.errorsByType).length > 0 && (
              <View style={styles.chartSection}>
                <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
                  Errors by Type
                </Text>
                {Object.entries(stats.errorsByType).map(([type, count]) => (
                  <View key={type} style={styles.chartRow}>
                    <Text style={[styles.chartLabel, { color: theme.colors.text }]}>
                      {type}
                    </Text>
                    <Text style={[styles.chartValue, { color: theme.colors.textSecondary }]}>
                      {count as number}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Actions Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Actions
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleExportErrors}
              >
                <Text style={styles.actionButtonText}>Export Errors</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
                onPress={handleClearErrors}
              >
                <Text style={styles.actionButtonText}>Clear Log</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Errors Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Errors ({errors.length})
            </Text>
            {errors.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No errors recorded
              </Text>
            ) : (
              errors.slice().reverse().slice(0, 20).map((errorEntry, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.errorItem, { borderColor: theme.colors.border }]}
                  onPress={() => setSelectedError(errorEntry)}
                >
                  <View style={styles.errorHeader}>
                    <Text style={[styles.errorType, { color: theme.colors.text }]}>
                      {errorEntry.error.type || 'Unknown'}
                    </Text>
                    <Text style={[styles.errorTime, { color: theme.colors.textTertiary }]}>
                      {formatTimestamp(errorEntry.timestamp)}
                    </Text>
                  </View>
                  <Text 
                    style={[styles.errorMessage, { color: theme.colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {errorEntry.error.message}
                  </Text>
                  {errorEntry.context?.component && (
                    <Text style={[styles.errorContext, { color: theme.colors.textTertiary }]}>
                      Component: {errorEntry.context.component}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {/* Error Detail Modal */}
        {selectedError && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedError(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Error Details
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedError(null)}>
                    <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Type:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {selectedError.error.type}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Message:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {selectedError.error.message}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Timestamp:
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                      {formatTimestamp(selectedError.timestamp)}
                    </Text>
                  </View>
                  {selectedError.context && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                        Context:
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                        {JSON.stringify(selectedError.context, null, 2)}
                      </Text>
                    </View>
                  )}
                  {selectedError.error.stack && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                        Stack Trace:
                      </Text>
                      <Text style={[styles.stackTrace, { color: theme.colors.text }]}>
                        {selectedError.error.stack}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

// Hook for accessing error reporting
export const useErrorReporting = () => {
  const [dashboardVisible, setDashboardVisible] = useState(false);

  const showDashboard = () => setDashboardVisible(true);
  const hideDashboard = () => setDashboardVisible(false);

  return {
    dashboardVisible,
    showDashboard,
    hideDashboard,
    ErrorDashboard: () => (
      <ErrorReportingDashboard
        visible={dashboardVisible}
        onClose={hideDashboard}
      />
    ),
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  chartSection: {
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  chartLabel: {
    fontSize: 14,
  },
  chartValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  errorItem: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  errorType: {
    fontWeight: '600',
    fontSize: 14,
  },
  errorTime: {
    fontSize: 12,
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  errorContext: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
  },
  stackTrace: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
  },
});

export default ErrorReportingDashboard;