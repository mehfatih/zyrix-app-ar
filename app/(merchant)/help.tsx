/**
 * Zyrix App — Help & Support Screen
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Linking, I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

// ─── ألوان بطاقات التواصل ─────────────────────────
const CONTACT_COLORS = [
  { bg: 'rgba(26, 86, 219, 0.12)',  border: 'rgba(26, 86, 219, 0.30)',  icon: '#60A5FA',  title: '#93C5FD' },   // بريد — أزرق
  { bg: 'rgba(13, 148, 136, 0.12)', border: 'rgba(13, 148, 136, 0.30)', icon: '#2DD4BF',  title: '#5EEAD4' },  // هاتف — تيل
  { bg: 'rgba(5, 150, 105, 0.12)',  border: 'rgba(5, 150, 105, 0.30)',  icon: '#34D399',  title: '#6EE7B7' },  // واتساب — أخضر
];

// ─── ألوان عناصر الأسئلة الشائعة ─────────────────
const FAQ_COLORS = [
  { bg: 'rgba(26, 86, 219, 0.07)',  border: 'rgba(26, 86, 219, 0.20)',  accent: '#60A5FA' },
  { bg: 'rgba(139, 92, 246, 0.07)', border: 'rgba(139, 92, 246, 0.20)', accent: '#A78BFA' },
  { bg: 'rgba(13, 148, 136, 0.07)', border: 'rgba(13, 148, 136, 0.20)', accent: '#2DD4BF' },
  { bg: 'rgba(245, 158, 11, 0.07)', border: 'rgba(245, 158, 11, 0.20)', accent: '#FCD34D' },
  { bg: 'rgba(220, 38, 38, 0.07)',  border: 'rgba(220, 38, 38, 0.20)',  accent: '#F87171' },
  { bg: 'rgba(5, 150, 105, 0.07)',  border: 'rgba(5, 150, 105, 0.20)',  accent: '#34D399' },
  { bg: 'rgba(99, 102, 241, 0.07)', border: 'rgba(99, 102, 241, 0.20)', accent: '#818CF8' },
];

// ─── SVG Icons ───────────────────────────────────

function BackIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon({ size = 18, color = COLORS.textMuted, open = false }: {
  size?: number; color?: string; open?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── FAQ Item ────────────────────────────────────

interface FAQItem { id: string; questionKey: string; answerKey: string; }

const FAQ_ITEMS: FAQItem[] = [
  { id: 'faq1', questionKey: 'help.faq1_q', answerKey: 'help.faq1_a' },
  { id: 'faq2', questionKey: 'help.faq2_q', answerKey: 'help.faq2_a' },
  { id: 'faq3', questionKey: 'help.faq3_q', answerKey: 'help.faq3_a' },
  { id: 'faq4', questionKey: 'help.faq4_q', answerKey: 'help.faq4_a' },
  { id: 'faq5', questionKey: 'help.faq5_q', answerKey: 'help.faq5_a' },
  { id: 'faq6', questionKey: 'help.faq6_q', answerKey: 'help.faq6_a' },
  { id: 'faq7', questionKey: 'help.faq7_q', answerKey: 'help.faq7_a' },
];

function FAQAccordion({ item, isOpen, onToggle, t, isRTL, colorIndex }: {
  item: FAQItem; isOpen: boolean; onToggle: () => void;
  t: (key: string) => string; isRTL: boolean; colorIndex: number;
}) {
  const fc = FAQ_COLORS[colorIndex % FAQ_COLORS.length];
  return (
    <View style={[styles.faqItem, { backgroundColor: isOpen ? fc.bg : 'transparent', borderColor: isOpen ? fc.border : COLORS.divider }]}>
      <TouchableOpacity
        style={[styles.faqQuestion, isRTL && styles.faqQuestionRTL]}
        onPress={onToggle} activeOpacity={0.7}
      >
        <View style={[styles.faqNumBadge, { backgroundColor: fc.bg, borderColor: fc.border, borderWidth: 1 }]}>
          <Text style={[styles.faqNum, { color: fc.accent }]}>{colorIndex + 1}</Text>
        </View>
        <Text style={[styles.faqQuestionText, isRTL && { textAlign: 'right' }, isOpen && { color: fc.accent }]}
          numberOfLines={isOpen ? undefined : 2}>
          {t(item.questionKey)}
        </Text>
        <ChevronDownIcon size={18} color={isOpen ? fc.accent : COLORS.textMuted} open={isOpen} />
      </TouchableOpacity>
      {isOpen && (
        <View style={[styles.faqAnswer, { borderTopColor: fc.border }]}>
          <Text style={[styles.faqAnswerText, isRTL && { textAlign: 'right' }]}>
            {t(item.answerKey)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const contactOptions = [
    { id: 'email',    icon: '📧', titleKey: 'help.contact_email',    subtitleKey: 'help.contact_email_sub',    action: () => Linking.openURL('mailto:info@zyrix.co') },
    { id: 'phone',    icon: '📞', titleKey: 'help.contact_phone',    subtitleKey: 'help.contact_phone_sub',    action: () => Linking.openURL('tel:+905452210888') },
    { id: 'whatsapp', icon: '💬', titleKey: 'help.contact_whatsapp', subtitleKey: 'help.contact_whatsapp_sub', action: () => Linking.openURL('https://wa.me/905452210888') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <BackIcon size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('help.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🎧</Text>
          <Text style={styles.heroTitle}>{t('help.hero_title')}</Text>
          <Text style={[styles.heroSubtitle, isRTL && { textAlign: 'right' }]}>
            {t('help.hero_subtitle')}
          </Text>
        </View>

        {/* Contact — كل بطاقة بلون مميز */}
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {t('help.contact_title')}
        </Text>
        <View style={[styles.contactGrid, isRTL && { flexDirection: 'row-reverse' }]}>
          {contactOptions.map((option, i) => {
            const cc = CONTACT_COLORS[i % CONTACT_COLORS.length];
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.contactCard, { backgroundColor: cc.bg, borderColor: cc.border }]}
                onPress={option.action} activeOpacity={0.7}
              >
                <Text style={styles.contactIcon}>{option.icon}</Text>
                <Text style={[styles.contactTitle, { color: cc.title }]}>{t(option.titleKey)}</Text>
                <Text style={styles.contactSubtitle}>{t(option.subtitleKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FAQ — كل سؤال بلون مميز */}
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {t('help.faq_title')}
        </Text>
        <View style={styles.faqContainer}>
          {FAQ_ITEMS.map((item, index) => (
            <FAQAccordion
              key={item.id}
              item={item}
              isOpen={openFAQ === item.id}
              onToggle={() => setOpenFAQ(openFAQ === item.id ? null : item.id)}
              t={t} isRTL={isRTL}
              colorIndex={index}
            />
          ))}
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottomCTA}>
          <Text style={[styles.ctaText, isRTL && { textAlign: 'right' }]}>
            {t('help.still_need_help')}
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => Linking.openURL('mailto:info@zyrix.co')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>{t('help.contact_us')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.darkBg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, height: 52,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, textAlign: 'center',
  },
  headerSpacer: { width: 36 },
  scrollContent: {
    paddingHorizontal: SPACING.xl, paddingTop: SPACING['2xl'], paddingBottom: SPACING['5xl'],
  },
  hero: { alignItems: 'center', marginBottom: SPACING['3xl'] },
  heroIcon: { fontSize: 48, marginBottom: SPACING.md },
  heroTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary, marginBottom: SPACING.md,
  },
  contactGrid: {
    flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING['3xl'],
  },
  contactCard: {
    flex: 1, borderRadius: RADIUS.md, padding: SPACING.lg,
    alignItems: 'center', borderWidth: 1,
  },
  contactIcon: { fontSize: 28, marginBottom: SPACING.sm },
  contactTitle: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 2, textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 10, color: COLORS.textMuted, textAlign: 'center',
  },
  faqContainer: { gap: SPACING.sm, marginBottom: SPACING['3xl'] },
  faqItem: {
    borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md,
  },
  faqQuestionRTL: { flexDirection: 'row-reverse' },
  faqNumBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  faqNum: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  faqQuestionText: {
    flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary, lineHeight: 20,
  },
  faqAnswer: {
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg,
    paddingTop: SPACING.md, borderTopWidth: 1,
  },
  faqAnswerText: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 22,
  },
  bottomCTA: { alignItems: 'center' },
  ctaText: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
    textAlign: 'center', marginBottom: SPACING.md,
  },
  ctaButton: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING['3xl'], height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, color: COLORS.white,
  },
});