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
    },
    {
      key: 'en',
      label: t('language.english'),
    },
  ];

  const menuProps: MenuProps = {
    items: menuItems,
    selectedKeys: [currentLanguage],
    onClick: ({ key }) => handleLanguageChange(String(key)),
  };

  return (
    <Dropdown
      menu={menuProps}
      placement="bottomRight"
      trigger={['click']}
    >
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
