import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  OpenMapView,
  OpenMapViewRef,
  MapMarkerItem,
} from '../components/OpenMapView';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/authStore';
import {
  getCurrentCoordinates,
  LocationCoordinates,
  CAMPUS_COORDINATES,
} from '../services/locationService';
import { ReportService } from '../services/reportService';
import { HazardReport } from '@safora/shared-types';
import { ReportHazardModal } from '../components/ReportHazardModal';
import {
  searchPlaces,
  PlaceSearchResult,
  fetchMultiModalRoute,
  MultiModalTravelTimes,
  RouteCoord,
} from '../services/routingService';

export interface MapScreenProps {
  onNavigateTab?: (
    tab: 'Home' | 'Map' | 'SafeWalk' | 'Profile',
    params?: any,
  ) => void;
}

export const MapScreen: React.FC<MapScreenProps> = ({ onNavigateTab }) => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { isGuest } = useAuthStore();
  const mapRef = useRef<OpenMapViewRef | null>(null);
  const [coords, setCoords] = useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [userLivePos, setUserLivePos] =
    useState<LocationCoordinates>(CAMPUS_COORDINATES);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [selectedHazard, setSelectedHazard] = useState<HazardReport | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showGuestGuardModal, setShowGuestGuardModal] = useState(false);

  // Multi-Modal Path Routing State (Car, 2-Wheeler, Walk)
  const [activeRoute, setActiveRoute] = useState<{
    destinationName: string;
    destinationCoord: RouteCoord;
    coordinates: RouteCoord[];
    distanceMeters: number;
    travelTimes: MultiModalTravelTimes;
  } | null>(null);
  const [travelMode, setTravelMode] = useState<'car' | 'bike' | 'walk'>('car');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Google Maps-style Location Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadMapData();
  }, []);

  // Debounced search for places
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(searchQuery, {
        latitude: userLivePos.latitude,
        longitude: userLivePos.longitude,
      });
      setSearchResults(results);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, userLivePos.latitude, userLivePos.longitude]);

  // Handle hardware back press inside MapScreen
  useEffect(() => {
    const onBackPress = () => {
      if (searchResults.length > 0 || searchQuery.length > 0) {
        setSearchResults([]);
        setSearchQuery('');
        return true;
      }
      if (selectedHazard !== null) {
        setSelectedHazard(null);
        return true;
      }
      if (activeRoute !== null) {
        setActiveRoute(null);
        return true;
      }
      return false; // Bubble up to MainTabNavigator
    };

    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => backSub.remove();
  }, [searchResults, searchQuery, selectedHazard, activeRoute]);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const userPos = await getCurrentCoordinates();
      setUserLivePos(userPos);
      setCoords(userPos);
      const data = await ReportService.getNearby(
        userPos.latitude,
        userPos.longitude,
        5000,
      );
      setHazards(data);
    } catch {
      // Fallback handled inside services
    } finally {
      setLoading(false);
    }
  };

  const plotRouteTo = async (destination: {
    latitude: number;
    longitude: number;
    name: string;
  }) => {
    setIsCalculatingRoute(true);
    try {
      const start: RouteCoord = {
        latitude: userLivePos.latitude,
        longitude: userLivePos.longitude,
      };
      const end: RouteCoord = {
        latitude: destination.latitude,
        longitude: destination.longitude,
      };
      const result = await fetchMultiModalRoute(start, end);
      setActiveRoute({
        destinationName: destination.name,
        destinationCoord: end,
        coordinates: result.coordinates,
        distanceMeters: result.distanceMeters,
        travelTimes: result.travelTimes,
      });

      if (mapRef.current) {
        mapRef.current.recenter(
          (start.latitude + end.latitude) / 2,
          (start.longitude + end.longitude) / 2,
          14,
        );
      }
    } catch (err) {
      console.warn('[MapScreen] Failed to calculate multi-modal route:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleSelectSearchResult = async (item: PlaceSearchResult) => {
    setSearchQuery('');
    setSearchResults([]);
    setCoords(prev => ({
      ...prev,
      latitude: item.latitude,
      longitude: item.longitude,
      areaName: item.placeName,
    }));

    if (mapRef.current) {
      mapRef.current.recenter(item.latitude, item.longitude, 16);
    }

    // Automatically plot multi-modal route to the selected place
    plotRouteTo({
      latitude: item.latitude,
      longitude: item.longitude,
      name: item.name,
    });

    setLoading(true);
    try {
      const data = await ReportService.getNearby(
        item.latitude,
        item.longitude,
        5000,
      );
      setHazards(data);
    } catch {
      // Silently maintain existing hazards
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = (coord: { latitude: number; longitude: number }) => {
    plotRouteTo({
      latitude: coord.latitude,
      longitude: coord.longitude,
      name: `Point (${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)})`,
    });
  };

  const recenterMap = () => {
    if (mapRef.current) {
      mapRef.current.recenter(userLivePos.latitude, userLivePos.longitude, 15);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatDurationText = (seconds: number) => {
    const mins = Math.ceil(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
    }
    return `${mins} min`;
  };

  const handlePinHazardPress = () => {
    if (isGuest) {
      setShowGuestGuardModal(true);
      return;
    }
    setShowReportModal(true);
  };

  const handleConfirmHazard = async (reportId: string | number) => {
    if (isGuest) {
      setShowGuestGuardModal(true);
      return;
    }
    try {
      const res = await ReportService.confirm(reportId);
      setHazards(prev =>
        prev.map(h =>
          h.id === reportId
            ? { ...h, confirmationsCount: res.confirmationsCount }
            : h,
        ),
      );
      if (selectedHazard?.id === reportId) {
        setSelectedHazard(prev =>
          prev ? { ...prev, confirmationsCount: res.confirmationsCount } : null,
        );
      }
      Alert.alert(
        'Hazard Confirmed',
        'Thank you! Your verification increases community safety confidence.',
      );
    } catch {
      Alert.alert('Notice', 'Hazard status recorded.');
    }
  };

  const handleResolveHazard = (reportId: string | number) => {
    if (isGuest) {
      setShowGuestGuardModal(true);
      return;
    }
    Alert.alert(
      'Mark as Resolved',
      'Are you sure this hazard has been cleared or repaired?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Cleared',
          onPress: () => {
            setHazards(prev => prev.filter(h => h.id !== reportId));
            setSelectedHazard(null);
            Alert.alert(
              'Thank You!',
              'This hazard has been marked resolved. Community radar updated.',
            );
          },
        },
      ],
    );
  };

  const getPinColor = (sev: number) => {
    if (sev >= 4) return '#EF4444';
    if (sev === 3) return '#F59E0B';
    return '#38BDF8';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lighting':
        return '💡';
      case 'road_hazard':
        return '🚧';
      case 'waterlogging':
        return '🌊';
      case 'isolated_area':
        return '🌲';
      case 'traffic':
        return '🚗';
      default:
        return '⚠️';
    }
  };

  const mapMarkers: MapMarkerItem[] = [
    {
      id: 'user-loc',
      latitude: userLivePos.latitude,
      longitude: userLivePos.longitude,
      title: 'Your Location',
      description: userLivePos.areaName,
      isUser: true,
    },
    ...(activeRoute
      ? [
          {
            id: 'route-dest',
            latitude: activeRoute.destinationCoord.latitude,
            longitude: activeRoute.destinationCoord.longitude,
            title: activeRoute.destinationName,
            icon: '📍',
            color: '#EF4444',
          },
        ]
      : []),
    ...hazards.map(item => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      title: item.title,
      description: `Severity: ${item.severity}/5`,
      icon: getCategoryIcon(item.category),
      color: getPinColor(item.severity),
    })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.backgroundCard}
      />

      {/* Header Overlay */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: colors.backgroundCard,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Safety Radar
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            📍 {coords.areaName} • {hazards.length} hazards active
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pinBtn, { backgroundColor: colors.primary }]}
          onPress={handlePinHazardPress}
          activeOpacity={0.85}
        >
          <Text style={styles.pinBtnText}>+ Pin Hazard</Text>
        </TouchableOpacity>
      </View>

      {/* Real Full-Screen MapView with Multi-Modal Polyline */}
      <View style={styles.mapWrapper}>
        <OpenMapView
          ref={mapRef}
          center={{ latitude: coords.latitude, longitude: coords.longitude }}
          zoom={15}
          isDark={isDark}
          markers={mapMarkers}
          polyline={activeRoute ? activeRoute.coordinates : undefined}
          polylineColor={
            travelMode === 'car'
              ? '#3B82F6'
              : travelMode === 'bike'
                ? '#10B981'
                : '#6366F1'
          }
          polylineDash={false}
          layerSwitcherTop={68}
          onMapPress={handleMapPress}
          onMarkerPress={markerId => {
            const found = hazards.find(h => String(h.id) === String(markerId));
            if (found) {
              setSelectedHazard(found);
            }
          }}
          style={styles.map}
        />

        {/* Floating Google Maps-Style Location Search Bar */}
        <View style={styles.searchOverlay}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search area, street, or landmark..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <View
              style={[
                styles.searchResultsBox,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border,
                },
              ]}
            >
              {searchResults.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.searchResultItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <Text style={styles.resultIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.resultName, { color: colors.textPrimary }]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.resultSub,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.placeName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recenter GPS Floating Button */}
        <TouchableOpacity
          style={[
            styles.recenterFab,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
              bottom: activeRoute ? 215 : selectedHazard ? 245 : 24,
            },
          ]}
          onPress={recenterMap}
          activeOpacity={0.85}
        >
          <Text style={styles.recenterIcon}>🎯</Text>
        </TouchableOpacity>

        {/* Loading Pill */}
        {loading && (
          <View
            style={[
              styles.loadingPill,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
              Scanning safety radar...
            </Text>
          </View>
        )}
      </View>

      {/* Selected Hazard Card Sheet */}
      {selectedHazard && (
        <View
          style={[
            styles.bottomCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.bottomCardHeader}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.sevBadge,
                  {
                    backgroundColor:
                      getPinColor(selectedHazard.severity) + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sevBadgeText,
                    { color: getPinColor(selectedHazard.severity) },
                  ]}
                >
                  SEVERITY {selectedHazard.severity}/5
                </Text>
              </View>
              <Text
                style={[
                  styles.confirmationsText,
                  { color: colors.textSecondary },
                ]}
              >
                👍 {selectedHazard.confirmationsCount || 0} verifications
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedHazard(null)}
              style={styles.cardCloseBtn}
            >
              <Text style={[styles.cardCloseText, { color: colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {selectedHazard.title}
          </Text>
          {selectedHazard.description ? (
            <Text
              style={[styles.cardDesc, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {selectedHazard.description}
            </Text>
          ) : null}

          {/* Photo Proof Evidence */}
          {selectedHazard.photoUrl || (selectedHazard as any).photo_url ? (
            <View style={styles.hazardPhotoWrapper}>
              <Image
                source={{
                  uri:
                    selectedHazard.photoUrl ||
                    (selectedHazard as any).photo_url,
                }}
                style={styles.hazardPhoto}
                resizeMode="cover"
              />
              <View style={styles.hazardPhotoBadge}>
                <Text style={styles.hazardPhotoBadgeText}>
                  📷 Cloudinary Evidence
                </Text>
              </View>
            </View>
          ) : null}

          {/* Voting Action Row: Still Present vs Resolved + Show Route */}
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleConfirmHazard(selectedHazard.id)}
            >
              <Text style={styles.confirmBtnText}>⚠️ Still Present (+1)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resolveBtn, { borderColor: '#10B981' }]}
              onPress={() => handleResolveHazard(selectedHazard.id)}
            >
              <Text style={styles.resolveBtnText}>✅ Resolved</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.routeHazardBtn, { borderColor: colors.primary }]}
              onPress={() => {
                plotRouteTo({
                  latitude: selectedHazard.latitude,
                  longitude: selectedHazard.longitude,
                  name: selectedHazard.title,
                });
                setSelectedHazard(null);
              }}
            >
              <Text
                style={[styles.routeHazardBtnText, { color: colors.primary }]}
              >
                🧭 Route
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Multi-Modal Path Routing Card (Car, 2-Wheeler, Walk) */}
      {activeRoute && !selectedHazard && (
        <View
          style={[
            styles.routeCard,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.routeHeader}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.routeDestTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                📍 {activeRoute.destinationName}
              </Text>
              <Text
                style={[
                  styles.routeDistanceSub,
                  { color: colors.textSecondary },
                ]}
              >
                Distance: {formatDistance(activeRoute.distanceMeters)}
                {isCalculatingRoute ? ' • Calculating...' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeRouteBtn}
              onPress={() => setActiveRoute(null)}
            >
              <Text style={styles.closeRouteBtnText}>✕ Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Transport Mode Options: Car, 2-Wheeler, Walk */}
          <View style={styles.modeTabsRow}>
            {/* Car Mode */}
            <TouchableOpacity
              style={[
                styles.modeTab,
                travelMode === 'car' && styles.modeTabActiveCar,
              ]}
              onPress={() => setTravelMode('car')}
              activeOpacity={0.8}
            >
              <Text style={styles.modeTabEmoji}>🚗</Text>
              <Text
                style={[
                  styles.modeTabTitle,
                  travelMode === 'car' && styles.modeTabTitleActive,
                ]}
              >
                Car
              </Text>
              <Text
                style={[
                  styles.modeTabEta,
                  travelMode === 'car' && styles.modeTabEtaActive,
                ]}
              >
                {formatDurationText(activeRoute.travelTimes.carSeconds)}
              </Text>
            </TouchableOpacity>

            {/* 2-Wheeler Mode */}
            <TouchableOpacity
              style={[
                styles.modeTab,
                travelMode === 'bike' && styles.modeTabActiveBike,
              ]}
              onPress={() => setTravelMode('bike')}
              activeOpacity={0.8}
            >
              <Text style={styles.modeTabEmoji}>🛵</Text>
              <Text
                style={[
                  styles.modeTabTitle,
                  travelMode === 'bike' && styles.modeTabTitleActive,
                ]}
              >
                2-Wheeler
              </Text>
              <Text
                style={[
                  styles.modeTabEta,
                  travelMode === 'bike' && styles.modeTabEtaActive,
                ]}
              >
                {formatDurationText(activeRoute.travelTimes.bikeSeconds)}
              </Text>
            </TouchableOpacity>

            {/* Walk Mode */}
            <TouchableOpacity
              style={[
                styles.modeTab,
                travelMode === 'walk' && styles.modeTabActiveWalk,
              ]}
              onPress={() => setTravelMode('walk')}
              activeOpacity={0.8}
            >
              <Text style={styles.modeTabEmoji}>🚶</Text>
              <Text
                style={[
                  styles.modeTabTitle,
                  travelMode === 'walk' && styles.modeTabTitleActive,
                ]}
              >
                Walk
              </Text>
              <Text
                style={[
                  styles.modeTabEta,
                  travelMode === 'walk' && styles.modeTabEtaActive,
                ]}
              >
                {formatDurationText(activeRoute.travelTimes.walkSeconds)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action below modes */}
          {travelMode === 'walk' ? (
            <TouchableOpacity
              style={[
                styles.startSafeWalkBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                onNavigateTab?.('SafeWalk', {
                  destination: {
                    latitude: activeRoute.destinationCoord.latitude,
                    longitude: activeRoute.destinationCoord.longitude,
                    name: activeRoute.destinationName,
                  },
                });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.startSafeWalkBtnText}>
                🛡️ Start Safe Walk Escort
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.trafficNoteRow}>
              <Text
                style={[
                  styles.trafficNoteText,
                  { color: colors.textSecondary },
                ]}
              >
                {travelMode === 'car'
                  ? '🚦 Realistic urban driving speed with traffic & intersection buffers'
                  : '⚡ Optimized for 2-wheelers with agile traffic maneuverability'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Report Hazard Modal (Authenticated Users) */}
      <ReportHazardModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        coordinates={{
          latitude: coords.latitude,
          longitude: coords.longitude,
        }}
        onReportCreated={newRep => {
          setHazards(prev => [newRep, ...prev]);
          setSelectedHazard(newRep);
        }}
      />

      {/* Guest Mode Guard Modal */}
      <Modal
        visible={showGuestGuardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestGuardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.guestModalCard,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.guestIconCircle}>
              <Text style={styles.guestIconEmoji}>🛡️</Text>
            </View>

            <Text
              style={[styles.guestModalTitle, { color: colors.textPrimary }]}
            >
              Citizen Account Required
            </Text>

            <Text
              style={[
                styles.guestModalSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              In Guest Mode you can view all live safety reports and radars. To
              pin new hazards or verify reports, please sign in or create a
              verified account to protect the community from false reports.
            </Text>

            <View style={styles.guestModalBtnGroup}>
              <TouchableOpacity
                style={[
                  styles.guestAuthBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  setShowGuestGuardModal(false);
                  navigation.navigate('Auth', { initialTab: 'register' });
                }}
              >
                <Text style={styles.guestAuthBtnText}>
                  Sign In / Create Account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestCancelBtn}
                onPress={() => setShowGuestGuardModal(false)}
              >
                <Text
                  style={[
                    styles.guestCancelBtnText,
                    { color: colors.textMuted },
                  ]}
                >
                  Continue Browsing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerInfo: { flex: 1, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  pinBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  pinBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  mapWrapper: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },

  // Floating Google Maps Location Search Bar
  searchOverlay: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 30,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    gap: 10,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  searchResultsBox: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 10,
    maxHeight: 220,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  resultIcon: { fontSize: 16 },
  resultName: { fontSize: 13, fontWeight: '700' },
  resultSub: { fontSize: 11, marginTop: 1 },

  recenterFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  recenterIcon: { fontSize: 20 },
  loadingPill: {
    position: 'absolute',
    top: 76,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    zIndex: 20,
  },
  loadingText: { fontSize: 12, fontWeight: '600' },
  bottomCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  bottomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevBadgeText: { fontSize: 10, fontWeight: '800' },
  confirmationsText: { fontSize: 11, fontWeight: '600' },
  cardCloseBtn: { padding: 4 },
  cardCloseText: { fontSize: 16, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardDesc: { fontSize: 12, lineHeight: 16, marginBottom: 12 },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  resolveBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  resolveBtnText: { color: '#10B981', fontWeight: '800', fontSize: 12 },

  // Guest Guard Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  guestModalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 12,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  guestIconEmoji: { fontSize: 32 },
  guestModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  guestModalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestModalBtnGroup: { width: '100%', gap: 10 },
  guestAuthBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  guestAuthBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  guestCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  guestCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hazardPhotoWrapper: {
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hazardPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  hazardPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hazardPhotoBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  routeHazardBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
  },
  routeHazardBtnText: {
    fontWeight: '800',
    fontSize: 12,
  },

  // Multi-Modal Path Routing Bottom Card
  routeCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    zIndex: 40,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeDestTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  routeDistanceSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeRouteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeRouteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  modeTabActiveCar: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
    elevation: 4,
  },
  modeTabActiveBike: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
    elevation: 4,
  },
  modeTabActiveWalk: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
    elevation: 4,
  },
  modeTabEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  modeTabTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 1,
  },
  modeTabTitleActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modeTabEta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  modeTabEtaActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  startSafeWalkBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  startSafeWalkBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  trafficNoteRow: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  trafficNoteText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
});
