import React from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Switch, ActivityIndicator,
} from "react-native";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, getAccent } from "./dark-premium-ui";

// ─── Elite Feature 49: Unified Design System ────────────────
// كل component يستخدم الـ tokens تلقائياً
// استخدم هذه الـ components بدل React Native الأساسية

// ─── ZInput ─────────────────────────────────────────────────

interface ZInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  isAr?: boolean;
  keyboardType?: any;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function ZInput({
  value, onChangeText, placeholder, label, hint, error,
  isAr = true, keyboardType, secureTextEntry, multiline,
  numberOfLines, leftIcon, rightIcon, onRightIconPress,
  disabled, accessibilityLabel,
}: ZInputProps) {
  const accent = getAccent();
  const hasError = !!error;

  return (
    <View style={zi.wrapper}>
      {label && (
        <Text style={[zi.label, { textAlign: isAr ? "right" : "left" }]}
          accessibilityRole="text">
          {label}
        </Text>
      )}
      <View style={[
        zi.container,
        { borderColor: hasError ? COLORS.error : COLORS.border },
        disabled && zi.disabled,
      ]}>
        {leftIcon && <Text style={zi.icon}>{leftIcon}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDisabled}
          style={[zi.input, { textAlign: isAr ? "right" : "left" }]}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={hint}
          accessibilityState={{ disabled }}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} accessibilityRole="button">
            <Text style={zi.icon}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>
      {hint && !error && (
        <Text style={[zi.hint, { textAlign: isAr ? "right" : "left" }]}>{hint}</Text>
      )}
      {error && (
        <Text style={[zi.error, { textAlign: isAr ? "right" : "left" }]}
          accessibilityLiveRegion="polite" accessibilityRole="alert">
          ⚠️ {error}
        </Text>
      )}
    </View>
  );
}

// ─── ZButton ─────────────────────────────────────────────────

