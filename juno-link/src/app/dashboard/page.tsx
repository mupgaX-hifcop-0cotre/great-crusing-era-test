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
    Card,
    CardContent,
    Typography,
    IconButton,
    Chip,
    CircularProgress,
    Stack,
    Divider,
    Menu,
    MenuItem,
    ListItemIcon,
    Paper,
    Tooltip,
    ButtonBase,
    Avatar,
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
} from "@mui/icons-material";
import { WaveBackground } from "@/components/ui/wave-background";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";
import { NotificationCenter } from "@/components/ui/notification-center";
import { supabase } from "@/lib/supabase";
import { rankColors } from "@/theme/material-theme";
import { Task } from "@/types";

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
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [archetype, setArchetype] = useState<string>("");
    const [skills, setSkills] = useState<string[]>([]);
    const [knotBalance, setKnotBalance] = useState<number>(0);
    const [recommendedTasks, setRecommendedTasks] = useState<Task[]>([]);

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

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('wallet_address', addr)
                .single();

            if (data) {
                setDisplayName(data.username || `船員 ${addr.slice(0, 6)}`);
                setDisplayBio(data.bio || "");
                setAvatarUrl(data.avatar_url || "");
                setSkills(data.skills || []);

                if (data.rank && data.rank > 0) {
                    setRankId(data.rank);
                }

                if (data.knot_balance !== undefined) {
                    setKnotBalance(data.knot_balance);
                }

                if (data.archetype) {
                    setArchetype(data.archetype);
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
            } else if (error && error.code === 'PGRST116') {
                // Not found, create default
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{
                        wallet_address: addr,
                        username: `船員 ${addr.slice(0, 6)}`,
                        rank: 0,
                        skills: []
                    }]);

                if (!insertError) {
                    setDisplayName(`船員 ${addr.slice(0, 6)}`);
                    setDisplayBio("");
                    setSkills([]);
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
                setAddress(addr);

                await loadProfile(addr);

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
                    zIndex: 20,
                }}
            >
                <Stack direction="row" alignItems="center">
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        onClick={handleMenuOpen}
                        sx={{ mr: 2, color: "onSurface.main", bgcolor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}
                    >
                        <MenuIcon />
                    </IconButton>

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
                    <Typography variant="h6" component="div" sx={{ fontWeight: 500, color: "onSurface.main" }}>
                        {t.login.title}
                    </Typography>
                </Stack>


                <Stack direction="row" alignItems="center" spacing={1}>
                    <NotificationCenter userAddress={address} />
                </Stack>

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
            </Box>

            {/* Main Content */}
            <Container maxWidth="lg" sx={{ mt: 12, mb: 4, position: "relative", zIndex: 10 }}>
                <Box
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                >
                    {/* Captain's Log Card */}
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        sx={{ flex: '1 1 300px', minWidth: 300 }}
                    >
                        <Card
                            elevation={2}
                            sx={{
                                height: '100%',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6,
                                },
                                borderRadius: 4,
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Avatar src={avatarUrl} sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }}>
                                            {displayName.charAt(0)}
                                        </Avatar>
                                        <Typography variant="h6" fontWeight={600} color="onSurface.main">
                                            {t.dashboard.captainLog}
                                        </Typography>
                                    </Stack>
                                    <ProfileEditDialog
                                        walletAddress={address}
                                        currentUsername={displayName}
                                        currentBio={displayBio}
                                        currentSkills={skills}
                                        onUpdate={() => loadProfile(address)}
                                    />
                                </Stack>

                                <Divider sx={{ mb: 2, borderColor: 'outline.variant' }} />

                                <Typography variant="caption" color="primary.main" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
                                    {t.dashboard.identity} {archetype && `• ${archetype}`}
                                </Typography>
                                <Typography variant="h5" fontWeight={600} sx={{ mt: 1, mb: 2, wordBreak: "break-all", color: 'onSurface.main' }}>
                                    {displayName}
                                </Typography>

                                {displayBio ? (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            bgcolor: 'surface.variant',
                                            borderRadius: 2,
                                            borderLeft: 4,
                                            borderColor: 'primary.main'
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="onSurface.variant"
                                            sx={{ fontStyle: "italic" }}
                                        >
                                            「{displayBio}」
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic", display: 'block', p: 1 }}>
                                        {t.dashboard.noTales}
                                    </Typography>
                                )}

                                {skills.length > 0 && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {t.dashboard.skills}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                            {skills.map(skill => (
                                                <Chip key={skill} label={skill} size="small" variant="outlined" />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {rankId === 0 && (
                                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                                        <ButtonBase
                                            onClick={() => router.push('/awakening')}
                                            sx={{
                                                p: 1.5,
                                                width: '100%',
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                borderRadius: 2,
                                                fontWeight: 'bold',
                                                boxShadow: 3,
                                                transition: 'all 0.3s',
                                                '&:hover': {
                                                    bgcolor: 'primary.dark',
                                                    transform: 'scale(1.02)'
                                                }
                                            }}
                                        >
                                            {t.start_awakening}
                                        </ButtonBase>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                            {t.dashboard.awakeningCta}
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Recommended Missions Card */}
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                        sx={{ flex: '1 1 300px', minWidth: 300 }}
                    >
                        <Card
                            elevation={2}
                            sx={{
                                height: '100%',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6,
                                },
                                borderRadius: 4,
                                bgcolor: recommendedTasks.length > 0 ? "secondary.container" : "surface.main"
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                                    <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'secondary.main', color: 'white', display: 'flex' }}>
                                        <AssignmentIcon fontSize="small" />
                                    </Box>
                                    <Typography variant="h6" fontWeight={600} color="onSurface.main">
                                        {t.dashboard.recommendedMissions}
                                    </Typography>
                                </Stack>

                                <Divider sx={{ mb: 2, borderColor: 'outline.variant' }} />

                                {recommendedTasks.length > 0 ? (
                                    <Stack spacing={2}>
                                        {recommendedTasks.map(task => (
                                            <Paper
                                                key={task.id}
                                                component={ButtonBase}
                                                onClick={() => router.push('/guild')}
                                                sx={{
                                                    p: 2,
                                                    width: '100%',
                                                    display: 'block',
                                                    textAlign: 'left',
                                                    bgcolor: 'surface.main',
                                                    '&:hover': { bgcolor: 'action.hover' }
                                                }}
                                            >
                                                <Typography variant="subtitle2" fontWeight={600} noWrap>
                                                    {task.title}
                                                </Typography>
                                                <Stack direction="row" spacing={1} mt={1}>
                                                    {task.tags?.map(tag => (
                                                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                    ))}
                                                </Stack>
                                            </Paper>
                                        ))}
                                        <ButtonBase onClick={() => router.push('/guild')}>
                                            <Typography variant="caption" color="primary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                                                View All on Guild Board &rarr;
                                            </Typography>
                                        </ButtonBase>
                                    </Stack>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {skills.length > 0
                                                ? "No matching missions found."
                                                : "Add skills to your profile to see recommended missions!"}
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Treasury Card */}
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        sx={{ flex: '1 1 300px', minWidth: 300 }}
                    >
                        <Card
                            elevation={2}
                            sx={{
                                height: '100%',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6,
                                },
                                borderRadius: 4,
                            }}
                        >
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                                    <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'secondary.main', color: 'white', display: 'flex' }}>
                                        <WalletIcon fontSize="small" />
                                    </Box>
                                    <Typography variant="h6" fontWeight={600} color="onSurface.main">
                                        {t.dashboard.treasury}
                                    </Typography>
                                </Stack>

                                <Divider sx={{ mb: 2, borderColor: 'outline.variant' }} />

                                <Typography variant="caption" color="secondary.main" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
                                    {t.dashboard.walletAddress}
                                </Typography>

                                <Tooltip title="クリックしてコピー" placement="top" arrow>
                                    <Paper
                                        variant="outlined"
                                        component={ButtonBase}
                                        onClick={() => {
                                            navigator.clipboard.writeText(address);
                                        }}
                                        sx={{
                                            mt: 1,
                                            mb: 3,
                                            p: 1.5,
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            bgcolor: "surface.variant",
                                            borderColor: "outline.variant",
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                            textAlign: 'left'
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: "monospace",
                                                wordBreak: "break-all",
                                                fontSize: "0.8rem",
                                                color: "onSurface.variant",
                                                mr: 1
                                            }}
                                        >
                                            {address}
                                        </Typography>
                                        <CopyIcon fontSize="small" sx={{ color: 'secondary.main', opacity: 0.7 }} />
                                    </Paper>
                                </Tooltip>

                                <Typography variant="caption" color="secondary.main" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>
                                    {t.dashboard.balance}
                                </Typography>
                                <Typography variant="h3" fontWeight={700} sx={{ mt: 1, color: 'onSurface.main' }}>
                                    {knotBalance}
                                    <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1 }}>
                                        $KNOT
                                    </Typography>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    Native: {Number(balance).toFixed(4)} POL
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Crew Status Card */}
                    <Box
                        component={motion.div}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        sx={{ flex: '1 1 300px', minWidth: 300 }}
                    >
                        <Card
                            elevation={2}
                            sx={{
                                height: '100%',
                                bgcolor: rankId > 0 ? `${getRankColor()}15` : "surface.main",
                                position: "relative",
                                overflow: "hidden",
                                borderRadius: 4,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6,
                                },
                            }}
                        >
                            {rankId > 0 && (
                                <Box
                                    component={motion.div}
                                    animate={{ rotate: [10, 15, 10] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    sx={{
                                        position: "absolute",
                                        top: -20,
                                        right: -20,
                                        opacity: 0.15,
                                        color: getRankColor(),
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <SailingIcon sx={{ fontSize: 180 }} />
                                </Box>
                            )}

                            <CardContent sx={{ position: "relative", zIndex: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        <Box sx={{ p: 1, borderRadius: '50%', bgcolor: getRankColor(), color: 'white', display: 'flex' }}>
                                            <SailingIcon fontSize="small" />
                                        </Box>
                                        <Typography variant="h6" fontWeight={600} color="onSurface.main">
                                            {t.dashboard.crewStatus}
                                        </Typography>
                                    </Stack>
                                    <Chip
                                        label={`Rank ${rankId}`}
                                        sx={{
                                            fontWeight: 700,
                                            bgcolor: 'surface.main',
                                            color: getRankColor(),
                                            borderColor: getRankColor(),
                                            border: 1
                                        }}
                                    />
                                </Stack>

                                <Divider sx={{ mb: 2, borderColor: `${getRankColor()}40` }} />

                                <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, color: getRankColor() }}>
                                    {t.dashboard.currentRank}
                                </Typography>
                                <Typography
                                    variant="h3"
                                    fontWeight={800}
                                    sx={{
                                        mt: 1,
                                        mb: 3,
                                        color: getRankColor(),
                                        letterSpacing: "0.05em",
                                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {getRankName()}
                                </Typography>

                                {/* Rank Progress */}
                                <Box sx={{ position: 'relative', height: 8, bgcolor: 'surface.variant', borderRadius: 4, overflow: 'hidden' }}>
                                    <Box
                                        component={motion.div}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(rankId / 3) * 100}%` }}
                                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                        sx={{
                                            height: '100%',
                                            bgcolor: getRankColor(),
                                            borderRadius: 4,
                                        }}
                                    />
                                </Box>

                                <Typography variant="body2" color="onSurface.variant" sx={{ mt: 3, fontStyle: "italic", lineHeight: 1.6 }}>
                                    {rankId === 0 && t.ranks.guestDesc}
                                    {rankId > 0 && t.ranks.memberDesc}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
