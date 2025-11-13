import React from 'react';
import { Navigate } from 'react-router-dom';
import { Flex, Spin } from 'antd';
import { useAdminAccess } from '../hooks/useAdminAccess';

type Props = {
  children: React.ReactNode;
};

/**
 * 管理画面へのアクセス権限を持つユーザーのみ表示するルートガード
 *
 * - 管理者 (role='admin') は常にアクセス可能
 * - チーム (role='team' かつ has_admin_access=true) もアクセス可能
 * - その他のユーザーは /team にリダイレクト
 */
const AdminRoute: React.FC<Props> = ({ children }) => {
  const { canAccessAdmin, loading } = useAdminAccess();

  if (loading) {
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f4f6fb',
        }}
      >
        <Spin size="large" />
      </Flex>
    );
  }

  if (!canAccessAdmin) {
    return <Navigate to="/team" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
