"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useRouter } from "next/navigation";
import { createPublicClient, createWalletClient, custom, formatEther } from "viem";
import { polygonAmoy } from "viem/chains";
import {
    Box,
    Container,
    Button,
    Avatar,
    Snackbar,
    Alert,
    Typography,
    Stack,
    Chip,
    Tooltip,
    Paper,
    ButtonBase,
    IconButton,
    Menu,
    MenuItem,
    Divider,
    CircularProgress,
    ListItemIcon,
} from "@mui/material";
import { motion } from "framer-motion";
import {
    Sailing as SailingIcon,
    AccountBalance as WalletIcon,
    ManageAccounts as SettingsIcon,
    Logout as LogoutIcon,
    Menu as MenuIcon,
    ContentCopy as CopyIcon,
    ListAlt as ListAltIcon,
    Assignment as AssignmentIcon,
    Language as LanguageIcon,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";
import { WaveBackground } from "@/components/ui/wave-background";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";
import { NotificationCenter } from "@/components/ui/notification-center";
import { supabase } from "@/lib/supabase";
import { rankColors } from "@/theme/material-theme";
import { Task, Profile } from "@/types";

import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";

export default function DashboardPage() {
    const { loggedIn, provider, logout } = useAuth();
    const { t, toggleLanguage, language } = useLanguage();
    const router = useRouter();
    const [address, setAddress] = useState<string>("");
    const [balance, setBalance] = useState<string>("0");
    // Removed rank string state, strictly use rankId
    const [rankId, setRankId] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Profile State
    const [displayName, setDisplayName] = useState<string>("");
    const [displayBio, setDisplayBio] = useState<string>("");
    const [showAddress, setShowAddress] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [archetype, setArchetype] = useState<string>("");
    const [skills, setSkills] = useState<string[]>([]);
    const [nmBalance, setNmBalance] = useState<number>(0);
    const [recommendedTasks, setRecommendedTasks] = useState<Task[]>([]);
    const [openError, setOpenError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Menu State
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleAdminNavigate = () => {
        handleMenuClose();
        router.push('/admin');
    };

    const handleGuildNavigate = () => {
        handleMenuClose();
        router.push('/guild');
    };

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    // Function to reload profile data from Supabase
    const loadProfile = async (addr: string) => {
        if (!supabase) return;
        const normalizedAddr = addr.toLowerCase();

        try {
            const { data: dataRaw, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('wallet_address', normalizedAddr)
                .maybeSingle();

            if (error) {
                console.error("Supabase error fetching profile:", error);
            }

            const data = dataRaw as Profile | null;

            if (data) {
                setDisplayName(data.username || `船員 ${addr.slice(0, 6)}`);
                setDisplayBio(data.bio || "");
                setAvatarUrl(data.avatar_url || "");
                setSkills(data.skills || []);

                if (data.rank && data.rank > 0) {
                    setRankId(data.rank);
                }

                if (data.nm_balance !== undefined) {
                    setNmBalance(data.nm_balance);
                }

                if (data.archetype) {
                    setArchetype(data.archetype);
                }

                // Onboarding Check: Rank 0 + No NM = Needs Onboarding
                if ((data.rank || 0) === 0 && (data.nm_balance || 0) < 100) {
                    setShowOnboarding(true);
                }

                if (data.skills && data.skills.length > 0) {
                    const { data: tasks } = await supabase
                        .from('tasks')
                        .select('*')
                        .overlaps('tags', data.skills)
                        .neq('status', 'done')
                        .limit(3);

                    if (tasks) {
                        setRecommendedTasks(tasks);
                    }
                } else {
                    setRecommendedTasks([]);
                }
            } else if (!data) {
                // Not found (maybeSingle returns data:null if not found)
                const { error: insertError } = await supabase
                    .from('profiles' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .insert([{
                        wallet_address: normalizedAddr,
                        username: `船員 ${normalizedAddr.slice(0, 6)}`,
                        rank: 0,
                        skills: []
                    }] as unknown as never);

                if (!insertError) {
                    setDisplayName(`船員 ${addr.slice(0, 6)}`);
                    setDisplayBio("");
                    setSkills([]);
                    // New user -> Show Onboarding
                    setShowOnboarding(true);
                }
            }
        } catch (err) {
            console.error("Profile load error:", err);
        }
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

                await loadProfile(normalizedAddr);

                const publicClient = createPublicClient({
                    chain: polygonAmoy,
                    transport: custom(provider),
                });

                const balanceResult = await publicClient.getBalance({ address: addr });
                setBalance(formatEther(balanceResult));

            } catch (error) {
                console.error("Error fetching account data:", error);
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
                <Typography variant="h6" sx={{ mt: 3, color: "primary.main", letterSpacing: "0.2em" }}>
                    {t.loading}
                </Typography>
            </Box>
        );
    }

    const getRankColor = () => {
        if (rankId >= 100) return "#BA1A1A"; // Admin Red
        if (rankId === 3) return "#FFD700"; // Admiral Gold
        if (rankId === 2) return rankColors.skipper;
        if (rankId === 1) return rankColors.deckhand;
        return rankColors.guest;
    };

    const getRankName = () => {
        if (rankId >= 100) return t.ranks.admin;
        if (rankId === 3) return t.ranks.admiral;
        if (rankId === 2) return t.ranks.skipper;
        if (rankId === 1) return t.ranks.deckhand;
        return t.ranks.guest;
    };

    // Awakening Handler
    const handleAwakening = () => {
        // Condition: If Rank > 0 (already awakened), need 100 NM to re-awaken
        if (rankId >= 1) {
            if (nmBalance < 100) {
                // Show error
                setErrorMessage(t.errors?.insufficientNM || "Insufficient Nautical Miles ($NM). You need 100 $NM to re-awaken.");
                setOpenError(true);
                return;
            }
        }
        // Proceed
        router.push('/awakening');
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <WaveBackground />

            {/* Transparent Header */}
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    zIndex: 10,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <IconButton
                        onClick={handleMenuOpen}
                        sx={{
                            color: "primary.main",
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
                        }}
                    >
                        <MenuIcon />
                    </IconButton>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        component="img"
                        src="/assets/logo.jpg"
                        alt="Great Cruising Era DAO"
                        sx={{
                            height: 40,
                            width: 40,
                            mr: 2,
                            objectFit: 'contain'
                        }}
                    />
                    <Typography variant="h6" component="div" sx={{ fontFamily: 'var(--font-cinzel)', fontWeight: 700, color: "var(--primary-gold)" }}>
                        CAPTAIN&apos;S LOG
                    </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1}>
                    <NotificationCenter userAddress={address} />
                </Stack>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
                PaperProps={{
                    elevation: 3,
                    sx: {
                        borderRadius: 3,
                        minWidth: 240,
                        mt: 1,
                    }
                }}
                transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            >
                <MenuItem onClick={() => { toggleLanguage(); handleMenuClose(); }}>
                    <ListItemIcon>
                        <LanguageIcon fontSize="small" />
                    </ListItemIcon>
                    {language === 'ja' ? 'English' : '日本語'}
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleGuildNavigate}>
                    <ListItemIcon>
                        <ListAltIcon fontSize="small" />
                    </ListItemIcon>
                    {t.dashboard.guildBoard}
                </MenuItem>

                {address.toLowerCase() === "0x264C351Ace86F18D620a12007A959AEcC02F7DDe".toLowerCase() && (
                    <MenuItem onClick={handleAdminNavigate}>
                        <ListItemIcon>
                            <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        {t.dashboard.adminPanel}
                    </MenuItem>
                )}

                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <Typography color="error">
                        {t.dashboard.logout}
                    </Typography>
                </MenuItem>
            </Menu>

            {/* Main Content */}
            <Container maxWidth="lg" sx={{ pt: 12, pb: 6, position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

                {/* Profile Section */}
                <Box sx={{ mb: 6 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="glass-panel"
                        style={{ borderRadius: '16px', overflow: 'hidden', padding: '24px' }}
                    >
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 4 }} alignItems="center">
                            {/* Profile Avatar Section */}
                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: { xs: 100, md: 140 },
                                        height: { xs: 100, md: 140 },
                                        borderRadius: '50%',
                                        padding: '4px',
                                        background: 'linear-gradient(45deg, #D4AF37, #F9A825)',
                                        boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl}
                                        alt={displayName}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            border: '4px solid #051E3E',
                                            bgcolor: '#051E3E'
                                        }}
                                    >
                                        {displayName.charAt(0)}
                                    </Avatar>
                                </Box>
                                {rankId >= 2 && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            bgcolor: '#D4AF37',
                                            color: '#051E3E',
                                            p: 0.5,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                            border: '2px solid #051E3E'
                                        }}
                                    >
                                        <SailingIcon fontSize="small" />
                                    </Box>
                                )}
                            </Box>

                            {/* Profile Info Section */}
                            <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', md: 'left' } }}>
                                <Typography variant="overline" sx={{ color: '#D4AF37', letterSpacing: '0.2em', fontWeight: 700 }}>
                                    {archetype || 'UNREGISTERED SOUL'}
                                </Typography>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        color: '#E0E6ED',
                                        mb: 1,
                                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                        fontSize: { xs: '2rem', md: '3rem' },
                                        wordBreak: 'break-word',
                                        lineHeight: 1.2
                                    }}
                                >
                                    {displayName}
                                </Typography>

                                {displayBio && (
                                    <Typography variant="body1" sx={{ color: '#94A3B8', fontStyle: 'italic', mb: 2, maxWidth: '600px' }}>
                                        &quot;{displayBio}&quot;
                                    </Typography>
                                )}

                                {/* Action Buttons */}
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    justifyContent={{ xs: 'center', md: 'flex-start' }}
                                    alignItems="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <ProfileEditDialog
                                        walletAddress={address}
                                        currentUsername={displayName}
                                        currentBio={displayBio}
                                        currentSkills={skills}
                                        onUpdate={() => loadProfile(address)}
                                    />

                                    {rankId === 0 ? (
                                        <Tooltip title={t.dashboard.tooltips.beginVoyage} arrow>
                                            <Button
                                                variant="contained"
                                                onClick={handleAwakening}
                                                startIcon={<SailingIcon />}
                                                sx={{ px: 4 }}
                                            >
                                                Begin The Voyage
                                            </Button>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip
                                            title={nmBalance < 100 ? t.dashboard.tooltips.insufficientBalance : t.dashboard.tooltips.reAwaken}
                                            arrow
                                        >
                                            <span>
                                                <Button
                                                    variant="outlined"
                                                    onClick={handleAwakening}
                                                    startIcon={<SailingIcon />}
                                                    sx={{
                                                        borderColor: '#D4AF37',
                                                        color: '#D4AF37',
                                                        '&:hover': {
                                                            borderColor: '#F9A825',
                                                            bgcolor: 'rgba(212, 175, 55, 0.1)'
                                                        }
                                                    }}
                                                >
                                                    Re-Awaken
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                        </Stack>
                    </motion.div>
                </Box>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ flex: 1 }}>
                    {/* Active Quests */}
                    <Box sx={{ flex: 2 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="glass-panel"
                            style={{ height: '100%', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                        >
                            <Box sx={{ p: 3, borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
                                <Typography variant="h5" sx={{ fontFamily: 'var(--font-cinzel)', color: '#D4AF37', borderBottom: '1px solid #D4AF37', display: 'inline-block', pb: 1, px: 2 }}>
                                    active quests
                                </Typography>
                            </Box>

                            <Box sx={{ p: 0, flex: 1, overflowY: 'auto' }}>
                                {recommendedTasks.length > 0 ? (
                                    recommendedTasks.map(task => (
                                        <ButtonBase
                                            key={task.id}
                                            sx={{
                                                width: '100%',
                                                textAlign: 'left',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                transition: 'all 0.2s',
                                                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' }
                                            }}
                                            onClick={handleGuildNavigate}
                                        >
                                            <Box sx={{ p: 3, width: '100%' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                                    <Typography variant="h6" sx={{ color: '#E0E6ED', fontWeight: 'bold' }}>
                                                        {task.title}
                                                    </Typography>
                                                    <Chip
                                                        label={`${task.final_reward || 0} $NM`}
                                                        size="small"
                                                        sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', border: '1px solid #D4AF37' }}
                                                    />
                                                </Stack>
                                                <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {task.description}
                                                </Typography>
                                                <Stack direction="row" spacing={1}>
                                                    {task.tags && task.tags.map((tag, idx) => (
                                                        <Chip key={idx} label={tag} size="small" variant="outlined" sx={{ color: '#64748B', borderColor: '#334155' }} />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        </ButtonBase>
                                    ))
                                ) : (
                                    <Box sx={{ p: 4, textAlign: 'center', color: '#64748B' }}>
                                        <Typography variant="body1">{t.dashboard.noTales}</Typography>
                                        <Button
                                            variant="text"
                                            onClick={handleGuildNavigate}
                                            sx={{ mt: 2, color: '#D4AF37' }}
                                        >
                                            {t.dashboard.guildBoard}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </motion.div>
                    </Box>

                    {/* Treasury Card */}
                    <Box sx={{ flex: 1 }}>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="glass-panel"
                            style={{ height: '100%', borderRadius: '16px', overflow: 'hidden' }}
                        >
                            <Box sx={{ p: 3, borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
                                <Typography variant="h5" sx={{ fontFamily: 'var(--font-cinzel)', color: '#D4AF37' }}>
                                    ship&apos;s treasury
                                </Typography>
                            </Box>

                            <Box sx={{ p: 3 }}>
                                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(5, 30, 62, 0.4)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1, letterSpacing: '0.1em' }}>
                                        LINKED WALLET
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#E0E6ED' }}>
                                            {showAddress ? address : (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected")}
                                        </Typography>
                                        <Stack direction="row">
                                            <IconButton
                                                size="small"
                                                onClick={() => setShowAddress(!showAddress)}
                                                sx={{ color: '#64748B', '&:hover': { color: '#D4AF37' } }}
                                            >
                                                {showAddress ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                            <Tooltip title={t.dashboard.tooltips.copyAddress || "Copy Address"} arrow placement="top">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(address);
                                                    }}
                                                    sx={{ color: '#64748B', '&:hover': { color: '#D4AF37' } }}
                                                >
                                                    <CopyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Stack>
                                </Box>

                                <Tooltip title="Your current in-game currency balance" arrow placement="top">
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            mb: 3,
                                            bgcolor: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '12px',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1, letterSpacing: '0.1em' }}>
                                            AVAILABLE FUNDS
                                        </Typography>
                                        <Typography variant="h2" sx={{ color: '#D4AF37', fontFamily: 'var(--font-cinzel)', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>
                                            {nmBalance.toLocaleString()}
                                            <Typography component="span" variant="h5" sx={{ ml: 1, opacity: 0.7 }}>$NM</Typography>
                                        </Typography>
                                    </Paper>
                                </Tooltip>

                                <Stack spacing={2}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <WalletIcon sx={{ color: '#64748B' }} />
                                            <Typography variant="body2" sx={{ color: '#E0E6ED' }}>Polygon</Typography>
                                        </Stack>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                                            {Number(balance).toFixed(4)} POL
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <AssignmentIcon sx={{ color: '#64748B' }} />
                                            <Typography variant="body2" sx={{ color: '#E0E6ED' }}>Rank</Typography>
                                        </Stack>
                                        <Chip
                                            label={getRankName()}
                                            size="small"
                                            sx={{
                                                bgcolor: `${getRankColor()}20`,
                                                color: getRankColor(),
                                                border: `1px solid ${getRankColor()}`,
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </Box>
                                </Stack>
                            </Box>
                        </motion.div>
                    </Box>
                </Stack>
            </Container>

            <Snackbar
                open={openError}
                autoHideDuration={6000}
                onClose={() => setOpenError(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setOpenError(false)} severity="error" sx={{ width: '100%', bgcolor: '#330000', color: '#ffcccc', border: '1px solid #ff0000' }}>
                    {errorMessage}
                </Alert>
            </Snackbar>

            {showOnboarding && (
                <OnboardingOverlay
                    walletAddress={address}
                    onComplete={() => setShowOnboarding(false)}
                />
            )}
        </Box>
    );
}
