import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image, Modal, FlatList, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  toggleOnline, getDashboard, getRiderOrders, acceptOrder, rejectOrder,
  getNotifications, markNotificationRead,
} from '../../api';
import useAuthStore from '../../store/authStore';
import useOrderStore from '../../store/orderStore';
import useLocationTracker from '../../hooks/useLocationTracker';
import Button from '../../components/Button';
import { fmtCurrency, errMsg, vehicleLabel } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const BRAND      = COLORS.primary;
const BRAND_DARK = COLORS.primaryDark;

// ─── Notifications Bottom Sheet ───────────────────────────────────────────────
function NotificationsModal({ visible, onClose, notifications, loading, onMarkRead }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={nm.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={nm.sheet}>
        <View style={nm.handle} />
        <View style={nm.header}>
          <Text style={nm.title}>Notifications</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={COLORS.gray700} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={nm.center}><ActivityIndicator color={BRAND} /></View>
        ) : notifications.length === 0 ? (
          <View style={nm.center}>
            <Ionicons name="notifications-off-outline" size={36} color={COLORS.gray300} />
            <Text style={nm.empty}>No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item, i) => item._id || String(i)}
            contentContainerStyle={{ paddingHorizontal: SIZES.lg, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[nm.item, !item.read && nm.itemUnread]}
                onPress={() => onMarkRead(item._id)}
                activeOpacity={0.8}
              >
                <View style={nm.iconBox}>
                  <Ionicons name="megaphone-outline" size={18} color={BRAND} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={nm.itemTitle} numberOfLines={1}>{item.title || 'Admin Notification'}</Text>
                  <Text style={nm.itemBody} numberOfLines={2}>{item.message || item.body}</Text>
                  {item.createdAt && (
                    <Text style={nm.itemTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  )}
                </View>
                {!item.read && <View style={nm.unreadDot} />}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const rider      = useAuthStore((s) => s.rider);
  const patchRider = useAuthStore((s) => s.patchRider);

  const activeOrder        = useOrderStore((s) => s.activeOrder);
  const availableOrders    = useOrderStore((s) => s.availableOrders);
  const setActiveOrder     = useOrderStore((s) => s.setActiveOrder);
  const setAvailableOrders = useOrderStore((s) => s.setAvailableOrders);

  const [dashboard,     setDashboard]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [toggling,      setToggling]      = useState(false);
  const [actingId,      setActingId]      = useState(null);
  const [notifVisible,  setNotifVisible]  = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading,  setNotifLoading]  = useState(false);

  const isOnline = !!rider?.isOnline;
  useLocationTracker(isOnline, 20000);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const load = useCallback(async () => {
    try {
      const [dashRes, ordersRes] = await Promise.all([getDashboard(), getRiderOrders()]);
      const dash = dashRes?.data?.data;
      if (dash) {
        setDashboard(dash);
        patchRider({ isOnline: dash.isOnline, earnings: dash.earnings, totalTrips: dash.totalTrips, rating: dash.rating });
      }
      const all = ordersRes?.data?.data?.orders || [];
      const active = all.find((o) => ['assigned', 'picked_up', 'in_transit'].includes(o.status));
      setActiveOrder(active || null);
      setAvailableOrders(active ? [] : all.filter((o) => o.status === 'searching'));
    } catch { /* silent poll */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [patchRider, setActiveOrder, setAvailableOrders]);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await getNotifications();
      const data = res?.data?.data?.notifications || res?.data?.data || res?.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* silently fail */ }
    finally { setNotifLoading(false); }
  }, []);

  useEffect(() => { load(); loadNotifications(); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [isOnline, load]);

  const openNotifications = () => { setNotifVisible(true); loadNotifications(); };

  const handleMarkRead = async (id) => {
    if (!id) return;
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch { /* ignore */ }
  };

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await toggleOnline();
      const next = res?.data?.data?.isOnline;
      patchRider({ isOnline: next });
      Toast.show({
        type: 'success',
        text1: next ? "You're online!" : "You're offline",
        text2: next ? 'Looking for orders...' : 'No new orders',
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e) });
    } finally { setToggling(false); }
  };

  const handleAccept = async (id) => {
    setActingId(id);
    try {
      const res = await acceptOrder(id);
      const order = res?.data?.data?.order;
      if (order) setActiveOrder(order);
      setAvailableOrders([]);
      Toast.show({ type: 'success', text1: 'Order accepted!' });
      navigation.navigate('ActiveOrder', { orderId: id });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Could not accept') });
      load();
    } finally { setActingId(null); }
  };

  const handleReject = async (id) => {
    setActingId(id);
    try {
      await rejectOrder(id);
      setAvailableOrders(availableOrders.filter((o) => o._id !== id));
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e) });
    } finally { setActingId(null); }
  };

  const today      = dashboard?.earnings?.today  ?? rider?.earnings?.today  ?? 0;
  const totalTrips = dashboard?.totalTrips        ?? rider?.totalTrips        ?? 0;
  const rating     = dashboard?.rating            ?? rider?.rating            ?? 0;
  const balance    = dashboard?.earnings?.balance ?? rider?.earnings?.balance ?? 0;
  const firstName  = rider?.name?.split(' ')[0] || 'Rider';
  const riderId    = rider?._id ? `RID${String(rider._id).slice(-4).toUpperCase()}` : 'RID----';
  const profilePhotoUrl = rider?.profilePhoto?.url || null;
  const initial    = rider?.name?.charAt(0)?.toUpperCase() || '?';

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={s.loadingWrap} edges={['top']}>
        <ActivityIndicator color={BRAND} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── Top Header — no hamburger, logo centered, bell right ── */}
      <View style={s.topBar}>
        <View style={s.topBarSpacer} />
        <View style={s.logoWrap}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.red} />
          <Text style={s.logoSafe}> SAFE </Text>
          <Text style={s.logoDel}>DELIVERY</Text>
        </View>
        <TouchableOpacity style={s.bellWrap} onPress={openNotifications} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.gray700} />
          {unreadCount > 0 && (
            <View style={s.bellBadge}>
              <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={BRAND} />}
      >
        {/* ── Hero Card with Profile Image ── */}
        <LinearGradient colors={[BRAND, BRAND_DARK]} style={s.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity style={s.avatarWrap} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarText}>{initial}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={s.heroInfo}>
            <Text style={s.heroName}>Hello, {firstName} 👋</Text>
            <Text style={s.heroId}>Rider ID: {riderId}</Text>
            <View style={s.heroRatingRow}>
              <Ionicons name="star" size={14} color="#FCD34D" />
              <Text style={s.heroRating}>{rating ? Number(rating).toFixed(1) : '—'} ({totalTrips} Trips)</Text>
            </View>
          </View>

          <View style={s.heroRight}>
            <Text style={s.youAreText}>You are</Text>
            <TouchableOpacity style={[s.onlinePill, !isOnline && s.offlinePill]} onPress={handleToggle} disabled={toggling} activeOpacity={0.8}>
              {toggling
                ? <ActivityIndicator size="small" color={isOnline ? COLORS.green : COLORS.gray500} />
                : <>
                    <View style={[s.statusDot, { backgroundColor: isOnline ? COLORS.green : COLORS.gray400 }]} />
                    <Text style={[s.onlinePillText, !isOnline && { color: COLORS.gray600 }]}>{isOnline ? 'Online' : 'Offline'}</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.goOfflineRow} onPress={handleToggle} disabled={toggling}>
              <Text style={s.goOfflineText}>{isOnline ? 'Go offline' : 'Go online'} </Text>
              <Ionicons name="power" size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Stats Row ── */}
        <View style={s.statsCard}>
          <StatTile icon="wallet-outline"        iconColor={BRAND}         iconBg="#EFF6FF" label="Today's Earnings" value={fmtCurrency(today)}           valueColor={BRAND} />
          <View style={s.statDivider} />
          <StatTile icon="document-text-outline" iconColor={COLORS.green}  iconBg="#DCFCE7" label="Today's Trips"    value={String(totalTrips)}           valueColor={COLORS.green} />
          <View style={s.statDivider} />
          <StatTile icon="time-outline"          iconColor={COLORS.yellow} iconBg="#FEF9C3" label="Hours Online"     value={dashboard?.hoursOnline ?? '—'} valueColor={COLORS.yellow} />
          <View style={s.statDivider} />
          <StatTile icon="card-outline"          iconColor="#8B5CF6"       iconBg="#F3E8FF" label="Balance"          value={fmtCurrency(balance)}          valueColor="#8B5CF6" />
         
        </View>

        {/* ── Vehicle Chip ── */}
        {rider?.vehicle?.type && (
          <View style={s.vehicleChip}>
            <Ionicons name="bicycle-outline" size={15} color={BRAND} />
            <Text style={s.vehicleText}>{vehicleLabel(rider.vehicle.type)}  •  {rider.vehicle.plate}</Text>
          </View>
        )}

        {/* ── Active Order ── */}
        {activeOrder && (
          <View style={s.orderCard}>
            <View style={s.orderCardHeader}>
              <Text style={s.orderCardTitle}>Current Order</Text>
              <TouchableOpacity style={s.pickUpBtn} onPress={() => navigation.navigate('ActiveOrder', { orderId: activeOrder._id })}>
                <Text style={s.pickUpBtnText}>Pick Up</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.orderId}>Order ID: <Text style={{ fontWeight: '700' }}>#{activeOrder._id?.slice(-7).toUpperCase()}</Text></Text>
            <View style={s.orderBody}>
              <View style={{ flex: 1 }}>
                <OrderRow icon="location"     iconColor={BRAND}          label="Pickup Location"   value={activeOrder.pickup?.address} />
                <OrderRow icon="location"     iconColor={COLORS.red}     label="Drop-off Location" value={activeOrder.drop?.address} />
                <OrderRow icon="cube-outline" iconColor={COLORS.gray500} label="Parcel Type"        value={`${activeOrder.parcelType ?? 'Package'} • ${activeOrder.parcelWeight ?? ''}`} />
                <View style={s.payRow}>
                  <Ionicons name="receipt-outline" size={16} color={COLORS.gray500} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={s.orderRowLabel}>Payment Type</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.orderRowValue}>Cash on Delivery</Text>
                      <View style={s.fareBadge}><Text style={s.fareBadgeText}>{fmtCurrency(activeOrder.fare)}</Text></View>
                    </View>
                  </View>
                </View>
              </View>
              <View style={s.mapBox}>
                <Ionicons name="map-outline" size={32} color={COLORS.gray300} />
                <Text style={s.mapLabel}>Map</Text>
              </View>
            </View>
            <View style={s.orderActions}>
              <TouchableOpacity style={s.navigateBtn}>
                <Ionicons name="navigate" size={16} color={BRAND} />
                <Text style={s.navigateBtnText}> Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.pickedBtn} onPress={() => navigation.navigate('ActiveOrder', { orderId: activeOrder._id })}>
                <Text style={s.pickedBtnText}>I've Picked Up</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.quickRow}>
            <QuickAction icon="list-outline"    iconColor={BRAND}        bg="#EFF6FF" label="My Orders" onPress={() => navigation.navigate('Orders')} />
            <QuickAction icon="bar-chart"       iconColor={COLORS.green} bg="#DCFCE7" label="Earnings"  onPress={() => navigation.navigate('Earnings')} />
            <QuickAction icon="card-outline"    iconColor={COLORS.yellow} bg="#FEF9C3" label="Payouts"  onPress={() => navigation.navigate('Earnings')} />
            <QuickAction icon="headset-outline" iconColor="#8B5CF6"      bg="#F3E8FF" label="Support"   onPress={() => navigation.navigate('Profile')} />
          </View>
        </View>

        {/* ── Available Orders / Offline ── */}
        {!activeOrder && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isOnline ? 'Available Orders' : 'Go Online to See Orders'}</Text>
            {!isOnline ? (
              <EmptyState icon="power-outline"  title="You're offline"      text="Tap Online to start receiving delivery requests." />
            ) : availableOrders.length === 0 ? (
              <EmptyState icon="search-outline" title="No orders right now" text="We'll notify you the moment a new delivery comes in." />
            ) : (
              availableOrders.map((order) => (
                <OfferCard key={order._id} order={order} acting={actingId === order._id} onAccept={() => handleAccept(order._id)} onReject={() => handleReject(order._id)} />
              ))
            )}
          </View>
        )}

        {/* ── Today's Summary ── */}
        <View style={s.section}>
          <View style={s.summaryHeader}>
            <Text style={s.sectionTitle}>Today's Summary</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')}><Text style={s.viewDetails}>View Details</Text></TouchableOpacity>
          </View>
          <View style={s.summaryRow}>
            <SummaryTile icon="checkmark-circle-outline" iconColor={COLORS.green} label="Completed"  value={totalTrips} />
            <SummaryTile icon="close-circle-outline"     iconColor={COLORS.red}   label="Cancelled"  value={dashboard?.cancelled ?? 0} />
            <SummaryTile icon="checkmark-outline"        iconColor={BRAND}        label="Successful" value={totalTrips} />
            <SummaryTile icon="trending-up-outline"      iconColor="#8B5CF6"      label="Completion" value={totalTrips > 0 ? '98%' : '—'} />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <NotificationsModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        notifications={notifications}
        loading={notifLoading}
        onMarkRead={handleMarkRead}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatTile({ icon, iconColor, iconBg, label, value, valueColor }) {
  return (
    <View style={stat.wrap}>
      <View style={[stat.iconBox, { backgroundColor: iconBg }]}><Ionicons name={icon} size={18} color={iconColor} /></View>
      <Text style={stat.label}>{label}</Text>
      <Text style={[stat.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}
function OrderRow({ icon, iconColor, label, value }) {
  return (
    <View style={orRow.wrap}>
      <Ionicons name={icon} size={16} color={iconColor} style={{ marginTop: 2 }} />
      <View style={{ marginLeft: 8, flex: 1 }}>
        <Text style={orRow.label}>{label}</Text>
        <Text style={orRow.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}
function QuickAction({ icon, iconColor, bg, label, onPress }) {
  return (
    <TouchableOpacity style={qa.wrap} onPress={onPress} activeOpacity={0.75}>
      <View style={[qa.iconBox, { backgroundColor: bg }]}><Ionicons name={icon} size={24} color={iconColor} /></View>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}
function SummaryTile({ icon, iconColor, label, value }) {
  return (
    <View style={sum.wrap}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={sum.value}>{value}</Text>
      <Text style={sum.label}>{label}</Text>
    </View>
  );
}
function EmptyState({ icon, title, text }) {
  return (
    <View style={es.wrap}>
      <View style={es.iconBox}><Ionicons name={icon} size={30} color={COLORS.gray400} /></View>
      <Text style={es.title}>{title}</Text>
      <Text style={es.text}>{text}</Text>
    </View>
  );
}
function OfferCard({ order, onAccept, onReject, acting }) {
  return (
    <View style={oc.card}>
      <View style={oc.top}>
        <View>
          <Text style={oc.fare}>{fmtCurrency(order.fare)}</Text>
          <Text style={oc.meta}>{order.distanceMiles?.toFixed(1)} mi  •  {order.parcelWeight}</Text>
        </View>
        <View style={oc.badge}><Text style={oc.badgeText}>NEW</Text></View>
      </View>
      <View style={oc.route}>
        <View style={oc.routeRow}><View style={[oc.dot, { backgroundColor: COLORS.green }]} /><Text style={oc.routeText} numberOfLines={1}>{order.pickup?.address}</Text></View>
        <View style={oc.dashes}>{[0,1,2].map((i) => <View key={i} style={oc.dash} />)}</View>
        <View style={oc.routeRow}><View style={[oc.dot, { backgroundColor: COLORS.red }]} /><Text style={oc.routeText} numberOfLines={1}>{order.drop?.address}</Text></View>
      </View>
      <View style={oc.actions}>
        <Button title="Reject" variant="outline" size="md" onPress={onReject} disabled={acting}  style={{ flex: 1, marginRight: 6 }} />
        <Button title="Accept" variant="primary" size="md" loading={acting}   onPress={onAccept} style={{ flex: 1.5, marginLeft: 6 }} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F4F6FB' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FB' },
  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  topBarSpacer:{ width: 32 },
  logoWrap:    { flexDirection: 'row', alignItems: 'center' },
  logoSafe:    { fontSize: 18, fontWeight: '900', color: BRAND, letterSpacing: 0.5 },
  logoDel:     { fontSize: 18, fontWeight: '900', color: COLORS.red, letterSpacing: 0.5 },
  bellWrap:    { position: 'relative' },
  bellBadge:   { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '700' },
  heroCard:    { marginHorizontal: SIZES.lg, marginTop: SIZES.lg, borderRadius: 18, padding: SIZES.lg, flexDirection: 'row', alignItems: 'center', ...SHADOWS.md },
  avatarWrap:  { marginRight: 10 },
  avatarImg:   { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarFallback:{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:  { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroInfo:    { flex: 1 },
  heroName:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  heroId:      { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroRatingRow:{ flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  heroRating:  { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginLeft: 4, fontWeight: '600' },
  heroRight:   { alignItems: 'center' },
  youAreText:  { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  onlinePill:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  offlinePill: { backgroundColor: 'rgba(255,255,255,0.85)' },
  statusDot:   { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  onlinePillText:{ fontSize: 13, fontWeight: '700', color: COLORS.green },
  goOfflineRow:{ flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  goOfflineText:{ fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  statsCard:   { marginHorizontal: SIZES.lg, marginTop: SIZES.md, backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, ...SHADOWS.sm },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.gray200 },
  statsArrow:  { paddingLeft: 4 },
  vehicleChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginHorizontal: SIZES.lg, marginTop: 10, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  vehicleText: { color: BRAND, fontWeight: '600', marginLeft: 6, fontSize: 12 },
  orderCard:       { marginHorizontal: SIZES.lg, marginTop: SIZES.md, backgroundColor: '#fff', borderRadius: 16, padding: SIZES.lg, ...SHADOWS.sm },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderCardTitle:  { fontSize: 16, fontWeight: '700', color: BRAND },
  pickUpBtn:       { backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  pickUpBtnText:   { color: BRAND, fontSize: 13, fontWeight: '700' },
  orderId:         { fontSize: 13, color: COLORS.gray700, marginBottom: 12 },
  orderBody:       { flexDirection: 'row', gap: 12 },
  payRow:          { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  orderRowLabel:   { fontSize: 10, color: COLORS.gray500 },
  orderRowValue:   { fontSize: 13, fontWeight: '600', color: COLORS.gray900 },
  fareBadge:       { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  fareBadgeText:   { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  mapBox:          { width: 110, height: 110, borderRadius: 12, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  mapLabel:        { color: COLORS.gray400, fontSize: 11, marginTop: 4 },
  orderActions:    { flexDirection: 'row', gap: 10, marginTop: SIZES.md },
  navigateBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: BRAND, borderRadius: 12, paddingVertical: 13 },
  navigateBtnText: { color: BRAND, fontWeight: '700', fontSize: 15 },
  pickedBtn:       { flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND, borderRadius: 12, paddingVertical: 13, gap: 8 },
  pickedBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  quickRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  section:       { marginHorizontal: SIZES.lg, marginTop: SIZES.xl },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.md },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  viewDetails:   { color: BRAND, fontSize: 13, fontWeight: '700' },
});

const nm = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  handle:     { width: 40, height: 4, backgroundColor: COLORS.gray200, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  title:      { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  center:     { alignItems: 'center', justifyContent: 'center', padding: 40 },
  empty:      { color: COLORS.gray400, marginTop: 10, fontSize: 14 },
  item:       { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.gray100, gap: 12 },
  itemUnread: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
  iconBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  itemTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  itemBody:   { fontSize: 13, color: COLORS.gray500, marginTop: 2, lineHeight: 18 },
  itemTime:   { fontSize: 11, color: COLORS.gray400, marginTop: 4 },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND, marginTop: 6 },
});

const stat = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  label:   { fontSize: 10, color: COLORS.gray500, textAlign: 'center' },
  value:   { fontSize: 15, fontWeight: '700', marginTop: 2 },
});
const orRow = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  label: { fontSize: 10, color: COLORS.gray500 },
  value: { fontSize: 13, fontWeight: '600', color: COLORS.gray900 },
});
const qa = StyleSheet.create({
  wrap:    { alignItems: 'center', flex: 1 },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  label:   { fontSize: 11, color: COLORS.gray700, fontWeight: '600', textAlign: 'center' },
});
const sum = StyleSheet.create({
  wrap:  { alignItems: 'center', flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginHorizontal: 3, ...SHADOWS.sm },
  value: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginTop: 4 },
  label: { fontSize: 10, color: COLORS.gray500, marginTop: 2 },
});
const es = StyleSheet.create({
  wrap:    { alignItems: 'center', padding: SIZES.xxl, backgroundColor: '#fff', borderRadius: 14, ...SHADOWS.sm },
  iconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title:   { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  text:    { fontSize: 12, color: COLORS.gray500, marginTop: 4, textAlign: 'center' },
});
const oc = StyleSheet.create({
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: SIZES.lg, marginBottom: SIZES.md, ...SHADOWS.md },
  top:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.md },
  fare:      { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  meta:      { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  badge:     { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: COLORS.green, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  route:     { paddingVertical: SIZES.md, paddingHorizontal: SIZES.md, backgroundColor: COLORS.gray50, borderRadius: 10, marginBottom: SIZES.md },
  routeRow:  { flexDirection: 'row', alignItems: 'center' },
  dot:       { width: 10, height: 10, borderRadius: 5, marginRight: SIZES.sm },
  routeText: { flex: 1, fontSize: 13, color: COLORS.gray900 },
  dashes:    { paddingLeft: 4, paddingVertical: 2 },
  dash:      { width: 2, height: 4, backgroundColor: COLORS.gray200, marginVertical: 1 },
  actions:   { flexDirection: 'row' },
});
