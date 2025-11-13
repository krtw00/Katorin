import type { ThemeConfig } from 'antd';

/**
 * Ant Design Theme Configuration
 * カスタムテーマ設定 - モダンな業務アプリケーション向け
 */
export const antdTheme: ThemeConfig = {
  token: {
    // Primary Colors - アップルらしいブルー系
    colorPrimary: '#007AFF',
    colorSuccess: '#34C759',
    colorWarning: '#FF9500',
    colorError: '#FF3B30',
    colorInfo: '#5AC8FA',

    // Background & Surface
    colorBgBase: '#FFFFFF',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F5F5F7',

    // Border
    borderRadius: 8,
    colorBorder: '#E5E5E7',
    colorBorderSecondary: '#F0F0F2',

    // Typography
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    lineHeight: 1.5715,

    // Spacing
    padding: 16,
    margin: 16,
    paddingLG: 24,
    paddingMD: 16,
    paddingSM: 12,
    paddingXS: 8,

    // Shadow - 控えめなシャドウ
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',

    // Motion
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.2s',
    motionDurationFast: '0.1s',
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#FFFFFF',
      bodyBg: '#F5F5F7',
      footerBg: '#FFFFFF',
      triggerBg: '#F5F5F7',
      triggerColor: '#1D1D1F',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#1D1D1F',
      itemHoverBg: '#F5F5F7',
      itemHoverColor: '#007AFF',
      itemSelectedBg: '#E5F2FF',
      itemSelectedColor: '#007AFF',
      iconSize: 18,
      fontSize: 14,
      itemHeight: 40,
      itemMarginInline: 4,
      itemBorderRadius: 6,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingContentHorizontal: 16,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      paddingLG: 24,
    },
    Table: {
      headerBg: '#F9F9FB',
      headerColor: '#6E6E73',
      borderColor: '#E5E5E7',
      rowHoverBg: '#F9F9FB',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      fontSize: 14,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      paddingBlock: 8,
      paddingInline: 12,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 36,
    },
    Modal: {
      borderRadiusLG: 12,
      paddingContentHorizontalLG: 24,
      paddingMD: 20,
    },
    Tabs: {
      itemColor: '#6E6E73',
      itemSelectedColor: '#007AFF',
      itemHoverColor: '#007AFF',
      inkBarColor: '#007AFF',
      titleFontSize: 15,
    },
    Breadcrumb: {
      fontSize: 14,
      itemColor: '#6E6E73',
      lastItemColor: '#1D1D1F',
      separatorColor: '#C7C7CC',
    },
    Statistic: {
      titleFontSize: 14,
      contentFontSize: 24,
    },
  },
};

/**
 * ダークモードテーマ設定（オプション）
 */
export const antdDarkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0A84FF',
    colorSuccess: '#32D74B',
    colorWarning: '#FF9F0A',
    colorError: '#FF453A',
    colorInfo: '#64D2FF',

    colorBgBase: '#000000',
    colorBgContainer: '#1C1C1E',
    colorBgElevated: '#2C2C2E',
    colorBgLayout: '#000000',

    colorBorder: '#38383A',
    colorBorderSecondary: '#2C2C2E',

    colorText: '#FFFFFF',
    colorTextSecondary: '#EBEBF5',
    colorTextTertiary: '#8E8E93',

    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    borderRadius: 8,
  },
  components: {
    Layout: {
      headerBg: '#1C1C1E',
      siderBg: '#1C1C1E',
      bodyBg: '#000000',
      footerBg: '#1C1C1E',
      triggerBg: '#2C2C2E',
      triggerColor: '#FFFFFF',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#FFFFFF',
      itemHoverBg: '#2C2C2E',
      itemHoverColor: '#0A84FF',
      itemSelectedBg: '#1C3A5C',
      itemSelectedColor: '#0A84FF',
    },
    Card: {
      colorBgContainer: '#1C1C1E',
      colorBorderSecondary: '#38383A',
    },
    Table: {
      headerBg: '#2C2C2E',
      headerColor: '#8E8E93',
      borderColor: '#38383A',
      rowHoverBg: '#2C2C2E',
    },
  },
};
