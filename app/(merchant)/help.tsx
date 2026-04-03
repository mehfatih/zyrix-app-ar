/**
 * Zyrix App — Help & Support Screen
 * FAQ accordion + contact options (email, phone, WhatsApp).
 * Phase 6 Task 6.7
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  I18nManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

// ─── Icons ───────────────────────────────────────

function BackIcon({ size = 22, color = COLORS.white }: { size?: number; color?: string }) {
  const isRTL = I18nManager.isRTL;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronDownIcon({ size = 18, color = COLORS.textMuted, open = false }: { size?: number; color?: string; open?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── FAQ Data ────────────────────────────────────

interface FAQItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

const FAQ_ITEMS: FAQItem[] = [
  { id: 'faq1', questionKey: 'help.faq1_q', answerKey: 'help.faq1_a' },
  { id: 'faq2', questionKey: 'help.faq2_q', answerKey: 'help.faq2_a' },
  { id: 'faq3', questionKey: 'help.faq3_q', answerKey: 'help.faq3_a' },
  { id: 'faq4', questionKey: 'help.faq4_q', answerKey: 'help.faq4_a' },
  { id: 'faq5', questionKey: 'help.faq5_q', answerKey: 'help.faq5_a' },
  { id: 'faq6', questionKey: 'help.faq6_q', answerKey: 'help.faq6_a' },
  { id: 'faq7', questionKey: 'help.faq7_q', answerKey: 'help.faq7_a' },
];

// ─── Contact Options ─────────────────────────────

interface ContactOption {
  id: string;
  icon: string;
  titleKey: string;
  subtitleKey: string;
  action: () => void;
}

// ─── FAQ Accordion Item ──────────────────────────

function FAQAccordion({
  item,
  isOpen,
  onToggle,
  t,
  isRTL,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  t: (key: string) => string;
  isRTL: boolean;
}) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={[styles.faqQuestion, isRTL && styles.faqQuestionRTL]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.faqQuestionText, isRTL && { textAlign: 'right' }]} numberOfLines={isOpen ? undefined : 2}>
          {t(item.questionKey)}
        </Text>
        <ChevronDownIcon
          size={18}
          color={isOpen ? COLORS.primaryLight : COLORS.textMuted}
          open={isOpen}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.faqAnswer}>
          <Text style={[styles.faqAnswerText, isRTL && { textAlign: 'right' }]}>
            {t(item.answerKey)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const contactOptions: ContactOption[] = [
    {
      id: 'email',
      icon: '📧',
      titleKey: 'help.contact_email',
      subtitleKey: 'help.contact_email_sub',
      action: () => Linking.openURL('mailto:info@zyrix.co'),
    },
    {
      id: 'phone',
      icon: '📞',
      titleKey: 'help.contact_phone',
      subtitleKey: 'help.contact_phone_sub',
      action: () => Linking.openURL('tel:+905452210888'),
    },
    {
      id: 'whatsapp',
      icon: '💬',
      titleKey: 'help.contact_whatsapp',
      subtitleKey: 'help.contact_whatsapp_sub',
      action: () => Linking.openURL('https://wa.me/905452210888'),
    },
  ];

  const toggleFAQ = (id: string) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>🎧</Text>
          <Text style={styles.heroTitle}>{t('help.hero_title')}</Text>
          <Text style={[styles.heroSubtitle, isRTL && { textAlign: 'right' }]}>
            {t('help.hero_subtitle')}
          </Text>
        </View>

        {/* Contact Options */}
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {t('help.contact_title')}
        </Text>

        <View style={styles.contactGrid}>
          {contactOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.contactCard}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <Text style={styles.contactIcon}>{option.icon}</Text>
              <Text style={styles.contactTitle}>{t(option.titleKey)}</Text>
              <Text style={styles.contactSubtitle}>{t(option.subtitleKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
          {t('help.faq_title')}
        </Text>

        <View style={styles.faqContainer}>
          {FAQ_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <FAQAccordion
                item={item}
                isOpen={openFAQ === item.id}
                onToggle={() => toggleFAQ(item.id)}
                t={t}
                isRTL={isRTL}
              />
              {index < FAQ_ITEMS.length - 1 && <View style={styles.faqDivider} />}
            </React.Fragment>
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

// ─── Styles ──────────────────────────────────────

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
    paddingHorizontal: SPACING.xl, paddingTop: SPACING['2xl'],
    paddingBottom: SPACING['5xl'],
  },
  // ─── Hero ───────────────
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
  // ─── Section ────────────
  sectionTitle: {
    fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary, marginBottom: SPACING.md,
  },
  // ─── Contact Grid ───────
  contactGrid: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    gap: SPACING.md, marginBottom: SPACING['3xl'],
  },
  contactCard: {
    flex: 1, backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md, padding: SPACING.lg,
    alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactIcon: { fontSize: 28, marginBottom: SPACING.sm },
  contactTitle: {
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary, marginBottom: 2, textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 10, color: COLORS.textMuted, textAlign: 'center',
  },
  // ─── FAQ ────────────────
  faqContainer: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING['3xl'],
  },
  faqItem: {
    paddingHorizontal: SPACING.lg,
  },
  faqQuestion: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.lg, gap: SPACING.md,
  },
  faqQuestionRTL: { flexDirection: 'row-reverse' },
  faqQuestionText: {
    flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary, lineHeight: 20,
  },
  faqAnswer: {
    paddingBottom: SPACING.lg,
  },
  faqAnswerText: {
    fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 22,
  },
  faqDivider: {
    height: 1, backgroundColor: COLORS.divider, marginHorizontal: 0,
  },
  // ─── Bottom CTA ─────────
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
    fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.white,
  },
});
