import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import api from '../utils/api';
import { useAuth } from '../context/authcontext';
import ScreenBackground from '../components/ScreenBackground';
import BrandMark from '../components/BrandMark';
import { colors, spacing, radius, buttonStyle, buttonTextStyle } from '../theme';

const PhoneAuthScreen = () => {
  const { user, updateUser } = useAuth();
  const registeredEmail = user?.email || '';

  const [currentStep, setCurrentStep] = useState(registeredEmail ? 2 : 1);
  const [emailAddress, setEmailAddress] = useState(registeredEmail);
  const [isLoading,   setIsLoading]   = useState(false);
  const [countdown,   setCountdown]   = useState(0);

  const [box1, setBox1] = useState('');
  const [box2, setBox2] = useState('');
  const [box3, setBox3] = useState('');
  const [box4, setBox4] = useState('');
  const [box5, setBox5] = useState('');
  const [box6, setBox6] = useState('');

  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const ref6 = useRef(null);

  useEffect(() => {
    if (registeredEmail) {
      setEmailAddress(registeredEmail);
      setCurrentStep(2);
    }
  }, [registeredEmail]);

  const sendOTP = async () => {
    if (!emailAddress || !emailAddress.trim()) {
      Alert.alert('Galat Email', 'Sahi email address daalo.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/send-otp', { email: emailAddress.trim().toLowerCase() });

      setCurrentStep(2);

      let sec = 30;
      setCountdown(sec);
      const timer = setInterval(() => {
        sec = sec - 1;
        setCountdown(sec);
        if (sec === 0) clearInterval(timer);
      }, 1000);

      Alert.alert(
        'OTP Bheja! 📧',
        `${emailAddress} pe verification code bhej diya gaya. Inbox check karo.`
      );
    } catch (err) {
      const message = err.response?.data?.error || 'Email nahi gaya. Try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    const otp = box1 + box2 + box3 + box4 + box5 + box6;

    if (otp.length !== 6) {
      Alert.alert('Incomplete', 'Poora 6 digit OTP daalo.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/verify-otp', {
        email: emailAddress.trim().toLowerCase(),
        otp,
      });

      await updateUser({
        is_phone_verified: true, // We update this flag in local AuthContext so AppNavigator redirects to home
      });

      Alert.alert('✅ Verified!', 'Email verification successful!');
    } catch (err) {
      const message = err.response?.data?.error || 'OTP galat hai.';
      Alert.alert('Error', message);
      setBox1(''); setBox2(''); setBox3('');
      setBox4(''); setBox5(''); setBox6('');
      ref1.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoxInput = (text, setBox, nextRef) => {
    setBox(text);
    if (text && nextRef) {
      nextRef.current?.focus();
    }
  };

  const handleBackspace = (key, setBox, prevRef) => {
    if (key === 'Backspace' && prevRef) {
      setBox('');
      prevRef.current?.focus();
    }
  };

  if (currentStep === 1) {
    return (
      <ScreenBackground>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.center}>
            <BrandMark size="small" />

            <View style={styles.card}>
              <Text style={styles.stepBadge}>STEP 1 OF 2</Text>
              <Text style={styles.title}>Email verify karo</Text>
              <Text style={styles.subtitle}>
                Fake accounts se bachne ke liye{"\n"}
                email verify karna zaroori hai
              </Text>

              <View style={styles.emailRow}>
                <TextInput
                  style={styles.emailInput}
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  placeholder="Apna email address daalo"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (isLoading || !emailAddress.trim()) && styles.buttonOff,
                ]}
                onPress={sendOTP}
                disabled={isLoading || !emailAddress.trim()}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color={colors.bg} />
                  : <Text style={styles.buttonText}>OTP Bhejo</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.center}>
          <BrandMark size="small" />

          <View style={styles.card}>
            <Text style={styles.stepBadge}>STEP 2 OF 2</Text>
            <Text style={styles.title}>OTP enter karo</Text>
            <Text style={styles.subtitle}>
              {emailAddress} pe{"\n"}
              6 digit code bheja gaya
            </Text>

            <View style={styles.otpRow}>
              {[
                { ref: ref1, val: box1, set: setBox1, next: ref2, prev: null },
                { ref: ref2, val: box2, set: setBox2, next: ref3, prev: ref1 },
                { ref: ref3, val: box3, set: setBox3, next: ref4, prev: ref2 },
                { ref: ref4, val: box4, set: setBox4, next: ref5, prev: ref3 },
                { ref: ref5, val: box5, set: setBox5, next: ref6, prev: ref4 },
                { ref: ref6, val: box6, set: setBox6, next: null, prev: ref5 },
              ].map((box, i) => (
                <TextInput
                  key={i}
                  ref={box.ref}
                  style={[styles.otpBox, box.val ? styles.otpBoxFilled : null]}
                  value={box.val}
                  maxLength={1}
                  keyboardType="numeric"
                  onChangeText={(t) => handleBoxInput(t, box.set, box.next)}
                  onKeyPress={({ nativeEvent: { key } }) => handleBackspace(key, box.set, box.prev)}
                  autoFocus={i === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (isLoading || (box1 + box2 + box3 + box4 + box5 + box6).length < 6) && styles.buttonOff,
              ]}
              onPress={verifyOTP}
              disabled={isLoading || (box1 + box2 + box3 + box4 + box5 + box6).length < 6}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.buttonText}>Verify Karo</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={countdown === 0 ? sendOTP : null}
              disabled={countdown > 0}
              style={styles.resendButton}
            >
              <Text style={[styles.resendText, countdown > 0 && styles.resendOff]}>
                {countdown > 0
                  ? `Resend karo (${countdown}s)`
                  : 'OTP nahi aaya? Dobara bhijwao'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setCurrentStep(1);
                setBox1(''); setBox2(''); setBox3('');
                setBox4(''); setBox5(''); setBox6('');
              }}
            >
              <Text style={styles.changeText}>Email badlo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.lg,
    gap:               spacing.lg,
  },
  card: {
    width:           '100%',
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.lg,
    alignItems:      'center',
  },
  stepBadge: {
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 2,
    color:         colors.primary,
    marginBottom:  spacing.md,
  },
  title: {
    fontSize:     22,
    fontWeight:   '600',
    color:        colors.text,
    textAlign:    'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize:     14,
    color:        colors.textSecondary,
    textAlign:    'center',
    lineHeight:   22,
    marginBottom: spacing.lg,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  spacing.lg,
    width:         '100%',
  },
  emailInput: {
    flex:              1,
    borderWidth:       1,
    borderColor:       colors.border,
    borderRadius:      radius.md,
    paddingVertical:   14,
    paddingHorizontal: spacing.md,
    fontSize:          16,
    backgroundColor:   colors.surfaceLight,
    color:             colors.text,
  },
  button: {
    ...buttonStyle,
    width: '100%',
    marginBottom: spacing.md,
  },
  buttonOff: {
    opacity: 0.4,
  },
  buttonText: {
    ...buttonTextStyle,
  },
  otpRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  otpBox: {
    width:           44,
    height:          54,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.sm,
    textAlign:       'center',
    fontSize:        22,
    fontWeight:      '600',
    color:           colors.text,
    backgroundColor: colors.surfaceLight,
  },
  otpBoxFilled: {
    borderColor:     colors.primary,
    backgroundColor: colors.primaryGlow,
    color:           colors.primary,
  },
  resendButton: {
    paddingVertical: spacing.sm,
    marginBottom:    spacing.xs,
  },
  resendText: {
    color:      colors.primary,
    fontSize:   14,
    fontWeight: '500',
  },
  resendOff: {
    color: colors.textMuted,
  },
  changeText: {
    color:    colors.textMuted,
    fontSize: 13,
  },
});

export default PhoneAuthScreen;
