import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import reportWebVitals from './reportWebVitals';
import i18n from './i18n';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ConfigProvider } from 'antd';
import jaJP from 'antd/locale/ja_JP';
import enUS from 'antd/locale/en_US';
import { antdTheme } from './themes/antdTheme';
import ErrorBoundary from './components/common/ErrorBoundary';
import 'dayjs/locale/ja';
import 'dayjs/locale/en';
import dayjs from 'dayjs';

/**
 * Ant Design ConfigProvider ラッパー
 * i18nextの言語設定に応じてロケールを切り替え
 */
const AntConfigWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState(i18n.language === 'en' ? enUS : jaJP);

  useEffect(() => {
    // i18nextの言語変更を監視
    const handleLanguageChange = (lng: string) => {
      setLocale(lng === 'en' ? enUS : jaJP);
      dayjs.locale(lng === 'en' ? 'en' : 'ja');
    };

    i18n.on('languageChanged', handleLanguageChange);

    // 初期言語設定
    handleLanguageChange(i18n.language);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <ConfigProvider locale={locale} theme={antdTheme}>
      {children}
    </ConfigProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AntConfigWrapper>
        <AuthProvider>
          <App />
          <SpeedInsights />
        </AuthProvider>
      </AntConfigWrapper>
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
