import React from 'react';
import { Box, CircularProgress, Typography, useTheme, alpha } from '@mui/material';

interface LoadingAnimationProps {
    message?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ message = 'Loading...' }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                borderRadius: 2,
                p: 4,
            }}
        >
            <CircularProgress
                size={48}
                thickness={4}
                sx={{
                    color: theme => `${theme.palette.primary.main}`,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    '@keyframes pulse': {
                        '0%, 100%': {
                            opacity: 1,
                        },
                        '50%': {
                            opacity: 0.5,
                        },
                    },
                }}
            />
            <Typography
                variant="h6"
                sx={{
                    mt: 2,
                    color: 'text.secondary',
                    fontWeight: 500,
                    textAlign: 'center',
                    animation: 'fadeInOut 2s ease-in-out infinite',
                    '@keyframes fadeInOut': {
                        '0%, 100%': {
                            opacity: 0.7,
                        },
                        '50%': {
                            opacity: 1,
                        },
                    },
                }}
            >
                {message}
            </Typography>
        </Box>
    );
};

export default LoadingAnimation; 