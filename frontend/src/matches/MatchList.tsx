import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

const MatchList: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
        {t('matchManager.matchList')}
      </Typography>
      <Alert severity="info">{t('matchManager.matchCardListDescription')}</Alert>
      {/* Phase 1: 参照のみ。後続フェーズで実データ接続 */}
    </Box>
  );
};

export default MatchList;


