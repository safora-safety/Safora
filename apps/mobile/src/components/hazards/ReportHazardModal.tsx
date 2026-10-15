import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Switch,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { HazardCategory, HazardReport } from '@safora/shared-types';
import { ReportService } from '../../services/reportService';
import { reverseGeocode } from '../../services/locationService';
import { useAuthStore } from '../../store/authStore';
import { navigationRef } from '../../navigation/RootNavigator';
import { OpenMapView } from '../map/OpenMapView';
import { HazardCategoryChips } from './HazardCategoryChips';

interface ReportHazardModalProps {
  visible: boolean;
  onClose: () => void;
  coordinates: { latitude: number; longitude: number };
  onReportCreated: (report: HazardReport) => void;
}

const SAMPLE_PHOTO_PRESETS = [
  {
    name: 'Broken Streetlight',
    url: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Open Trench / Pothole',
    url: 'https://images.unsplash.com/photo-1578873375969-d65261d76587?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dark Trail / Alley',
    url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
  },
];

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({
  visible,
  onClose,
  coordinates,
  onReportCreated,
}) => {
  const { colors, isDark } = useTheme();
  const { isGuest } = useAuthStore();
  const [category, setCategory] = useState<HazardCategory>('lighting');
  const [customCategoryTitle, setCustomCategoryTitle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(3);
  const [photoList, setPhotoList] = useState<string[]>([]);
  const [customPhotoInput, setCustomPhotoInput] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pin location state (defaults to live device coordinates, adjustable by user)
  const [reportLat, setReportLat] = useState(coordinates.latitude);
  const [reportLng, setReportLng] = useState(coordinates.longitude);
  const [reportAddress, setReportAddress] = useState<string>('');
  const [isEditingPin, setIsEditingPin] = useState(false);

  React.useEffect(() => {
    setReportLat(coordinates.latitude);
    setReportLng(coordinates.longitude);
    reverseGeocode(coordinates.latitude, coordinates.longitude).then(
      setReportAddress,
    );
  }, [coordinates.latitude, coordinates.longitude, visible]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      reverseGeocode(reportLat, reportLng).then(setReportAddress);
    }, 600);
    return () => clearTimeout(timer);
  }, [reportLat, reportLng]);

  const handleTakePhoto = async () => {
    if (photoList.length >= 3) {
      Alert.alert(
        'Maximum Photos',
        'You can attach up to 3 photos per hazard report.',
      );
      return;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message:
              'Safora needs camera access so you can capture photo evidence of road and safety hazards.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Camera Permission Denied',
            'Camera permission is required to capture hazard photos directly. You can also pick a photo from your gallery.',
          );
          return;
        }
      } catch (err) {
        console.warn('Camera permission request error:', err);
      }
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.uri) {
        setPhotoList(prev => [...prev.slice(0, 2), asset.uri!]);
        setShowPhotoInput(false);
      }
    } catch {
      Alert.alert('Camera Error', 'Could not open camera on device.');
    }
  };

  const handlePickGallery = async () => {
    if (photoList.length >= 3) {
      Alert.alert(
        'Maximum Photos',
        'You can attach up to 3 photos per hazard report.',
      );
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.uri) {
        setPhotoList(prev => [...prev.slice(0, 2), asset.uri!]);
        setShowPhotoInput(false);
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not open photo gallery.');
    }
  };

  const handleAddPresetPhoto = (url: string) => {
    if (photoList.length >= 3) {
      Alert.alert(
        'Maximum Photos',
        'You can attach up to 3 photos per hazard report.',
      );
      return;
    }
    setPhotoList(prev => [...prev.slice(0, 2), url]);
    setShowPhotoInput(false);
  };

  const handleAddCustomUrlPhoto = () => {
    if (!customPhotoInput.trim()) return;
    if (photoList.length >= 3) {
      Alert.alert(
        'Maximum Photos',
        'You can attach up to 3 photos per hazard report.',
      );
      return;
    }
    setPhotoList(prev => [...prev.slice(0, 2), customPhotoInput.trim()]);
    setCustomPhotoInput('');
    setShowPhotoInput(false);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isGuest) {
      Alert.alert(
        'Account Required to Report Hazards',
        'To maintain safety data integrity and prevent false reports, reporting community hazards requires a registered citizen account.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In / Register',
            onPress: () => {
              onClose();
              if (navigationRef.isReady()) {
                navigationRef.navigate('Auth', { initialTab: 'register' });
              }
            },
          },
        ],
      );
      return;
    }

    setFormError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setFormError('Please enter a descriptive hazard title (min 3 chars).');
      return;
    }

    setLoading(true);
    try {
      let uploadedUrls: string[] = [];
      if (photoList.length > 0) {
        setIsUploadingPhoto(true);
        try {
          for (let i = 0; i < photoList.length; i++) {
            const uri = photoList[i];
            if (uri.startsWith('http')) {
              uploadedUrls.push(uri);
            } else {
              try {
                const uploaded = await ReportService.uploadPhoto(
                  uri,
                  `hazard_${Date.now()}_${i}.jpg`,
                );
                uploadedUrls.push(uploaded);
              } catch {
                uploadedUrls.push(uri);
              }
            }
          }
        } finally {
          setIsUploadingPhoto(false);
        }
      }

      const finalDescription = [
        customCategoryTitle.trim()
          ? `[Custom Hazard Type: ${customCategoryTitle.trim()}]`
          : null,
        description.trim() ? description.trim() : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      const created = await ReportService.create({
        category,
        title: trimmedTitle,
        description: finalDescription || undefined,
        severity,
        latitude: reportLat,
        longitude: reportLng,
        photo_url: uploadedUrls[0] || undefined,
        photo_urls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        is_anonymous: isAnonymous,
      });

      Alert.alert(
        'Hazard Reported',
        'Thank you! Your safety report & photo evidence has been added to the community radar.',
      );
      onReportCreated(created);
      setTitle('');
      setCustomCategoryTitle('');
      setDescription('');
      setSeverity(3);
      setPhotoList([]);
      setIsAnonymous(false);
      setCustomPhotoInput('');
      setShowPhotoInput(false);
      onClose();
    } catch {
      setFormError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityLabel = (sev: number) => {
    switch (sev) {
      case 1:
        return '1 - Minor Nuisance';
      case 2:
        return '2 - Low Risk';
      case 3:
        return '3 - Moderate Caution';
      case 4:
        return '4 - High Risk Danger';
      case 5:
        return '5 - Critical Emergency';
      default:
        return `${sev}`;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Report Street Hazard
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Pin dangerous roads, broken lights, or isolated trails
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
          >
            {/* Early Guest Mode Guard */}
            {isGuest ? (
              <View style={styles.guestGuardBox}>
                <Text style={styles.guestGuardIcon}>🔒</Text>
                <Text
                  style={[
                    styles.guestGuardTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Citizen Account Required
                </Text>
                <Text
                  style={[
                    styles.guestGuardDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  To maintain safety radar integrity and prevent fake reports,
                  reporting community street hazards requires a registered
                  citizen account.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.guestActionBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    onClose();
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('Auth', {
                        initialTab: 'register',
                      });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.guestActionBtnText}>
                    Sign In / Register Account →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {formError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️ {formError}</Text>
                  </View>
                )}

                {/* Category Selector */}
                <HazardCategoryChips
                  category={category}
                  onSelectCategory={setCategory}
                  customCategoryTitle={customCategoryTitle}
                  onChangeCustomCategoryTitle={setCustomCategoryTitle}
                />

                {/* Location Pin with Interactive Mini Map (No typing numbers) */}
                <View style={styles.group}>
                  <View style={styles.locationHeaderRow}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                      Hazard Pin Location
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsEditingPin(!isEditingPin)}
                      style={styles.adjustPinBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.adjustPinBtnText}>
                        {isEditingPin
                          ? '✓ Done Adjusting'
                          : '📍 Adjust Pin on Map'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.locationCard,
                      {
                        backgroundColor: colors.backgroundInput,
                        borderColor: isEditingPin
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.locationIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.locationCoordsText,
                          {
                            color: colors.textPrimary,
                            fontWeight: '800',
                            fontSize: 13,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {reportAddress || 'Resolving street address...'}
                      </Text>
                      <Text
                        style={[
                          styles.locationHelpText,
                          {
                            color: colors.textMuted,
                            fontSize: 11,
                            marginTop: 2,
                          },
                        ]}
                      >
                        GPS Pin: {reportLat.toFixed(5)}, {reportLng.toFixed(5)}
                      </Text>
                    </View>
                  </View>

                  {/* Interactive Map Pin Adjuster */}
                  {isEditingPin && (
                    <View style={styles.miniMapWrapper}>
                      <Text
                        style={[
                          styles.miniMapHelp,
                          { color: colors.textSecondary },
                        ]}
                      >
                        🗺️ Tap anywhere on the map to reposition hazard pin:
                      </Text>
                      <View style={styles.miniMapBox}>
                        <OpenMapView
                          center={{ latitude: reportLat, longitude: reportLng }}
                          zoom={16}
                          isDark={isDark}
                          showLayerSwitcher={false}
                          markers={[
                            {
                              id: 'hazard-pin',
                              latitude: reportLat,
                              longitude: reportLng,
                              icon: '⚠️',
                              title: 'Hazard Pin',
                              color: '#EF4444',
                            },
                          ]}
                          onMapPress={c => {
                            setReportLat(c.latitude);
                            setReportLng(c.longitude);
                          }}
                          style={styles.miniMap}
                        />
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.resetGpsBtn,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.backgroundInput,
                          },
                        ]}
                        onPress={() => {
                          setReportLat(coordinates.latitude);
                          setReportLng(coordinates.longitude);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.resetGpsText,
                            { color: colors.primary },
                          ]}
                        >
                          📍 Reset to Current Live GPS Coordinates
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Title Input */}
                <View style={styles.group}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    Hazard Title <Text style={styles.req}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.backgroundInput,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="e.g., Unlit Canal Path Behind Hostel"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Severity Rating */}
                <View style={styles.group}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                      Danger Severity Rating
                    </Text>
                    <Text
                      style={[
                        styles.sevIndicator,
                        {
                          color:
                            severity >= 4
                              ? '#EF4444'
                              : severity === 3
                                ? '#F59E0B'
                                : '#38BDF8',
                        },
                      ]}
                    >
                      {getSeverityLabel(severity)}
                    </Text>
                  </View>

                  <View style={styles.sevButtonsRow}>
                    {[1, 2, 3, 4, 5].map(num => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.sevButton,
                          {
                            backgroundColor:
                              severity === num
                                ? num >= 4
                                  ? '#EF4444'
                                  : num === 3
                                    ? '#F59E0B'
                                    : '#38BDF8'
                                : colors.backgroundInput,
                            borderColor:
                              severity === num ? '#FFFFFF' : colors.border,
                          },
                        ]}
                        onPress={() => setSeverity(num)}
                      >
                        <Text
                          style={[
                            styles.sevButtonText,
                            {
                              color:
                                severity === num
                                  ? '#FFFFFF'
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Photo Proof Evidence (Up to 3 Photos) */}
                <View style={styles.group}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                      Photo Proof Evidence{' '}
                      <Text style={styles.opt}>
                        ({photoList.length}/3 photos)
                      </Text>
                    </Text>
                  </View>

                  {/* Horizontal Photo Thumbnails Strip */}
                  {photoList.length > 0 && (
                    <View style={styles.photosStrip}>
                      {photoList.map((url, idx) => (
                        <View
                          key={`${url}-${idx}`}
                          style={styles.photoThumbCard}
                        >
                          <Image
                            source={{ uri: url }}
                            style={styles.photoThumbImage}
                          />
                          <TouchableOpacity
                            onPress={() => handleRemovePhoto(idx)}
                            style={styles.photoThumbRemoveBtn}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.photoThumbRemoveText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add Photo Button (If under 3 photos) */}
                  {photoList.length < 3 && (
                    <View style={styles.photoPresetRow}>
                      <TouchableOpacity
                        style={[
                          styles.addPhotoBtn,
                          {
                            backgroundColor: colors.backgroundInput,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setShowPhotoInput(!showPhotoInput)}
                      >
                        <Text style={styles.addPhotoBtnIcon}>📸</Text>
                        <Text
                          style={[
                            styles.addPhotoBtnText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {showPhotoInput
                            ? 'Cancel Photo Picker'
                            : `+ Attach Photo Proof (${photoList.length}/3)`}
                        </Text>
                      </TouchableOpacity>

                      {showPhotoInput && (
                        <View style={styles.presetOptionsBox}>
                          <Text
                            style={[
                              styles.presetTitle,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Capture or upload photo:
                          </Text>

                          {isUploadingPhoto ? (
                            <View
                              style={{
                                paddingVertical: 12,
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <ActivityIndicator
                                size="small"
                                color={colors.primary}
                              />
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.textSecondary,
                                }}
                              >
                                Uploading evidence to cloud storage...
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginBottom: 12,
                              }}
                            >
                              <TouchableOpacity
                                style={[
                                  styles.pickerActionBtn,
                                  {
                                    backgroundColor: colors.backgroundCard,
                                    borderColor: colors.border,
                                  },
                                ]}
                                onPress={handleTakePhoto}
                              >
                                <Text style={styles.pickerActionIcon}>📷</Text>
                                <Text
                                  style={[
                                    styles.pickerActionText,
                                    { color: colors.textPrimary },
                                  ]}
                                >
                                  Take Photo
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.pickerActionBtn,
                                  {
                                    backgroundColor: colors.backgroundCard,
                                    borderColor: colors.border,
                                  },
                                ]}
                                onPress={handlePickGallery}
                              >
                                <Text style={styles.pickerActionIcon}>🖼️</Text>
                                <Text
                                  style={[
                                    styles.pickerActionText,
                                    { color: colors.textPrimary },
                                  ]}
                                >
                                  Choose Gallery
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          <Text
                            style={[
                              styles.presetTitle,
                              { color: colors.textSecondary, marginTop: 4 },
                            ]}
                          >
                            Or choose quick preset proof:
                          </Text>
                          <View style={styles.presetChipsRow}>
                            {SAMPLE_PHOTO_PRESETS.map(preset => (
                              <TouchableOpacity
                                key={preset.name}
                                style={[
                                  styles.presetChip,
                                  {
                                    backgroundColor: colors.backgroundCard,
                                    borderColor: colors.border,
                                  },
                                ]}
                                onPress={() => handleAddPresetPhoto(preset.url)}
                              >
                                <Text
                                  style={[
                                    styles.presetChipText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  {preset.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <View style={styles.customUrlRow}>
                            <TextInput
                              style={[
                                styles.input,
                                {
                                  flex: 1,
                                  backgroundColor: colors.backgroundCard,
                                  borderColor: colors.border,
                                  color: colors.textPrimary,
                                },
                              ]}
                              placeholder="Or paste image URL..."
                              placeholderTextColor={colors.textMuted}
                              value={customPhotoInput}
                              onChangeText={setCustomPhotoInput}
                            />
                            <TouchableOpacity
                              style={[
                                styles.applyUrlBtn,
                                { backgroundColor: colors.primary },
                              ]}
                              onPress={handleAddCustomUrlPhoto}
                            >
                              <Text style={styles.applyUrlText}>Attach</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Description */}
                <View style={styles.group}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    Additional Details{' '}
                    <Text style={styles.opt}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: colors.backgroundInput,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="Describe landmark or specific danger points..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                {/* Anonymous Reporting Switch */}
                <View
                  style={[
                    styles.anonSwitchCard,
                    {
                      backgroundColor: colors.backgroundInput,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={[styles.anonTitle, { color: colors.textPrimary }]}
                    >
                      🕵️ Report Anonymously
                    </Text>
                    <Text
                      style={[styles.anonDesc, { color: colors.textSecondary }]}
                    >
                      Hide your profile name on the public community safety map.
                    </Text>
                  </View>
                  <Switch
                    value={isAnonymous}
                    onValueChange={setIsAnonymous}
                    trackColor={{ false: '#334155', true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.backgroundInput,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
              disabled={loading}
            >
              <Text
                style={[styles.cancelBtnText, { color: colors.textSecondary }]}
              >
                {isGuest ? 'Close' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            {!isGuest && (
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  loading && styles.btnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Hazard Pin</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, fontWeight: '700' },
  form: { padding: 20, gap: 16 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
  },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  group: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '700' },
  req: { color: '#EF4444' },
  opt: { fontSize: 11, fontWeight: '400', opacity: 0.6 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryIcon: { fontSize: 20 },
  categoryLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustPinBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  adjustPinBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  locationIcon: { fontSize: 18 },
  locationCoordsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationHelpText: {
    fontSize: 10,
    marginTop: 2,
  },
  miniMapWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  miniMapHelp: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  miniMapBox: {
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  resetGpsBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetGpsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  textArea: { minHeight: 70 },
  sevIndicator: { fontSize: 11, fontWeight: '800' },
  sevButtonsRow: { flexDirection: 'row', gap: 8 },
  sevButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevButtonText: { fontSize: 13, fontWeight: '800' },

  // Multi-Photo Styles
  photosStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  photoThumbCard: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoThumbRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoThumbRemoveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  photoPresetRow: { gap: 10 },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPhotoBtnIcon: { fontSize: 16 },
  addPhotoBtnText: { fontSize: 12, fontWeight: '700' },
  presetOptionsBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  presetTitle: { fontSize: 11, fontWeight: '600' },
  pickerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  pickerActionIcon: { fontSize: 16 },
  pickerActionText: { fontSize: 12, fontWeight: '700' },
  presetChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetChip: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  presetChipText: { fontSize: 11, fontWeight: '700' },
  customUrlRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  applyUrlBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyUrlText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },

  // Anonymous Switch Card
  anonSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  anonTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  anonDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // Early Guest Mode Guard Box
  guestGuardBox: {
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestGuardIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  guestGuardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestGuardDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  guestActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
  },
  guestActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '700', fontSize: 13 },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
});

export default ReportHazardModal;
