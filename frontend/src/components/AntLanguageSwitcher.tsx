import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Tooltip } from 'antd';
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

/**
 * Ant Design版 言語切り替えコンポーネント
 * 日本語/英語の切り替えを提供
 */
const AntLanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  const currentLanguage = i18n.language || 'ja';
  const languageName = currentLanguage === 'ja' ? t('language.japanese') : t('language.english');

  const items: MenuProps['items'] = [
    {
      key: 'ja',
      label: t('language.japanese'),
      icon: currentLanguage === 'ja' ? <CheckOutlined /> : null,
      onClick: () => handleLanguageChange('ja'),
    },
    {
      key: 'en',
      label: t('language.english'),
      icon: currentLanguage === 'en' ? <CheckOutlined /> : null,
      onClick: () => handleLanguageChange('en'),
    },
  ];

  return (
    <Dropdown
      menu={{ items, selectedKeys: [currentLanguage] }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Tooltip title={languageName}>
        <Button
          type="text"
          icon={<GlobalOutlined />}
          aria-label={languageName}
          style={{ color: '#9ca3af' }}
        />
      </Tooltip>
    </Dropdown>
  );
};

export default AntLanguageSwitcher;
