/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Background handler for emergency push alerts
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message handled in the background:', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
