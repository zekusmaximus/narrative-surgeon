import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';

import { useManuscriptStore } from './src/store/manuscriptStore';
import ManuscriptsScreen from './src/screens/ManuscriptsScreen';
import ScenesScreen from './src/screens/ScenesScreen';
import EditorScreen from './src/screens/EditorScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import RevisionWorkspace from './src/screens/RevisionWorkspace';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const { initialize, isLoading, error } = useManuscriptStore();

  useEffect(() => {
    initialize().catch((err) => {
      console.error('Failed to initialize app:', err);
      Alert.alert('Initialization Error', 'Failed to initialize the application. Please restart the app.');
    });
  }, [initialize]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: '#2563eb',
            tabBarInactiveTintColor: '#6b7280',
          }}
        >
          <Tab.Screen
            name="Manuscripts"
            component={ManuscriptsScreen}
            options={{
              title: 'My Manuscripts',
              tabBarLabel: 'Manuscripts',
            }}
          />
          <Tab.Screen
            name="Scenes"
            component={ScenesScreen}
            options={{
              title: 'Scene Management',
              tabBarLabel: 'Scenes',
            }}
          />
          <Tab.Screen
            name="Editor"
            component={EditorScreen}
            options={{
              title: 'Editor',
              tabBarLabel: 'Editor',
            }}
          />
          <Tab.Screen
            name="Analysis"
            component={AnalysisScreen}
            options={{
              title: 'AI Analysis',
              tabBarLabel: 'Analysis',
            }}
          />
          <Tab.Screen
            name="Revision"
            component={RevisionWorkspace}
            options={{
              title: 'Revision Workspace',
              tabBarLabel: 'Revision',
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              tabBarLabel: 'Settings',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
