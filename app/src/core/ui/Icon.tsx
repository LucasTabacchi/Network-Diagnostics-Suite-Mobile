import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

export type IconName =
  | 'home'
  | 'network'
  | 'install'
  | 'history'
  | 'settings'
  | 'cloud_sync'
  | 'radar'
  | 'qr_code_scanner'
  | 'add_task'
  | 'router'
  | 'ont'
  | 'place'
  | 'chevron_right'
  | 'chevron_left'
  | 'arrow_forward'
  | 'pending_actions'
  | 'terminal'
  | 'check_circle'
  | 'warning'
  | 'antenna'
  | 'switch'
  | 'edit'
  | 'delete'
  | 'refresh'
  | 'lock'
  | 'copy'
  | 'add'
  | 'photo_camera'
  | 'add_a_photo'
  | 'satellite_alt'
  | 'sync'
  | 'check'
  | 'description'
  | 'picture_as_pdf'
  | 'event';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = colors.onSurface,
}) => {
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
          <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
          <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
          <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth="2" />
        </Svg>
      );
    case 'network':
    case 'radar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
          <Path d="M12 3V12L18.5 15.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'install':
    case 'add_task':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 11L12 14L22 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'history':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Path d="M12 7V12L15.5 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
          <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'cloud_sync':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l5.59-5.59L17 10l-7 7z" fill={color} />
        </Svg>
      );
    case 'qr_code_scanner':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 8V4H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M16 4H20V8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M20 16V20H16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M8 20H4V16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Rect x="7" y="7" width="3" height="3" fill={color} />
          <Rect x="14" y="7" width="3" height="3" fill={color} />
          <Rect x="7" y="14" width="3" height="3" fill={color} />
          <Rect x="14" y="14" width="3" height="3" fill={color} />
        </Svg>
      );
    case 'router':
    case 'ont':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="11" width="20" height="9" rx="2" stroke={color} strokeWidth="2" />
          <Circle cx="6" cy="15.5" r="1" fill={color} />
          <Circle cx="10" cy="15.5" r="1" fill={color} />
          <Path d="M16 5V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M8 5V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'antenna':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2C6.48 2 2 6.48 2 12C2 14.54 2.95 16.86 4.53 18.63L6 17.16C4.77 15.74 4 13.96 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 13.96 19.23 15.74 18 17.16L19.47 18.63C21.05 16.86 22 14.54 22 12C22 6.48 17.52 2 12 2Z" fill={color} />
          <Circle cx="12" cy="12" r="3" fill={color} />
          <Path d="M11 15H13V22H11V15Z" fill={color} />
        </Svg>
      );
    case 'switch':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth="2" />
          <Path d="M6 10H10M6 14H10M14 10H18M14 14H18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'place':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill={color} />
        </Svg>
      );
    case 'chevron_right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'chevron_left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'arrow_forward':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'pending_actions':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M17 12V7C17 5.9 16.1 5 15 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19H12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="17" cy="17" r="4" stroke={color} strokeWidth="2" />
          <Path d="M17 15V17L18.5 18.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'terminal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth="2" />
          <Path d="M7 9L10 12L7 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M13 15H17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'check_circle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Path d="M8 12L11 15L16 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'warning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3L2 21H22L12 3Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <Path d="M12 9V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="12" cy="17.5" r="1" fill={color} />
        </Svg>
      );
    case 'edit':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M11 4H4C2.9 4 2 4.9 2 6V20C2 21.1 2.9 22 4 22H18C19.1 22 20 21.1 20 20V13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M18.5 2.5C19.3 1.7 20.7 1.7 21.5 2.5C22.3 3.3 22.3 4.7 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'delete':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 6H21" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6" stroke={color} strokeWidth="2" />
          <Path d="M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke={color} strokeWidth="2" />
        </Svg>
      );
    case 'refresh':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M21.5 2V7H16.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M2.5 22V17H7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M20.49 15A9 9 0 015.64 5.64L2.5 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M3.51 9A9 9 0 0118.36 18.36L21.5 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'lock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="11" width="16" height="11" rx="2" stroke={color} strokeWidth="2" />
          <Path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" stroke={color} strokeWidth="2" />
        </Svg>
      );
    case 'copy':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="2" />
          <Path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke={color} strokeWidth="2" />
        </Svg>
      );
    case 'add':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'photo_camera':
    case 'add_a_photo':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" />
        </Svg>
      );
    case 'satellite_alt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Path d="M12 3C16.97 3 21 7.03 21 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M12 7C14.76 7 17 9.24 17 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="12" cy="12" r="2" fill={color} />
        </Svg>
      );
    case 'sync':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M21.5 2V7H16.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M2.5 22V17H7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M20.49 15A9 9 0 015.64 5.64L2.5 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M3.51 9A9 9 0 0118.36 18.36L21.5 17" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'description':
    case 'picture_as_pdf':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M14 2V8H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'event':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
};
