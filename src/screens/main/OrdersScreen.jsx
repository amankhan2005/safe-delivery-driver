import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRiderOrders } from '../../api';
import { fmtCurrency, fmtDateTime, fmtStatus, statusColor } from '../../utils/helpers';
import { COLORS, SIZES, SHADOWS } from '../../theme';

export default function OrdersScreen({ navigation }) {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getRiderOrders();
      const all = res?.data?.data?.orders || [];
      // Show history: delivered + cancelled
      setOrders(all.filter((o) => ['delivered', 'cancelled'].includes(o.status)));
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }) => {
    const color = statusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OrderHistoryDetail', { orderId: item._id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.idRow}>
            <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
            <Text style={styles.orderId}>#{item._id?.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{fmtStatus(item.status)}</Text>
          </View>
        </View>

        <View style={styles.route}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.green }]} />
            <Text style={styles.routeText} numberOfLines={1}>{item.pickup?.address}</Text>
          </View>
          <View style={styles.dashes}>{[0,1,2].map((i) => <View key={i} style={styles.dash} />)}</View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.red }]} />
            <Text style={styles.routeText} numberOfLines={1}>{item.drop?.address}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>{fmtDateTime(item.createdAt)}</Text>
          <Text style={styles.fare}>{fmtCurrency(item.fare)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery History</Text>
        <Text style={styles.count}>{orders.length} orders</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={COLORS.gray200} />
            <Text style={styles.emptyText}>No completed deliveries yet</Text>
            <Text style={styles.emptySub}>Finished orders will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:     { padding: SIZES.lg, paddingTop: SIZES.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:      { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900 },
  count:      { fontSize: SIZES.fontSm, color: COLORS.gray400 },
  list:       { padding: SIZES.lg, paddingTop: 0, gap: 12 },
  card:       { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: SIZES.lg, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.md },
  idRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderId:    { fontSize: SIZES.fontSm, fontWeight: '700', color: COLORS.gray900 },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  badgeText:  { fontSize: SIZES.fontXs, fontWeight: '600' },
  route:      { marginBottom: SIZES.md },
  routeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeText:  { flex: 1, fontSize: SIZES.fontSm, color: COLORS.gray700 },
  dashes:     { flexDirection: 'column', gap: 3, marginLeft: 3, marginVertical: 4 },
  dash:       { width: 2, height: 4, backgroundColor: COLORS.gray200, borderRadius: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.gray100, paddingTop: SIZES.sm },
  date:       { fontSize: SIZES.fontXs, color: COLORS.gray400 },
  fare:       { fontSize: SIZES.fontMd, fontWeight: '700', color: COLORS.primary },
  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyText:  { fontSize: SIZES.fontXl, fontWeight: '600', color: COLORS.gray400, marginTop: SIZES.lg },
  emptySub:   { fontSize: SIZES.fontSm, color: COLORS.gray400, marginTop: 4 },
});
