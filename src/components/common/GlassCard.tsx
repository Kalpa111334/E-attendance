import React from 'react';
import { Card, CardProps, useTheme, alpha } from '@mui/material';

export const GlassCard: React.FC<CardProps> = ({ children, sx, ...props }) => {
  const theme = useTheme();

  return (
    <Card
      {...props}
      sx={{
        backdropFilter: 'blur(10px)',
        background: alpha(theme.palette.background.paper, 0.8),
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        boxShadow: `
          0 4px 6px ${alpha(theme.palette.primary.main, 0.1)},
          0 10px 40px ${alpha(theme.palette.primary.main, 0.1)}
        `,
        position: 'relative',
        overflow: 'visible',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, 
            ${theme.palette.primary.main},
            ${theme.palette.secondary.main},
            ${theme.palette.primary.main}
          )`,
          borderRadius: '4px 4px 0 0',
        },
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}; 