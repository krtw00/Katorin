import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    handleClose();
  };

  const currentLanguage = i18n.language || 'ja';
  const languageName = currentLanguage === 'ja' ? '日本語' : 'English';

  return (
    <>
      <Tooltip title={languageName}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ ml: 2 }}
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <LanguageRoundedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="language-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => handleLanguageChange('ja')}
          selected={currentLanguage === 'ja'}
        >
          日本語
        </MenuItem>
        <MenuItem
          onClick={() => handleLanguageChange('en')}
          selected={currentLanguage === 'en'}
        >
          English
        </MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSwitcher;
