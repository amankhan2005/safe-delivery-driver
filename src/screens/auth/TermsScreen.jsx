import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Screen from '../../components/Screen'; // ← common Screen component
import { COLORS, SIZES, SHADOWS } from '../../theme';

const SECTIONS = [
  {
    number: '1',
    title: 'Rider Responsibilities',
    items: [
      'Riders must handle all customer packages safely and professionally.',
      'Opening, tampering with, or stealing customer items is strictly prohibited.',
      'Riders must respect customer privacy at all times.',
      'Riders are responsible for safe delivery from pickup to drop-off.',
    ],
  },
  {
    number: '2',
    title: 'Prohibited Actions',
    items: [
      'Do not transport illegal, hazardous, or restricted items.',
      'Any violation may result in account suspension or permanent ban.',
      'Serious violations may lead to legal action under applicable laws.',
    ],
  },
  {
    number: '3',
    title: 'Data Collection',
    intro: 'We collect the following for verification and safety:',
    items: [
      'Name, email address, and phone number',
      'Live selfie captured during signup',
      'Government-issued identity documents',
      'Driving licence',
      'Vehicle details — registration certificate, number, model, and color',
    ],
  },
  {
    number: '4',
    title: 'Purpose of Data',
    items: [
      'Identity verification before onboarding',
      'Customer and rider safety throughout operations',
      'Secure and accountable delivery processes',
    ],
  },
  {
    number: '5',
    title: 'Privacy Policy',
    items: [
      'All collected data is securely stored using industry-standard encryption.',
      'Data is not shared with any unauthorized third parties.',
      'Information is used solely for service delivery and legal compliance.',
    ],
  },
  {
    number: '6',
    title: 'Agreement',
    intro: 'By tapping "Agree and Continue", you confirm that you have read, understood, and agree to be bound by these Terms and Conditions. Failure to comply with these terms may result in suspension or termination of your rider account.',
    items: [],
  },
];

const SectionBlock = ({ section }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{section.number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
    {section.intro ? <Text style={styles.intro}>{section.intro}</Text> : null}
    {section.items.map((item, i) => (
      <View key={i} style={styles.bulletRow}>
        <View style={styles.bullet} />
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

export default function TermsScreen({ navigation, route }) {
  const fromProfile = route?.params?.fromProfile === true;
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 60;
    if (isNearBottom && !scrolledToEnd) setScrolledToEnd(true);
  };

  const handleAgree = () => {
    navigation.navigate('SelfieCapture', {
      signupData: route?.params?.signupData,
    });
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <Screen
        scroll
        pad={false}
        bg={COLORS.white}
        edges={['top', 'bottom']}
        noKeyboard
        scrollProps={{
          contentContainerStyle: styles.scrollContent,
          onScroll: handleScroll,
          scrollEventThrottle: 32,
          showsVerticalScrollIndicator: true,
          style: { backgroundColor: COLORS.background },
        }}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.gray700} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Terms and Conditions</Text>
            <Text style={styles.headerSub}>Safe Delivery — Liberia</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.divider} />

        {/* ── Content ── */}
        <View style={{ padding: SIZES.lg }}>
          <View style={styles.effectiveBanner}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.effectiveText}>
              Effective Date: 1 May 2026 — Safe Delivery (Rider Partner Agreement, Liberia)
            </Text>
          </View>

          <Text style={styles.preamble}>
            These Terms and Conditions govern your use of the Safe Delivery rider platform. Please
            read this document carefully before proceeding with registration.
          </Text>

          {SECTIONS.map((s) => (
            <SectionBlock key={s.number} section={s} />
          ))}

          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.green} />
            <Text style={styles.footerNoteText}>
              Safe Delivery is committed to protecting your privacy and ensuring a safe, trusted
              delivery network across Liberia.
            </Text>
          </View>
        </View>

        {/* ── Bottom Action (inside scroll so it stays at end) ── */}
        {!fromProfile && (
          <View style={styles.bottomBar}>
            {!scrolledToEnd && (
              <Text style={styles.scrollHint}>Scroll to read all terms before agreeing</Text>
            )}
            <Button
              title="Agree and Continue"
              onPress={handleAgree}
              size="lg"
              disabled={!scrolledToEnd}
              icon={<Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />}
            />
          </View>
        )}

      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, backgroundColor: COLORS.white },
  backBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center' },
  headerCenter:      { flex: 1, alignItems: 'center' },
  headerTitle:       { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900 },
  headerSub:         { fontSize: SIZES.fontXs, color: COLORS.gray500, marginTop: 2 },
  divider:           { height: 1, backgroundColor: COLORS.border },
  scrollContent:     { flexGrow: 1, paddingBottom: SIZES.xxxl },
  effectiveBanner:   { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.xs, backgroundColor: COLORS.primaryLight, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.md },
  effectiveText:     { flex: 1, fontSize: SIZES.fontXs, color: COLORS.primary, fontWeight: '600', lineHeight: 17 },
  preamble:          { fontSize: SIZES.fontMd, color: COLORS.gray700, lineHeight: 22, marginBottom: SIZES.lg },
  section:           { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: SIZES.lg, marginBottom: SIZES.md, ...SHADOWS.sm },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.md },
  sectionNumber:     { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sectionNumberText: { color: COLORS.white, fontSize: SIZES.fontSm, fontWeight: '700' },
  sectionTitle:      { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900, flex: 1 },
  intro:             { fontSize: SIZES.fontMd, color: COLORS.gray700, lineHeight: 22, marginBottom: SIZES.sm },
  bulletRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm, marginBottom: SIZES.sm },
  bullet:            { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 7 },
  bulletText:        { flex: 1, fontSize: SIZES.fontMd, color: COLORS.gray700, lineHeight: 22 },
  footerNote:        { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm, backgroundColor: COLORS.greenLight, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginTop: SIZES.md },
  footerNoteText:    { flex: 1, fontSize: SIZES.fontSm, color: COLORS.gray700, lineHeight: 18 },
  bottomBar:         { margin: SIZES.lg, marginTop: 0, gap: SIZES.sm },
  scrollHint:        { fontSize: SIZES.fontXs, color: COLORS.gray400, textAlign: 'center' },
});