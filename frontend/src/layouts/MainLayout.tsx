import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Space, Grid } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TrophyOutlined,
  TeamOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import AntLanguageSwitcher from '../components/AntLanguageSwitcher';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

interface MainLayoutProps {
  children: React.ReactNode;
  /** ユーザーメールアドレス */
  userEmail?: string;
  /** 管理者かどうか */
  isAdmin?: boolean;
  /** 選択中の大会情報 */
  selectedTournament?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  /** ログアウトハンドラ */
  onLogout?: () => void;
  /** 大会変更ハンドラ */
  onChangeTournament?: () => void;
}

/**
 * メインレイアウトコンポーネント
 * サイドバーナビゲーション、ヘッダー、コンテンツエリアを提供
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  userEmail,
  isAdmin = false,
  selectedTournament,
  onLogout,
  onChangeTournament,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 管理者用メニュー項目
  const adminMenuItems: MenuProps['items'] = [
    {
      key: '/admin/matches',
      icon: <TrophyOutlined />,
      label: t('nav.matches', '試合管理'),
      onClick: () => navigate('/admin/matches'),
    },
    {
      key: '/admin/teams',
      icon: <TeamOutlined />,
      label: t('nav.teams', 'チーム管理'),
      onClick: () => navigate('/admin/teams'),
    },
  ];

  // チーム用メニュー項目
  const teamMenuItems: MenuProps['items'] = [
    {
      key: '/team/dashboard',
      icon: <DashboardOutlined />,
      label: t('nav.dashboard', 'ダッシュボード'),
      onClick: () => navigate('/team/dashboard'),
    },
    {
      key: '/team/matches',
      icon: <TrophyOutlined />,
      label: t('nav.matches', '試合'),
      onClick: () => navigate('/team/matches'),
    },
  ];

  const menuItems = isAdmin ? adminMenuItems : teamMenuItems;

  // 現在のパスに基づいて選択されたメニューキーを取得
  const getSelectedKey = () => {
    const path = location.pathname;
    // 最も長いマッチを見つける（より具体的なパスを優先）
    const matchedItem = menuItems?.find((item) => path.startsWith(item?.key as string));
    return matchedItem?.key as string || path;
  };

  // ユーザードロップダウンメニュー
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'email',
      label: userEmail,
      disabled: true,
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    ...(onChangeTournament && selectedTournament
      ? [
          {
            key: 'change-tournament',
            label: t('app.changeTournament', '大会を変更'),
            icon: <SwapOutlined />,
            onClick: onChangeTournament,
          },
        ]
      : []),
    {
      key: 'logout',
      label: t('app.logout', 'ログアウト'),
      icon: <LogoutOutlined />,
      onClick: onLogout,
      danger: true,
    },
  ];

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* サイドバー */}
      <Sider
        trigger={null}
        collapsible
        collapsed={isMobile ? false : collapsed}
        breakpoint="md"
        collapsedWidth={isMobile ? 0 : 80}
        width={240}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: isMobile ? 1001 : 999,
          display: isMobile && !mobileDrawerOpen ? 'none' : 'block',
        }}
      >
        {/* ロゴ・タイトル */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          {!collapsed || isMobile ? (
            <Typography.Title
              level={4}
              style={{
                margin: 0,
                color: '#1D1D1F',
                fontWeight: 600,
              }}
            >
              {t('app.title', 'Katorin')}
            </Typography.Title>
          ) : (
            <TrophyOutlined style={{ fontSize: 24, color: '#007AFF' }} />
          )}
        </div>

        {/* ナビゲーションメニュー */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>

      {/* モバイル用オーバーレイ */}
      {isMobile && mobileDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 1000,
          }}
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 80 : 240,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* ヘッダー */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 998,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
              }}
            />

            {/* 選択中の大会表示 */}
            {selectedTournament && (
              <Space direction="vertical" size={0} style={{ marginLeft: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('app.selectedTournament', '選択中の大会')}
                </Text>
                <Text strong style={{ fontSize: 14 }}>
                  {selectedTournament.name}
                </Text>
              </Space>
            )}
          </Space>

          <Space size="middle">
            {/* 言語切り替え */}
            <AntLanguageSwitcher />

            {/* ユーザーメニュー */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Button
                type="text"
                style={{
                  height: 40,
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#007AFF' }} />
                {!isMobile && userEmail && (
                  <Text style={{ maxWidth: 150 }} ellipsis>
                    {userEmail}
                  </Text>
                )}
              </Button>
            </Dropdown>
          </Space>
        </Header>

        {/* コンテンツエリア */}
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
