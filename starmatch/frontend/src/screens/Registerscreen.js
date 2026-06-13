import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../utils/api';
import { useAuth } from '../context/authcontext';
import ScreenBackground from '../components/ScreenBackground';
import BrandMark from '../components/BrandMark';
import { colors, spacing, radius, inputStyle, buttonStyle, buttonTextStyle } from '../theme';

const RegisterScreen = ({ navigation }) => {
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [birthDate,   setBirthDate]   = useState('');
  const [gender,      setGender]      = useState('');
  const [photo,       setPhoto]       = useState(null);
  const [isLoading,   setIsLoading]   = useState(false);

  const { login } = useAuth();

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not pick image: ' + err.message);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Ruko!', 'Name, email aur password zaroori hain.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password Chota Hai', 'Password kam se kam 8 characters ka hona chahiye.');
      return;
    }
    if (!photo) {
      Alert.alert('Photo Required', 'Sorry, Profile Picture is required.');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password.trim());
      if (birthDate) formData.append('birth_date', birthDate);
      if (gender) formData.append('gender', gender);

      const fileType = photo.uri.split('.').pop()?.toLowerCase();
      const mimeType = fileType === 'png'
        ? 'image/png'
        : fileType === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

      formData.append('photo', {
        uri: photo.uri,
        type: mimeType,
        name: photo.fileName || `photo-${Date.now()}.${fileType || 'jpg'}`,
      });

      const response = await api.post('/auth/register', formData);

      const { token, user, otp_sent, otp_error } = response.data;
      await login(token, {
        ...user,
      }, true);

      if (otp_sent) {
        Alert.alert('OTP Bheja! 📧', `${email.trim().toLowerCase()} pe verification code gaya. Verify karo.`);
      } else if (otp_error) {
        Alert.alert('OTP nahi gaya', otp_error);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Registration nahi hui.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const GenderButton = ({ value, label }) => (
    <TouchableOpacity
      style={[styles.genderBtn, gender === value && styles.genderBtnSelected]}
      onPress={() => setGender(value)}
      activeOpacity={0.8}
    >
      <Text style={[styles.genderText, gender === value && styles.genderTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BrandMark size="small" subtitle="Premium connections, curated for you" />

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>PROFILE PHOTO</Text>
            <TouchableOpacity
              style={[styles.photoBox, !photo && styles.photoBoxEmpty]}
              onPress={handlePickPhoto}
              activeOpacity={0.85}
            >
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <View style={styles.photoIconRing}>
                    <Text style={styles.photoIconText}>+</Text>
                  </View>
                  <Text style={styles.photoPlaceholderText}>Photo chuno</Text>
                  <Text style={styles.photoPlaceholderSubtext}>Required</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>DETAILS</Text>

            <TextInput
              style={styles.input}
              placeholder="Tumhara naam"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password (min 8 characters)"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Birth date (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={birthDate}
              onChangeText={setBirthDate}
            />

            <Text style={styles.fieldLabel}>I am</Text>
            <View style={styles.genderRow}>
              <GenderButton value="male"   label="Male" />
              <GenderButton value="female" label="Female" />
              <GenderButton value="other"  label="Other" />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.buttonText}>Create Account</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>
                Pehle se account hai?{' '}
                <Text style={styles.linkHighlight}>Login karo</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding:       spacing.lg,
    paddingTop:    56,
    paddingBottom: spacing.xxl,
    gap:           spacing.lg,
  },
  formCard: {
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
    letterSpacing: 1.8,
    color:         colors.primary,
    marginTop:     spacing.xs,
  },
  photoBox: {
    width:           '100%',
    height:          200,
    borderRadius:    radius.md,
    overflow:        'hidden',
    backgroundColor: colors.surfaceLight,
  },
  photoBoxEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPreview: {
    width:      '100%',
    height:     '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
  },
  photoIconRing: {
    width:           52,
    height:          52,
    borderRadius:    26,
    borderWidth:     1,
    borderColor:     colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.primaryGlow,
  },
  photoIconText: {
    fontSize:   28,
    color:      colors.primary,
    fontWeight: '300',
    marginTop:  -2,
  },
  photoPlaceholderText: {
    fontSize:   15,
    fontWeight: '600',
    color:      colors.text,
  },
  photoPlaceholderSubtext: {
    fontSize: 12,
    color:    colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    ...inputStyle,
  },

  fieldLabel: {
    fontSize:   13,
    fontWeight: '600',
    color:      colors.textSecondary,
    marginTop:  spacing.xs,
  },
  genderRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  genderBtn: {
    flex:            1,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.sm,
    paddingVertical: 12,
    alignItems:      'center',
    backgroundColor: colors.surfaceLight,
  },
  genderBtnSelected: {
    borderColor:     colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  genderText: {
    color:    colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  genderTextSelected: {
    color:      colors.primary,
    fontWeight: '700',
  },
  button: {
    ...buttonStyle,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    ...buttonTextStyle,
  },
  linkButton: {
    alignItems:    'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    color:    colors.textSecondary,
    fontSize: 14,
  },
  linkHighlight: {
    color:      colors.primary,
    fontWeight: '600',
  },
});

export default RegisterScreen;
