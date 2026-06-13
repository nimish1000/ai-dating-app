import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

const BrandMark = ({ size = 'large', subtitle }) => (
  <View style={styles.wrap}>
    <View style={styles.row}>
      <Text style={[styles.star, size === 'small' && styles.starSmall]}>✦</Text>
      <Text style={[styles.brand, size === 'small' && styles.brandSmall]}>
        Star<Text style={styles.accent}>Match</Text>
      </Text>
    </View>
    {subtitle ? (
      <Text style={[styles.subtitle, size === 'small' && styles.subtitleSmall]}>
        {subtitle}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  star: {
    fontSize:   18,
    color:      colors.primary,
    marginTop:  2,
  },
  starSmall: {
    fontSize: 14,
  },
  brand: {
    fontSize:      typography.brandSize,
    fontWeight:    '300',
    letterSpacing: 1.5,
    color:         colors.text,
  },
  brandSmall: {
    fontSize:      20,
    letterSpacing: 1,
  },
  accent: {
    fontWeight: '600',
    color:      colors.primary,
  },
  subtitle: {
    marginTop:  10,
    fontSize:   typography.subtitleSize,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: 22,
  },
  subtitleSmall: {
    fontSize: 13,
    marginTop: 4,
  },
});

export default BrandMark;
