import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export { FontAwesome5, Feather, Ionicons, MaterialCommunityIcons };

export type IconFamily = 'fa' | 'feather' | 'ion' | 'mci';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  family?: IconFamily;
  regular?: boolean; // For FontAwesome5 outlined style
  solid?: boolean;
  style?: StyleProp<TextStyle>;
}

// Semantic alias map to make replacing emojis easy, consistent, and outlined
const ICON_ALIAS_MAP: Record<
  string,
  { name: string; family: IconFamily; regular?: boolean }
> = {
  // Security & Auth
  lock: { name: 'lock', family: 'feather' },
  unlock: { name: 'unlock', family: 'feather' },
  key: { name: 'key', family: 'feather' },
  shield: { name: 'shield', family: 'feather' },
  'shield-alt': { name: 'shield-alt', family: 'fa' },
  eye: { name: 'eye', family: 'feather' },
  'eye-off': { name: 'eye-off', family: 'feather' },

  // Emergency & Alerts
  alert: { name: 'alert-triangle', family: 'feather' },
  siren: { name: 'bell', family: 'fa', regular: true },
  bell: { name: 'bell', family: 'feather' },
  zap: { name: 'zap', family: 'feather' },
  mic: { name: 'mic', family: 'feather' },
  'mic-off': { name: 'mic-off', family: 'feather' },
  volume: { name: 'volume-2', family: 'feather' },
  mute: { name: 'volume-x', family: 'feather' },

  // Navigation & Location
  pin: { name: 'map-pin', family: 'feather' },
  map: { name: 'map', family: 'feather' },
  crosshair: { name: 'crosshair', family: 'feather' },
  compass: { name: 'compass', family: 'feather' },
  walking: { name: 'walking', family: 'fa' },
  navigation: { name: 'navigation', family: 'feather' },
  flag: { name: 'flag', family: 'feather' },
  home: { name: 'home', family: 'feather' },

  // Communication & Tools
  phone: { name: 'phone', family: 'feather' },
  'phone-call': { name: 'phone-call', family: 'feather' },
  message: { name: 'message-square', family: 'feather' },
  calculator: { name: 'grid', family: 'feather' },
  mail: { name: 'mail', family: 'feather' },

  // User & Actions
  user: { name: 'user', family: 'feather' },
  users: { name: 'users', family: 'feather' },
  check: { name: 'check', family: 'feather' },
  'check-circle': { name: 'check-circle', family: 'feather' },
  close: { name: 'x', family: 'feather' },
  x: { name: 'x', family: 'feather' },
  settings: { name: 'settings', family: 'feather' },
  cog: { name: 'cog', family: 'fa' },
  trash: { name: 'trash-2', family: 'feather' },
  logout: { name: 'log-out', family: 'feather' },
  camera: { name: 'camera', family: 'feather' },
  search: { name: 'search', family: 'feather' },
  refresh: { name: 'refresh-cw', family: 'feather' },
  share: { name: 'share-2', family: 'feather' },
  award: { name: 'award', family: 'feather' },
  clock: { name: 'clock', family: 'feather' },
  info: { name: 'info', family: 'feather' },
  battery: { name: 'battery', family: 'feather' },
  wifi: { name: 'wifi', family: 'feather' },
  edit: { name: 'edit-2', family: 'feather' },
  plus: { name: 'plus', family: 'feather' },
  lightbulb: { name: 'lightbulb', family: 'fa', regular: true },
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = '#FFFFFF',
  family,
  regular,
  solid,
  style,
}) => {
  const alias = ICON_ALIAS_MAP[name];
  const targetFamily = family || (alias ? alias.family : 'fa');
  const targetName = alias && !family ? alias.name : name;
  const isRegular = regular !== undefined ? regular : alias?.regular || false;

  switch (targetFamily) {
    case 'feather':
      return (
        <Feather name={targetName} size={size} color={color} style={style} />
      );
    case 'ion':
      return (
        <Ionicons name={targetName} size={size} color={color} style={style} />
      );
    case 'mci':
      return (
        <MaterialCommunityIcons
          name={targetName}
          size={size}
          color={color}
          style={style}
        />
      );
    case 'fa':
    default:
      return (
        <FontAwesome5
          name={targetName}
          size={size}
          color={color}
          regular={isRegular}
          solid={solid}
          style={style}
        />
      );
  }
};

export default Icon;
