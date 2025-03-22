import React from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    useTheme,
    Breadcrumbs,
    Link,
} from '@mui/material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';
import RosterManagement from '../components/RosterManagement';
import { Link as RouterLink } from 'react-router-dom';

const RosterManagementPage = () => {
    const theme = useTheme();

    return (
        <Container maxWidth="xl">
            <Box sx={{ py: { xs: 2, sm: 3 } }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link 
                        component={RouterLink} 
                        to="/"
                        underline="hover"
                        color="inherit"
                        sx={{ display: 'flex', alignItems: 'center' }}
                    >
                        Dashboard
                    </Link>
                    <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ mr: 0.5, fontSize: 20 }} />
                        Roster Management
                    </Typography>
                </Breadcrumbs>

                <Typography 
                    variant="h4" 
                    component="h1" 
                    sx={{ 
                        mb: { xs: 2, sm: 3 },
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                        fontWeight: 600,
                        color: theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}
                >
                    <ScheduleIcon sx={{ fontSize: { xs: 24, sm: 32 } }} />
                    Employee Roster Management
                </Typography>

                <Paper 
                    elevation={2}
                    sx={{ 
                        borderRadius: 2,
                        overflow: 'hidden',
                        background: theme.palette.background.paper,
                    }}
                >
                    <RosterManagement />
                </Paper>
            </Box>
        </Container>
    );
};

export default RosterManagementPage; 