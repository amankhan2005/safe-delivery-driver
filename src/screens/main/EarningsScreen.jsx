import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getEarnings } from '../../api';                          // ✅ FIXED
import { fmtCurrency, fmtDate, fmtStatus, statusColor } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';
import Screen from '../../components/Screen';

const BRAND = COLORS.primary;

const PERIODS = [
  { key: 'daily',   label: 'Today',      icon: 'today-outline' },
  { key: 'monthly', label: 'This Month', icon: 'calendar-outline' },
  { key: 'yearly',  label: 'This Year',  icon: 'stats-chart-outline' },
];

export default function EarningsScreen({ route }) {
  const [period,     setPeriod]     = useState(route?.params?.period || 'daily'); // ✅ accepts period from HomeScreen
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getEarnings(period);                      // ✅ FIXED
      setData(res?.data?.data || null);
    } catch (e) {
      console.log('Earnings fetch error:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const earnings    = data?.periodEarnings ?? 0;
  const miles       = data?.periodMiles    ?? 0;
  const allTimeObj  = data?.allTimeEarnings;
  const allTime     = typeof allTimeObj === 'object' ? (allTimeObj?.total ?? 0) : (allTimeObj ?? 0);
  const ordersCount = data?.ordersCount    ?? 0;
  const orders      = data?.orders         || [];
  const avgFare     = ordersCount > 0 ? earnings / ordersCount : 0;

  return (
    <Screen
      scroll
      pad={false}
      bg="#F1F5FB"
      edges={['top']}
      noKeyboard
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={BRAND}
        />
      }
      scrollProps={{ showsVerticalScrollIndicator: false }}
    >

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Earnings</Text>
        <Text style={s.headerSub}>Track your delivery income</Text>
      </View>

      {/* ── Period tabs ── */}
      <View style={s.tabs}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.tab, period === p.key && s.tabActive]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={p.icon} size={14} color={period === p.key ? '#fff' : COLORS.gray500} />
            <Text style={[s.tabTxt, period === p.key && s.tabTxtActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator color={BRAND} size="large" /></View>
      ) : (
        <>
          {/* ── Main earnings card ── */}
          <LinearGradient
            colors={['#0A2F9A', '#1B4FD8', '#2563EB']}
            style={s.mainCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.mainLabel}>
              {PERIODS.find(p => p.key === period)?.label} Earnings
            </Text>
            <Text style={s.mainVal}>{fmtCurrency(earnings)}</Text>
            <View style={s.mainStats}>
              <View style={s.mainStat}>
                <Ionicons name="cube-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={s.mainStatVal}>{ordersCount}</Text>
                <Text style={s.mainStatLabel}>Orders</Text>
              </View>
              <View style={s.mainStatDiv} />
              <View style={s.mainStat}>
                <Ionicons name="navigate-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={s.mainStatVal}>{Number(miles).toFixed(1)}</Text>
                <Text style={s.mainStatLabel}>Miles</Text>
              </View>
              <View style={s.mainStatDiv} />
              <View style={s.mainStat}>
                <Ionicons name="cash-outline" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={s.mainStatVal}>{fmtCurrency(avgFare)}</Text>
                <Text style={s.mainStatLabel}>Avg/Order</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── All-time card ── */}
          <View style={s.allTimeCard}>
            <View style={s.allTimeIconWrap}>
              <Ionicons name="trophy-outline" size={22} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.allTimeLabel}>All-Time Earnings</Text>
              <Text style={s.allTimeVal}>{fmtCurrency(allTime)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
          </View>

          {/* ── Quick stats row ── */}
          <View style={s.quickRow}>
            <View style={[s.quickTile, { borderLeftColor: '#16A34A' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
              <Text style={[s.quickVal, { color: '#16A34A' }]}>{ordersCount}</Text>
              <Text style={s.quickLabel}>Completed</Text>
            </View>
            <View style={[s.quickTile, { borderLeftColor: BRAND }]}>
              <Ionicons name="map-outline" size={20} color={BRAND} />
              <Text style={[s.quickVal, { color: BRAND }]}>{Number(miles).toFixed(1)}</Text>
              <Text style={s.quickLabel}>Miles Driven</Text>
            </View>
            <View style={[s.quickTile, { borderLeftColor: '#D97706' }]}>
              <Ionicons name="star-outline" size={20} color="#D97706" />
              <Text style={[s.quickVal, { color: '#D97706' }]}>
                {ordersCount > 0 ? '98%' : '—'}
              </Text>
              <Text style={s.quickLabel}>Success Rate</Text>
            </View>
          </View>

          {/* ── Order list ── */}
          {orders.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Recent Orders</Text>
              {orders.map((o) => {
                const color = statusColor(o.status);
                return (
                  <View key={o._id} style={s.orderCard}>
                    <View style={[s.orderStatusBar, { backgroundColor: color }]} />
                    <View style={s.orderBody}>
                      <View style={s.orderTop}>
                        <View style={s.orderRouteWrap}>
                          <View style={s.orderRouteRow}>
                            <View style={[s.orderDot, { backgroundColor: '#22C55E' }]} />
                            <Text style={s.orderAddr} numberOfLines={1}>{o.pickup?.address || 'Pickup'}</Text>
                          </View>
                          <View style={s.orderConn}><View style={s.orderConnLine} /></View>
                          <View style={s.orderRouteRow}>
                            <View style={[s.orderDot, { backgroundColor: '#EF4444' }]} />
                            <Text style={s.orderAddr} numberOfLines={1}>{o.drop?.address || 'Drop'}</Text>
                          </View>
                        </View>
                        <View style={s.orderRight}>
                          <Text style={s.orderFare}>{fmtCurrency(o.fare)}</Text>
                          <View style={[s.orderStatusBadge, { backgroundColor: color + '18' }]}>
                            <Text style={[s.orderStatusTxt, { color }]}>{fmtStatus(o.status)}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={s.orderDate}>{fmtDate(o.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {orders.length === 0 && (
            <View style={s.emptyOrders}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.gray300} />
              <Text style={s.emptyTitle}>No orders yet</Text>
              <Text style={s.emptySub}>Your completed orders will appear here</Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 40 }} />

    </Screen>
  );
}

const s = StyleSheet.create({
  header:      { paddingHorizontal: SIZES.lg, paddingTop: SIZES.lg, paddingBottom: SIZES.sm },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: '#6B7280', fontWeight: '500', marginTop: 3 },

  tabs:        { flexDirection: 'row', marginHorizontal: SIZES.lg, marginBottom: SIZES.lg, backgroundColor: '#E5E7EB', borderRadius: 12, padding: 3, gap: 3 },
  tab:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  tabActive:   { backgroundColor: BRAND, ...SHADOWS.sm },
  tabTxt:      { fontSize: 12, fontWeight: '700', color: COLORS.gray500 },
  tabTxtActive:{ color: '#fff' },

  loader: { padding: 80, alignItems: 'center' },

  mainCard:      { marginHorizontal: SIZES.lg, borderRadius: 20, padding: SIZES.xl, ...SHADOWS.blue },
  mainLabel:     { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  mainVal:       { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: SIZES.lg },
  mainStats:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: SIZES.md },
  mainStat:      { flex: 1, alignItems: 'center', gap: 3 },
  mainStatVal:   { fontSize: 16, fontWeight: '900', color: '#fff' },
  mainStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  mainStatDiv:   { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  allTimeCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: SIZES.lg, marginTop: SIZES.md, borderRadius: 16, padding: SIZES.lg, gap: SIZES.md, ...SHADOWS.sm },
  allTimeIconWrap:{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  allTimeLabel:   { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 3 },
  allTimeVal:     { fontSize: 22, fontWeight: '900', color: BRAND },

  quickRow:  { flexDirection: 'row', marginHorizontal: SIZES.lg, marginTop: SIZES.md, gap: SIZES.sm },
  quickTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 4, borderLeftWidth: 3, ...SHADOWS.sm },
  quickVal:  { fontSize: 16, fontWeight: '900' },
  quickLabel:{ fontSize: 10, color: '#6B7280', fontWeight: '500' },

  section:      { marginHorizontal: SIZES.lg, marginTop: SIZES.xl },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: SIZES.md, letterSpacing: -0.2 },

  orderCard:       { backgroundColor: '#fff', borderRadius: 14, marginBottom: SIZES.sm, flexDirection: 'row', overflow: 'hidden', ...SHADOWS.sm },
  orderStatusBar:  { width: 4 },
  orderBody:       { flex: 1, padding: SIZES.md },
  orderTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm },
  orderRouteWrap:  { flex: 1 },
  orderRouteRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderDot:        { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  orderAddr:       { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
  orderConn:       { paddingLeft: 4, paddingVertical: 2 },
  orderConnLine:   { width: 2, height: 10, backgroundColor: '#E5E7EB', borderRadius: 1 },
  orderRight:      { alignItems: 'flex-end', gap: 5 },
  orderFare:       { fontSize: 16, fontWeight: '900', color: BRAND },
  orderStatusBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  orderStatusTxt:  { fontSize: 10, fontWeight: '700' },
  orderDate:       { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 6 },

  emptyOrders: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:    { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});