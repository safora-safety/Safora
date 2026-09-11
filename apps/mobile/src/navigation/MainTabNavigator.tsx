import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { SafeWalkScreen } from '../screens/SafeWalkScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

type TabKey = 'Home' | 'Map' | 'SafeWalk' | 'Profile';

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { key: 'Home', label: 'Home', icon: '🏠' },
  { key: 'Map', label: 'Map Radar', icon: '🗺️' },
  { key: 'SafeWalk', label: 'Safe Walk', icon: '🚶‍♀️' },
  { key: 'Profile', label: 'Profile', icon: '👤' },
];

export const MainTabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const [safeWalkDestination, setSafeWalkDestination] = useState<
    | {
        latitude: number;
        longitude: number;
        name: string;
      }
    | undefined
  >(undefined);
  const [tabHistory, setTabHistory] = useState<TabKey[]>(['Home']);
  const lastBackPressRef = useRef<number>(0);

  const handleNavigateTab = (tab: TabKey, params?: any) => {
    if (params?.destination) {
      setSafeWalkDestination(params.destination);
    }
    if (tab === activeTab) return;

    if (tab === 'Home') {
      setTabHistory(['Home']);
    } else {
      setTabHistory(prev => [...prev.filter(t => t !== tab), tab]);
    }
    setActiveTab(tab);
  };

  // Hardware Android Back Button Handler
  useEffect(() => {
    const onBackPress = () => {
      // 1. If we have a tab history stack, pop one step back
      if (tabHistory.length > 1) {
        const nextHistory = tabHistory.slice(0, tabHistory.length - 1);
        const previousTab = nextHistory[nextHistory.length - 1];
        setTabHistory(nextHistory);
        setActiveTab(previousTab);
        return true;
      }

      // 2. If activeTab is not Home, navigate back to Home
      if (activeTab !== 'Home') {
        setActiveTab('Home');
        setTabHistory(['Home']);
        return true;
      }

      // 3. User is on Home tab with no prior stack: require double-tap back within 2s to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return false; // Let OS exit app
      }

      lastBackPressRef.current = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          'Press back again to exit Safora',
          ToastAndroid.SHORT,
        );
      }
      return true; // Consume event, prevent accidental exit
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => backSubscription.remove();
  }, [tabHistory, activeTab]);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen onNavigateTab={tab => handleNavigateTab(tab)} />;
      case 'Map':
        return <MapScreen onNavigateTab={handleNavigateTab} />;
      case 'SafeWalk':
        return <SafeWalkScreen initialDestination={safeWalkDestination} />;
      case 'Profile':
        return <ProfileScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Screen Container */}
      <View style={styles.screenArea}>{renderActiveScreen()}</View>

      {/* Sleek Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.7}
              onPress={() => handleNavigateTab(tab.key)}
            >
              {isActive && <View style={styles.activeGlowLine} />}
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenArea: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20,
    paddingTop: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    position: 'relative',
    minWidth: 70,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  activeGlowLine: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.accent,
    fontWeight: '800',
  },
});
