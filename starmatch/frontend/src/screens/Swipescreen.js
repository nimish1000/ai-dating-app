import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, Animated, PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import BrandMark from '../components/BrandMark';
import { colors, spacing, radius, shadows } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const SwipeScreen = () => {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchPopup, setMatchPopup] = useState(null);

  const currentIndexRef = useRef(0);
  const profilesRef = useRef([]);
  const swipingRef = useRef(false);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/discover');
      setProfiles(response.data.profiles);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
    } catch (err) {
      Alert.alert('Error', 'Profiles load nahi hue. Internet check karo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwipe = useCallback((direction, gesture) => {
    if (swipingRef.current) return;
    const idx = currentIndexRef.current;
    const profs = profilesRef.current;
    const currentProfile = profs[idx];
    if (!currentProfile) return;

    swipingRef.current = true;

    const toX = direction === 'right' ? SCREEN_WIDTH + 200 : -SCREEN_WIDTH - 200;
    const toY = gesture ? gesture.dy + gesture.vy * 150 : 0;

    Animated.timing(position, {
      toValue: { x: toX, y: toY },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      const nextIndex = idx + 1;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      swipingRef.current = false;

      api.post('/swipe', {
        swiped_id: currentProfile.id,
        direction,
      }).then(response => {
        if (response.data.matched) {
          setMatchPopup({
            name: response.data.matched_with,
            matchId: response.data.match_id,
          });
        }
      }).catch(err => {
        console.log('Swipe error:', err.message);
      });
    });
  }, [position]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !swipingRef.current,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && !swipingRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (swipingRef.current) return;

        if (gesture.dx > SWIPE_THRESHOLD || gesture.vx > 0.8) {
          handleSwipe('right', gesture);
        } else if (gesture.dx < -SWIPE_THRESHOLD || gesture.vx < -0.8) {
          handleSwipe('left', gesture);
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const cardOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.6, 0, SCREEN_WIDTH * 0.6],
    outputRange: [0.4, 1, 0.4],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 5, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  const nextCardOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0.5, 1],
    extrapolate: 'clamp',
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Curating profiles for you...</Text>
      </View>
    );
  }

  const currentProfile = profiles[currentIndex];

  if (!currentProfile) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIcon}>
          <Ionicons name="moon-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Abhi ke liye bas</Text>
        <Text style={styles.emptyText}>
          Aaj ke saare profiles dekh liye. Kal dobara aao!
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchProfiles} activeOpacity={0.85}>
          <Text style={styles.refreshBtnText}>Dobara Try Karo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <BrandMark size="small" />
        <Text style={styles.headerTagline}>Discover</Text>
      </View>

      <View style={styles.cardContainer}>
        {profiles[currentIndex + 1] && (
          <Animated.View style={[
            styles.card,
            styles.cardBehind,
            {
              transform: [{ scale: nextCardScale }],
              opacity: nextCardOpacity,
            },
          ]}>
            <ProfileCard profile={profiles[currentIndex + 1]} />
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotation },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
            <Text style={styles.likeLabelText}>LIKE</Text>
          </Animated.View>

          <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
            <Text style={styles.nopeLabelText}>PASS</Text>
          </Animated.View>

          <ProfileCard profile={currentProfile} />
        </Animated.View>
      </View>

      <View style={styles.hintContainer}>
        <Ionicons name="arrow-back" size={14} color={colors.textMuted} />
        <Text style={styles.hintText}>Swipe to explore</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
      </View>

      {matchPopup && (
        <View style={styles.matchOverlay}>
          <View style={styles.matchCard}>
            <View style={styles.matchIconRing}>
              <Ionicons name="heart" size={32} color={colors.primary} />
            </View>
            <Text style={styles.matchTitle}>It's a Match</Text>
            <Text style={styles.matchText}>
              Tum aur {matchPopup.name} ne ek doosre ko like kiya
            </Text>
            <TouchableOpacity
              style={styles.matchBtn}
              onPress={() => setMatchPopup(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.matchBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const ProfileCard = ({ profile }) => (
  <View style={styles.cardInner}>
    {profile.photo ? (
      <Image source={{ uri: profile.photo }} style={styles.photo} resizeMode="cover" />
    ) : (
      <View style={styles.photoPlaceholder}>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
      </View>
    )}

    <View style={styles.photoGradient} />

    <View style={styles.cardInfo}>
      <Text style={styles.cardName}>
        {profile.name}
        {profile.age ? <Text style={styles.cardAge}>, {profile.age}</Text> : null}
      </Text>
      {profile.current_city && (
        <View style={styles.cityRow}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={styles.cardCity}>{profile.current_city}</Text>
        </View>
      )}
      {profile.bio && (
        <Text style={styles.cardBio} numberOfLines={2}>
          {profile.bio}
        </Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg,
    overflow:        'hidden',
  },
  centered: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    padding:         spacing.lg,
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: spacing.md,
    color:     colors.textSecondary,
    fontSize:  15,
    letterSpacing: 0.3,
  },
  emptyIcon: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: colors.primaryGlow,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.lg,
  },
  emptyTitle: {
    fontSize:   22,
    fontWeight: '600',
    color:      colors.text,
  },
  emptyText: {
    fontSize:  15,
    color:     colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  refreshBtn: {
    marginTop:       spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical:   14,
    borderRadius:      radius.full,
  },
  refreshBtnText: {
    color:         colors.bg,
    fontWeight:    '700',
    fontSize:      14,
    letterSpacing: 0.5,
  },

  header: {
    paddingBottom: spacing.md,
    alignItems:    'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTagline: {
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 3,
    color:         colors.textMuted,
    marginTop:     4,
    textTransform: 'uppercase',
  },

  cardContainer: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    overflow:        'hidden',
  },
  card: {
    position:        'absolute',
    width:           SCREEN_WIDTH - 16,
    height:          '95%',
    borderRadius:    radius.xl,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  cardBehind: {
    top: 8,
  },
  cardInner: {
    flex:         1,
    borderRadius: radius.xl,
    overflow:     'hidden',
  },
  photo: {
    width:  '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  photoPlaceholder: {
    width:           '100%',
    height:          '100%',
    backgroundColor: colors.surfaceLight,
    justifyContent:  'center',
    alignItems:      'center',
  },
  photoGradient: {
    position:   'absolute',
    bottom:     0,
    left:       0,
    right:      0,
    height:     '50%',
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
  },
  cardInfo: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
    padding:  spacing.lg,
  },
  cardName: {
    fontSize:   26,
    fontWeight: '600',
    color:      colors.text,
  },
  cardAge: {
    fontWeight: '400',
    color:      colors.textSecondary,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginTop:     6,
  },
  cardCity: {
    fontSize: 14,
    color:    colors.textSecondary,
  },
  cardBio: {
    fontSize:   14,
    color:      colors.textSecondary,
    marginTop:  spacing.sm,
    lineHeight: 20,
  },

  likeLabel: {
    position:        'absolute',
    top:             36,
    left:            20,
    zIndex:          10,
    borderWidth:     2,
    borderColor:     colors.success,
    borderRadius:    radius.sm,
    paddingHorizontal: 12,
    paddingVertical:   6,
    backgroundColor: 'rgba(94, 173, 126, 0.12)',
    transform:       [{ rotate: '-12deg' }],
  },
  likeLabelText: {
    fontSize:      20,
    fontWeight:    '800',
    color:         colors.success,
    letterSpacing: 2,
  },
  nopeLabel: {
    position:        'absolute',
    top:             36,
    right:           20,
    zIndex:          10,
    borderWidth:     2,
    borderColor:     colors.error,
    borderRadius:    radius.sm,
    paddingHorizontal: 12,
    paddingVertical:   6,
    backgroundColor: 'rgba(212, 100, 100, 0.12)',
    transform:       [{ rotate: '12deg' }],
  },
  nopeLabelText: {
    fontSize:      20,
    fontWeight:    '800',
    color:         colors.error,
    letterSpacing: 2,
  },

  hintContainer: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
  },
  hintText: {
    fontSize:      12,
    color:         colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  matchOverlay: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay,
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          100,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.xl,
    alignItems:      'center',
    marginHorizontal: spacing.lg,
    width:           SCREEN_WIDTH - 48,
  },
  matchIconRing: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: colors.primaryGlow,
    borderWidth:     1,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.md,
  },
  matchTitle: {
    fontSize:   26,
    fontWeight: '600',
    color:      colors.primary,
  },
  matchText: {
    fontSize:   15,
    color:      colors.textSecondary,
    textAlign:  'center',
    marginTop:  spacing.sm,
    lineHeight: 22,
  },
  matchBtn: {
    marginTop:       spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical:   14,
    borderRadius:      radius.full,
    width:             '100%',
    alignItems:        'center',
  },
  matchBtnText: {
    color:         colors.bg,
    fontWeight:    '700',
    fontSize:      15,
    letterSpacing: 0.5,
  },
});

export default SwipeScreen;
