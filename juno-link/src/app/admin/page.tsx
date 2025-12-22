"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createWalletClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useRouter } from "next/navigation";
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    CircularProgress,
    IconButton,
    Tooltip,
    Stack,
    Menu,
    MenuItem,
    ListItemIcon,
} from "@mui/material";
import { motion } from "framer-motion";
import {
    Anchor as AnchorIcon,
    Home as HomeIcon,
    ExitToApp as LogoutIcon,
    Refresh as RefreshIcon,
    ArrowUpward as PromoteIcon,
    EmojiEvents as RankIcon,
    Menu as MenuIcon,
    ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { WaveBackground } from "@/components/ui/wave-background";
import { rankColors } from "@/theme/material-theme";

// ABI for minting and reading balance
const abi = [
    {
        inputs: [
            { name: "account", type: "address" },
            { name: "id", type: "uint256" },
            { name: "amount", type: "uint256" },
            { name: "data", type: "bytes" }
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            { name: "account", type: "address" },
            { name: "id", type: "uint256" }
        ],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

const CONTRACT_ADDRESS = "0x760711eAF41CF264814eCf7B900080c16BA24418";

interface Profile {
    wallet_address: string;
    username: string;
    rank: number;
}

export default function AdminDashboard() {
    const { provider, logout } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [mintingFor, setMintingFor] = useState<string | null>(null);
    const [syncingFor, setSyncingFor] = useState<string | null>(null);

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

    const handleLogout = () => {
        handleMenuClose();
        logout();
    };

    const fetchCrew = async () => {
        setLoading(true);
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('rank', { ascending: false });

            if (error) {
                console.error("Error fetching profiles:", error);
            } else {
                setProfiles(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCrew();
    }, []);

    const handleMintDeckhand = async (targetAddress: string) => {
        if (!provider) return;
        setMintingFor(targetAddress);

        try {
            const walletClient = createWalletClient({
                chain: polygonAmoy,
                transport: custom(provider),
            });

            const [adminAddress] = await walletClient.requestAddresses();

            const hash = await walletClient.writeContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: 'mint',
                args: [targetAddress as `0x${string}`, BigInt(1), BigInt(1), "0x"],
                account: adminAddress,
            });

            console.log("Transaction sent:", hash);

            if (supabase) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ rank: 1 })
                    .eq('wallet_address', targetAddress);

                if (error) {
                    console.error("Failed to sync rank to DB:", error);
                    alert(t.admin.mintSuccessDbError);
                } else {
                    fetchCrew();
                }
            }
            alert(`${targetAddress} ${t.admin.promoteDeckhand}`);
        } catch (error) {
            console.error("Minting failed:", error);
            alert(t.admin.mintFailed);
        } finally {
            setMintingFor(null);
        }
    };

    const handleMintSkipper = async (targetAddress: string) => {
        if (!provider) return;
        setMintingFor(targetAddress);

        try {
            const walletClient = createWalletClient({
                chain: polygonAmoy,
                transport: custom(provider),
            });

            const [adminAddress] = await walletClient.requestAddresses();

            const hash = await walletClient.writeContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: 'mint',
                args: [targetAddress as `0x${string}`, BigInt(2), BigInt(1), "0x"],
                account: adminAddress,
            });

            console.log("Transaction sent:", hash);

            if (supabase) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ rank: 2 })
                    .eq('wallet_address', targetAddress);

                if (error) {
                    console.error("Failed to sync rank to DB:", error);
                    alert(t.admin.mintSuccessDbError);
                } else {
                    fetchCrew();
                }
            }
            alert(`${targetAddress} ${t.admin.promoteSkipper}`);
        } catch (error) {
            console.error("Minting failed:", error);
            alert(t.admin.mintFailed);
        } finally {
            setMintingFor(null);
        }
    };

    const handleSyncRank = async (targetAddress: string) => {
        if (!provider) return;
        setSyncingFor(targetAddress);

        try {
            const { createPublicClient } = await import('viem');

            const publicClient = createPublicClient({
                chain: polygonAmoy,
                transport: custom(provider),
            });

            const bal1 = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: "balanceOf",
                args: [targetAddress as `0x${string}`, BigInt(1)]
            });

            const bal2 = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: "balanceOf",
                args: [targetAddress as `0x${string}`, BigInt(2)]
            });

            let newRank = 0;
            if (Number(bal2) > 0) {
                newRank = 2;
            } else if (Number(bal1) > 0) {
                newRank = 1;
            }

            if (supabase) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ rank: newRank })
                    .eq('wallet_address', targetAddress);

                if (error) {
                    console.error("Failed to sync rank:", error);
                    alert(t.admin.syncFailed);
                } else {
                    fetchCrew();
                    const rankName = newRank === 2 ? t.ranks.skipper : newRank === 1 ? t.ranks.deckhand : t.ranks.guest;
                    alert(`${t.admin.syncSuccess}${rankName}`);
                }
            }
        } catch (error) {
            console.error("Sync failed:", error);
            alert(t.admin.syncFailed);
        } finally {
            setSyncingFor(null);
        }
    };

    const getRankChip = (rankId: number) => {
        let color = rankColors.guest;
        let label = t.ranks.guest;

        if (rankId >= 100) {
            color = "#BA1A1A"; // Admin Red
            label = t.ranks.admin;
        } else if (rankId === 3) {
            color = rankColors.admiral;
            label = t.ranks.admiral;
        } else if (rankId === 2) {
            color = rankColors.skipper;
            label = t.ranks.skipper;
        } else if (rankId === 1) {
            color = rankColors.deckhand;
            label = t.ranks.deckhand;
        }

        return (
            <Chip
                label={label}
                sx={{
                    bgcolor: `${color}20`,
                    color: color,
                    fontWeight: 600,
                    borderColor: color,
                }}
                variant="outlined"
            />
        );
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
                    {/* Hamburger Menu (Left) */}
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

                    <AnchorIcon sx={{ mr: 2, color: "primary.main" }} />
                    <Box>
                        <Typography variant="h6" fontWeight={500} color="onSurface.main">
                            {t.admin.title}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, color: "onSurface.variant" }}>
                            {t.admin.subtitle}
                        </Typography>
                    </Box>
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
                    <MenuItem onClick={handleDashboardNavigate}>
                        <ListItemIcon>
                            <HomeIcon fontSize="small" />
                        </ListItemIcon>
                        {t.admin.dashboard}
                    </MenuItem>

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
            <Container maxWidth="xl" sx={{ mt: 12, mb: 4, position: "relative", zIndex: 10 }}>
                <Card
                    component={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    elevation={3}
                    sx={{ borderRadius: 4, overflow: 'hidden' }}
                >
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ p: 3, borderBottom: 1, borderColor: "outline.variant", bgcolor: "surface.main" }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex' }}>
                                    <RankIcon />
                                </Box>
                                <Typography variant="h5" fontWeight={400} color="onSurface.main">
                                    {t.admin.manifest}
                                </Typography>
                            </Stack>
                        </Box>

                        {loading ? (
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 8 }}>
                                <CircularProgress size={60} thickness={4} />
                                <Typography variant="body1" sx={{ mt: 3, color: "primary.main", letterSpacing: "0.2em" }}>
                                    {t.admin.retrieving}
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer component={Paper} elevation={0}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "surface.variant" }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.80rem", color: "onSurface.variant", textTransform: 'uppercase', letterSpacing: 1 }}>{t.admin.sailorName}</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.80rem", color: "onSurface.variant", textTransform: 'uppercase', letterSpacing: 1 }}>{t.admin.walletAddress}</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.80rem", color: "onSurface.variant", textTransform: 'uppercase', letterSpacing: 1 }}>{t.admin.currentRank}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.80rem", color: "onSurface.variant", textTransform: 'uppercase', letterSpacing: 1 }}>{t.admin.actions}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {profiles.map((profile, index) => (
                                            <TableRow
                                                component={motion.tr}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05, duration: 0.3 }}
                                                key={profile.wallet_address}
                                                sx={{
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                    transition: 'background-color 0.2s',
                                                }}
                                            >
                                                <TableCell sx={{ fontWeight: 500, fontSize: "1rem" }}>
                                                    {profile.username || "Unknown"}
                                                </TableCell>
                                                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                                                    <Paper
                                                        variant="outlined"
                                                        sx={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            px: 1,
                                                            py: 0.5,
                                                            bgcolor: 'surface.variant',
                                                            borderColor: 'outline.variant',
                                                            gap: 1
                                                        }}
                                                    >
                                                        {profile.wallet_address.substring(0, 6)}...{profile.wallet_address.substring(profile.wallet_address.length - 4)}
                                                        <Tooltip title={t.admin.copyAddress}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => navigator.clipboard.writeText(profile.wallet_address)}
                                                                sx={{ p: 0.5 }}
                                                            >
                                                                <CopyIcon sx={{ fontSize: 14 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Paper>
                                                </TableCell>
                                                <TableCell>{getRankChip(profile.rank)}</TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                        {profile.rank === 0 && (
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color="secondary"
                                                                startIcon={mintingFor === profile.wallet_address ? <CircularProgress size={16} color="inherit" /> : <PromoteIcon />}
                                                                onClick={() => handleMintDeckhand(profile.wallet_address)}
                                                                disabled={!!mintingFor}
                                                                sx={{ textTransform: "none", borderRadius: 2 }}
                                                            >
                                                                {mintingFor === profile.wallet_address ? t.admin.minting : t.admin.promoteDeckhand}
                                                            </Button>
                                                        )}
                                                        {profile.rank === 1 && (
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color="primary"
                                                                startIcon={mintingFor === profile.wallet_address ? <CircularProgress size={16} color="inherit" /> : <PromoteIcon />}
                                                                onClick={() => handleMintSkipper(profile.wallet_address)}
                                                                disabled={!!mintingFor}
                                                                sx={{ textTransform: "none", borderRadius: 2 }}
                                                            >
                                                                {mintingFor === profile.wallet_address ? t.admin.minting : t.admin.promoteSkipper}
                                                            </Button>
                                                        )}
                                                        <Tooltip title="Sync from Blockchain">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => handleSyncRank(profile.wallet_address)}
                                                                disabled={syncingFor === profile.wallet_address}
                                                                sx={{ bgcolor: 'surface.variant' }}
                                                            >
                                                                {syncingFor === profile.wallet_address ? <CircularProgress size={20} /> : <RefreshIcon />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {profiles.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                                    <Typography variant="body1" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                                        {t.admin.noCrew}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
}
