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
import { Box, Typography } from '@mui/material';

const TeamLoginForm: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">
        ⚠️ This component is deprecated. Use LoginForm.tsx instead.
      </Typography>
    </Box>
  );
};

export default TeamLoginForm;
