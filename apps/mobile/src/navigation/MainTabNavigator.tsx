import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  ToastAndroid,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { SafeWalkScreen } from '../screens/SafeWalkScreen';
import { ToolsScreen } from '../screens/ToolsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAuthStore } from '../store/authStore';

export type TabKey = 'Home' | 'Radar' | 'SafeWalk' | 'Tools' | 'Profile';

interface TabItem {
  key: TabKey;
  label: string;
  iconName: string;
}

const TABS: TabItem[] = [
  { key: 'Home', label: 'Home', iconName: 'home' },
  { key: 'Radar', label: 'Radar', iconName: 'compass' },
  { key: 'SafeWalk', label: 'Safe Walk', iconName: 'navigation' },
  { key: 'Tools', label: 'Tools', iconName: 'grid' },
  { key: 'Profile', label: 'You', iconName: 'user' },
];

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();

  // Safe bottom padding for navigation bar
  const bottomBarPadding = Math.max(insets.bottom, 12);

  const [activeTab, setActiveTab] = useState<TabKey>('Home');
  const [safeWalkDestination, setSafeWalkDestination] = useState<
    | {
        latitude: number;
        longitude: number;
        name: string;
      }
    | undefined
  >(undefined);
  const [mapParams, setMapParams] = useState<any>(undefined);
  const [profileParams, setProfileParams] = useState<any>(undefined);
  const [tabHistory, setTabHistory] = useState<TabKey[]>(['Home']);
  const lastBackPressRef = useRef<number>(0);

  // Tab scale bounce anim
  const tabScaleAnims = useRef<Record<TabKey, Animated.Value>>({
    Home: new Animated.Value(1),
    Radar: new Animated.Value(1),
    SafeWalk: new Animated.Value(1),
    Tools: new Animated.Value(1),
    Profile: new Animated.Value(1),
  }).current;

  // Unread/Incomplete setup count for "You" tab
  // If user hasn't completed test drill, lacks phone, or lacks blood group, show badge count
  const calculateYouBadgeCount = (): number => {
    let count = 0;
    if (!user?.hasCompletedTestDrill && !user?.has_completed_test_drill)
      count += 1;
    if (!user?.bloodGroup && !user?.blood_group) count += 1;
    if (!user?.phone) count += 1;
    return count > 0 ? count : 0;
  };
  const youBadgeCount = calculateYouBadgeCount();

  const handleNavigateTab = (tab: TabKey, params?: any) => {
    if (params?.destination) {
      setSafeWalkDestination(params.destination);
    }
    if (tab === 'Radar' && params) {
      setMapParams({ ...params, timestamp: Date.now() });
    }
    if (tab === 'Profile' && params) {
      setProfileParams({ ...params, timestamp: Date.now() });
    }

    // Trigger liquid spring bounce on the tab icon
    Animated.sequence([
      Animated.timing(tabScaleAnims[tab], {
        toValue: 0.85,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(tabScaleAnims[tab], {
        toValue: 1,
        speed: 24,
        bounciness: 9,
        useNativeDriver: true,
      }),
    ]).start();

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

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      {/* Screen Container with preserved screen state */}
      <View style={styles.screenArea}>
        <View
          style={[
            styles.screenWrapper,
            activeTab === 'Home' ? styles.visible : styles.hidden,
          ]}
        >
          <HomeScreen
            onNavigateTab={(tab, params) => {
              const mappedTab: TabKey =
                tab === 'Map' ? 'Radar' : (tab as TabKey);
              handleNavigateTab(mappedTab, params);
            }}
          />
        </View>

        <View
          style={[
            styles.screenWrapper,
            activeTab === 'Radar' ? styles.visible : styles.hidden,
          ]}
        >
          <MapScreen
            onNavigateTab={(tab, params) => {
              const mappedTab: TabKey =
                tab === 'Map' ? 'Radar' : (tab as TabKey);
              handleNavigateTab(mappedTab, params);
            }}
            route={mapParams ? { params: mapParams } : undefined}
          />
        </View>

        <View
          style={[
            styles.screenWrapper,
            activeTab === 'SafeWalk' ? styles.visible : styles.hidden,
          ]}
        >
          <SafeWalkScreen initialDestination={safeWalkDestination} />
        </View>

        <View
          style={[
            styles.screenWrapper,
            activeTab === 'Tools' ? styles.visible : styles.hidden,
          ]}
        >
          <ToolsScreen
            onNavigateTab={(tab, params) => handleNavigateTab(tab, params)}
          />
        </View>

        <View
          style={[
            styles.screenWrapper,
            activeTab === 'Profile' ? styles.visible : styles.hidden,
          ]}
        >
          <ProfileScreen
            route={profileParams ? { params: profileParams } : undefined}
          />
        </View>
      </View>

      {/* Floating Liquid Glass Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomNavContainer,
          {
            paddingBottom: bottomBarPadding > 14 ? bottomBarPadding : 10,
          },
        ]}
      >
        <View
          style={[
            styles.liquidNavBar,
            {
              backgroundColor: isDark
                ? 'rgba(20, 24, 44, 0.78)'
                : 'rgba(255, 255, 255, 0.88)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.14)'
                : 'rgba(110, 100, 225, 0.18)',
              shadowColor: isDark ? '#000000' : 'rgba(40, 36, 110, 0.22)',
            },
          ]}
        >
          {/* Top specular highlight rim */}
          <View
            pointerEvents="none"
            style={[
              styles.specularRim,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.35)'
                  : 'rgba(255, 255, 255, 0.95)',
              },
            ]}
          />

          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const isYouTab = tab.key === 'Profile';

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  isActive && {
                    backgroundColor: isDark
                      ? 'rgba(139, 137, 255, 0.22)'
                      : 'rgba(75, 73, 168, 0.12)',
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(75, 73, 168, 0.20)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => handleNavigateTab(tab.key)}
              >
                <Animated.View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: tabScaleAnims[tab.key] }],
                  }}
                >
                  <View style={styles.iconContainer}>
                    <Feather
                      name={tab.iconName}
                      size={20}
                      color={
                        isActive
                          ? isDark
                            ? '#FFFFFF'
                            : colors.primaryDark
                          : isDark
                            ? '#8387AB'
                            : '#66647A'
                      }
                    />

                    {/* Unread badge on You tab */}
                    {isYouTab && youBadgeCount > 0 && (
                      <View
                        style={[
                          styles.badgePill,
                          {
                            backgroundColor: colors.badgeBackground,
                            borderColor: isDark ? '#10132A' : '#FFFFFF',
                          },
                        ]}
                      >
                        <Text style={styles.badgeText}>{youBadgeCount}</Text>
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isActive
                          ? isDark
                            ? '#FFFFFF'
                            : colors.primaryDark
                          : isDark
                            ? '#8387AB'
                            : '#66647A',
                        fontWeight: isActive ? '800' : '600',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenArea: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
  visible: {
    display: 'flex',
  },
  hidden: {
    display: 'none',
  },
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  liquidNavBar: {
    flexDirection: 'row',
    width: '100%',
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 14,
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    opacity: 0.8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 62,
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  badgePill: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
