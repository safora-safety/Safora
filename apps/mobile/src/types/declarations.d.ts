declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}

declare const require: (id: string) => any;

declare module 'react-native-vector-icons/FontAwesome5' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';
  export interface FontAwesome5IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    light?: boolean;
    regular?: boolean;
    solid?: boolean;
    brand?: boolean;
  }
  export default class FontAwesome5 extends Component<FontAwesome5IconProps> {}
}

declare module 'react-native-vector-icons/Feather' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';
  export interface FeatherIconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }
  export default class Feather extends Component<FeatherIconProps> {}
}

declare module 'react-native-vector-icons/Ionicons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';
  export interface IoniconsIconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }
  export default class Ionicons extends Component<IoniconsIconProps> {}
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';
  export interface MaterialCommunityIconsProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }
  export default class MaterialCommunityIcons extends Component<MaterialCommunityIconsProps> {}
}
