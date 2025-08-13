import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  SafeAreaView,
} from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { useApiKey } from '../hooks/useApiKey';
import ApiValidationService from '../services/apiValidation';

interface AppSettingsScreenProps {
  navigation: any; // Replace with proper navigation type if available
}

export function AppSettingsScreen({ navigation }: AppSettingsScreenProps) {
  const {
    hasApiKey,
    isLoading: apiKeyLoading,
    isValidating,
    validationResult,
    saveApiKey: saveApiKeyHook,
    removeApiKey: removeApiKeyHook,
  } = useApiKey();

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [preferredModel, setPreferredModel] = useState('gpt-4o-mini');
  const [maxTokens, setMaxTokens] = useState('2000');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);


  const loadSettings = async () => {
    try {
      const storage = new MMKV({
        id: 'narrative-surgeon-settings'
      });
      
      const savedAutoAnalysis = storage.getBoolean('auto_analysis');
      if (savedAutoAnalysis !== undefined) setAutoAnalysis(savedAutoAnalysis);
      
      const savedModel = storage.getString('preferred_model');
      if (savedModel) setPreferredModel(savedModel);
      
      const savedTokens = storage.getString('max_tokens');
      if (savedTokens) setMaxTokens(savedTokens);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const storage = new MMKV({
        id: 'narrative-surgeon-settings'
      });
      
      storage.set('auto_analysis', autoAnalysis);
      storage.set('preferred_model', preferredModel);
      storage.set('max_tokens', maxTokens);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    const success = await saveApiKeyHook(apiKey.trim());
    
    if (success) {
      // Clear the input for security unless user wants to see it
      if (!showApiKey) {
        setApiKey('');
      }
      
      Alert.alert(
        'Success', 
        'API key validated and saved securely! You can now use AI-powered analysis features.'
      );
    } else {
      const errorMessage = validationResult?.error || 'Failed to validate API key';
      Alert.alert(
        'Validation Failed', 
        `${errorMessage}\n\nYou can find your API key at:\nhttps://platform.openai.com/api-keys`
      );
    }
  };

  const removeApiKey = () => {
    Alert.alert(
      'Remove API Key',
      'Are you sure you want to remove the saved API key? This will disable all AI analysis features until you add a new key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await removeApiKeyHook();
            if (success) {
              setApiKey('');
              Alert.alert('Success', 'API key removed successfully');
            } else {
              Alert.alert('Error', 'Failed to remove API key');
            }
          }
        }
      ]
    );
  };

  const handleSettingChange = (setting: string, value: any) => {
    switch (setting) {
      case 'autoAnalysis':
        setAutoAnalysis(value);
        break;
      case 'preferredModel':
        setPreferredModel(value);
        break;
      case 'maxTokens':
        setMaxTokens(value);
        break;
    }
    
    // Auto-save settings with debounce
    setTimeout(saveSettings, 100);
  };

  const getModelDescription = (model: string) => {
    const descriptions = {
      'gpt-4o-mini': 'Fast, cost-effective, good for most analysis tasks',
      'gpt-4o': 'Balanced performance and capabilities',
      'gpt-4': 'Most capable, slower and more expensive'
    };
    return descriptions[model as keyof typeof descriptions] || '';
  };

  if (isLoading || apiKeyLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>App Settings</Text>
          <Text style={styles.subtitle}>Configure Narrative Surgeon</Text>
        </View>

        {/* API Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 OpenAI API Configuration</Text>
          <Text style={styles.sectionDescription}>
            Connect your OpenAI account to enable AI-powered manuscript analysis, including scene analysis, character voice detection, pacing insights, and revision suggestions.
          </Text>
          
          <View style={styles.apiKeyContainer}>
            <TextInput
              style={[styles.apiKeyInput, isValidating && styles.disabledInput]}
              placeholder={hasApiKey && !showApiKey ? "API key is configured ✓" : "sk-proj-..."}
              value={showApiKey || !hasApiKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
              onChangeText={setApiKey}
              secureTextEntry={!showApiKey && hasApiKey}
              editable={!isValidating}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            
            <TouchableOpacity 
              style={styles.toggleVisibility}
              onPress={() => setShowApiKey(!showApiKey)}
              disabled={isValidating}
            >
              <Text style={styles.toggleText}>{showApiKey ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton, isValidating && styles.disabledButton]}
              onPress={saveApiKey}
              disabled={isValidating}
            >
              {isValidating ? (
                <View style={styles.validatingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.buttonText}>Validating...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  {hasApiKey ? '🔄 Update Key' : '💾 Save Key'}
                </Text>
              )}
            </TouchableOpacity>

            {hasApiKey && (
              <TouchableOpacity 
                style={[styles.button, styles.removeButton, isValidating && styles.disabledButton]}
                onPress={removeApiKey}
                disabled={isValidating}
              >
                <Text style={styles.removeButtonText}>🗑️ Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              🔗 Get your API key from:{'\n'}
              <Text style={styles.linkText}>platform.openai.com/api-keys</Text>
            </Text>
            <Text style={styles.securityNote}>
              🔒 Your API key is encrypted and stored securely on your device only.
            </Text>
          </View>
        </View>

        {/* AI Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Analysis Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Analysis</Text>
              <Text style={styles.settingDescription}>
                Automatically analyze scenes when importing manuscripts
              </Text>
            </View>
            <Switch
              value={autoAnalysis}
              onValueChange={(value) => handleSettingChange('autoAnalysis', value)}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={autoAnalysis ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI Model</Text>
              <Text style={styles.settingDescription}>
                {getModelDescription(preferredModel)}
              </Text>
            </View>
            <View style={styles.modelSelector}>
              {[
                { key: 'gpt-4o-mini', label: '4o-mini', color: '#4CAF50' },
                { key: 'gpt-4o', label: '4o', color: '#FF9800' },
                { key: 'gpt-4', label: 'GPT-4', color: '#F44336' }
              ].map(model => (
                <TouchableOpacity
                  key={model.key}
                  style={[
                    styles.modelOption,
                    preferredModel === model.key && { ...styles.selectedModel, backgroundColor: model.color }
                  ]}
                  onPress={() => handleSettingChange('preferredModel', model.key)}
                >
                  <Text style={[
                    styles.modelText,
                    preferredModel === model.key && styles.selectedModelText
                  ]}>
                    {model.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Response Length</Text>
              <Text style={styles.settingDescription}>
                Maximum tokens per AI response (1000-4000)
              </Text>
            </View>
            <TextInput
              style={styles.tokenInput}
              value={maxTokens}
              onChangeText={(value) => {
                // Only allow numbers and reasonable ranges
                if (/^\d*$/.test(value)) {
                  const num = parseInt(value) || 0;
                  if (num <= 4000) {
                    handleSettingChange('maxTokens', value);
                  }
                }
              }}
              keyboardType="numeric"
              placeholder="2000"
            />
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Security & Privacy</Text>
          <View style={styles.securityInfo}>
            <Text style={styles.securityItem}>✅ All data stored locally on your device</Text>
            <Text style={styles.securityItem}>✅ API keys encrypted with unique device keys</Text>
            <Text style={styles.securityItem}>✅ No data sent to third parties (except OpenAI for analysis)</Text>
            <Text style={styles.securityItem}>✅ You control when and what gets analyzed</Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build:</Text>
            <Text style={styles.infoValue}>Phase 4 - Agent Submission Ready</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage:</Text>
            <Text style={styles.infoValue}>Encrypted MMKV + SecureStore</Text>
          </View>
          <Text style={styles.aboutText}>
            Narrative Surgeon is a privacy-first manuscript analysis tool that helps authors 
            improve their work using AI insights while keeping all data under your control.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  apiKeyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    fontFamily: 'monospace',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  toggleVisibility: {
    marginLeft: 12,
    padding: 16,
  },
  toggleText: {
    fontSize: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  securityNote: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  modelSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modelOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedModel: {
    borderColor: '#007AFF',
  },
  modelText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedModelText: {
    color: '#fff',
    fontWeight: '600',
  },
  tokenInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    minWidth: 80,
    textAlign: 'center',
  },
  securityInfo: {
    gap: 8,
  },
  securityItem: {
    fontSize: 14,
    color: '#4CAF50',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginTop: 12,
  },
});

export default AppSettingsScreen;