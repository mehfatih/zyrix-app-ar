// components/ChartCard.tsx
import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  I18nManager,
  ViewStyle,
} from 'react-native'
import { COLORS } from '../constants/colors'

const isRTL = I18nManager.isRTL

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  label: string   // e.g. "Mon", "Jan", "Week 1"
  value: number
}

export interface ChartCardProps {
  title: string
  subtitle?: string
  data: ChartDataPoint[]
  color?: string
  unit?: string          // e.g. "₺", "%", ""
  style?: ViewStyle
  showAverage?: boolean
  type?: 'bar' | 'line'
}

// ─── Bar chart (pure RN, no external lib) ─────────────────────────────────────

function BarChart({
  data,
  color,
  unit,
}: {
  data: ChartDataPoint[]
  color: string
  unit: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <View style={chart.container}>
      {/* Bars */}
      <View style={chart.barsRow}>
        {data.map((point, i) => {
          const heightPct = (point.value / max) * 100
          return (
            <View key={i} style={chart.barWrapper}>
              {/* Value label above bar */}
              <Text style={chart.barValueLabel} numberOfLines={1}>
                {point.value >= 1000
                  ? `${(point.value / 1000).toFixed(1)}k`
                  : point.value % 1 === 0
                  ? String(point.value)
                  : point.value.toFixed(1)}
              </Text>
              {/* Bar track */}
              <View style={chart.barTrack}>
                <View
                  style={[
                    chart.bar,
                    {
                      height: `${Math.max(heightPct, 4)}%`,
                      backgroundColor: color,
                      opacity: heightPct < 20 ? 0.45 : 1,
                    },
                  ]}
                />
              </View>
              {/* X label */}
              <Text style={chart.barXLabel} numberOfLines={1}>
                {point.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Line chart (SVG-free, uses View widths + absolute positioning) ────────────

function LineChart({
  data,
  color,
  unit,
}: {
  data: ChartDataPoint[]
  color: string
  unit: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const min = Math.min(...data.map((d) => d.value), 0)
  const range = max - min || 1
  const CHART_HEIGHT = 100

  // Normalise to 0–1
  const normalised = data.map((d) => (d.value - min) / range)

  return (
    <View style={line.container}>
      {/* Y-axis labels */}
      <View style={line.yAxis}>
        {[max, (max + min) / 2, min].map((v, i) => (
          <Text key={i} style={line.yLabel}>
            {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
          </Text>
        ))}
      </View>

      {/* Plot area */}
      <View style={[line.plotArea, { height: CHART_HEIGHT }]}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((frac, i) => (
          <View
            key={i}
            style={[
              line.gridLine,
              { top: `${(1 - frac) * 100}%` },
            ]}
          />
        ))}

        {/* Dots + connecting lines using flex */}
        <View style={line.dotsRow}>
          {normalised.map((n, i) => {
            const bottom = n * (CHART_HEIGHT - 12)
            return (
              <View key={i} style={line.dotWrapper}>
                {/* Connecting line to next point */}
                {i < normalised.length - 1 && (() => {
                  const n2 = normalised[i + 1]
                  const dy = (n2 - n) * (CHART_HEIGHT - 12)
                  const angle = Math.atan2(-dy, 28) * (180 / Math.PI)
                  const length = Math.sqrt(28 * 28 + dy * dy)
                  return (
                    <View
                      style={[
                        line.connector,
                        {
                          bottom: bottom + 5,
                          width: length,
                          transform: [{ rotate: `${angle}deg` }],
                          backgroundColor: color,
                        },
                      ]}
                    />
                  )
                })()}
                {/* Dot */}
                <View
                  style={[
                    line.dot,
                    { bottom, backgroundColor: color },
                  ]}
                />
                {/* X label */}
                <Text style={line.xLabel}>{data[i].label}</Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

// ─── ChartCard ────────────────────────────────────────────────────────────────

export default function ChartCard({
  title,
  subtitle,
  data,
  color = COLORS.primary,
  unit = '₺',
  style,
  showAverage = false,
  type = 'bar',
}: ChartCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const avg   = data.length ? total / data.length : 0

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View>
          <Text style={[styles.title, isRTL && styles.textRight]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, isRTL && styles.textRight]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {showAverage && (
          <View style={styles.avgPill}>
            <Text style={styles.avgLabel}>Ø</Text>
            <Text style={styles.avgValue}>
              {avg >= 1000
                ? `${(avg / 1000).toFixed(1)}k`
                : avg.toFixed(0)}{' '}
              {unit}
            </Text>
          </View>
        )}
      </View>

      {/* Chart */}
      {type === 'bar' ? (
        <BarChart data={data} color={color} unit={unit} />
      ) : (
        <LineChart data={data} color={color} unit={unit} />
      )}

      {/* Footer total */}
      <View style={[styles.footer, isRTL && styles.footerRTL]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.footerText}>
          Total:{' '}
          <Text style={[styles.footerValue, { color }]}>
            {total >= 1000
              ? `${(total / 1000).toFixed(2)}k`
              : total.toFixed(2)}{' '}
            {unit}
          </Text>
        </Text>
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  textRight: {
    textAlign: 'right',
  },
  avgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avgLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  avgValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footerValue: {
    fontWeight: '700',
  },
})

// Bar chart styles
const chart = StyleSheet.create({
  container: {
    height: 140,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 3,
    fontWeight: '600',
  },
  barTrack: {
    width: '100%',
    height: 90,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barXLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
})

// Line chart styles
const line = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    justifyContent: 'space-between',
    width: 32,
    paddingVertical: 4,
  },
  yLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  plotArea: {
    flex: 1,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dotWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    height: '100%',
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  connector: {
    position: 'absolute',
    height: 2,
    opacity: 0.7,
  },
  xLabel: {
    position: 'absolute',
    bottom: -16,
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
})
