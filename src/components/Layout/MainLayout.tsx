import React from 'react';
import { Box, Container, useTheme, alpha, Typography } from '@mui/material';
import { Navigation, Footer } from '../../App';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.light, 0.15)} 0%, 
          ${alpha(theme.palette.secondary.light, 0.15)} 50%,
          ${alpha(theme.palette.primary.light, 0.15)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 0% 0%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, ${alpha(theme.palette.error.main, 0.15)} 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, ${alpha(theme.palette.success.main, 0.15)} 0%, transparent 50%)
          `,
          animation: 'gradient 15s ease infinite',
        },
      }}
    >
      <Navigation />
      <Container 
        maxWidth="lg" 
        sx={{ 
          flex: 1,
          py: { xs: 2, md: 4 },
          position: 'relative',
        }}
      >
        {children}
      </Container>
      <Box 
        sx={{ 
          textAlign: 'center',
          py: 2,
          position: 'relative',
          zIndex: 1
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 700,
            letterSpacing: 1.5,
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 1,
              },
              '50%': {
                opacity: 0.7,
              },
            },
          }}
        >
          POWERED BY: MIDIZ
        </Typography>
      </Box>
      <Footer />
    </Box>
  );
}; 