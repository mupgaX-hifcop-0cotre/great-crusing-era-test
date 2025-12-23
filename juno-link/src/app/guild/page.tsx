"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useRouter } from "next/navigation";
import { createWalletClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";
import {
    Box,
    Container,
    Typography,
    Button,
    CircularProgress,
    Stack,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider,
} from "@mui/material";
import {
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    Menu as MenuIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Home as HomeIcon,
    Language as LanguageIcon,
} from "@mui/icons-material";
import { WaveBackground } from "@/components/ui/wave-background";
import { KanbanBoard } from "@/components/guild/kanban-board";
import { CreateTaskDialog } from "@/components/guild/create-task-dialog";
import { NotificationCenter } from "@/components/ui/notification-center";
import { ArchivedTasks } from "@/components/guild/archived-tasks";
import { Tabs, Tab } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useTutorial } from "@/components/providers/tutorial-provider";

// Admin address for visibility check
const ADMIN_ADDRESS = "0x264C351Ace86F18D620a12007A959AEcC02F7DDe";

export default function GuildBoardPage() {
    const { loggedIn, provider, logout } = useAuth();
    const { t, toggleLanguage, language } = useLanguage();
    const { step } = useTutorial();
    const router = useRouter();
    const [address, setAddress] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [view, setView] = useState<'board' | 'archive'>('board');

    const handleTabChange = (_: React.SyntheticEvent, newValue: 'board' | 'archive') => {
        setView(newValue);
    };

    // Menu State
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDashboardNavigate = () => {
        handleMenuClose();
        router.push('/dashboard');
    };

    const handleAdminNavigate = () => {
        handleMenuClose();
        router.push('/admin');
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    useEffect(() => {
        if (!loggedIn) {
            router.push("/");
            return;
        }

        const fetchAccountData = async () => {
            if (!provider) return;
            try {
                const walletClient = createWalletClient({
                    chain: polygonAmoy,
                    transport: custom(provider),
                });
                const [addr] = await walletClient.requestAddresses();
                const normalizedAddr = addr.toLowerCase();
                setAddress(normalizedAddr);
            } catch (err) {
                console.error("Error fetching address:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAccountData();
    }, [loggedIn, provider, router]);

    if (!loggedIn || loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    bgcolor: "background.default",
                }}
            >
                <WaveBackground />
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    const isAdmin = address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
    const showCreateButton = isAdmin || step === 'CREATE_TASK';
    const highlightCreate = step === 'CREATE_TASK';

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <WaveBackground />

            {/* Header */}
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    zIndex: 20,
                }}
            >
                <Container maxWidth="xl">
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <IconButton
                                onClick={handleMenuOpen}
                                sx={{ color: "onSurface.main", bgcolor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}
                            >
                                <MenuIcon />
                            </IconButton>

                            <Menu
                                anchorEl={anchorEl}
                                open={openMenu}
                                onClose={handleMenuClose}
                                PaperProps={{
                                    elevation: 3,
                                    sx: { borderRadius: 3, minWidth: 200, mt: 1 }
                                }}
                            >
                                <MenuItem onClick={() => { toggleLanguage(); handleMenuClose(); }}>
                                    <ListItemIcon>
                                        <LanguageIcon fontSize="small" />
                                    </ListItemIcon>
                                    {language === 'ja' ? 'English' : '日本語'}
                                </MenuItem>

                                <Divider />

                                <MenuItem onClick={handleDashboardNavigate}>
                                    <ListItemIcon><HomeIcon fontSize="small" /></ListItemIcon>
                                    {t.admin.dashboard}
                                </MenuItem>
                                {isAdmin && (
                                    <MenuItem onClick={handleAdminNavigate}>
                                        <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                                        {t.dashboard.adminPanel}
                                    </MenuItem>
                                )}
                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                                    <Typography color="error">{t.dashboard.logout}</Typography>
                                </MenuItem>
                            </Menu>

                            <IconButton onClick={() => router.push('/dashboard')}>
                                <ArrowBackIcon />
                            </IconButton>

                            <NotificationCenter userAddress={address} />

                            <Typography variant="h5" fontWeight={700} color="onSurface.main">
                                {t.guild.title}
                            </Typography>
                        </Stack>

                        {showCreateButton && (
                            <motion.div
                                animate={highlightCreate ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0px #D4AF37", "0 0 20px #D4AF37", "0 0 0px #D4AF37"] } : {}}
                                transition={highlightCreate ? { repeat: Infinity, duration: 2 } : {}}
                            >
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setIsCreateOpen(true)}
                                    sx={{
                                        borderRadius: 2,
                                        bgcolor: highlightCreate ? '#D4AF37' : 'primary.main',
                                        color: highlightCreate ? '#000' : '#fff',
                                        '&:hover': {
                                            bgcolor: highlightCreate ? '#F9A825' : 'primary.dark',
                                        }
                                    }}
                                >
                                    {t.guild.createTask}
                                </Button>
                            </motion.div>
                        )}
                    </Stack>
                </Container>
            </Box>

            {/* Tabs & Content */}
            <Container maxWidth={false} sx={{ mt: 12, mb: 4, position: "relative", zIndex: 10, px: { xs: 2, md: 4 } }}>
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Tabs
                        value={view}
                        onChange={handleTabChange}
                        sx={{
                            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                            '& .MuiTab-root': { fontWeight: 700, fontSize: '1rem', transition: 'all 0.2s' }
                        }}
                    >
                        <Tab label={t.guild.tabs.board} value="board" sx={{ minWidth: 120 }} />
                        <Tab label={t.guild.tabs.archive} value="archive" sx={{ minWidth: 120 }} />
                    </Tabs>
                </Box>

                <AnimatePresence mode="wait">
                    {view === 'board' ? (
                        <motion.div
                            key="board"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <KanbanBoard refreshTrigger={refreshTrigger} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="archive"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ArchivedTasks />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Container>

            <CreateTaskDialog
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={() => setRefreshTrigger(prev => prev + 1)}
                creatorAddress={address}
            />
        </Box>
    );
}
