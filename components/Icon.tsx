/**
 * Zyrix App — Icon System
 * Professional SVG icons replacing all emoji usage.
 * Uses react-native-svg (already installed).
 * 
 * Usage:
 *   import { Icon } from '../components/Icon';
 *   <Icon name="home" size={24} color={COLORS.primary} />
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = '#F9FAFB', strokeWidth = 1.8 }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
  };

  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    // ─── Navigation ────────────────────────────
    case 'home':
      return (
        <Svg {...props}>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...s} />
          <Polyline points="9 22 9 12 15 12 15 22" {...s} />
        </Svg>
      );
    case 'credit-card':
      return (
        <Svg {...props}>
          <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" {...s} />
          <Line x1="1" y1="10" x2="23" y2="10" {...s} />
        </Svg>
      );
    case 'wallet':
      return (
        <Svg {...props}>
          <Path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" {...s} />
          <Path d="M4 6v12a2 2 0 0 0 2 2h14v-4" {...s} />
          <Path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" {...s} />
        </Svg>
      );
    case 'bar-chart':
      return (
        <Svg {...props}>
          <Line x1="12" y1="20" x2="12" y2="10" {...s} />
          <Line x1="18" y1="20" x2="18" y2="4" {...s} />
          <Line x1="6" y1="20" x2="6" y2="16" {...s} />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="3" {...s} />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" {...s} />
        </Svg>
      );

    // ─── Actions ───────────────────────────────
    case 'bell':
      return (
        <Svg {...props}>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...s} />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...s} />
        </Svg>
      );
    case 'link':
      return (
        <Svg {...props}>
          <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" {...s} />
          <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" {...s} />
        </Svg>
      );
    case 'alert-triangle':
      return (
        <Svg {...props}>
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...s} />
          <Line x1="12" y1="9" x2="12" y2="13" {...s} />
          <Line x1="12" y1="17" x2="12.01" y2="17" {...s} />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg {...props}>
          <Polyline points="23 4 23 10 17 10" {...s} />
          <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" {...s} />
        </Svg>
      );
    case 'check-circle':
      return (
        <Svg {...props}>
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...s} />
          <Polyline points="22 4 12 14.01 9 11.01" {...s} />
        </Svg>
      );
    case 'clipboard':
      return (
        <Svg {...props}>
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" {...s} />
          <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" {...s} />
        </Svg>
      );

    // ─── Balance Screen ────────────────────────
    case 'arrow-up':
      return (
        <Svg {...props}>
          <Line x1="12" y1="19" x2="12" y2="5" {...s} />
          <Polyline points="5 12 12 5 19 12" {...s} />
        </Svg>
      );
    case 'copy':
      return (
        <Svg {...props}>
          <Rect x="9" y="9" width="13" height="13" rx="2" ry="2" {...s} />
          <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" {...s} />
        </Svg>
      );
    case 'qr-code':
      return (
        <Svg {...props}>
          <Rect x="3" y="3" width="7" height="7" rx="1" {...s} />
          <Rect x="14" y="3" width="7" height="7" rx="1" {...s} />
          <Rect x="3" y="14" width="7" height="7" rx="1" {...s} />
          <Rect x="14" y="14" width="3" height="3" {...s} />
          <Line x1="21" y1="14" x2="21" y2="14.01" {...s} />
          <Line x1="21" y1="21" x2="21" y2="21.01" {...s} />
          <Line x1="17" y1="21" x2="17" y2="21.01" {...s} />
        </Svg>
      );

    // ─── Settings Screen ───────────────────────
    case 'globe':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Line x1="2" y1="12" x2="22" y2="12" {...s} />
          <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s} />
        </Svg>
      );
    case 'mail':
      return (
        <Svg {...props}>
          <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" {...s} />
          <Polyline points="22,6 12,13 2,6" {...s} />
        </Svg>
      );
    case 'message-square':
      return (
        <Svg {...props}>
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...s} />
        </Svg>
      );
    case 'shield':
      return (
        <Svg {...props}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s} />
        </Svg>
      );
    case 'fingerprint':
      return (
        <Svg {...props}>
          <Path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" {...s} />
          <Path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 2 0 3.5 1 4.5 2.5" {...s} />
          <Path d="M12 12v9" {...s} />
          <Path d="M9 15c0 3 .5 5.5 1.5 8" {...s} />
          <Path d="M15 13c0 4-1 7-2.5 9.5" {...s} />
          <Path d="M22 12c0 4-1.5 7.5-4 10" {...s} />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Polyline points="12 6 12 12 16 14" {...s} />
        </Svg>
      );
    case 'key':
      return (
        <Svg {...props}>
          <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" {...s} />
        </Svg>
      );
    case 'log-out':
      return (
        <Svg {...props}>
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...s} />
          <Polyline points="16 17 21 12 16 7" {...s} />
          <Line x1="21" y1="12" x2="9" y2="12" {...s} />
        </Svg>
      );
    case 'code':
      return (
        <Svg {...props}>
          <Polyline points="16 18 22 12 16 6" {...s} />
          <Polyline points="8 6 2 12 8 18" {...s} />
        </Svg>
      );

    // ─── Notifications ─────────────────────────
    case 'bank':
      return (
        <Svg {...props}>
          <Path d="M3 21h18" {...s} />
          <Path d="M3 10h18" {...s} />
          <Path d="M5 6l7-3 7 3" {...s} />
          <Line x1="4" y1="10" x2="4" y2="21" {...s} />
          <Line x1="20" y1="10" x2="20" y2="21" {...s} />
          <Line x1="8" y1="14" x2="8" y2="17" {...s} />
          <Line x1="12" y1="14" x2="12" y2="17" {...s} />
          <Line x1="16" y1="14" x2="16" y2="17" {...s} />
        </Svg>
      );
    case 'undo':
      return (
        <Svg {...props}>
          <Polyline points="1 4 1 10 7 10" {...s} />
          <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" {...s} />
        </Svg>
      );

    // ─── Misc ──────────────────────────────────
    case 'share':
      return (
        <Svg {...props}>
          <Circle cx="18" cy="5" r="3" {...s} />
          <Circle cx="6" cy="12" r="3" {...s} />
          <Circle cx="18" cy="19" r="3" {...s} />
          <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" {...s} />
          <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" {...s} />
        </Svg>
      );
    case 'download':
      return (
        <Svg {...props}>
          <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...s} />
          <Polyline points="7 10 12 15 17 10" {...s} />
          <Line x1="12" y1="15" x2="12" y2="3" {...s} />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg {...props}>
          <Polyline points="9 18 15 12 9 6" {...s} />
        </Svg>
      );
    case 'chevron-left':
      return (
        <Svg {...props}>
          <Polyline points="15 18 9 12 15 6" {...s} />
        </Svg>
      );
    case 'trending-up':
      return (
        <Svg {...props}>
          <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...s} />
          <Polyline points="17 6 23 6 23 12" {...s} />
        </Svg>
      );
    case 'users':
      return (
        <Svg {...props}>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s} />
          <Circle cx="9" cy="7" r="4" {...s} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...s} />
        </Svg>
      );
    case 'file-text':
      return (
        <Svg {...props}>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s} />
          <Polyline points="14 2 14 8 20 8" {...s} />
          <Line x1="16" y1="13" x2="8" y2="13" {...s} />
          <Line x1="16" y1="17" x2="8" y2="17" {...s} />
          <Polyline points="10 9 9 9 8 9" {...s} />
        </Svg>
      );
    case 'dollar-sign':
      return (
        <Svg {...props}>
          <Line x1="12" y1="1" x2="12" y2="23" {...s} />
          <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" {...s} />
        </Svg>
      );
    case 'zap':
      return (
        <Svg {...props}>
          <Path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" fill={color} stroke="none" />
        </Svg>
      );
    case 'target':
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Circle cx="12" cy="12" r="6" {...s} />
          <Circle cx="12" cy="12" r="2" {...s} />
        </Svg>
      );
    case 'receipt':
      return (
        <Svg {...props}>
          <Path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" {...s} />
          <Line x1="8" y1="8" x2="16" y2="8" {...s} />
          <Line x1="8" y1="12" x2="16" y2="12" {...s} />
          <Line x1="8" y1="16" x2="12" y2="16" {...s} />
        </Svg>
      );
    case 'pie-chart':
      return (
        <Svg {...props}>
          <Path d="M21.21 15.89A10 10 0 1 1 8 2.83" {...s} />
          <Path d="M22 12A10 10 0 0 0 12 2v10z" {...s} />
        </Svg>
      );

    default:
      // Fallback: simple circle
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...s} />
        </Svg>
      );
  }
}

export default Icon;
