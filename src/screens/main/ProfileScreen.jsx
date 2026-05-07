import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Modal, Pressable, TextInput, ActivityIndicator, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import { riderChangePassword, updateRiderProfile, uploadProfilePhoto, submitInquiry, deleteRiderAccount } from '../../api';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import Screen from '../../components/Screen';  
import { COLORS, SIZES, SHADOWS } from '../../theme';
import { vehicleLabel, errMsg } from '../../utils/helpers';

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: 'How do I go online and receive orders?',
    answer: 'Tap the center button in the bottom navigation or use the Online/Offline toggle on the Home screen. Once online, you will automatically receive nearby delivery requests.',
  },
  {
    question: 'How do I accept or reject an order?',
    answer: 'When a new order appears, you will see Accept and Reject buttons. Tap Accept to take the delivery or Reject to pass. Accepting too few orders may affect your rating.',
  },
  {
    question: 'How are my earnings calculated?',
    answer: 'Earnings are based on the distance of each delivery. You can view your daily, weekly, and monthly earnings in the Earnings tab. Payouts are processed regularly to your registered account.',
  },
  {
    question: 'What should I do if I cannot find the pickup location?',
    answer: 'Use the Navigate button on the Active Order screen to open turn-by-turn directions. If you still cannot locate it, contact the customer using the in-app call option.',
  },
  {
    question: 'How do I complete a delivery?',
    answer: 'After delivering the package, ask the customer for their OTP code and enter it in the app to confirm delivery. This protects both you and the customer.',
  },
  {
    question: 'What items am I not allowed to deliver?',
    answer: 'Do not deliver illegal substances, weapons, flammable or hazardous materials, or any items prohibited by Liberian law. Violations may result in account suspension.',
  },
];

