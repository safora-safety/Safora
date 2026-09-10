import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { StyleSheet, View, ViewStyle, ActivityIndicator } from 'react-native';
import WebView from 'react-native-webview';

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
  markers?: MapMarkerItem[];
  polyline?: Array<{ latitude: number; longitude: number }>;
  polylineColor?: string;
  polylineDash?: boolean;
  onMarkerPress?: (markerId: string | number) => void;
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  style?: ViewStyle;
}

export interface OpenMapViewRef {
  recenter: (latitude: number, longitude: number, zoom?: number) => void;
}

const MAPTILER_KEY = 'NWS4ts6GlPJ2wfFvWYgJ';

const generateHtml = (
  initialCenter: { latitude: number; longitude: number },
  initialZoom: number,
  isDark: boolean,
) => {
  const tileUrl = isDark
    ? `https://api.maptiler.com/maps/basic-v2-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
    : `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;

  const bgColor = isDark ? '#0B1120' : '#F8FAFC';

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
      background: rgba(79, 70, 229, 0.35);
      border: 2px solid #4F46E5;
      animation: pulse-ring 1.8s infinite ease-out;
    }
    .user-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #4F46E5;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 0 8px rgba(79, 70, 229, 0.8);
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

    function initMap() {
      map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        center: [${initialCenter.latitude}, ${initialCenter.longitude}],
        zoom: ${initialZoom}
      });

      tileLayer = L.tileLayer('${tileUrl}', {
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

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }
    }

    window.updateMapTheme = function(isDark) {
      if (!map) return;
      var newUrl = isDark
        ? 'https://api.maptiler.com/maps/basic-v2-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}'
        : 'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}';
      if (tileLayer) {
        map.removeLayer(tileLayer);
      }
      tileLayer = L.tileLayer(newUrl, {
        maxZoom: 19,
        tileSize: 256
      }).addTo(map);
      document.body.style.background = isDark ? '#0B1120' : '#F8FAFC';
    };

    window.recenterMap = function(lat, lng, zoom) {
      if (map) {
        map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 0.8 });
      }
    };

    window.renderMarkers = function(markersList) {
      if (!map) return;
      // Clear old markers
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
      markers = [],
      polyline,
      polylineColor = '#4F46E5',
      polylineDash = false,
      onMarkerPress,
      onMapPress,
      style,
    },
    ref,
  ) => {
    const webViewRef = useRef<any>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      recenter: (latitude: number, longitude: number, newZoom?: number) => {
        const script = `if (window.recenterMap) { window.recenterMap(${latitude}, ${longitude}, ${newZoom || zoom}); }; true;`;
        webViewRef.current?.injectJavaScript(script);
      },
    }));

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
          // Initial push of markers and polyline
          const initScript = `
            if (window.renderMarkers) { window.renderMarkers(${JSON.stringify(markers)}); }
            if (window.renderPolyline) { window.renderPolyline(${JSON.stringify(polyline || [])}, "${polylineColor}", ${polylineDash}); }
            true;
          `;
          webViewRef.current?.injectJavaScript(initScript);
        } else if (data.type === 'markerPress' && onMarkerPress) {
          onMarkerPress(data.markerId);
        } else if (data.type === 'mapPress' && onMapPress) {
          onMapPress(data.coordinate);
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
            html: generateHtml(center, zoom, isDark),
            baseUrl: 'https://safora.local',
          }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
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
});