interface ZButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ZButton({
  label, onPress, variant = "primary",
  size = "md", loading, disabled, icon,
  fullWidth, accessibilityLabel, accessibilityHint,
}: ZButtonProps) {
  const accent = getAccent();

  const bgColors = {
    primary:   accent,
    secondary: COLORS.bgElevated,
    ghost:     "transparent",
    danger:    COLORS.error,
  };

  const textColors = {
    primary:   "#fff",
    secondary: COLORS.textPrimary,
    ghost:     accent,
    danger:    "#fff",
  };

  const paddings = { sm: SPACING.sm, md: SPACING.md, lg: SPACING.lg };
  const fontSizes = { sm: TYPOGRAPHY.sm, md: TYPOGRAPHY.md, lg: TYPOGRAPHY.lg };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        zb.btn,
        {
          backgroundColor: bgColors[variant],
          paddingVertical: paddings[size],
          paddingHorizontal: paddings[size] * 2,
          borderColor: variant === "ghost" ? accent : variant === "secondary" ? COLORS.border : "transparent",
          borderWidth: variant === "ghost" || variant === "secondary" ? 1 : 0,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <View style={zb.inner}>
          {icon && <Text style={zb.icon}>{icon}</Text>}
          <Text style={[zb.text, { color: textColors[variant], fontSize: fontSizes[size] }]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── ZSelect ─────────────────────────────────────────────────

interface ZSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
  isAr?: boolean;
  accessibilityLabel?: string;
}

export function ZSelect({ options, value, onChange, label, isAr = true, accessibilityLabel }: ZSelectProps) {
  const accent = getAccent();
  return (
    <View style={zs.wrapper}>
      {label && <Text style={[zs.label, { textAlign: isAr ? "right" : "left" }]}>{label}</Text>}
      <View style={zs.options} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel ?? label}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[zs.option, value === opt.value && { borderColor: accent, backgroundColor: accent + "22" }]}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === opt.value }}
            accessibilityLabel={opt.label}
          >
            <Text style={[zs.optionText, value === opt.value && { color: accent }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── ZSwitch ─────────────────────────────────────────────────

export function ZSwitch({
  value, onValueChange, label, desc, isAr = true, accessibilityLabel,
}: {
  value: boolean; onValueChange: (v: boolean) => void;
  label: string; desc?: string; isAr?: boolean; accessibilityLabel?: string;
}) {
  const accent = getAccent();
  return (
    <View style={zsw.row}>
      <View style={zsw.text}>
        <Text style={[zsw.label, { textAlign: isAr ? "right" : "left" }]}>{label}</Text>
        {desc && <Text style={[zsw.desc, { textAlign: isAr ? "right" : "left" }]}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.bgElevated, true: accent + "66" }}
        thumbColor={value ? accent : COLORS.textDisabled}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

// ─── ZStat ───────────────────────────────────────────────────

export function ZStat({
  icon, label, value, subValue, color, trend,
}: {
  icon: string; label: string; value: string;
  subValue?: string; color?: string; trend?: "up" | "down" | "neutral";
}) {
  const c = color ?? getAccent();
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "";
  const trendColor = trend === "up" ? COLORS.success : trend === "down" ? COLORS.error : COLORS.textMuted;

  return (
    <View style={[zst.card, { borderColor: c + "33" }]}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${subValue ? `, ${subValue}` : ""}`}>
      <View style={[zst.iconBox, { backgroundColor: c + "22" }]}>
        <Text style={zst.icon}>{icon}</Text>
      </View>
      <Text style={zst.label}>{label}</Text>
      <Text style={[zst.value, { color: c }]}>{value}</Text>
      {subValue && (
        <Text style={[zst.sub, { color: trendColor }]}>
          {trendIcon} {subValue}
        </Text>
      )}
    </View>
  );
}

// ─── ZSection ────────────────────────────────────────────────

export function ZSection({
  title, children, action, actionLabel, isAr = true,
}: {
  title: string; children: React.ReactNode;
  action?: () => void; actionLabel?: string; isAr?: boolean;
}) {
  return (
    <View style={zsec.wrapper}>
      <View style={zsec.header}>
        <Text style={[zsec.title, { textAlign: isAr ? "right" : "left" }]}>{title}</Text>
        {action && actionLabel && (
          <TouchableOpacity onPress={action} accessibilityRole="button" accessibilityLabel={actionLabel}>
            <Text style={zsec.action}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── ZEmptyState ─────────────────────────────────────────────

export function ZEmptyState({
  icon, title, desc, ctaLabel, onCta, isAr = true,
}: {
  icon: string; title: string; desc: string;
  ctaLabel?: string; onCta?: () => void; isAr?: boolean;
}) {
  return (
    <View style={zes.container} accessibilityRole="text" accessibilityLabel={`${title}. ${desc}`}>
      <Text style={zes.icon}>{icon}</Text>
      <Text style={[zes.title, { textAlign: isAr ? "center" : "center" }]}>{title}</Text>
      <Text style={zes.desc}>{desc}</Text>
      {ctaLabel && onCta && (
        <ZButton label={ctaLabel} onPress={onCta} size="md" accessibilityLabel={ctaLabel} />
      )}
    </View>
  );
}

// ─── ZList ───────────────────────────────────────────────────

export function ZList<T>({
  data, renderItem, keyExtractor, emptyIcon, emptyTitle, emptyDesc, isAr = true,
}: {
  data: T[]; renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyIcon?: string; emptyTitle?: string; emptyDesc?: string; isAr?: boolean;
}) {
  if (data.length === 0) {
    return (
      <ZEmptyState
        icon={emptyIcon ?? "📭"}
        title={emptyTitle ?? (isAr ? "لا توجد بيانات" : "No data")}
        desc={emptyDesc ?? (isAr ? "ستظهر البيانات هنا" : "Data will appear here")}
        isAr={isAr}
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={{ gap: SPACING.sm }}>
      {data.map((item, i) => (
        <View key={keyExtractor(item)}>{renderItem(item, i)}</View>
      ))}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const zi = StyleSheet.create({
  wrapper:   { gap: SPACING.xs },
  label:     { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.medium },
  container: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: SPACING.md, gap: SPACING.sm },
  input:     { flex: 1, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.md, paddingVertical: SPACING.md },
  icon:      { fontSize: 18 },
  hint:      { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted },
  error:     { fontSize: TYPOGRAPHY.xs, color: COLORS.error },
  disabled:  { opacity: 0.5 },
});

const zb = StyleSheet.create({
  btn:   { borderRadius: RADIUS.lg, alignItems: "center", justifyContent: "center" },
  inner: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  icon:  { fontSize: 16 },
  text:  { fontWeight: TYPOGRAPHY.bold },
});

const zs = StyleSheet.create({
  wrapper: { gap: SPACING.xs },
  label:   { fontSize: TYPOGRAPHY.sm, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.medium },
  options: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  option:  { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  optionText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
});

const zsw = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  text:  { flex: 1 },
  label: { fontSize: TYPOGRAPHY.md, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.medium },
  desc:  { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginTop: 2 },
});

const zst = StyleSheet.create({
  card:    { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, alignItems: "center" },
  iconBox: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: "center", alignItems: "center", marginBottom: SPACING.sm },
  icon:    { fontSize: 18 },
  label:   { fontSize: TYPOGRAPHY.xs, color: COLORS.textMuted, marginBottom: SPACING.xs, textAlign: "center" },
  value:   { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold },
  sub:     { fontSize: TYPOGRAPHY.xs, marginTop: 2 },
});

const zsec = StyleSheet.create({
  wrapper: { gap: SPACING.sm },
  header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title:   { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textMuted },
  action:  { fontSize: TYPOGRAPHY.sm, color: getAccent() },
});

const zes = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xxl, gap: SPACING.md },
  icon:      { fontSize: 64 },
  title:     { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  desc:      { fontSize: TYPOGRAPHY.md, color: COLORS.textMuted, textAlign: "center", lineHeight: 22 },
});