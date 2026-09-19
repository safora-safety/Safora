import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { apiClient } from './apiClient';

class NotificationService {
  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const hasPermission = await this.requestUserPermission();
      if (hasPermission) {
        await this.registerTokenWithBackend();
        this.setupListeners();
        this.isInitialized = true;
      }
    } catch (err) {
      console.warn('[NotificationService] Initialization error:', err);
    }
  }

  public async requestUserPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log(
            '[NotificationService] Android 13+ notification permission denied',
          );
          return false;
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      return enabled;
    } catch (err) {
      console.warn('[NotificationService] Failed to request permissions:', err);
      return false;
    }
  }

  public async registerTokenWithBackend(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      if (token) {
        console.log(
          '[NotificationService] FCM Token obtained:',
          token.substring(0, 15) + '...',
        );
        await apiClient.post('/users/fcm-token', { token });
        console.log(
          '[NotificationService] Push notification token registered with backend',
        );
        return token;
      }
      return null;
    } catch (err) {
      console.warn(
        '[NotificationService] Failed to register token with backend:',
        err,
      );
      return null;
    }
  }

  private setupListeners(): void {
    // Handle foreground notifications
    messaging().onMessage(async remoteMessage => {
      console.log(
        '[NotificationService] Foreground notification received:',
        remoteMessage,
      );
      const title =
        remoteMessage.notification?.title ||
        remoteMessage.data?.title ||
        '🚨 Safora Alert';
      const body =
        remoteMessage.notification?.body ||
        remoteMessage.data?.body ||
        'Emergency alert received.';

      Alert.alert(String(title), String(body), [{ text: 'OK' }]);
    });

    // Handle token refresh
    messaging().onTokenRefresh(async newToken => {
      console.log('[NotificationService] FCM token refreshed');
      try {
        await apiClient.post('/users/fcm-token', { token: newToken });
      } catch (err) {
        console.warn(
          '[NotificationService] Failed to update refreshed token:',
          err,
        );
      }
    });

    // Handle background notification clicks when app is opened
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        '[NotificationService] Notification opened app from background:',
        remoteMessage,
      );
    });

    // Check if app was opened from a quit state via a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            '[NotificationService] App opened from quit state by notification:',
            remoteMessage,
          );
        }
      });
  }
}

export const notificationService = new NotificationService();
