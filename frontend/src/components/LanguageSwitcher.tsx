import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  const currentLanguage = i18n.language || 'ja';
  const languageName = currentLanguage === 'ja' ? t('language.japanese') : t('language.english');

  const menuItems: MenuProps['items'] = [
    {
      key: 'ja',
      label: t('language.japanese'),
      onClick: () => handleLanguageChange('ja'),
    },
    {
      key: 'en',
      label: t('language.english'),
      onClick: () => handleLanguageChange('en'),
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems, selectedKeys: [currentLanguage] }} placement="bottomRight">
      <Tooltip title={languageName}>
        <Button
          type="text"
          icon={<GlobalOutlined />}
          size="small"
          style={{ marginLeft: 16, color: '#9ca3af' }}
        />
      </Tooltip>
    </Dropdown>
  );
};

export default LanguageSwitcher;
