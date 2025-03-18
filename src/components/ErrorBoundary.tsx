import React, { Component, ErrorInfo } from 'react';
import {
    Box,
    Typography,
    Button,
    Container,
    Paper,
    alpha,
} from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    handleRefresh = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="md" sx={{ py: 8 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            borderRadius: 4,
                            background: theme => `linear-gradient(135deg, ${alpha(theme.palette.error.light, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.1)} 100%)`,
                            border: theme => `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                        }}
                    >
                        <ErrorIcon
                            sx={{
                                fontSize: 64,
                                color: 'error.main',
                                mb: 2,
                                animation: 'bounce 2s infinite',
                                '@keyframes bounce': {
                                    '0%, 100%': {
                                        transform: 'translateY(0)',
                                    },
                                    '50%': {
                                        transform: 'translateY(-10px)',
                                    },
                                },
                            }}
                        />
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                            Oops! Something went wrong
                        </Typography>
                        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                            We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<RefreshIcon />}
                                onClick={this.handleRefresh}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: 2,
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                Refresh Page
                            </Button>
                        </Box>
                        {process.env.NODE_ENV === 'development' && (
                            <Box sx={{ mt: 4, textAlign: 'left' }}>
                                <Typography variant="subtitle2" color="error" sx={{ fontFamily: 'monospace' }}>
                                    {this.state.error?.toString()}
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 