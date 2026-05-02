import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getOrderById } from '../../api';
import { fmtCurrency, fmtDateTime, fmtStatus, statusColor } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';

const TIMELINE = ['searching', 'assigned', 'picked_up', 'in_transit', 'delivered'];

export default function OrderHistoryDetail({ navigation, route }) {
  const { orderId } = route.params;
  const [order,      setOrder]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getOrderById(orderId);
      setOrder(res?.data?.data?.order);
    } catch { /* */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !order) {
    return <SafeAreaView style={styles.center} edges={['top']}><ActivityIndicator color={COLORS.primary} size="large" /></SafeAreaView>;
  }

  const color     = statusColor(order.status);
  const stepIndex = TIMELINE.indexOf(order.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.gray700} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status card */}
        <View style={[styles.statusCard, { borderTopColor: color }]}>
          <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.statusText, { color }]}>{fmtStatus(order.status)}</Text>
          </View>
          <Text style={styles.orderId}>#{order._id?.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{fmtDateTime(order.createdAt)}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Progress</Text>
          {TIMELINE.map((s, i) => {
            const done    = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <View key={s} style={styles.tlRow}>
                <View style={styles.tlLeft}>
                  <View style={[styles.tlDot, done && styles.tlDotDone, current && styles.tlDotCur]}>
                    {done && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                  </View>
                  {i < TIMELINE.length - 1 && <View style={[styles.tlLine, done && styles.tlLineDone]} />}
                </View>
                <Text style={[styles.tlLabel, done && styles.tlLabelDone]}>{fmtStatus(s)}</Text>
              </View>
            );
          })}
        </View>

        {/* Route */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeRow}><View style={[styles.routeDot, { backgroundColor: COLORS.green }]} />
            <View style={styles.routeInfo}><Text style={styles.routeLabel}>Pickup</Text><Text style={styles.routeAddr}>{order.pickup?.address}</Text>{(order.pickup?.contactName || order.pickup?.contactPhone) ? <Text style={styles.routeContact}>{[order.pickup?.contactName, order.pickup?.contactPhone].filter(Boolean).join(' · ')}</Text> : null}</View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}><View style={[styles.routeDot, { backgroundColor: COLORS.red }]} />
            <View style={styles.routeInfo}><Text style={styles.routeLabel}>Drop</Text><Text style={styles.routeAddr}>{order.drop?.address}</Text>{(order.drop?.contactName || order.drop?.contactPhone) ? <Text style={styles.routeContact}>{[order.drop?.contactName, order.drop?.contactPhone].filter(Boolean).join(' · ')}</Text> : null}</View>
          </View>
        </View>

        {/* Proof photos */}
        {(order.pickupPhoto?.url || order.dropPhoto?.url) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Proof Photos</Text>
            <View style={styles.photoRow}>
              {order.pickupPhoto?.url ? <View style={styles.photoBox}><Image source={{ uri: order.pickupPhoto.url }} style={styles.photo} /><Text style={styles.photoCap}>Pickup</Text></View> : null}
              {order.dropPhoto?.url   ? <View style={styles.photoBox}><Image source={{ uri: order.dropPhoto.url }}   style={styles.photo} /><Text style={styles.photoCap}>Drop</Text></View>   : null}
            </View>
          </View>
        )}

        {/* Fare */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.fareRow}><Text style={styles.fareLabel}>Total Fare</Text><Text style={styles.fareVal}>{fmtCurrency(order.fare)}</Text></View>
          <View style={styles.fareRow}><Text style={styles.fareLabel}>Distance</Text><Text style={styles.fareVal2}>{order.distanceMiles?.toFixed(1)} miles</Text></View>
          <View style={styles.payMethod}><Ionicons name="cash-outline" size={16} color={COLORS.green} /><Text style={styles.payMethodText}>Cash on Delivery</Text></View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg },
  backBtn:      { width: 40, height: 40, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  headerTitle:  { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900 },
  statusCard:   { backgroundColor: COLORS.white, marginHorizontal: SIZES.lg, borderRadius: SIZES.radiusLg, padding: SIZES.lg, alignItems: 'center', marginBottom: SIZES.md, borderTopWidth: 4, ...SHADOWS.sm },
  statusBadge:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusFull, marginBottom: 8 },
  statusText:   { fontSize: SIZES.fontMd, fontWeight: '700' },
  orderId:      { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900 },
  orderDate:    { fontSize: SIZES.fontSm, color: COLORS.gray400, marginTop: 4 },
  card:         { backgroundColor: COLORS.white, marginHorizontal: SIZES.lg, borderRadius: SIZES.radiusLg, padding: SIZES.lg, marginBottom: SIZES.md, ...SHADOWS.sm },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.md },
  tlRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  tlLeft:       { width: 32, alignItems: 'center' },
  tlDot:        { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.gray200, alignItems: 'center', justifyContent: 'center' },
  tlDotDone:    { backgroundColor: COLORS.primary },
  tlDotCur:     { backgroundColor: COLORS.primary },
  tlLine:       { width: 2, height: 20, backgroundColor: COLORS.gray200, marginVertical: 2 },
  tlLineDone:   { backgroundColor: COLORS.primary },
  tlLabel:      { fontSize: SIZES.fontMd, color: COLORS.gray400, paddingTop: 2, paddingLeft: SIZES.sm },
  tlLabelDone:  { color: COLORS.gray900, fontWeight: '600' },
  routeRow:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  routeDot:     { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  routeInfo:    { flex: 1 },
  routeLabel:   { fontSize: SIZES.fontXs, color: COLORS.gray400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeAddr:    { fontSize: SIZES.fontMd, color: COLORS.gray900, fontWeight: '600', marginTop: 2 },
  routeContact: { fontSize: SIZES.fontSm, color: COLORS.gray500, marginTop: 2 },
  routeDivider: { height: 20, width: 2, backgroundColor: COLORS.gray100, marginLeft: 5, marginVertical: 4 },
  photoRow:     { flexDirection: 'row' },
  photoBox:     { flex: 1, marginRight: SIZES.sm },
  photo:        { width: '100%', height: 120, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.gray100 },
  photoCap:     { fontSize: SIZES.fontXs, color: COLORS.gray500, marginTop: 4, textAlign: 'center' },
  fareRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  fareLabel:    { fontSize: SIZES.fontMd, color: COLORS.gray500 },
  fareVal:      { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.primary },
  fareVal2:     { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.gray900 },
  payMethod:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.greenLight, padding: SIZES.sm, borderRadius: SIZES.radiusSm, marginTop: SIZES.sm },
  payMethodText:{ fontSize: SIZES.fontSm, color: COLORS.green, fontWeight: '600' },
});
