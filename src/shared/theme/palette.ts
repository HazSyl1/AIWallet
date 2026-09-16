export interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  iconMuted: string;
  primary: string;
  danger: string;
  info: string;
  warning: string;
  accentPurple: string;
  successTint: { background: string; text: string };
  dangerTint: { background: string; text: string };
  infoTint: { background: string; text: string };
}

const brand = {
  primary: '#4CAF50',
  danger: '#F44336',
  info: '#2196F3',
  warning: '#FF9800',
  accentPurple: '#9C27B0',
};

export const lightColors: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceVariant: '#f5f5f5',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#eeeeee',
  iconMuted: '#cccccc',
  ...brand,
  successTint: { background: '#E8F5E9', text: '#2E7D32' },
  dangerTint: { background: '#FFEBEE', text: '#C62828' },
  infoTint: { background: '#E3F2FD', text: '#1565C0' },
};

export const darkColors: ThemeColors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2E',
  textPrimary: '#F2F2F2',
  textSecondary: '#A0A0A5',
  textTertiary: '#7A7A7E',
  border: '#3A3A3C',
  iconMuted: '#48484A',
  ...brand,
  successTint: { background: 'rgba(76,175,80,0.16)', text: '#81C784' },
  dangerTint: { background: 'rgba(244,67,54,0.16)', text: '#E57373' },
  infoTint: { background: 'rgba(33,150,243,0.16)', text: '#64B5F6' },
};
