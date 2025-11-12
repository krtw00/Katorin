import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  /** ローディングメッセージ */
  tip?: string;
  /** 全画面表示するか */
  fullscreen?: boolean;
  /** スピナーのサイズ */
  size?: 'small' | 'default' | 'large';
}

/**
 * ローディングスピナーコンポーネント
 * 全画面または部分的なローディング表示
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  tip,
  fullscreen = true,
  size = 'large',
}) => {
  const icon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : 24 }} spin />;

  if (fullscreen) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <Spin indicator={icon} tip={tip} size={size} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 0',
        width: '100%',
      }}
    >
      <Spin indicator={icon} tip={tip} size={size} />
    </div>
  );
};

export default LoadingSpinner;
