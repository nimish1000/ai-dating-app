import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuth } from '../context/authcontext';
import BrandMark from '../components/BrandMark';
import { colors, spacing, radius, buttonStyle, buttonTextStyle } from '../theme';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={16} color={colors.primary} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsFetching(true);
      const response = await api.get('/auth/me');
      setProfile(response.data.user);
    } catch (err) {
      console.error('Fetch profile error:', err);
      Alert.alert('Error', 'Could not load profile');
    } finally {
      setIsFetching(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Kya tum sure ho? Logout ho jaoge.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await api.post('/auth/logout');
              await logout();
              Alert.alert('Success', 'Aap logout ho gaye! 👋');
            } catch (err) {
              console.error('Logout error:', err);
              await logout();
              Alert.alert('Logged Out', 'Local logout ho gaya');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      <BrandMark size="small" subtitle="Your profile" />

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'Member'}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>

        <InfoRow icon="person-outline" label="Naam" value={user?.name || 'N/A'} />
        <InfoRow icon="mail-outline" label="Email" value={user?.email || 'N/A'} />
        <InfoRow icon="calendar-outline" label="Age" value={String(profile?.age || 'N/A')} />
        <InfoRow icon="male-female-outline" label="Gender" value={profile?.gender || 'N/A'} />
        <InfoRow icon="location-outline" label="City" value={profile?.current_city || 'N/A'} />

        {profile?.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.label}>Bio</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {profile?.created_at && (
          <InfoRow
            icon="time-outline"
            label="Member Since"
            value={new Date(profile.created_at).toLocaleDateString()}
          />
        )}
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => Alert.alert('Coming Soon', 'Edit profile feature aane wali hai!')}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={18} color={colors.text} />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutButton, isLoading && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color={colors.bg} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding:       spacing.lg,
    paddingBottom: spacing.xxl,
    gap:           spacing.lg,
    alignItems:    'center',
  },
  avatarSection: {
    alignItems: 'center',
    gap:        spacing.sm,
  },
  avatar: {
    width:           88,
    height:          88,
    borderRadius:    44,
    backgroundColor: colors.primaryGlow,
    borderWidth:     2,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontSize:   28,
    fontWeight: '600',
    color:      colors.primary,
    letterSpacing: 1,
  },
  profileName: {
    fontSize:   22,
    fontWeight: '600',
    color:      colors.text,
    marginTop:  spacing.xs,
  },
  profileEmail: {
    fontSize: 14,
    color:    colors.textMuted,
  },
  profileCard: {
    width:           '100%',
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.lg,
    gap:             spacing.md,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 2,
    color:         colors.primary,
    marginBottom:  spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: colors.primaryGlow,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       2,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize:   12,
    fontWeight: '500',
    color:      colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  value: {
    fontSize:   16,
    fontWeight: '500',
    color:      colors.text,
  },
  bioSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bioText: {
    fontSize:   14,
    color:      colors.textSecondary,
    lineHeight: 22,
    marginTop:  spacing.xs,
  },
  editButton: {
    width:           '100%',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         16,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  editButtonText: {
    color:      colors.text,
    fontSize:   15,
    fontWeight: '600',
  },
  logoutButton: {
    ...buttonStyle,
    width:          '100%',
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            spacing.sm,
  },
  logoutButtonText: {
    ...buttonTextStyle,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});

export default ProfileScreen;
