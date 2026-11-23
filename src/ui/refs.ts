import { type ComponentRef } from 'react';
import { type ScrollView, type TextInput, type View } from 'react-native';

/** Instance types for refs to host components (React Native 0.88 typings). */
export type ViewRef = ComponentRef<typeof View>;
export type TextInputRef = ComponentRef<typeof TextInput>;
export type ScrollViewRef = ComponentRef<typeof ScrollView>;
