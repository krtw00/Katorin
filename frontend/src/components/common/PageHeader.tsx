import React from 'react';
import { Typography, Space, Breadcrumb } from 'antd';
import type { BreadcrumbProps } from 'antd';

const { Title } = Typography;

interface PageHeaderProps {
  /** ページタイトル */
  title: string;
  /** サブタイトル */
  subtitle?: string;
  /** パンくずリスト */
  breadcrumbs?: BreadcrumbProps['items'];
  /** ヘッダーの右側に表示するアクション */
  extra?: React.ReactNode;
  /** カスタムスタイル */
  style?: React.CSSProperties;
}

/**
 * ページヘッダーコンポーネント
 * ページタイトル、パンくずリスト、アクションボタンを表示
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  extra,
  style,
}) => {
  return (
    <div
      style={{
        marginBottom: 24,
        ...style,
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          items={breadcrumbs}
          style={{ marginBottom: 16 }}
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Space direction="vertical" size={4}>
          <Title level={2} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              {subtitle}
            </Typography.Text>
          )}
        </Space>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
