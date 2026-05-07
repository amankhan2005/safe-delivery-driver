import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image, Modal, FlatList,
  Platform, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  toggleOnline, getDashboard, acceptOrder, rejectOrder,
  getNotifications, markNotificationRead,
} from '../../api';
import useAuthStore from '../../store/authStore';
import useOrderStore from '../../store/orderStore';
import useLocationTracker from '../../hooks/useLocationTracker';
import { fmtCurrency, errMsg, vehicleLabel } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const { width: SW } = Dimensions.get('window');
const BRAND      = COLORS.primary;
const BRAND_DARK = COLORS.primaryDark;

// ─── Notifications Sheet ──────────────────────────────────────────────────────
function NotifSheet({ visible, onClose, notifications, loading, onMarkRead }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={nm.bg} activeOpacity={1} onPress={onClose} />
      <View style={nm.sheet}>
        <View style={nm.pill} />
        <View style={nm.hdr}>
          <Text style={nm.title}>Notifications</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
        {loading
          ? <View style={nm.ctr}><ActivityIndicator color={BRAND} /></View>
          : notifications.length === 0
            ? <View style={nm.ctr}>
                <Ionicons name="notifications-off-outline" size={38} color="#D1D5DB" />
                <Text style={nm.none}>No notifications</Text>
              </View>
            : <FlatList
                data={notifications}
                keyExtractor={(item, i) => item._id || String(i)}
                contentContainerStyle={{ padding: SIZES.lg, paddingBottom: 32 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[nm.item, !item.read && nm.unread]}
                    onPress={() => onMarkRead(item._id)}
                    activeOpacity={0.8}
                  >
                    <View style={nm.icon}>
                      <Ionicons name="megaphone-outline" size={16} color={BRAND} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={nm.iTitle} numberOfLines={1}>{item.title || 'Notification'}</Text>
                      <Text style={nm.iBody} numberOfLines={2}>{item.message || item.body}</Text>
                    </View>
                    {!item.read && <View style={nm.dot} />}
                  </TouchableOpacity>
                )}
              />
        }
      </View>
    </Modal>
  );
}

