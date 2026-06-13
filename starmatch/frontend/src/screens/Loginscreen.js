import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import api from '../utils/api';
import { useAuth } from '../context/authcontext';
import ScreenBackground from '../components/ScreenBackground';
import BrandMark from '../components/BrandMark';
import { colors, spacing, radius, inputStyle, buttonStyle, buttonTextStyle } from '../theme';

const LoginScreen = ({ navigation }) => {
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focused,   setFocused]   = useState(null);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ruko!', 'Email aur password dono bharo.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email:    email.trim().toLowerCase(),
        password: password.trim(),
      });

      const { token, user } = response.data;
      await login(token, {
        ...user,
        is_phone_verified: user.is_phone_verified ?? false,
      });
    } catch (err) {
      const message = err.response?.data?.error || 'Login nahi hua. Try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <BrandMark subtitle="Apna perfect match dhundo" />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formLabel}>WELCOME BACK</Text>

          <TextInput
            style={[styles.input, focused === 'email' && styles.inputFocused]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={[styles.input, focused === 'password' && styles.inputFocused]}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.buttonText}>Login Karo</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ya</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              Naya account?{' '}
              <Text style={styles.linkHighlight}>Register karo</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:              1,
    justifyContent:    'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems:   'center',
    marginBottom: spacing.xl,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.lg,
    gap:             spacing.md,
  },
  formLabel: {
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 2,
    color:         colors.primary,
    marginBottom:  spacing.xs,
  },
  input: {
    ...inputStyle,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surfaceLight,
  },
  button: {
    ...buttonStyle,
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    ...buttonTextStyle,
  },
  divider: {
    flexDirection: 'row',
    alignItems:    'center',
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color:            colors.textMuted,
    fontSize:         13,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
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

export default LoginScreen;
