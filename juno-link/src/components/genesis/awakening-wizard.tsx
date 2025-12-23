"use client";

import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Stack,
    CircularProgress,
    Divider,
    Snackbar,
    Alert
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useRitualMode } from '@/components/providers/ritual-mode-provider';
import { ORACLE_MAPPING } from '@/lib/genesis/logic';
import type { DiagnosticAnswers, OracleMappingResult } from '@/lib/genesis/logic';
import { submitAwakening, regenerateAvatar, cleanupUserAvatars } from '@/app/actions/genesis';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useLanguage } from '@/components/providers/language-provider';
import Web3 from 'web3';

export function AwakeningWizard() {
    const { startAwakening, endAwakening, isAwakening } = useRitualMode();
    const router = useRouter();
    const { provider } = useAuth();
    const { t } = useLanguage();
    const [step, setStep] = useState(-1);
    const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
    const [result, setResult] = useState<OracleMappingResult | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Avatar regeneration states
    const [previousAvatar, setPreviousAvatar] = useState<string | null>(null);
    const [isComparing, setIsComparing] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [openError, setOpenError] = useState(false);

    const handleCloseError = () => setOpenError(false);

    const QUESTIONS = [
        {
            key: 'q1_role',
            text: t.awakening.questions.q1.text,
            options: ORACLE_MAPPING.q1
        },
        {
            key: 'q2_style',
            text: t.awakening.questions.q2.text,
            options: ORACLE_MAPPING.q2
        },
        {
            key: 'q3_item',
            text: t.awakening.questions.q3.text,
            options: ORACLE_MAPPING.q3
        }
    ];

    const handleStart = () => {
        startAwakening();
        setStep(0);
    };

    const handleAnswer = (key: string, value: string) => {
        const newAnswers = { ...answers, [key]: value };
        setAnswers(newAnswers);

        if (step < 2) {
            setStep(step + 1);
        } else {
            finishRitual(newAnswers as DiagnosticAnswers);
        }
    };

    const getWalletAddress = async (timeout = 10000): Promise<string | null> => {
        const withTimeout = <T,>(promise: Promise<T>, ms: number) => {
            return Promise.race([
                promise,
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
            ]);
        };

        try {
            if (provider) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const web3 = new Web3(provider as any);
                const accounts = await withTimeout(web3.eth.getAccounts(), timeout);
                if (accounts && accounts.length > 0) {
                    return accounts[0];
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).ethereum) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const accounts = await withTimeout((window as any).ethereum.request({ method: 'eth_accounts' }), timeout);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (accounts && (accounts as any).length > 0) return (accounts as any)[0];
            }
        } catch (e) {
            console.error("Failed to fetch wallet address:", e);
        }
        return null;
    };

    const finishRitual = async (fullAnswers: DiagnosticAnswers) => {
        setIsLoading(true);
        setErrorMessage(null);
        setOpenError(false);

        try {
            console.log("Starting Awakening ritual submission...");
            const userId = await getWalletAddress();
            console.log("Resolved address:", userId);

            if (!userId) {
                setErrorMessage("ウォレットが接続されていません");
                setOpenError(true);
                return;
            }

            const response = await submitAwakening(userId, fullAnswers);
            console.log("Server response:", response);

            if (response.success && response.data) {
                setResult(response.data.result);
                setAvatarUrl(response.data.imageUrl);
                setStep(3);
            } else {
                console.error("Ritual failed response:", response);
                setErrorMessage(response.error || t.awakening.result.unknownError);
                setOpenError(true);
            }
        } catch (e) {
            console.error("Ritual disrupted exception:", e);
            setErrorMessage(t.awakening.result.error);
            setOpenError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerate = async () => {
        if (!answers || !result || !avatarUrl) return;

        setIsRegenerating(true);
        setPreviousAvatar(avatarUrl); // Save current avatar

        try {
            const userId = await getWalletAddress();
            if (!userId) {
                setErrorMessage("ウォレットが接続されていません");
                setOpenError(true);
                return;
            }

            // Call regenerateAvatar server action with 10 NM cost
            const response = await regenerateAvatar(userId, answers as DiagnosticAnswers);

            if (response.success && response.data) {
                setAvatarUrl(response.data.imageUrl);
                setIsComparing(true); // Show comparison view
            } else {
                setErrorMessage(response.error || "再生成に失敗しました");
                setOpenError(true);
                setPreviousAvatar(null); // Reset on error
            }
        } catch (e) {
            console.error("Regeneration failed:", e);
            setErrorMessage("再生成に失敗しました。もう一度お試しください。");
            setOpenError(true);
            setPreviousAvatar(null);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleSelectAvatar = async (choice: 'previous' | 'new') => {
        const selectedUrl = choice === 'new' ? avatarUrl : previousAvatar;

        if (!selectedUrl) return;

        // Update to show selected avatar
        setAvatarUrl(selectedUrl);
        setPreviousAvatar(null);
        setIsComparing(false);

        // Cleanup all old avatar files for this user
        try {
            const userId = await getWalletAddress();
            if (!userId) {
                console.warn('[handleSelectAvatar] No wallet address, skipping cleanup');
                return;
            }

            console.log('[handleSelectAvatar] Cleaning up old avatars for user');
            const cleanupResult = await cleanupUserAvatars(userId);

            if (cleanupResult.success) {
                console.log(`[handleSelectAvatar] Cleanup successful. Deleted ${cleanupResult.deletedCount || 0} old avatar(s)`);
            } else {
                console.error('[handleSelectAvatar] Cleanup failed:', cleanupResult.error);
                // Don't show error to user - this is a background cleanup task
            }
        } catch (error) {
            console.error('[handleSelectAvatar] Error during cleanup:', error);
            // Don't show error to user
        }

        console.log(`Selected: ${choice === 'new' ? 'new' : 'previous'} avatar`);
    };

    const finishAndRedirect = () => {
        endAwakening();
        router.refresh();
        router.push('/dashboard');
    };

    if (step === -1) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="glass-panel"
                    style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        borderRadius: '24px',
                        marginTop: '40px'
                    }}
                >
                    <Box
                        component="img"
                        src="/assets/mascot.jpg"
                        alt="Navigator Character"
                        sx={{
                            width: 220,
                            height: 220,
                            mx: 'auto',
                            mb: 4,
                            objectFit: 'contain',
                            borderRadius: '50%',
                            border: '4px solid #D4AF37',
                            boxShadow: '0 0 30px rgba(212, 175, 55, 0.4)',
                            animation: 'gentle-float 3s ease-in-out infinite',
                            '@keyframes gentle-float': {
                                '0%, 100%': { transform: 'translateY(0px)' },
                                '50%': { transform: 'translateY(-10px)' }
                            }
                        }}
                    />
                    <Typography variant="h2" gutterBottom sx={{ fontFamily: 'var(--font-cinzel)', color: '#D4AF37' }}>
                        {t.awakening.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#B0BEC5', mb: 6, fontSize: '1.2rem', maxWidth: '600px', mx: 'auto', whiteSpace: 'pre-line' }}>
                        {t.awakening.subtitle}
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleStart}
                        sx={{
                            px: 8,
                            py: 2,
                            fontSize: '1.2rem',
                            letterSpacing: '0.2em'
                        }}
                    >
                        {t.awakening.begin}
                    </Button>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (isLoading) {
        return (
            <Box sx={{
                textAlign: 'center',
                py: 15,
                color: isAwakening ? '#D4AF37' : 'primary.main',
                position: 'relative'
            }}>
                {/* Ship's Wheel (Helm) Animation */}
                <Box sx={{
                    position: 'relative',
                    display: 'inline-block',
                    mb: 4
                }}>
                    {/* Rotating Ship's Wheel */}
                    <Box sx={{
                        width: 100,
                        height: 100,
                        animation: 'spin 3s linear infinite',
                        filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.3))'
                    }}>
                        <svg viewBox="0 0 100 100" width="100" height="100">
                            {/* Outer circle */}
                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3" />

                            {/* Center hub */}
                            <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.8" />

                            {/* 8 spokes */}
                            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                                <g key={angle} transform={`rotate(${angle} 50 50)`}>
                                    <line x1="50" y1="50" x2="50" y2="8" stroke="currentColor" strokeWidth="2.5" />
                                    <rect x="46" y="4" width="8" height="12" fill="currentColor" rx="2" />
                                </g>
                            ))}

                            {/* Inner ring */}
                            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                        </svg>
                    </Box>
                </Box>

                <Typography variant="h5" sx={{
                    mt: 2,
                    fontFamily: isAwakening ? 'Cinzel Decorative' : 'inherit',
                    animation: 'fadeIn 1s ease-in-out'
                }}>
                    {t.awakening.processing}
                </Typography>

                <Typography variant="body2" sx={{
                    mt: 3,
                    color: '#B0BEC5',
                    fontStyle: 'italic',
                    maxWidth: '450px',
                    mx: 'auto',
                    lineHeight: 1.8
                }}>
                    神殿の力を呼び覚まし、あなたの姿を顕現させています...<br />
                    <Box component="span" sx={{ color: '#D4AF37', fontWeight: 600 }}>
                        （10-15秒ほどお待ちください）
                    </Box>
                </Typography>

                {/* Motivational messages */}
                <Box sx={{
                    mt: 4,
                    p: 3,
                    bgcolor: 'rgba(212, 175, 55, 0.05)',
                    borderRadius: 2,
                    maxWidth: '500px',
                    mx: 'auto',
                    border: '1px solid rgba(212, 175, 55, 0.2)'
                }}>
                    <Typography variant="caption" sx={{
                        color: '#D4AF37',
                        display: 'block',
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontSize: '0.7rem'
                    }}>
                        💡 豆知識
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#E0E0E0' }}>
                        AIが3D voxel artスタイルであなた専用の
                        アバターを生成しています...
                    </Typography>
                </Box>

                <style jsx global>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </Box>
        );
    }

    const currentQ = QUESTIONS[step];

    const renderOptions = () => {
        const keyMap: Record<string, 'q1' | 'q2' | 'q3'> = {
            q1_role: 'q1',
            q2_style: 'q2',
            q3_item: 'q3'
        };
        const questionKey = keyMap[currentQ.key];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const optionsLabels = t.awakening.questions[questionKey].options as Record<string, string>;

        return Object.entries(currentQ.options).map(([optKey]) => (
            <Button
                key={optKey}
                variant="outlined"
                size="large"
                sx={{
                    py: 2.5,
                    fontSize: '1.1rem',
                    fontFamily: isAwakening ? 'Cinzel Decorative' : 'inherit',
                    borderColor: isAwakening ? 'rgba(212, 175, 55, 0.4)' : 'inherit',
                    color: isAwakening ? '#E0E0E0' : 'inherit',
                    background: isAwakening ? 'linear-gradient(45deg, rgba(0,0,0,0.6) 0%, rgba(20,30,40,0.6) 100%)' : 'transparent',
                    borderWidth: '1px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        borderColor: '#D4AF37',
                        background: isAwakening ? 'linear-gradient(45deg, rgba(212, 175, 55, 0.15) 0%, rgba(0,0,0,0.8) 100%)' : 'rgba(0,0,0,0.05)',
                        transform: 'translateY(-2px)',
                        boxShadow: isAwakening ? '0 0 15px rgba(212, 175, 55, 0.3)' : 'none'
                    }
                }}
                onClick={() => handleAnswer(currentQ.key, optKey)}
            >
                {optionsLabels[optKey] || optKey}
            </Button>
        ));
    };

    // Comparison screen
    if (isComparing && previousAvatar && avatarUrl && result) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="glass-panel"
                    style={{
                        borderRadius: '24px',
                        padding: '40px 20px',
                        marginTop: '32px',
                        border: '1px solid #D4AF37'
                    }}
                >
                    <Typography variant="h4" sx={{
                        textAlign: 'center',
                        mb: 4,
                        color: '#D4AF37',
                        fontFamily: 'Cinzel Decorative'
                    }}>
                        どちらのアバターを選びますか？
                    </Typography>

                    <Box sx={{
                        display: 'flex',
                        gap: 4,
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        mb: 2
                    }}>
                        {/* Previous Avatar */}
                        <Box sx={{
                            position: 'relative',
                            width: 320,
                            border: '2px solid rgba(212, 175, 55, 0.3)',
                            borderRadius: 3,
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                borderColor: '#D4AF37',
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 20px rgba(212, 175, 55, 0.3)'
                            }
                        }}>
                            <Box sx={{
                                height: 300,
                                bgcolor: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previousAvatar}
                                    alt="Previous Avatar"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </Box>
                            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.7)' }}>
                                <Typography variant="caption" sx={{ color: '#B0BEC5', mb: 1, display: 'block' }}>
                                    前のアバター
                                </Typography>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={() => handleSelectAvatar('previous')}
                                    sx={{
                                        borderColor: '#D4AF37',
                                        color: '#D4AF37',
                                        '&:hover': {
                                            borderColor: '#F9A825',
                                            bgcolor: 'rgba(212, 175, 55, 0.1)'
                                        }
                                    }}
                                >
                                    こちらを選択
                                </Button>
                            </Box>
                        </Box>

                        {/* New Avatar */}
                        <Box sx={{
                            position: 'relative',
                            width: 320,
                            border: '3px solid #D4AF37',
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 0 30px rgba(212, 175, 55, 0.4)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 8px 30px rgba(212, 175, 55, 0.6)'
                            }
                        }}>
                            <Box sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                bgcolor: '#D4AF37',
                                color: '#000',
                                px: 2,
                                py: 0.5,
                                borderRadius: 2,
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                zIndex: 10
                            }}>
                                NEW
                            </Box>
                            <Box sx={{
                                height: 300,
                                bgcolor: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={avatarUrl}
                                    alt="New Avatar"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </Box>
                            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.7)' }}>
                                <Typography variant="caption" sx={{ color: '#B0BEC5', mb: 1, display: 'block' }}>
                                    新しいアバター
                                </Typography>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={() => handleSelectAvatar('new')}
                                    sx={{
                                        bgcolor: '#D4AF37',
                                        color: '#000',
                                        fontWeight: 'bold',
                                        '&:hover': {
                                            bgcolor: '#F9A825'
                                        }
                                    }}
                                >
                                    こちらを選択
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (step === 3 && result) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, type: "spring" }}
                    className="glass-panel"
                    style={{
                        borderRadius: '24px',
                        overflow: 'hidden',
                        marginTop: '32px',
                        border: '1px solid #D4AF37',
                        boxShadow: '0 0 50px rgba(212, 175, 55, 0.2)'
                    }}
                >
                    <Box sx={{
                        position: 'relative',
                        height: 200,
                        width: '100%',
                        background: 'radial-gradient(circle at center, #1a237e 0%, #000000 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        overflow: 'hidden'
                    }}>
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarUrl}
                                alt={result.animal}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    backgroundColor: '#f5f5f5'
                                }}
                            />
                        ) : (
                            <Typography variant="h1" sx={{ fontSize: '5rem', opacity: 0.2, color: 'white' }}>
                                {result.animal.charAt(0)}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ textAlign: 'center', pt: 4, pb: 6, px: 4 }}>
                        <Typography variant="overline" sx={{ color: '#D4AF37', letterSpacing: '0.2em' }}>
                            {t.awakening.complete}
                        </Typography>

                        <Typography variant="h3" gutterBottom sx={{
                            fontFamily: 'var(--font-cinzel)',
                            color: '#fff',
                            textShadow: '0 0 20px rgba(212, 175, 55, 0.8)',
                            mt: 2,
                            fontWeight: 700
                        }}>
                            {result.archetype}
                        </Typography>

                        <Divider sx={{ my: 3, borderColor: 'rgba(212,175,55,0.3)', width: '50%', mx: 'auto' }} />

                        <Typography variant="h5" sx={{ color: '#E0E0E0', mb: 1 }}>
                            {t.awakening.result.spiritAnimal}: <span style={{ color: '#D4AF37' }}>{result.animal}</span>
                        </Typography>

                        <Typography variant="body1" sx={{ color: '#B0BEC5', fontStyle: 'italic', mb: 4 }}>
                            {t.awakening.result.quote.replace('{item}', result.item).replace('{vibe}', result.vibe)}
                        </Typography>

                        {/* Regeneration & Navigation Buttons */}
                        <Stack direction="row" spacing={2} justifyContent="center">
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={handleRegenerate}
                                disabled={isRegenerating}
                                startIcon={isRegenerating ? <CircularProgress size={20} /> : null}
                                sx={{
                                    borderColor: '#D4AF37',
                                    color: '#D4AF37',
                                    px: 4,
                                    py: 1.5,
                                    '&:hover': {
                                        borderColor: '#F9A825',
                                        bgcolor: 'rgba(212, 175, 55, 0.1)'
                                    }
                                }}
                            >
                                {isRegenerating ? '生成中...' : '再生成する (10 $NM)'}
                            </Button>

                            <Button
                                variant="contained"
                                size="large"
                                onClick={finishAndRedirect}
                                sx={{
                                    bgcolor: '#D4AF37',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    px: 6,
                                    py: 1.5,
                                    clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)',
                                    '&:hover': {
                                        bgcolor: '#F9A825',
                                        transform: 'scale(1.05)'
                                    }
                                }}
                            >
                                {t.awakening.enterWorld}
                            </Button>
                        </Stack>
                    </Box>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <Container maxWidth="md">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="glass-panel"
                    style={{
                        minHeight: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        padding: '32px',
                        overflow: 'visible',
                        borderRadius: '16px'
                    }}
                >
                    <Box sx={{ textAlign: 'center', px: { xs: 2, md: 8 } }}>
                        {isAwakening && (
                            <Box sx={{
                                position: 'absolute',
                                top: -20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                bgcolor: '#051E3E',
                                px: 3,
                                py: 0.5,
                                border: '1px solid #D4AF37',
                                borderRadius: 10,
                                boxShadow: '0 0 15px rgba(212, 175, 55, 0.5)'
                            }}>
                                <Typography variant="caption" sx={{ letterSpacing: 3, color: '#D4AF37', fontFamily: 'var(--font-cinzel)', fontWeight: 700 }}>
                                    {t.awakening.steps.replace('{step}', (step + 1).toString())}
                                </Typography>
                            </Box>
                        )}

                        <Typography variant="h4" paragraph sx={{
                            mb: 6,
                            mt: 4,
                            fontFamily: 'var(--font-cinzel), serif',
                            color: '#E0E6ED',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            lineHeight: 1.6,
                            fontWeight: 600
                        }}>
                            {currentQ.text}
                        </Typography>

                        <Stack spacing={2} direction="column" alignItems="stretch" maxWidth={500} mx="auto">
                            {renderOptions()}
                        </Stack>
                    </Box>
                </motion.div>
            </AnimatePresence>

            <Snackbar
                open={openError}
                autoHideDuration={6000}
                onClose={handleCloseError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%', fontWeight: 700 }}>
                    {errorMessage}
                </Alert>
            </Snackbar>
        </Container >
    );
}
