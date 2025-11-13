import React from 'react';
import { Empty, Button } from 'antd';
import type { EmptyProps } from 'antd';

interface EmptyStateProps extends Omit<EmptyProps, 'description'> {
  /** 表示するメッセージ */
  message?: string;
  /** 説明文 */
  description?: string;
  /** アクションボタンのテキスト */
  actionText?: string;
  /** アクションボタンのクリックハンドラ */
  onAction?: () => void;
  /** カスタムスタイル */
  style?: React.CSSProperties;
}

/**
 * 空状態表示コンポーネント
 * データがない場合に表示
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  description,
  actionText,
  onAction,
  style,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  ...restProps
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 20px',
        ...style,
      }}
    >
      <Empty
        image={image}
        description={
          <div>
            {message && (
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                {message}
              </div>
            )}
            {description && (
              <div style={{ fontSize: 14, color: '#8c8c8c' }}>
                {description}
              </div>
            )}
          </div>
        }
        {...restProps}
      >
        {actionText && onAction && (
          <Button type="primary" onClick={onAction}>
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  );
};

export default EmptyState;