// ─── Offer Card ───────────────────────────────────────────────────────────────
function OfferCard({ order, onAccept, onReject, acting }) {
  return (
    <View style={oc.wrap}>
      <View style={oc.fareStrip}>
        <View>
          <Text style={oc.earnLabel}>YOUR EARNINGS</Text>
          <Text style={oc.fare}>{fmtCurrency(order.fare)}</Text>
        </View>
        <View style={oc.pills}>
          <View style={oc.pill}>
            <Ionicons name="navigate-outline" size={11} color="#15803D" />
            <Text style={oc.pillTxt}>{order.distanceMiles?.toFixed(1)} mi</Text>
          </View>
          <View style={oc.pill}>
            <Ionicons name="cube-outline" size={11} color="#15803D" />
            <Text style={oc.pillTxt}>{order.parcelWeight || 'Pkg'}</Text>
          </View>
        </View>
        <View style={oc.newTag}><Text style={oc.newTxt}>NEW</Text></View>
      </View>

      <View style={oc.route}>
        <View style={oc.rRow}>
          <View style={oc.rCol}>
            <View style={[oc.rDot, { backgroundColor: '#22C55E' }]} />
            <View style={oc.rLine} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={oc.rTag}>PICKUP</Text>
            <Text style={oc.rAddr} numberOfLines={1}>{order.pickup?.address}</Text>
          </View>
        </View>
        <View style={oc.rRow}>
          <View style={oc.rCol}>
            <View style={[oc.rDot, { backgroundColor: '#EF4444' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={oc.rTag}>DROP</Text>
            <Text style={oc.rAddr} numberOfLines={1}>{order.drop?.address}</Text>
          </View>
        </View>
      </View>

      <View style={oc.btns}>
        <TouchableOpacity style={oc.rejBtn} onPress={onReject} disabled={acting}>
          <Text style={oc.rejTxt}>✕  Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={oc.accBtn} onPress={onAccept} disabled={acting}>
          {acting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={oc.accTxt}>✓  Accept  {fmtCurrency(order.fare)}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const rider      = useAuthStore((s) => s.rider);
  const patchRider = useAuthStore((s) => s.patchRider);

  const activeOrder        = useOrderStore((s) => s.activeOrder);
  const availableOrders    = useOrderStore((s) => s.availableOrders);
  const setActiveOrder     = useOrderStore((s) => s.setActiveOrder);
  const setAvailableOrders = useOrderStore((s) => s.setAvailableOrders);

  const [dash,         setDash]         = useState(null);
  const [loading,      setLoading]      = useState(false); // FIX: false — show cached data instantly
  const [refreshing,   setRefreshing]   = useState(false);
  const [toggling,     setToggling]     = useState(false);
  const [actingId,     setActingId]     = useState(null);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifs,       setNotifs]       = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const mountedRef   = useRef(true);
  const isFirstFocus = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const isOnline   = !!rider?.isOnline;
  const unread     = notifs.filter(n => !n.read).length;
  const firstName  = rider?.name?.split(' ')[0] || 'Rider';
  const initial    = rider?.name?.[0]?.toUpperCase() || '?';
  const photoUrl   = rider?.profilePhoto?.url || null;
  const today      = dash?.earnings?.today   ?? rider?.earnings?.today   ?? 0;
  const totalTrips = dash?.totalTrips        ?? rider?.totalTrips        ?? 0;
  const rating     = dash?.rating            ?? rider?.rating            ?? 0;
  const balance    = dash?.earnings?.balance ?? rider?.earnings?.balance ?? 0;

  useLocationTracker(isOnline, 20000);

  // FIX: Show cached rider data immediately, load dashboard in background
  const load = useCallback(async () => {
    try {
      const dR = await getDashboard();
      if (!mountedRef.current) return;
      const d = dR?.data?.data;
      if (d) {
        setDash(d);
        patchRider({
          isOnline:   d.isOnline,
          earnings:   d.earnings,
          totalTrips: d.totalTrips,
          rating:     d.rating,
        });
      }
    } catch {
      // silent — dashboard failure is non-critical
      // rider data from store still shows
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [patchRider]);

  const loadNotifs = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res  = await getNotifications();
      if (!mountedRef.current) return;
      const data = res?.data?.data?.notifications || res?.data?.data || res?.data || [];
      setNotifs(Array.isArray(data) ? data : []);
    } catch {
      if (mountedRef.current) setNotifs([]);
    } finally {
      if (mountedRef.current) setNotifLoading(false);
    }
  }, []);

  // Mount — load dashboard in background, don't block UI
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus — reload dashboard when coming back to screen
  useFocusEffect(useCallback(() => {
    if (isFirstFocus.current) {
      isFirstFocus.current = false;
      return;
    }
    load();
  }, [load]));

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res  = await toggleOnline();
      if (!mountedRef.current) return;
      const next = res?.data?.data?.isOnline;
      patchRider({ isOnline: next });
      Toast.show({
        type:  'success',
        text1: next ? "You're Online!" : "You're Offline",
        text2: next ? 'Ready to receive orders' : 'Go online to earn',
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e) });
    } finally {
      if (mountedRef.current) setToggling(false);
    }
  };

  // FIX: Accept — wait for store update before navigating to ActiveOrder
  const handleAccept = useCallback(async (id) => {
    if (actingId) return;
    setActingId(id);
    try {
      const res   = await acceptOrder(id);
      if (!mountedRef.current) return;
      const order = res?.data?.data?.order;
      if (order) {
        setActiveOrder(order);
        setAvailableOrders([]);
        Toast.show({ type: 'success', text1: '✅ Order accepted!', text2: 'Heading to pickup' });
        // FIX: 300ms delay — let store update before ActiveOrderScreen mounts
        setTimeout(() => {
          if (mountedRef.current) {
            navigation.navigate('ActiveOrder', { orderId: id });
          }
        }, 300);
      } else {
        Toast.show({ type: 'error', text1: 'Could not accept', text2: 'Please try again' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Could not accept') });
    } finally {
      if (mountedRef.current) setActingId(null);
    }
  }, [actingId, setActiveOrder, setAvailableOrders, navigation]);

  const handleReject = useCallback(async (id) => {
    if (actingId) return;
    setActingId(id);
    try {
      await rejectOrder(id);
      if (!mountedRef.current) return;
      setAvailableOrders(availableOrders.filter(o => o._id !== id));
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e) });
    } finally {
      if (mountedRef.current) setActingId(null);
    }
  }, [actingId, availableOrders, setAvailableOrders]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.topAvatar}>
          {photoUrl
            ? <Image source={{ uri: photoUrl }} style={s.topAvatarImg} />
            : <LinearGradient colors={[BRAND, BRAND_DARK]} style={s.topAvatarFallback}>
                <Text style={s.topAvatarTxt}>{initial}</Text>
              </LinearGradient>
          }
        </TouchableOpacity>

        <View style={s.topCenter}>
          <Text style={s.topGreet}>Good day, {firstName} 👋</Text>
          <View style={s.topRatingRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={s.topRating}>{rating ? Number(rating).toFixed(1) : '—'}</Text>
            <Text style={s.topDot}>·</Text>
            <Text style={s.topTrips}>{totalTrips} trips</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.bellBtn}
          onPress={() => { setNotifOpen(true); loadNotifs(); }}
        >
          <Ionicons name="notifications-outline" size={22} color="#374151" />
          {unread > 0 && (
            <View style={s.bellDot}>
              <Text style={s.bellDotTxt}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={BRAND}
          />
        }
      >

        {/* ── Status + Earnings banner ── */}
        <LinearGradient
          colors={['#0A2F9A', '#1B4FD8', '#2563EB']}
          style={s.banner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={s.bannerTop}>
            <View>
              <Text style={s.bannerLabel}>STATUS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#6B7280' }]} />
                <Text style={s.bannerStatus}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.toggleBtn, isOnline ? s.toggleBtnOn : s.toggleBtnOff]}
              onPress={handleToggle}
              disabled={toggling}
              activeOpacity={0.85}
            >
              {toggling
                ? <ActivityIndicator size="small" color={isOnline ? '#16A34A' : '#9CA3AF'} />
                : <Text style={[s.toggleBtnTxt, { color: isOnline ? '#16A34A' : '#6B7280' }]}>
                    {isOnline ? 'Go Offline' : 'Go Online'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          <View style={s.bannerStats}>
            <View style={s.bannerStat}>
              <Text style={s.bannerStatVal}>{fmtCurrency(today)}</Text>
              <Text style={s.bannerStatLabel}>Today's Earnings</Text>
            </View>
            <View style={s.bannerStatDiv} />
            <View style={s.bannerStat}>
              <Text style={s.bannerStatVal}>{totalTrips}</Text>
              <Text style={s.bannerStatLabel}>Trips</Text>
            </View>
            
          </View>

          {rider?.vehicle?.plate && (
            <View style={s.vehicleChip}>
              <Ionicons name="car-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={s.vehicleChipTxt}>
                {rider.vehicle.plate}  ·  {rider.vehicle.model || vehicleLabel(rider.vehicle.type)}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Active Order ── */}
        {activeOrder && (
          <View style={s.activeWrap}>
            <View style={s.activeCard}>
              <View style={s.activeTop}>
                <View style={s.activeTopLeft}>
                  <View style={s.activeLiveDot} />
                  <Text style={s.activeLiveTxt}>ACTIVE ORDER</Text>
                </View>
                <Text style={s.activeFare}>{fmtCurrency(activeOrder.fare)}</Text>
              </View>

              <View style={s.activeRoute}>
                <View style={s.activeRRow}>
                  <View style={[s.activeRDot, { backgroundColor: '#22C55E' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.activeRTag}>PICKUP</Text>
                    <Text style={s.activeRAddr} numberOfLines={1}>{activeOrder.pickup?.address}</Text>
                  </View>
                </View>
                <View style={s.activeRConn}>
                  {[0,1,2,3].map(i => <View key={i} style={s.activeRDash} />)}
                </View>
                <View style={s.activeRRow}>
                  <View style={[s.activeRDot, { backgroundColor: '#EF4444' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.activeRTag}>DROP-OFF</Text>
                    <Text style={s.activeRAddr} numberOfLines={1}>{activeOrder.drop?.address}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={s.manageBtn}
                onPress={() => navigation.navigate('ActiveOrder', { orderId: activeOrder._id })}
              >
                <Text style={s.manageBtnTxt}>Manage Order</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Available Orders ── */}
        {!activeOrder && (
          <View style={s.section}>
            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>
                {isOnline
                  ? availableOrders.length > 0
                    ? `Nearby Orders (${availableOrders.length})`
                    : 'Nearby Orders'
                  : 'Go Online to Earn'
                }
              </Text>
              {isOnline && availableOrders.length > 0 && (
                <View style={s.livePill}>
                  <View style={s.livePillDot} />
                  <Text style={s.livePillTxt}>LIVE</Text>
                </View>
              )}
            </View>

            {!isOnline
              ? <View style={s.stateCard}>
                  <View style={s.stateIconWrap}>
                    <Ionicons name="power-outline" size={34} color="#9CA3AF" />
                  </View>
                  <Text style={s.stateTitle}>You're Offline</Text>
                  <Text style={s.stateSub}>Switch online to start receiving delivery orders and earn money.</Text>
                  <TouchableOpacity style={s.goOnlineBtn} onPress={handleToggle} disabled={toggling}>
                    {toggling
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.goOnlineTxt}>Switch Online</Text>
                    }
                  </TouchableOpacity>
                </View>
              : availableOrders.length === 0
                ? <View style={s.stateCard}>
                    <View style={s.stateIconWrap}>
                      <Ionicons name="search-outline" size={34} color="#9CA3AF" />
                    </View>
                    <Text style={s.stateTitle}>Searching for Orders</Text>
                    <Text style={s.stateSub}>We'll ring your phone the moment a new order comes in nearby.</Text>
                  </View>
                : availableOrders.map(order => (
                    <OfferCard
                      key={order._id}
                      order={order}
                      acting={actingId === order._id}
                      onAccept={() => handleAccept(order._id)}
                      onReject={() => handleReject(order._id)}
                    />
                  ))
            }
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.qaRow}>
            {[
              { icon: 'list-outline',   color: BRAND,     bg: '#EFF6FF', label: 'My Orders', screen: 'Orders'   },
              { icon: 'bar-chart',      color: '#16A34A', bg: '#F0FDF4', label: 'Earnings',  screen: 'Earnings' },
              { icon: 'card-outline',   color: '#D97706', bg: '#FFFBEB', label: 'Payouts',   screen: 'Earnings' },
              { icon: 'person-outline', color: '#7C3AED', bg: '#F5F3FF', label: 'Profile',   screen: 'Profile'  },
            ].map(qa => (
              <TouchableOpacity
                key={qa.label}
                style={s.qaItem}
                onPress={() => navigation.navigate(qa.screen)}
                activeOpacity={0.75}
              >
                <View style={[s.qaIcon, { backgroundColor: qa.bg }]}>
                  <Ionicons name={qa.icon} size={22} color={qa.color} />
                </View>
                <Text style={s.qaLabel}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Today Summary ── */}
        <View style={s.section}>
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Today's Summary</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
              <Text style={s.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={s.sumRow}>
            {[
              { icon: 'checkmark-circle-outline', color: '#16A34A', label: 'Completed',    val: totalTrips },
              { icon: 'close-circle-outline',     color: '#EF4444', label: 'Cancelled',    val: dash?.cancelled ?? 0 },
              { icon: 'trending-up-outline',      color: BRAND,     label: 'Success Rate', val: totalTrips > 0 ? '98%' : '—' },
            ].map(t => (
              <View key={t.label} style={s.sumTile}>
                <View style={[s.sumIcon, { backgroundColor: t.color + '18' }]}>
                  <Ionicons name={t.icon} size={20} color={t.color} />
                </View>
                <Text style={[s.sumVal, { color: t.color }]}>{t.val}</Text>
                <Text style={s.sumLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <NotifSheet
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifs}
        loading={notifLoading}
        onMarkRead={async (id) => {
          if (!id) return;
          try {
            await markNotificationRead(id);
            if (mountedRef.current) {
              setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            }
          } catch {}
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#F1F5FB' },
  topBar:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.lg, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB', gap: 10 },
  topAvatar:        {},
  topAvatarImg:     { width: 42, height: 42, borderRadius: 21 },
  topAvatarFallback:{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  topAvatarTxt:     { fontSize: 18, fontWeight: '800', color: '#fff' },
  topCenter:        { flex: 1 },
  topGreet:         { fontSize: 15, fontWeight: '700', color: '#111827' },
  topRatingRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  topRating:        { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  topDot:           { fontSize: 12, color: '#D1D5DB' },
  topTrips:         { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  bellBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot:          { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  bellDotTxt:       { color: '#fff', fontSize: 9, fontWeight: '700' },
  banner:           { marginHorizontal: SIZES.lg, marginTop: SIZES.md, borderRadius: 20, padding: SIZES.lg, gap: SIZES.md, ...SHADOWS.blue },
  bannerTop:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerLabel:      { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 4 },
  bannerStatus:     { fontSize: 18, fontWeight: '900', color: '#fff' },
  onlineDot:        { width: 10, height: 10, borderRadius: 5 },
  toggleBtn:        { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  toggleBtnOn:      { backgroundColor: '#fff' },
  toggleBtnOff:     { backgroundColor: 'rgba(255,255,255,0.2)' },
  toggleBtnTxt:     { fontSize: 13, fontWeight: '800' },
  bannerStats:      { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: SIZES.md },
  bannerStat:       { flex: 1, alignItems: 'center' },
  bannerStatVal:    { fontSize: 18, fontWeight: '900', color: '#fff' },
  bannerStatLabel:  { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginTop: 2 },
  bannerStatDiv:    { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  vehicleChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  vehicleChipTxt:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  activeWrap:       { marginHorizontal: SIZES.lg, marginTop: SIZES.md },
  activeCard:       { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SHADOWS.md },
  activeTop:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  activeTopLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeLiveDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  activeLiveTxt:    { fontSize: 11, fontWeight: '800', color: '#374151', letterSpacing: 0.8 },
  activeFare:       { fontSize: 20, fontWeight: '900', color: BRAND },
  activeRoute:      { padding: SIZES.lg, gap: 0 },
  activeRRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  activeRDot:       { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  activeRTag:       { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 2 },
  activeRAddr:      { fontSize: 13, fontWeight: '600', color: '#111827' },
  activeRConn:      { paddingLeft: 5, paddingVertical: 4, gap: 3 },
  activeRDash:      { width: 2, height: 4, backgroundColor: '#D1D5DB', borderRadius: 1 },
  manageBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, margin: SIZES.lg, marginTop: 0, borderRadius: 12, paddingVertical: 13 },
  manageBtnTxt:     { color: '#fff', fontWeight: '800', fontSize: 15 },
  section:          { marginHorizontal: SIZES.lg, marginTop: SIZES.xl },
  sectionHdr:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.md },
  sectionTitle:     { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.2 },
  seeAll:           { fontSize: 13, fontWeight: '700', color: BRAND },
  livePill:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  livePillDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  livePillTxt:      { fontSize: 10, fontWeight: '800', color: '#EF4444', letterSpacing: 1 },
  stateCard:        { backgroundColor: '#fff', borderRadius: 18, padding: 32, alignItems: 'center', gap: 10, ...SHADOWS.sm },
  stateIconWrap:    { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stateTitle:       { fontSize: 18, fontWeight: '800', color: '#111827' },
  stateSub:         { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  goOnlineBtn:      { marginTop: 6, backgroundColor: BRAND, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 13 },
  goOnlineTxt:      { color: '#fff', fontWeight: '800', fontSize: 15 },
  qaRow:            { flexDirection: 'row', gap: SIZES.sm },
  qaItem:           { flex: 1, alignItems: 'center', gap: 6 },
  qaIcon:           { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qaLabel:          { fontSize: 11, color: '#374151', fontWeight: '600', textAlign: 'center' },
  sumRow:           { flexDirection: 'row', gap: SIZES.sm },
  sumTile:          { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, ...SHADOWS.sm },
  sumIcon:          { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sumVal:           { fontSize: 20, fontWeight: '900' },
  sumLabel:         { fontSize: 10, color: '#6B7280', fontWeight: '500', textAlign: 'center' },
});

const nm = StyleSheet.create({
  bg:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pill:  { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  hdr:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  ctr:   { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10 },
  none:  { color: '#9CA3AF', fontSize: 14 },
  item:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F9FAFB', gap: 12 },
  unread:{ backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 8, marginHorizontal: -8 },
  icon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  iTitle:{ fontSize: 14, fontWeight: '700', color: '#111827' },
  iBody: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 17 },
  dot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },
});

const oc = StyleSheet.create({
  wrap:      { backgroundColor: '#fff', borderRadius: 18, marginBottom: SIZES.md, overflow: 'hidden', ...SHADOWS.md },
  fareStrip: { flexDirection: 'row', alignItems: 'center', padding: SIZES.lg, backgroundColor: '#F0FDF4', gap: SIZES.md },
  earnLabel: { fontSize: 9, fontWeight: '700', color: '#15803D', letterSpacing: 1.5, marginBottom: 2 },
  fare:      { fontSize: 28, fontWeight: '900', color: '#14532D', letterSpacing: -0.5 },
  pills:     { flex: 1, gap: 5 },
  pill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  pillTxt:   { fontSize: 11, fontWeight: '700', color: '#15803D' },
  newTag:    { backgroundColor: '#1B4FD8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  newTxt:    { color: '#fff', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  route:     { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  rRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rCol:      { alignItems: 'center', width: 14 },
  rDot:      { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  rLine:     { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 3, minHeight: 18 },
  rTag:      { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 2 },
  rAddr:     { fontSize: 13, fontWeight: '600', color: '#111827', paddingBottom: 10 },
  btns:      { flexDirection: 'row', padding: SIZES.md, gap: SIZES.sm },
  rejBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 14, paddingVertical: 13, backgroundColor: '#FEF2F2' },
  rejTxt:    { fontSize: 14, fontWeight: '800', color: '#EF4444' },
  accBtn:    { flex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A', borderRadius: 14, paddingVertical: 13 },
  accTxt:    { fontSize: 14, fontWeight: '900', color: '#fff' },
});