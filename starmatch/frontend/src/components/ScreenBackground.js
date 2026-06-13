import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

const ScreenBackground = ({ children, style }) => (
  <View style={[styles.root, style]}>
    <View style={styles.glowTop} />
    <View style={styles.glowBottom} />
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  glowTop: {
    position:        'absolute',
    top:             -80,
    right:           -60,
    width:           220,
    height:          220,
    borderRadius:    110,
    backgroundColor: colors.primaryGlow,
  },
  glowBottom: {
    position:        'absolute',
    bottom:          120,
    left:            -80,
    width:           200,
    height:          200,
    borderRadius:    100,
    backgroundColor: colors.accentSoft,
  },
});

export default ScreenBackground;
