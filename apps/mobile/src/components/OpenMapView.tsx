import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';

export type MapLayerType = 'default' | 'satellite' | 'street';

export interface MapMarkerItem {
  id: string | number;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  isUser?: boolean;
}

export interface OpenMapViewProps {
  center: { latitude: number; longitude: number };
  zoom?: number;
  isDark?: boolean;
  mapLayer?: MapLayerType;
  showLayerSwitcher?: boolean;
  layerSwitcherTop?: number;
  onLayerChange?: (layer: MapLayerType) => void;
  markers?: MapMarkerItem[];
  polyline?: Array<{ latitude: number; longitude: number }>;
  polylineColor?: string;
  polylineDash?: boolean;
  onMarkerPress?: (markerId: string | number) => void;
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  onOfflineCached?: (tileCount: number) => void;
  style?: ViewStyle;
}

export interface OpenMapViewRef {
  recenter: (latitude: number, longitude: number, zoom?: number) => void;
  cache10km: (latitude: number, longitude: number) => void;
  setMapLayer: (layer: MapLayerType) => void;
}

const MAPTILER_KEY = 'NWS4ts6GlPJ2wfFvWYgJ';

const generateHtml = (
  initialCenter: { latitude: number; longitude: number },
  initialZoom: number,
  isDark: boolean,
  initialLayer: MapLayerType = 'default',
) => {
  const bgColor =
    initialLayer === 'satellite' ? '#000000' : isDark ? '#0B1120' : '#F8FAFC';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${bgColor}; overflow: hidden; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
    
    /* User pulse marker */
    .user-pulse {
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-pulse::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(56, 189, 248, 0.35);
      border: 2px solid #38BDF8;
      animation: pulse-ring 1.8s infinite ease-out;
    }
    .user-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #38BDF8;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
      z-index: 2;
    }
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
      z-index: 2;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Walker marker */
    .walker-marker {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: #4F46E5;
      border: 2px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    }

    /* Destination pin */
    .dest-marker {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: #EF4444;
      border: 2px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.45);
    }

    /* Hazard Pin */
    .hazard-pin {
      width: 34px;
      height: 34px;
      border-radius: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .hazard-pin:active {
      transform: scale(1.15);
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var tileLayer;
    var markersMap = {};
    var polylineLayer = null;
    var CACHE_NAME = 'safora-offline-maptiles-v1';
    var currentIsDark = ${isDark};
    var currentLayer = '${initialLayer}';

    function getTileUrlForLayer(layerType, isDark) {
      if (layerType === 'satellite') {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      }
      if (layerType === 'street') {
        return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      }
      // default themed streets
      return isDark
        ? 'https://api.maptiler.com/maps/basic-v2-dark/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY
        : 'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY;
    }

    // Custom Leaflet TileLayer with Offline System Storage Cache
    var OfflineTileLayer = L.TileLayer.extend({
      createTile: function(coords, done) {
        var tile = document.createElement('img');
        L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
        L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));
        tile.alt = '';
        tile.setAttribute('role', 'presentation');

        var url = this.getTileUrl(coords);
        if ('caches' in window) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.match(url).then(function(cachedResponse) {
              if (cachedResponse) {
                cachedResponse.blob().then(function(blob) {
                  tile.src = URL.createObjectURL(blob);
                });
              } else {
                fetch(url, { mode: 'cors' }).then(function(networkRes) {
                  if (networkRes.ok) {
                    cache.put(url, networkRes.clone());
                    return networkRes.blob();
                  }
                }).then(function(blob) {
                  if (blob) tile.src = URL.createObjectURL(blob);
                  else tile.src = url;
                }).catch(function() {
                  tile.src = url;
                });
              }
            }).catch(function() {
              tile.src = url;
            });
          }).catch(function() {
            tile.src = url;
          });
        } else {
          tile.src = url;
        }
        return tile;
      }
    });

    function initMap() {
      map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        center: [${initialCenter.latitude}, ${initialCenter.longitude}],
        zoom: ${initialZoom}
      });

      var initialUrl = getTileUrlForLayer(currentLayer, currentIsDark);
      tileLayer = new OfflineTileLayer(initialUrl, {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(map);

      map.on('click', function(e) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapPress',
            coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng }
          }));
        }
      });

      // Silently pre-cache surrounding 10km radius tiles for offline usage
      setTimeout(function() {
        cacheSurrounding10km(${initialCenter.latitude}, ${initialCenter.longitude});
      }, 1000);

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }
    }

    // Pre-cache tiles covering 10km radius around given latitude/longitude
    window.cacheSurrounding10km = function(lat, lng) {
      if (!('caches' in window)) return;

      var deltaLat = 0.09; // ~10km in latitude
      var deltaLng = 0.10; // ~10km in longitude
      var minLat = lat - deltaLat;
      var maxLat = lat + deltaLat;
      var minLng = lng - deltaLng;
      var maxLng = lng + deltaLng;

      var zoomLevels = [13, 14, 15];
      var tilesToFetch = [];

      zoomLevels.forEach(function(z) {
        var minX = Math.floor((minLng + 180) / 360 * Math.pow(2, z));
        var maxX = Math.floor((maxLng + 180) / 360 * Math.pow(2, z));
        var minY = Math.floor((1 - Math.log(Math.tan(maxLat * Math.PI / 180) + 1 / Math.cos(maxLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        var maxY = Math.floor((1 - Math.log(Math.tan(minLat * Math.PI / 180) + 1 / Math.cos(minLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));

        for (var x = minX; x <= maxX; x++) {
          for (var y = minY; y <= maxY; y++) {
            var url = getTileUrlForLayer(currentLayer, currentIsDark)
              .replace('{z}', z)
              .replace('{x}', x)
              .replace('{y}', y);
            tilesToFetch.push(url);
          }
        }
      });

      caches.open(CACHE_NAME).then(function(cache) {
        var cachedCount = 0;
        tilesToFetch.slice(0, 36).forEach(function(url) {
          cache.match(url).then(function(existing) {
            if (!existing) {
              fetch(url, { mode: 'cors' }).then(function(res) {
                if (res.ok) {
                  cache.put(url, res);
                  cachedCount++;
                }
              }).catch(function() {});
            }
          });
        });

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'offlineCacheComplete',
            tileCount: tilesToFetch.length
          }));
        }
      }).catch(function() {});
    };

    window.setMapLayer = function(layerType) {
      if (!map) return;
      currentLayer = layerType;
      var newUrl = getTileUrlForLayer(layerType, currentIsDark);
      if (tileLayer) {
        map.removeLayer(tileLayer);
      }
      tileLayer = new OfflineTileLayer(newUrl, {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c', 'd']
      }).addTo(map);

      if (layerType === 'satellite') {
        document.body.style.background = '#000000';
      } else if (layerType === 'street') {
        document.body.style.background = '#F3F4F6';
      } else {
        document.body.style.background = currentIsDark ? '#0B1120' : '#F8FAFC';
      }

      if (polylineLayer) {
        polylineLayer.bringToFront();
      }
    };

    window.updateMapTheme = function(isDark) {
      currentIsDark = isDark;
      if (currentLayer === 'default') {
        window.setMapLayer('default');
      }
    };

    window.recenterMap = function(lat, lng, zoom) {
      if (map) {
        map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 0.8 });
        cacheSurrounding10km(lat, lng);
      }
    };

    window.renderMarkers = function(markersList) {
      if (!map) return;
      for (var id in markersMap) {
        map.removeLayer(markersMap[id]);
      }
      markersMap = {};

      markersList.forEach(function(m) {
        var htmlIcon = '';
        var iconSize = [34, 34];
        var iconAnchor = [17, 17];

        if (m.isUser) {
          htmlIcon = '<div class="user-pulse"><div class="user-dot"></div></div>';
          iconSize = [32, 32];
          iconAnchor = [16, 16];
        } else if (m.icon === '🚶‍♀️') {
          htmlIcon = '<div class="walker-marker">🚶‍♀️</div>';
          iconSize = [36, 36];
          iconAnchor = [18, 18];
        } else if (m.icon === '📍') {
          htmlIcon = '<div class="dest-marker">📍</div>';
          iconSize = [36, 36];
          iconAnchor = [18, 18];
        } else {
          var bg = m.color || '#F59E0B';
          htmlIcon = '<div class="hazard-pin" style="background:' + bg + ';">' + (m.icon || '⚠️') + '</div>';
        }

        var customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: htmlIcon,
          iconSize: iconSize,
          iconAnchor: iconAnchor
        });

        var marker = L.marker([m.latitude, m.longitude], { icon: customIcon }).addTo(map);

        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'markerPress',
              markerId: m.id
            }));
          }
        });

        markersMap[m.id] = marker;
      });
    };

    window.renderPolyline = function(points, color, isDashed) {
      if (!map) return;
      if (polylineLayer) {
        map.removeLayer(polylineLayer);
        polylineLayer = null;
      }
      if (!points || points.length < 2) return;

      var latlngs = points.map(function(p) { return [p.latitude, p.longitude]; });
      polylineLayer = L.polyline(latlngs, {
        color: color || '#4F46E5',
        weight: 4,
        opacity: 0.9,
        dashArray: isDashed ? '8, 8' : undefined
      }).addTo(map);
    };

    window.onload = initMap;
  </script>
