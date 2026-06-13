import React from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/authcontext';
import { colors } from '../theme';

import LoginScreen     from '../screens/Loginscreen';
import RegisterScreen  from '../screens/Registerscreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import SwipeScreen     from '../screens/Swipescreen';
import ProfileScreen   from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary:    colors.primary,
    background: colors.bg,
    card:       colors.surface,
    text:       colors.text,
    border:     colors.border,
    notification: colors.accent,
  },
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarActiveTintColor:   colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: {
        backgroundColor: colors.bgElevated,
        borderTopColor:  colors.border,
        borderTopWidth:  1,
        paddingBottom:   Platform.OS === 'ios' ? 20 : 8,
        paddingTop:      8,
        height:          Platform.OS === 'ios' ? 84 : 64,
      },
      tabBarLabelStyle: {
        fontSize:      11,
        fontWeight:    '600',
        letterSpacing: 0.5,
        marginTop:     2,
      },
      headerShown: false,
      tabBarIcon: ({ color, size, focused }) => {
        const iconName = route.name === 'Swipe'
          ? (focused ? 'compass' : 'compass-outline')
          : (focused ? 'person' : 'person-outline');
        return <Ionicons name={iconName} size={22} color={color} />;
      },
    })}
  >
    <Tab.Screen
      name="Swipe"
      component={SwipeScreen}
      options={{ tabBarLabel: 'Discover' }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isLoggedIn, isLoading, user, isRegistering } = useAuth();
  const needsPhoneVerify = isLoggedIn && isRegistering && user?.is_phone_verified !== true;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {needsPhoneVerify ? (
          <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
        ) : isLoggedIn ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: colors.bg,
  },
});

export default AppNavigator;
