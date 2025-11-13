/**
 * ⚠️ DEPRECATED: This component is no longer used.
 *
 * Team login is now handled by the unified LoginForm.tsx component with a "Team" tab.
 *
 * The LoginForm.tsx component:
 * - Provides both "Admin" and "Team" login tabs
 * - Uses Supabase Auth directly (signInWithPassword)
 * - Constructs team email as: {teamName}@{tournamentSlug}.players.local
 *
 * This file is kept for reference but should not be imported or used.
 *
 * To be removed in v2.0
 */

import React from 'react';
import { Typography } from 'antd';

const TeamLoginForm: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={4}>
        ⚠️ This component is deprecated. Use LoginForm.tsx instead.
      </Typography.Title>
    </div>
  );
};

export default TeamLoginForm;