</body>
</html>`;
};

export const OpenMapView = forwardRef<OpenMapViewRef, OpenMapViewProps>(
  (
    {
      center,
      zoom = 15,
      isDark = true,
      mapLayer = 'default',
      showLayerSwitcher = true,
      layerSwitcherTop,
      onLayerChange,
      markers = [],
      polyline,
      polylineColor = '#4F46E5',
      polylineDash = false,
      onMarkerPress,
      onMapPress,
      onOfflineCached,
      style,
    },
    ref,
  ) => {
    const webViewRef = useRef<any>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [activeLayer, setActiveLayer] = useState<MapLayerType>(mapLayer);
    const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      recenter: (latitude: number, longitude: number, newZoom?: number) => {
        const script = `if (window.recenterMap) { window.recenterMap(${latitude}, ${longitude}, ${newZoom || zoom}); }; true;`;
        webViewRef.current?.injectJavaScript(script);
      },
      cache10km: (latitude: number, longitude: number) => {
        const script = `if (window.cacheSurrounding10km) { window.cacheSurrounding10km(${latitude}, ${longitude}); }; true;`;
        webViewRef.current?.injectJavaScript(script);
      },
      setMapLayer: (layer: MapLayerType) => {
        switchLayer(layer);
      },
    }));

    const switchLayer = (layer: MapLayerType) => {
      setActiveLayer(layer);
      onLayerChange?.(layer);
      const script = `if (window.setMapLayer) { window.setMapLayer('${layer}'); }; true;`;
      webViewRef.current?.injectJavaScript(script);
    };

    // Prop-driven layer changes
    useEffect(() => {
      if (mapLayer && mapLayer !== activeLayer) {
        switchLayer(mapLayer);
      }
    }, [mapLayer]);

    // Send markers update to WebView whenever markers prop changes
    useEffect(() => {
      if (!isMapLoaded) return;
      const script = `if (window.renderMarkers) { window.renderMarkers(${JSON.stringify(markers)}); }; true;`;
      webViewRef.current?.injectJavaScript(script);
    }, [markers, isMapLoaded]);

    // Send polyline update whenever polyline changes
    useEffect(() => {
      if (!isMapLoaded) return;
      const script = `if (window.renderPolyline) { window.renderPolyline(${JSON.stringify(polyline || [])}, "${polylineColor}", ${polylineDash}); }; true;`;
      webViewRef.current?.injectJavaScript(script);
    }, [polyline, polylineColor, polylineDash, isMapLoaded]);

    // Send theme update whenever isDark changes
    useEffect(() => {
      if (!isMapLoaded) return;
      const script = `if (window.updateMapTheme) { window.updateMapTheme(${isDark}); }; true;`;
      webViewRef.current?.injectJavaScript(script);
    }, [isDark, isMapLoaded]);

    const handleMessage = (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'mapReady') {
          setIsMapLoaded(true);
          const initScript = `
            if (window.renderMarkers) { window.renderMarkers(${JSON.stringify(markers)}); }
            if (window.renderPolyline) { window.renderPolyline(${JSON.stringify(polyline || [])}, "${polylineColor}", ${polylineDash}); }
            if (window.setMapLayer) { window.setMapLayer('${activeLayer}'); }
            true;
          `;
          webViewRef.current?.injectJavaScript(initScript);
        } else if (data.type === 'markerPress' && onMarkerPress) {
          onMarkerPress(data.markerId);
        } else if (data.type === 'mapPress' && onMapPress) {
          onMapPress(data.coordinate);
        } else if (data.type === 'offlineCacheComplete' && onOfflineCached) {
          onOfflineCached(data.tileCount);
        }
      } catch {
        // Ignore JSON parse errors
      }
    };

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{
            html: generateHtml(center, zoom, isDark, activeLayer),
            baseUrl: 'https://safora.local',
          }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          scalesPageToFit={false}
          scrollEnabled={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onMessage={handleMessage}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
            </View>
          )}
          startInLoadingState={true}
        />

        {/* Floating Layer Switcher (Satellite / Street / Default) */}
        {showLayerSwitcher && (
          <View
            style={[
              styles.layerSwitcherContainer,
              { top: layerSwitcherTop ?? 14 },
            ]}
          >
            {isLayerMenuOpen ? (
              <View style={styles.layerExpandedMenu}>
                <TouchableOpacity
                  style={[
                    styles.layerOptionBtn,
                    activeLayer === 'default' && styles.layerOptionBtnActive,
                  ]}
                  onPress={() => {
                    switchLayer('default');
                    setIsLayerMenuOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.layerOptionIcon}>🗺️</Text>
                  <Text
                    style={[
                      styles.layerOptionText,
                      activeLayer === 'default' && styles.layerOptionTextActive,
                    ]}
                  >
                    Default
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.layerOptionBtn,
                    activeLayer === 'satellite' && styles.layerOptionBtnActive,
                  ]}
                  onPress={() => {
                    switchLayer('satellite');
                    setIsLayerMenuOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.layerOptionIcon}>🛰️</Text>
                  <Text
                    style={[
                      styles.layerOptionText,
                      activeLayer === 'satellite' &&
                        styles.layerOptionTextActive,
                    ]}
                  >
                    Satellite
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.layerOptionBtn,
                    activeLayer === 'street' && styles.layerOptionBtnActive,
                  ]}
                  onPress={() => {
                    switchLayer('street');
                    setIsLayerMenuOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.layerOptionIcon}>🛣️</Text>
                  <Text
                    style={[
                      styles.layerOptionText,
                      activeLayer === 'street' && styles.layerOptionTextActive,
                    ]}
                  >
                    Street
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.layerCloseBtn}
                  onPress={() => setIsLayerMenuOpen(false)}
                >
                  <Text style={styles.layerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.layerFab}
                onPress={() => setIsLayerMenuOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.layerFabIcon}>
                  {activeLayer === 'satellite'
                    ? '🛰️'
                    : activeLayer === 'street'
                      ? '🛣️'
                      : '🥞'}
                </Text>
                <Text style={styles.layerFabLabel}>Layers</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1120',
  },
  layerSwitcherContainer: {
    position: 'absolute',
    right: 14,
    zIndex: 999,
  },
  layerFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  layerFabIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  layerFabLabel: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  layerExpandedMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  layerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  layerOptionBtnActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  layerOptionIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  layerOptionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  layerOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  layerCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 2,
  },
  layerCloseText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
});
