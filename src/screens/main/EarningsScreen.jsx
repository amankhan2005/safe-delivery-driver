import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getEarnings } from '../../api';
import { fmtCurrency, fmtDate, fmtStatus, statusColor } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const PERIODS = [
  { key: 'daily',   label: 'Today' },
  { key: 'monthly', label: 'This Month' },
  { key: 'yearly',  label: 'This Year' },
];

export default function EarningsScreen() {
  const [period,    setPeriod]    = useState('daily');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getEarnings(period);
      setData(res?.data?.data || null);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const earnings    = data?.periodEarnings   ?? 0;
  const miles       = data?.periodMiles      ?? 0;
  const allTimeObj  = data?.allTimeEarnings;
  const allTime     = typeof allTimeObj === 'object' ? (allTimeObj?.total ?? 0) : (allTimeObj ?? 0);
  const ordersCount = data?.ordersCount      ?? 0;
  const orders      = data?.orders           || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Earnings</Text>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={COLORS.primary} /></View>
        ) : (
          <>
            {/* Big number */}
            <View style={styles.bigCard}>
              <Text style={styles.bigLabel}>{PERIODS.find((p) => p.key === period)?.label}</Text>
              <Text style={styles.bigValue}>{fmtCurrency(earnings)}</Text>
              <View style={styles.bigMeta}>
                <View style={styles.metaItem}><Ionicons name="cube-outline" size={16} color={COLORS.gray500} /><Text style={styles.metaText}>{ordersCount} orders</Text></View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}><Ionicons name="map-outline" size={16} color={COLORS.gray500} /><Text style={styles.metaText}>{Number(miles).toFixed(1)} miles</Text></View>
              </View>
            </View>

            {/* All-time */}
            <View style={styles.alltimeCard}>
              <View>
                <Text style={styles.alltimeLabel}>All-Time Earnings</Text>
                <Text style={styles.alltimeValue}>{fmtCurrency(allTime)}</Text>
              </View>
              <Ionicons name="trophy-outline" size={32} color={COLORS.primary} />
            </View>

            {/* Order list */}
            {orders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Orders</Text>
                {orders.map((o) => {
                  const color = statusColor(o.status);
                  return (
                    <View key={o._id} style={styles.orderRow}>
                      <View style={styles.orderLeft}>
                        <View style={[styles.orderDot, { backgroundColor: color }]} />
                        <View>
                          <Text style={styles.orderAddr} numberOfLines={1}>{o.drop?.address}</Text>
                          <Text style={styles.orderDate}>{fmtDate(o.createdAt)}</Text>
                        </View>
                      </View>
                      <Text style={styles.orderFare}>{fmtCurrency(o.fare)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { padding: SIZES.lg },
  title:           { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900 },
  loadingBox:      { padding: 60, alignItems: 'center' },
  periodRow:       { flexDirection: 'row', paddingHorizontal: SIZES.lg, marginBottom: SIZES.lg, gap: 8 },
  periodBtn:       { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  periodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodLabel:     { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.gray500 },
  periodLabelActive:{ color: COLORS.white },
  bigCard:         { backgroundColor: COLORS.primary, marginHorizontal: SIZES.lg, borderRadius: SIZES.radiusXl, padding: SIZES.xl, ...SHADOWS.md },
  bigLabel:        { fontSize: SIZES.fontSm, color: 'rgba(255,255,255,0.8)', fontWeight: '600', letterSpacing: 1 },
  bigValue:        { fontSize: 44, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  bigMeta:         { flexDirection: 'row', alignItems: 'center', marginTop: SIZES.lg },
  metaItem:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:        { color: 'rgba(255,255,255,0.85)', fontSize: SIZES.fontSm, fontWeight: '500' },
  metaDivider:     { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: SIZES.md },
  alltimeCard:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primaryLight, marginHorizontal: SIZES.lg, marginTop: SIZES.md, borderRadius: SIZES.radiusLg, padding: SIZES.lg, ...SHADOWS.sm },
  alltimeLabel:    { fontSize: SIZES.fontSm, color: COLORS.primary, fontWeight: '600' },
  alltimeValue:    { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.primaryDark, marginTop: 4 },
  section:         { paddingHorizontal: SIZES.lg, marginTop: SIZES.xl },
  sectionTitle:    { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.md },
  orderRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm, ...SHADOWS.sm },
  orderLeft:       { flex: 1, flexDirection: 'row', alignItems: 'center' },
  orderDot:        { width: 10, height: 10, borderRadius: 5, marginRight: SIZES.md },
  orderAddr:       { fontSize: SIZES.fontMd, fontWeight: '500', color: COLORS.gray900, maxWidth: 200 },
  orderDate:       { fontSize: SIZES.fontXs, color: COLORS.gray500, marginTop: 2 },
  orderFare:       { fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary },
});
