import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import useAuthStore from '../store/authStore';
import { COLORS, SHADOWS } from '../theme';
import { toggleOnline } from '../api';
import { errMsg } from '../utils/helpers';

// Auth
import OnboardingScreen     from '../screens/auth/OnboardingScreen';
import LoginScreen          from '../screens/auth/LoginScreen';
import SignupScreen         from '../screens/auth/SignupScreen';
import TermsScreen          from '../screens/auth/TermsScreen';
import SelfieCaptureScreen  from '../screens/auth/SelfieCaptureScreen';
import VerifyPhoneOTPScreen from '../screens/auth/VerifyPhoneOTPScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen  from '../screens/auth/ResetPasswordScreen';

// KYC
import KYCStep1Screen   from '../screens/kyc/KYCStep1Screen';
import KYCStep2Screen   from '../screens/kyc/KYCStep2Screen';
import KYCStep3Screen   from '../screens/kyc/KYCStep3Screen';
import KYCPendingScreen from '../screens/kyc/KYCPendingScreen';

// Main
import HomeScreen         from '../screens/main/HomeScreen';
import OrdersScreen       from '../screens/main/OrdersScreen';
import EarningsScreen     from '../screens/main/EarningsScreen';
import ProfileScreen      from '../screens/main/ProfileScreen';
import ActiveOrderScreen  from '../screens/main/ActiveOrderScreen';
import OrderHistoryDetail from '../screens/main/OrderHistoryDetail';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();
const NO_HEADER = { headerShown: false };

// ── Custom Tab Bar with safe area insets ─────────────────────────────────────
function CustomTabBar({ state, navigation }) {
  const rider      = useAuthStore((s) => s.rider);
  const patchRider = useAuthStore((s) => s.patchRider);
  const isOnline   = !!rider?.isOnline;
  const [toggling, setToggling] = React.useState(false);

  // KEY FIX: responsive bottom padding using safe area insets
  const insets    = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 10 : 20);

  const handleGoOnline = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res  = await toggleOnline();
      const next = res?.data?.data?.isOnline;
      patchRider({ isOnline: next });
      Toast.show({
        type:  'success',
        text1: next ? "You're online!" : "You're offline",
        text2: next ? 'Looking for orders...' : 'No new orders',
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e) });
    } finally { setToggling(false); }
  };

  const tabs = [
    { name: 'Home',     icon: 'home',          iconOut: 'home-outline' },
    { name: 'Orders',   icon: 'document-text', iconOut: 'document-text-outline' },
    { name: 'GoOnline', icon: 'bicycle',       iconOut: 'bicycle', isCenter: true },
    { name: 'Earnings', icon: 'wallet',        iconOut: 'wallet-outline' },
    { name: 'Profile',  icon: 'person',        iconOut: 'person-outline' },
  ];

  return (
    <View style={[tab.bar, { paddingBottom: bottomPad }]}>
      {tabs.map((t) => {
        if (t.isCenter) {
          return (
            <TouchableOpacity
              key="center"
              style={tab.centerWrap}
              onPress={handleGoOnline}
              activeOpacity={0.85}
              disabled={toggling}
            >
              <View style={[tab.centerBtn, isOnline && tab.centerBtnOnline]}>
                {toggling
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name={isOnline ? 'power' : 'bicycle'} size={26} color="#fff" />
                }
              </View>
              <Text style={[tab.centerLabel, isOnline && tab.centerLabelOnline]}>
                {isOnline ? 'Go Offline' : 'Go Online'}
              </Text>
            </TouchableOpacity>
          );
        }

        const routeIndex = state.routes.findIndex((r) => r.name === t.name);
        const focused    = state.index === routeIndex;

        return (
          <TouchableOpacity
            key={t.name}
            style={tab.item}
            onPress={() => navigation.navigate(t.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={focused ? t.icon : t.iconOut}
              size={22}
              color={focused ? COLORS.primary : COLORS.gray400}
            />
            <Text style={[tab.label, focused && tab.labelActive]}>{t.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tab = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
    ...SHADOWS.sm,
  },
  item:              { flex: 1, alignItems: 'center', gap: 3, paddingBottom: 2 },
  label:             { fontSize: 10, fontWeight: '600', color: COLORS.gray400 },
  labelActive:       { color: COLORS.primary },
  centerWrap:        { flex: 1, alignItems: 'center', marginTop: -28 },
  centerBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
    ...SHADOWS.md,
  },
  centerBtnOnline:   { backgroundColor: COLORS.green },
  centerLabel:       { fontSize: 10, fontWeight: '600', color: COLORS.gray400, marginTop: 3 },
  centerLabelOnline: { color: COLORS.green },
});

// ── Navigators ────────────────────────────────────────────────────────────────
function Tabs() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Orders"   component={OrdersScreen} />
      <Tab.Screen name="GoOnline" component={HomeScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={NO_HEADER} initialRouteName="Onboarding">
      <Stack.Screen name="Onboarding"    component={OnboardingScreen} />
      <Stack.Screen name="Login"         component={LoginScreen} />
      <Stack.Screen name="Terms"         component={TermsScreen} />
      <Stack.Screen name="Signup"        component={SignupScreen} />
      <Stack.Screen name="SelfieCapture" component={SelfieCaptureScreen} />
      <Stack.Screen name="VerifyPhone"   component={VerifyPhoneOTPScreen} />
      <Stack.Screen name="ForgotPass"    component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPass"     component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

function KYCStack({ initialRouteName }) {
  return (
    <Stack.Navigator screenOptions={NO_HEADER} initialRouteName={initialRouteName}>
      <Stack.Screen name="KYCStep1"   component={KYCStep1Screen} />
      <Stack.Screen name="KYCStep2"   component={KYCStep2Screen} />
      <Stack.Screen name="KYCStep3"   component={KYCStep3Screen} />
      <Stack.Screen name="KYCPending" component={KYCPendingScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={NO_HEADER}>
      <Stack.Screen name="Tabs"               component={Tabs} />
      <Stack.Screen name="ActiveOrder"        component={ActiveOrderScreen} />
      <Stack.Screen name="OrderHistoryDetail" component={OrderHistoryDetail} />
      <Stack.Screen name="TermsFromProfile"   component={TermsScreen} />
    </Stack.Navigator>
  );
}

function pickRoute(rider) {
  if (!rider) return { screen: 'Auth' };
  if (!rider.kycCompleted) {
    const step    = rider.kycStep ?? 1;
    const initial = step === 2 ? 'KYCStep2' : step === 3 ? 'KYCStep3' : 'KYCStep1';
    return { screen: 'KYC', initial };
  }
  if (rider.status !== 'approved') return { screen: 'KYC', initial: 'KYCPending' };
  return { screen: 'Main' };
}

export default function AppNavigator({ onReady }) {
  const { token, rider, loading, init } = useAuthStore();
  useEffect(() => { init(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const route = token
    ? pickRoute(rider || { kycCompleted: false, kycStep: 1, status: 'pending' })
    : { screen: 'Auth' };

  return (
    <NavigationContainer onReady={onReady}>
      <Stack.Navigator screenOptions={NO_HEADER}>
        {route.screen === 'Auth' && <Stack.Screen name="Auth" component={AuthStack} />}
        {route.screen === 'KYC' && (
          <Stack.Screen name="KYC">
            {() => <KYCStack initialRouteName={route.initial} />}
          </Stack.Screen>
        )}
        {route.screen === 'Main' && <Stack.Screen name="Main" component={MainStack} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
}