// ─── Reusable sub-components ──────────────────────────────────────────────────
const MenuItem = ({ icon, label, sublabel, onPress, danger, color = COLORS.primary, last }) => (
  <TouchableOpacity
    style={[styles.menuItem, !last && styles.menuItemBorder]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={[styles.menuIconBox, { backgroundColor: (danger ? COLORS.red : color) + '18' }]}>
      <Ionicons name={icon} size={18} color={danger ? COLORS.red : color} />
    </View>
    <View style={styles.menuText}>
      <Text style={[styles.menuLabel, danger && { color: COLORS.red }]}>{label}</Text>
      {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={14} color={danger ? COLORS.red + '60' : COLORS.gray400} />
  </TouchableOpacity>
);

const FaqItem = ({ item, isOpen, onToggle }) => (
  <View style={styles.faqItem}>
    <TouchableOpacity style={styles.faqQuestion} onPress={onToggle} activeOpacity={0.75}>
      <Text style={styles.faqQuestionText}>{item.question}</Text>
      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.gray400} />
    </TouchableOpacity>
    {isOpen && (
      <View style={styles.faqAnswer}>
        <Text style={styles.faqAnswerText}>{item.answer}</Text>
      </View>
    )}
  </View>
);

// ─── Sign Out Modal ───────────────────────────────────────────────────────────
const SignOutModal = ({ visible, onCancel, onConfirm }) => (
  <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
    <Pressable style={signOutStyles.backdrop} onPress={onCancel}>
      <Pressable style={signOutStyles.card} onPress={() => {}}>
        <View style={signOutStyles.iconWrap}>
          <Ionicons name="log-out-outline" size={32} color="#fff" />
        </View>
        <Text style={signOutStyles.title}>Sign Out?</Text>
        <Text style={signOutStyles.subtitle}>
          You'll need to log in again to access your account and deliveries.
        </Text>
        <View style={signOutStyles.divider} />
        <View style={signOutStyles.actions}>
          <TouchableOpacity style={signOutStyles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={signOutStyles.cancelText}>Stay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={signOutStyles.signOutBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={signOutStyles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

// ─── Delete Account Modal ─────────────────────────────────────────────────────
function DeleteAccountModal({ visible, onCancel, onConfirm, loading }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setPassword('');
      setShowPass(false);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[deleteStyles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[deleteStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={deleteStyles.iconWrap}>
            <View style={deleteStyles.iconBg}>
              <Ionicons name="trash-outline" size={28} color={COLORS.red} />
            </View>
          </View>
          <Text style={deleteStyles.title}>Delete Account?</Text>
          <Text style={deleteStyles.body}>
            This is permanent and cannot be undone. All your rides, earnings history, and data will be erased forever.
          </Text>
          <View style={deleteStyles.warningStrip}>
            <Ionicons name="warning-outline" size={14} color="#B45309" />
            <Text style={deleteStyles.warningText}>This action cannot be reversed</Text>
          </View>
          <View style={deleteStyles.passWrap}>
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.gray400} style={{ marginLeft: 12 }} />
            <TextInput
              style={deleteStyles.passInput}
              placeholder="Enter your password to confirm"
              placeholderTextColor={COLORS.gray400}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ paddingRight: 12 }}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
          <View style={deleteStyles.btnRow}>
            <TouchableOpacity style={deleteStyles.cancelBtn} onPress={onCancel} activeOpacity={0.8} disabled={loading}>
              <Text style={deleteStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[deleteStyles.deleteBtn, { opacity: loading ? 0.75 : 1 }]}
              onPress={() => onConfirm(password)}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : (<><Ionicons name="trash-outline" size={16} color="#fff" /><Text style={deleteStyles.deleteBtnText}>Delete</Text></>)
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const rider        = useAuthStore((s) => s.rider);
  const refreshRider = useAuthStore((s) => s.refreshRider);
  const logout       = useAuthStore((s) => s.logout);

  const [panel,         setPanel]         = useState(null);
  const [editForm,      setEditForm]      = useState({ name: '', email: '', dob: '' });
  const [passForm,      setPassForm]      = useState({ old: '', newP: '', confirm: '' });
  const [message,       setMessage]       = useState('');
  const [loading,       setLoading]       = useState(false);
  const [photoLoading,  setPhotoLoading]  = useState(false);
  const [openFaq,       setOpenFaq]       = useState(null);
  const [showSignOut,   setShowSignOut]   = useState(false);
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useFocusEffect(useCallback(() => { refreshRider(); }, [refreshRider]));

  const togglePanel = (p) => setPanel((v) => (v === p ? null : p));
  const setE = (k) => (v) => setEditForm((f) => ({ ...f, [k]: v }));
  const setP = (k) => (v) => setPassForm((f) => ({ ...f, [k]: v }));

  const openEdit = () => {
    setEditForm({ name: rider?.name || '', email: rider?.email || '', dob: rider?.dob?.slice(0, 10) || '' });
    togglePanel('edit');
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) return Toast.show({ type: 'error', text1: 'Name cannot be empty' });
    setLoading(true);
    try {
      await updateRiderProfile({ name: editForm.name.trim(), email: editForm.email.trim(), dob: editForm.dob });
      await refreshRider();
      Toast.show({ type: 'success', text1: 'Profile updated!' });
      setPanel(null);
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Update failed') });
    } finally { setLoading(false); }
  };

  const handleChangePass = async () => {
    const { old, newP, confirm } = passForm;
    if (!old || !newP || !confirm) return Toast.show({ type: 'error', text1: 'Fill all fields' });
    if (newP !== confirm)          return Toast.show({ type: 'error', text1: 'Passwords do not match' });
    if (newP.length < 6)           return Toast.show({ type: 'error', text1: 'Minimum 6 characters' });
    setLoading(true);
    try {
      await riderChangePassword({ oldPassword: old, newPassword: newP });
      Toast.show({ type: 'success', text1: 'Password changed!' });
      setPanel(null);
      setPassForm({ old: '', newP: '', confirm: '' });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Failed') });
    } finally { setLoading(false); }
  };

  const handleInquiry = async () => {
    if (!message.trim()) return Toast.show({ type: 'error', text1: 'Enter your message' });
    setLoading(true);
    try {
      await submitInquiry({
        firstName: rider?.name?.split(' ')[0] || 'Rider',
        lastName:  rider?.name?.split(' ').slice(1).join(' ') || '',
        phone:     rider?.phone,
        email:     rider?.email,
        role:      'rider',
        message,
      });
      Toast.show({ type: 'success', text1: 'Message sent!', text2: "We'll get back to you soon." });
      setPanel(null);
      setMessage('');
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Failed to send') });
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async (password) => {
    if (!password.trim()) return Toast.show({ type: 'error', text1: 'Password is required' });
    setDeleteLoading(true);
    try {
      await deleteRiderAccount({ password });
      setDeleteModal(false);
      Toast.show({ type: 'success', text1: 'Account deleted', text2: 'Your rider account has been removed.' });
      setTimeout(() => logout(), 1200);
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.error || 'Failed to delete account' });
    } finally { setDeleteLoading(false); }
  };

  const handlePickPhoto = async () => {
    try {
      const { status: existing } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let finalStatus = existing;
      if (finalStatus !== 'granted') {
        const { status: asked } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = asked;
      }
      if (finalStatus !== 'granted') {
        return Toast.show({ type: 'error', text1: 'Gallery access denied', text2: 'Enable Photos permission in your device Settings.' });
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1],
      });
      if (result.canceled || !result.assets?.[0]) return;
      setPhotoLoading(true);
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fd = new FormData();
      fd.append('photo', { uri: asset.uri, name: asset.fileName || `profile.${ext}`, type: asset.mimeType || `image/${ext}` });
      await uploadProfilePhoto(fd);
      await refreshRider();
      Toast.show({ type: 'success', text1: 'Photo updated!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: errMsg(e, 'Upload failed') });
    } finally { setPhotoLoading(false); }
  };

  const initial = rider?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <Screen
      scroll
      pad={false}
      edges={['top']}
      scrollProps={{ contentContainerStyle: { paddingBottom: 100 }, showsVerticalScrollIndicator: false }}
    >

      {/* ── Profile Header ── */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarWrap} disabled={photoLoading}>
          {rider?.profilePhoto?.url ? (
            <Image source={{ uri: rider.profilePhoto.url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          )}
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={14} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{rider?.name}</Text>
        <Text style={styles.email}>{rider?.email}</Text>
        <Text style={styles.phone}>{rider?.phone}</Text>
        <View style={[styles.statusBadge, rider?.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
          <Text style={[styles.statusText, rider?.status === 'approved' ? styles.statusApprovedText : styles.statusPendingText]}>
            {rider?.status === 'approved' ? 'Verified Rider' : (rider?.status || 'pending')}
          </Text>
        </View>
      </View>

      {/* ── Vehicle Info ── */}
      {rider?.vehicle?.type && (
        <View style={styles.vehicleCard}>
          <Ionicons name="car-outline" size={20} color={COLORS.primary} />
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleType}>{vehicleLabel(rider.vehicle.type)}</Text>
            <Text style={styles.vehicleMeta}>{rider.vehicle.plate} · {rider.vehicle.model} · {rider.vehicle.color}</Text>
          </View>
        </View>
      )}

      {/* ── Account Section ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="person-outline"      label="Edit Profile"    sublabel="Update your info"         color={COLORS.primary} onPress={openEdit} />
          <MenuItem icon="lock-closed-outline" label="Change Password" sublabel="Keep your account secure" color={COLORS.primary} onPress={() => togglePanel('password')} last />
        </View>
      </View>

      {/* Edit Profile Panel */}
      {panel === 'edit' && (
        <View style={styles.panel}>
          <View style={styles.panelHdr}>
            <Text style={styles.panelTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setPanel(null)}>
              <Ionicons name="close-circle" size={22} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
          <Input label="Full Name"     placeholder="Your name"  value={editForm.name}  onChangeText={setE('name')}  autoCapitalize="words"      leftIcon={<Ionicons name="person-outline"   size={16} color={COLORS.gray400} />} />
          <Input label="Email"         placeholder="Email"       value={editForm.email} onChangeText={setE('email')} keyboardType="email-address" leftIcon={<Ionicons name="mail-outline"     size={16} color={COLORS.gray400} />} />
          <Input label="Date of Birth" placeholder="YYYY-MM-DD" value={editForm.dob}   onChangeText={setE('dob')}                               leftIcon={<Ionicons name="calendar-outline" size={16} color={COLORS.gray400} />} />
          <Button title="Save Changes" onPress={handleSaveProfile} loading={loading} size="lg" />
          <Button title="Cancel" onPress={() => setPanel(null)} variant="ghost" size="sm" style={{ marginTop: SIZES.sm }} />
        </View>
      )}

      {/* Change Password Panel */}
      {panel === 'password' && (
        <View style={styles.panel}>
          <View style={styles.panelHdr}>
            <Text style={styles.panelTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setPanel(null)}>
              <Ionicons name="close-circle" size={22} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
          <Input label="Current Password" placeholder="••••••"           value={passForm.old}     onChangeText={setP('old')}     secureTextEntry leftIcon={<Ionicons name="lock-closed-outline"      size={16} color={COLORS.gray400} />} />
          <Input label="New Password"      placeholder="Min 6 characters" value={passForm.newP}    onChangeText={setP('newP')}    secureTextEntry leftIcon={<Ionicons name="lock-open-outline"        size={16} color={COLORS.gray400} />} />
          <Input label="Confirm Password"  placeholder="Re-enter"         value={passForm.confirm} onChangeText={setP('confirm')} secureTextEntry leftIcon={<Ionicons name="checkmark-circle-outline" size={16} color={COLORS.gray400} />} />
          <Button title="Update Password" onPress={handleChangePass} loading={loading} size="lg" />
          <Button title="Cancel" onPress={() => setPanel(null)} variant="ghost" size="sm" style={{ marginTop: SIZES.sm }} />
        </View>
      )}

      {/* ── Support Section ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="help-circle-outline"      label="Contact Support"      sublabel="Get help from our team"               color={COLORS.green}   onPress={() => setPanel('support')} />
          <MenuItem icon="document-text-outline"    label="FAQ"                  sublabel="Frequently asked questions"           color={COLORS.green}   onPress={() => togglePanel('faq')} />
          <MenuItem icon="shield-checkmark-outline" label="Terms and Conditions" sublabel="View rider agreement and privacy policy" color={COLORS.primary} onPress={() => navigation.navigate('TermsFromProfile', { fromProfile: true })} last />
        </View>
      </View>

      {/* Contact Support Panel */}
      {panel === 'support' && (
        <View style={styles.panel}>
          <View style={styles.panelHdr}>
            <Text style={styles.panelTitle}>Contact Support</Text>
            <TouchableOpacity onPress={() => setPanel(null)}>
              <Ionicons name="close-circle" size={22} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
          <Input
            label="Your Message"
            placeholder="Describe your issue..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            autoFocus
            inputStyle={{ height: 100, textAlignVertical: 'top' }}
            leftIcon={<Ionicons name="chatbubble-outline" size={16} color={COLORS.gray400} />}
          />
          <Button title="Send Message" onPress={handleInquiry} loading={loading} size="lg" />
          <Button title="Cancel" onPress={() => setPanel(null)} variant="ghost" size="sm" style={{ marginTop: SIZES.sm }} />
        </View>
      )}

      {/* FAQ Panel */}
      {panel === 'faq' && (
        <View style={styles.panel}>
          <View style={styles.panelHdr}>
            <Text style={styles.panelTitle}>FAQ</Text>
            <TouchableOpacity onPress={() => { setPanel(null); setOpenFaq(null); }}>
              <Ionicons name="close-circle" size={22} color={COLORS.gray400} />
            </TouchableOpacity>
          </View>
          {FAQ_ITEMS.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              isOpen={openFaq === index}
              onToggle={() => setOpenFaq((v) => (v === index ? null : index))}
            />
          ))}
        </View>
      )}

      {/* ── Danger Zone ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="trash-outline" label="Delete Account" sublabel="Permanently remove your rider account" onPress={() => setDeleteModal(true)} danger last />
        </View>
      </View>

      {/* ── Sign Out ── */}
      <View style={styles.section}>
        <View style={styles.menuCard}>
          <MenuItem icon="log-out-outline" label="Sign Out" sublabel="See you again soon!" onPress={() => setShowSignOut(true)} danger last />
        </View>
      </View>

      <Text style={styles.version}>Safe Delivery Rider v1.0.0 • Liberia's Trusted Logistics</Text>

      {/* ── Modals (render above everything) ── */}
      <SignOutModal
        visible={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={() => { setShowSignOut(false); logout(); }}
      />
      <DeleteAccountModal
        visible={deleteModal}
        onCancel={() => { if (!deleteLoading) setDeleteModal(false); }}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
      />

    </Screen>
  );
}

// ─── Delete Modal Styles ──────────────────────────────────────────────────────
const deleteStyles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  card:         { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  iconWrap:     { marginBottom: 16 },
  iconBg:       { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, letterSpacing: -0.3 },
  body:         { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, fontWeight: '500', marginBottom: 14 },
  warningStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, width: '100%' },
  warningText:  { fontSize: 12, color: '#B45309', fontWeight: '600' },
  passWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20, width: '100%', height: 50 },
  passInput:    { flex: 1, paddingHorizontal: 10, fontSize: 14, color: '#111827', fontWeight: '500' },
  btnRow:       { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cancelText:   { fontSize: 15, color: '#374151', fontWeight: '700' },
  deleteBtn:    { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  deleteBtnText:{ fontSize: 15, color: '#fff', fontWeight: '700' },
});

// ─── Sign Out Modal Styles ────────────────────────────────────────────────────
const signOutStyles = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card:        { width: '100%', backgroundColor: '#244BB3', borderRadius: 20, paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12 },
  iconWrap:    { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:       { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, letterSpacing: 0.3 },
  subtitle:    { fontSize: 14, color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  divider:     { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 20 },
  actions:     { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cancelText:  { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  signOutBtn:  { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: '#D93025', shadowColor: '#D93025', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  signOutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  profileHeader:      { alignItems: 'center', padding: SIZES.xl, paddingTop: SIZES.xxl, backgroundColor: COLORS.white, marginBottom: SIZES.md },
  avatarWrap:         { position: 'relative', marginBottom: SIZES.md },
  avatar:             { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImg:          { width: 88, height: 88, borderRadius: 44 },
  avatarText:         { fontSize: 36, fontWeight: '700', color: COLORS.white },
  cameraOverlay:      { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white },
  name:               { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.gray900 },
  email:              { fontSize: SIZES.fontMd, color: COLORS.gray500, marginTop: 4 },
  phone:              { fontSize: SIZES.fontMd, color: COLORS.gray500, marginTop: 2 },
  statusBadge:        { marginTop: SIZES.md, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  statusApproved:     { backgroundColor: COLORS.greenLight },
  statusPending:      { backgroundColor: COLORS.yellowLight },
  statusText:         { fontWeight: '600', fontSize: SIZES.fontSm },
  statusApprovedText: { color: COLORS.green },
  statusPendingText:  { color: COLORS.yellow },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SIZES.lg, marginBottom: SIZES.md, backgroundColor: COLORS.white, padding: SIZES.md, borderRadius: SIZES.radiusMd, ...SHADOWS.sm },
  vehicleInfo: { marginLeft: SIZES.md },
  vehicleType: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.gray900 },
  vehicleMeta: { fontSize: SIZES.fontSm, color: COLORS.gray500, marginTop: 2 },

  section:      { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.md },
  sectionTitle: { fontSize: SIZES.fontXs, fontWeight: '700', color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: SIZES.sm },
  menuCard:     { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, overflow: 'hidden', ...SHADOWS.sm },

  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, padding: SIZES.lg },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  menuIconBox:    { width: 38, height: 38, borderRadius: SIZES.radiusSm, alignItems: 'center', justifyContent: 'center' },
  menuText:       { flex: 1 },
  menuLabel:      { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.gray900 },
  menuSublabel:   { fontSize: SIZES.fontXs, color: COLORS.gray400, marginTop: 2 },

  panel:      { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: SIZES.lg, marginHorizontal: SIZES.lg, marginBottom: SIZES.md, ...SHADOWS.sm },
  panelHdr:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.xl },
  panelTitle: { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.gray900 },

  faqItem:         { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  faqQuestion:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SIZES.md, gap: SIZES.sm },
  faqQuestionText: { flex: 1, fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.gray900, lineHeight: 20 },
  faqAnswer:       { paddingBottom: SIZES.md },
  faqAnswerText:   { fontSize: SIZES.fontXs, color: COLORS.gray400, lineHeight: 18 },

  version: { textAlign: 'center', color: COLORS.gray400, fontSize: SIZES.fontXs, paddingVertical: SIZES.xxl },
});