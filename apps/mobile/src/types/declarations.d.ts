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

declare module 'react-native-vector-icons/Feather' {
  import React from 'react';
  import { TextStyle, StyleProp } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
    testID?: string;
  }

  export default class Feather extends React.Component<IconProps> {}
}

declare module 'react-native-vector-icons/*' {
  import React from 'react';
  import { TextStyle, StyleProp } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
    testID?: string;
  }

  export default class Icon extends React.Component<IconProps> {}
}

declare const require: (id: string) => any;
