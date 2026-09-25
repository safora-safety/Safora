import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AccountSelectScreen } from '../screens/AccountSelectScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
import { GuardianLiveScreen } from '../screens/GuardianLiveScreen';
import { TermsScreen } from '../screens/TermsScreen';
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
  GuardianLive:
    | {
        journeyId?: string | number;
        walkerName?: string;
        initialLocation?: { latitude: number; longitude: number };
      }
    | undefined;
  Terms: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isGuest,
    isHydrated,
    hasSeenOnboarding,
    hydrateAuth,
  } = useAuthStore();

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  const hasAcceptedTerms = Boolean(
    user?.terms_accepted_at || (user as any)?.termsAcceptedAt,
  );
  const hasAckAge = Boolean(
    user?.age_notice_ack || (user as any)?.ageNoticeAck,
  );

  // Show the Terms screen until the user actually submits it.
  // Once submitted, the DB updates termsAcceptedAt/ageNoticeAck,
  // which makes needsTerms permanently false — no extra flag needed.
  const needsTerms =
    isAuthenticated && !isGuest && user && (!hasAcceptedTerms || !hasAckAge);

  // When authentication state changes dynamically (e.g. Guest mode tapped), switch immediately
  useEffect(() => {
    if (!isHydrated) return;
    if (navigationRef.isReady()) {
      if (isAuthenticated) {
        if (needsTerms) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Terms' }],
          });
        } else {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
      }
    }
  }, [isAuthenticated, isHydrated, needsTerms]);

  // Show dark splash loader while rehydrating stored login session
  if (!isHydrated) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Dynamically calculate initial route so it always exists in the navigator
  const initialRoute = isAuthenticated
    ? needsTerms
      ? 'Terms'
      : 'MainTabs'
    : !hasSeenOnboarding
      ? 'Onboarding'
      : 'AccountSelect';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        id="root"
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="AccountSelect" component={AccountSelectScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
        <Stack.Screen
          name="GuardianLive"
          component={GuardianLiveScreen}
          options={{ animation: 'slide_from_right' }}
        />
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
