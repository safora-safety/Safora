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

export type MapLayerType = 'default' | 'tactical' | 'satellite' | 'street';

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

export interface MapClusterItem {
  clusterId: number;
  pointCount: number;
  avgSeverity: number;
  centerLatitude: number;
  centerLongitude: number;
  reportIds?: number[];
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
  clusters?: MapClusterItem[];
  polyline?: Array<{ latitude: number; longitude: number }>;
  polylineColor?: string;
  polylineDash?: boolean;
  showCorridorHalo?: boolean;
  corridorHaloColor?: string;
  tilt3D?: boolean;
  onMarkerPress?: (markerId: string | number) => void;
  onMapPress?: (coord: { latitude: number; longitude: number }) => void;
  onOfflineCached?: (tileCount: number) => void;
  style?: ViewStyle;
}

export interface OpenMapViewRef {
  recenter: (latitude: number, longitude: number, zoom?: number) => void;
  cache10km: (latitude: number, longitude: number) => void;
  setMapLayer: (layer: MapLayerType) => void;
  set3DTilt: (enabled: boolean) => void;
}

const generateHtml = (
  initialCenter: { latitude: number; longitude: number },
  initialZoom: number,
  isDark: boolean,
  initialLayer: MapLayerType = 'default',
) => {
  const bgColor =
    initialLayer === 'satellite'
      ? '#000000'
      : initialLayer === 'street'
        ? '#F8FAFC'
        : initialLayer === 'tactical'
          ? '#111827'
          : '#070A11';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: ${bgColor}; overflow: hidden; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
    
    /* Watermark-free High-Tech Dark Matrix Leaflet Tiles */
    .dark-matrix-tiles .leaflet-tile,
    .leaflet-tile.dark-matrix-tiles,
    .leaflet-layer.dark-matrix-tiles .leaflet-tile,
    .dark-matrix-layer .leaflet-tile {
      filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(95%) !important;
    }

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
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    if (typeof L === 'undefined') {
      document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"><\\/script>');
      document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />');
    }
  </script>
</head>
<body>
  <div id="map"></div>
  <script>
    window.onerror = function(msg, url, line) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: msg + ' at ' + url + ':' + line
        }));
      }
    };

    var map = null;
    var tileLayer = null;
    var markersMap = {};
    var polylineLayer = null;
    var currentIsDark = ${isDark};
    var currentLayer = '${initialLayer}';

    function getTileConfig(layerType, isDark) {
      if (layerType === 'satellite') {
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          className: '',
          maxNativeZoom: 18,
          bg: '#000000'
        };
      }
      if (layerType === 'tactical') {
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          className: '',
          maxNativeZoom: 16,
          bg: '#111827'
        };
      }
      if (layerType === 'street') {
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          className: '',
          maxNativeZoom: 19,
          bg: '#F8FAFC'
        };
      }
      // 'default' is Dark Matrix if isDark or crisp OSM if light mode
      return {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        className: isDark ? 'dark-matrix-tiles' : '',
        maxNativeZoom: 19,
        bg: isDark ? '#070A11' : '#F8FAFC'
      };
    }

    function initMap() {
      if (map) return;
      if (typeof L === 'undefined') {
        setTimeout(initMap, 80);
        return;
      }

      map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        center: [${initialCenter.latitude}, ${initialCenter.longitude}],
        zoom: ${initialZoom},
        minZoom: 3,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1.0,
        worldCopyJump: false,
        fadeAnimation: false
      });

      var cfg = getTileConfig(currentLayer, currentIsDark);
      tileLayer = L.tileLayer(cfg.url, {
        maxZoom: 19,
        minZoom: 3,
        maxNativeZoom: cfg.maxNativeZoom,
        className: cfg.className,
        noWrap: true,
        bounds: [[-85, -180], [85, 180]],
        subdomains: ['a', 'b', 'c', 'd'],
        crossOrigin: true
      }).addTo(map);

      map.on('click', function(e) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapPress',
            coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng }
          }));
        }
      });

      // Google Maps style one-handed gestures:
      // 1. Two-finger tap -> Zoom out by 1 level
      // 2. Double-tap and drag -> Zoom in / out smoothly
      var mapContainer = document.getElementById('map');
      if (mapContainer) {
        var lastTapTime = 0;
        var lastTapX = 0;
        var lastTapY = 0;
        var isDoubleTapDragging = false;
        var dragStartY = 0;
        var dragStartZoom = 0;
        var twoFingerTapCandidate = false;
        var touchStartTime = 0;

        mapContainer.addEventListener('touchstart', function(e) {
          var now = Date.now();
          if (e.touches.length === 2) {
            twoFingerTapCandidate = true;
            touchStartTime = now;
            return;
          }
          twoFingerTapCandidate = false;

          if (e.touches.length === 1) {
            var touch = e.touches[0];
            var dist = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);
            if (now - lastTapTime < 340 && dist < 45) {
              // Second tap started - enter one-finger zoom mode
              isDoubleTapDragging = true;
              dragStartY = touch.clientY;
              dragStartZoom = map.getZoom();
              map.dragging.disable();
              e.preventDefault();
            }
            lastTapTime = now;
            lastTapX = touch.clientX;
            lastTapY = touch.clientY;
          }
        }, { passive: false });

        mapContainer.addEventListener('touchmove', function(e) {
          if (isDoubleTapDragging && e.touches.length === 1) {
            var currentY = e.touches[0].clientY;
            var deltaY = currentY - dragStartY; // dragging down zooms in, up zooms out
            var newZoom = Math.max(3, Math.min(19, dragStartZoom + (deltaY / 65)));
            map.setZoom(newZoom, { animate: false });
            e.preventDefault();
          }
          if (twoFingerTapCandidate && e.touches.length === 2) {
            twoFingerTapCandidate = false;
          }
        }, { passive: false });

        mapContainer.addEventListener('touchend', function(e) {
          if (isDoubleTapDragging) {
            isDoubleTapDragging = false;
            map.dragging.enable();
          }
          if (twoFingerTapCandidate && (Date.now() - touchStartTime < 280)) {
            twoFingerTapCandidate = false;
            map.zoomOut(1);
          }
        });
      }

      setTimeout(function() {
        if (window.cacheSurrounding10km) {
          window.cacheSurrounding10km(${initialCenter.latitude}, ${initialCenter.longitude});
        }
      }, 1000);

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }
    }

    // Pre-cache surrounding 10km radius tiles into WebView disk cache
    window.cacheSurrounding10km = function(lat, lng) {
      try {
        var deltaLat = 0.09;
        var deltaLng = 0.10;
        var z = 15;
        var minX = Math.floor((lng - deltaLng + 180) / 360 * Math.pow(2, z));
        var maxX = Math.floor((lng + deltaLng + 180) / 360 * Math.pow(2, z));
        var minY = Math.floor((1 - Math.log(Math.tan((lat + deltaLat) * Math.PI / 180) + 1 / Math.cos((lat + deltaLat) * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        var maxY = Math.floor((1 - Math.log(Math.tan((lat - deltaLat) * Math.PI / 180) + 1 / Math.cos((lat - deltaLat) * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        
        var cfg = getTileConfig(currentLayer, currentIsDark);
        var count = 0;
        for (var x = minX; x <= maxX && count < 25; x++) {
          for (var y = minY; y <= maxY && count < 25; y++) {
            var tileUrl = cfg.url
              .replace('{z}', z)
              .replace('{x}', x)
              .replace('{y}', y)
              .replace('{s}', 'a');
            var preloader = new Image();
            preloader.src = tileUrl;
            count++;
          }
        }
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'offlineCacheComplete',
            tileCount: count
          }));
        }
      } catch(e) {}
    };

    window.setMapLayer = function(layerType) {
      if (!map) return;
      currentLayer = layerType;
      var cfg = getTileConfig(layerType, currentIsDark);
      if (tileLayer) {
        map.removeLayer(tileLayer);
      }
      tileLayer = L.tileLayer(cfg.url, {
        maxZoom: 19,
        minZoom: 3,
        maxNativeZoom: cfg.maxNativeZoom,
        className: cfg.className,
        noWrap: true,
        bounds: [[-85, -180], [85, 180]],
        subdomains: ['a', 'b', 'c', 'd'],
        crossOrigin: true
      }).addTo(map);

      document.body.style.background = cfg.bg;
      var mapEl = document.getElementById('map');
      if (mapEl) mapEl.style.background = cfg.bg;

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
        if (window.cacheSurrounding10km) {
          window.cacheSurrounding10km(lat, lng);
        }
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

    var corridorHaloLayer = null;
    window.renderPolyline = function(points, color, isDashed, showHalo, haloColor) {
      if (!map) return;
      if (polylineLayer) {
        map.removeLayer(polylineLayer);
        polylineLayer = null;
      }
      if (corridorHaloLayer) {
        map.removeLayer(corridorHaloLayer);
        corridorHaloLayer = null;
      }
      if (!points || points.length < 2) return;

      var latlngs = points.map(function(p) { return [p.latitude, p.longitude]; });

      // 150m Corridor Halo Buffer
      if (showHalo) {
        corridorHaloLayer = L.polyline(latlngs, {
          color: haloColor || '#10B981',
          weight: 42,
          opacity: 0.22,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      }

      polylineLayer = L.polyline(latlngs, {
        color: color || '#4F46E5',
        weight: 5,
        opacity: 0.95,
        dashArray: isDashed ? '8, 8' : undefined
      }).addTo(map);
    };

    window.set3DTilt = function(enabled) {
      var mapEl = document.getElementById('map');
      if (!mapEl) return;
      if (enabled) {
        document.body.style.perspective = '1000px';
        mapEl.style.transform = 'rotateX(35deg) scale(1.15)';
        mapEl.style.transformOrigin = 'center bottom';
        mapEl.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      } else {
        mapEl.style.transform = 'none';
      }
    };

    var clustersLayer = null;
    window.renderClusters = function(clustersList) {
      if (!map) return;
      if (clustersLayer) {
        map.removeLayer(clustersLayer);
        clustersLayer = null;
      }
      if (!clustersList || !clustersList.length) return;

      clustersLayer = L.layerGroup();
      clustersList.forEach(function(c) {
        var radius = Math.min(600, 150 + ((c.pointCount || 2) - 2) * 50);
        var sev = Number(c.avgSeverity || 3);
        var color = sev >= 3.5 ? '#EF4444' : (sev >= 2.5 ? '#F59E0B' : '#10B981');

        var circle = L.circle([c.centerLatitude, c.centerLongitude], {
          radius: radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.35,
          weight: 2
        });

        circle.bindTooltip('<b>Hazard Hotspot</b><br/>' + (c.pointCount || 1) + ' reports (Avg Severity ' + sev + ')', {
          permanent: false,
          direction: 'top'
        });

        clustersLayer.addLayer(circle);
      });
      clustersLayer.addTo(map);
    };

    function startMap() {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initMap();
      } else {
        window.addEventListener('DOMContentLoaded', initMap);
        window.addEventListener('load', initMap);
      }
    }
    startMap();
    setTimeout(startMap, 300);
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
      clusters = [],
      polyline,
      polylineColor = '#4F46E5',
      polylineDash = false,
      showCorridorHalo = false,
      corridorHaloColor = '#10B981',
      tilt3D = false,
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
      set3DTilt: (enabled: boolean) => {
        const script = `if (window.set3DTilt) { window.set3DTilt(${Boolean(enabled)}); }; true;`;
        webViewRef.current?.injectJavaScript(script);
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

    // Send clusters update whenever clusters prop changes
    useEffect(() => {
      if (!isMapLoaded) return;
      const script = `if (window.renderClusters) { window.renderClusters(${JSON.stringify(clusters || [])}); }; true;`;
      webViewRef.current?.injectJavaScript(script);
    }, [clusters, isMapLoaded]);

    // Send polyline update whenever polyline changes
    useEffect(() => {
      if (!isMapLoaded) return;
      const script = `if (window.renderPolyline) { window.renderPolyline(${JSON.stringify(polyline || [])}, "${polylineColor}", ${polylineDash}, ${Boolean(showCorridorHalo)}, "${corridorHaloColor}"); }; true;`;
      webViewRef.current?.injectJavaScript(script);
    }, [
      polyline,
      polylineColor,
      polylineDash,
      showCorridorHalo,
      corridorHaloColor,
      isMapLoaded,
    ]);

    // Send 3D tilt update whenever tilt3D changes
    useEffect(() => {
      if (!isMapLoaded) return;
      const script = `if (window.set3DTilt) { window.set3DTilt(${Boolean(tilt3D)}); }; true;`;
      webViewRef.current?.injectJavaScript(script);
    }, [tilt3D, isMapLoaded]);

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
            if (window.renderClusters) { window.renderClusters(${JSON.stringify(clusters || [])}); }
            if (window.renderPolyline) { window.renderPolyline(${JSON.stringify(polyline || [])}, "${polylineColor}", ${polylineDash}, ${Boolean(showCorridorHalo)}, "${corridorHaloColor}"); }
            if (window.set3DTilt) { window.set3DTilt(${Boolean(tilt3D)}); }
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
        } else if (data.type === 'error') {
          console.warn('[OpenMapView Web Error]:', data.message);
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
          }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          androidLayerType="hardware"
          scalesPageToFit={false}
          scrollEnabled={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onMessage={handleMessage}
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
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      color: '#94A3B8',
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 0.5,
                    }}
                  >
                    MAP STYLE
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsLayerMenuOpen(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={{
                        color: '#94A3B8',
                        fontSize: 13,
                        fontWeight: '700',
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

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
                  <Text style={styles.layerOptionIcon}>⚡</Text>
                  <Text
                    style={[
                      styles.layerOptionText,
                      activeLayer === 'default' && styles.layerOptionTextActive,
                    ]}
                  >
                    Dark Matrix
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.layerOptionBtn,
                    activeLayer === 'tactical' && styles.layerOptionBtnActive,
                  ]}
                  onPress={() => {
                    switchLayer('tactical');
                    setIsLayerMenuOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.layerOptionIcon}>🛡️</Text>
                  <Text
                    style={[
                      styles.layerOptionText,
                      activeLayer === 'tactical' &&
                        styles.layerOptionTextActive,
                    ]}
                  >
                    Tactical Gray
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
                    Street Map
                  </Text>
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
                      : activeLayer === 'tactical'
                        ? '🛡️'
                        : '⚡'}
                </Text>
                <Text style={styles.layerFabLabel}>
                  {activeLayer === 'satellite'
                    ? 'Satellite'
                    : activeLayer === 'street'
                      ? 'Street'
                      : activeLayer === 'tactical'
                        ? 'Tactical'
                        : 'Dark Matrix'}
                </Text>
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
    ...(StyleSheet.absoluteFill as object),
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
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
    minWidth: 140,
  },
  layerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginVertical: 2,
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

export default OpenMapView;
