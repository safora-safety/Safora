import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AccountSelectScreen } from '../screens/AccountSelectScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { colors } from '../theme/colors';

export type RootStackParamList = {
  AccountSelect: undefined;
  Auth:
    | {
        initialTab?: 'login' | 'register';
        prefillEmail?: string;
        prefillName?: string;
      }
    | undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Settings: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isHydrated, hasSeenOnboarding, hydrateAuth } =
    useAuthStore();

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  // Show dark splash loader while rehydrating stored login session
  if (!isHydrated) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        id="root"
        initialRouteName={!hasSeenOnboarding ? 'Onboarding' : 'AccountSelect'}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!isAuthenticated ? (
          <>
            {!hasSeenOnboarding ? (
              <>
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen
                  name="AccountSelect"
                  component={AccountSelectScreen}
                />
                <Stack.Screen name="Auth" component={AuthScreen} />
              </>
            ) : (
              <>
                <Stack.Screen
                  name="AccountSelect"
                  component={AccountSelectScreen}
                />
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              </>
            )}
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#070A11',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
