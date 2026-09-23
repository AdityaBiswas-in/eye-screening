import React, { ReactNode } from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';

interface PhoneFrameProps {
  children: ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  return <SafeAreaView style={styles.nativeContainer}>{children}</SafeAreaView>;
};

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
