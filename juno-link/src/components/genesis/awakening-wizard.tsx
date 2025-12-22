"use client";

import React, { useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    Fade,
    Stack,
    CircularProgress,
    Divider
} from '@mui/material';
import { useRitualMode } from '@/components/providers/ritual-mode-provider';
import { ORACLE_MAPPING, resolveAwakeningLogic } from '@/lib/genesis/logic';
import type { DiagnosticAnswers, OracleMappingResult } from '@/lib/genesis/logic';
import { submitAwakening } from '@/app/actions/genesis';
import { useRouter } from 'next/navigation';

const QUESTIONS = [
    {
        key: 'q1_role',
        text: "嵐の海で船が大きく傾いた時、お前なら真っ先にどこへ走る？",
        options: ORACLE_MAPPING.q1
    },
    {
        key: 'q2_style',
        text: "長い航海の夜、甲板で何を思う？",
        options: ORACLE_MAPPING.q2
    },
    {
        key: 'q3_item',
        text: "これだけは手放せない、お守りはどれだ？",
        options: ORACLE_MAPPING.q3
    }
];

export function AwakeningWizard() {
    const { startAwakening, endAwakening, isAwakening } = useRitualMode();
    const router = useRouter(); // For redirection
    const [step, setStep] = useState(-1); // -1: Intro, 0-2: Questions, 3: Result
    const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({});
    const [result, setResult] = useState<OracleMappingResult | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
            // Finish
            finishRitual(newAnswers as DiagnosticAnswers);
        }
    };

    const finishRitual = async (finalAnswers: DiagnosticAnswers) => {
        setIsLoading(true);

        // We use the address from the wallet (or null if not connected, though page should be protected)
        // Assuming auth provider gives `userAddress` (need to check if useAuth provides it or just `userInfo` or `address` state in dashboard)
        // Actually the useAuth hook might not expose address directly if it's internal state of dashboard. 
        // Let's check `auth-provider` below. 
        // If not available, we might need to pass it or use context. 
        // For now, I'll assume we can get it or use a placeholder if the auth context is simple.
        // Wait, useAuth returns { loggedIn, provider, logout }. It doesn't return address directly?
        // In Dashboard it gets address via `walletClient.requestAddresses()`.
        // The Wizard should probably do the same or we should lift address to AuthProvider.
        // I will try to get address again here if needed, or pass it as prop?
        // Let's rely on a helper or just re-request since it's a connected wallet.

        let currentAddress = null;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).ethereum) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) currentAddress = accounts[0];
            }
        } catch (e) { console.error(e); }

        try {
            const response = await submitAwakening(currentAddress, finalAnswers);

            if (response.success && response.data) {
                setResult(response.data.result as unknown as OracleMappingResult);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((response.data as any).imageUrl) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setAvatarUrl((response.data as any).imageUrl);
                }
                setStep(3);
            } else {
                const resolution = resolveAwakeningLogic(finalAnswers);
                setResult(resolution);
                setStep(3);
            }
        } catch (e) {
            console.error("Ritual Failed", e);
            const resolution = resolveAwakeningLogic(finalAnswers);
            setResult(resolution);
            setStep(3);
        } finally {
            setIsLoading(false);
        }
    };

    const finishAndRedirect = () => {
        endAwakening();
        router.push('/dashboard');
    };

    // --- Renders ---

    if (step === -1) {
        return (
            <Box sx={{ textAlign: 'center', py: 10 }}>
                <Box
                    component="img"
                    src="/assets/navigator.jpg"
                    alt="Navigator Character"
                    sx={{
                        width: 200,
                        height: 200,
                        mx: 'auto',
                        mb: 4,
                        objectFit: 'contain',
                        animation: 'gentle-float 3s ease-in-out infinite',
                        '@keyframes gentle-float': {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-10px)' }
                        }
                    }}
                />
                <Typography variant="h3" gutterBottom>The Genesis</Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Are you ready to awaken your soul directly from the digital ocean?
                </Typography>
                <Button variant="contained" size="large" onClick={handleStart}>
                    Begin Ritual
                </Button>
            </Box>
        );
    }

    if (isLoading) {
        return (
            <Box sx={{ textAlign: 'center', py: 15, color: isAwakening ? '#D4AF37' : 'primary.main' }}>
                <CircularProgress color="inherit" size={60} />
                <Typography variant="h5" sx={{ mt: 4, fontFamily: isAwakening ? 'Cinzel Decorative' : 'inherit' }}>
                    The Oracle is consulting the stars...
                </Typography>
            </Box>
        );
    }

    // Question Step
    const currentQ = QUESTIONS[step];

    const renderOptions = () => {
        const keyMap: Record<string, 'q1' | 'q2' | 'q3'> = {
            q1_role: 'q1',
            q2_style: 'q2',
            q3_item: 'q3'
        };
        const questionKey = keyMap[currentQ.key];

        // Label mapping for visual display
        const LABELS: Record<string, Record<string, string>> = {
            q1: { A: "舵を取る (Lead)", B: "帆を張り直す (Power)", C: "仲間を鼓舞する (Charisma)", D: "海図を確認する (Analyze)" },
            q2: { A: "冒険心 (Adventure)", B: "安らぎ (Comfort)", C: "神秘 (Mystery)", D: "分析 (Tech)" },
            q3: { A: "コンパス (Guide)", B: "スカーフ (Voyager)", C: "楽器 (Bard)", D: "工具/剣 (Builder)" }
        };

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
                {LABELS[questionKey][optKey] || optKey}
            </Button>
        ));
    };

    if (step === 3 && result) {
        return (
            <Fade in={true} timeout={1000}>
                <Container maxWidth="sm">
                    <Card
                        sx={{
                            bgcolor: 'rgba(10, 15, 20, 0.85)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid #D4AF37',
                            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
                            borderRadius: 4,
                            overflow: 'visible',
                            mt: 4
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
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <Typography variant="h1" sx={{ fontSize: '5rem', opacity: 0.2, color: 'white' }}>
                                    {result.animal.charAt(0)}
                                </Typography>
                            )}
                        </Box>

                        <CardContent sx={{ textAlign: 'center', pt: 4, pb: 6, px: 4 }}>
                            <Typography variant="overline" sx={{ color: '#D4AF37', letterSpacing: '0.2em' }}>
                                AWAKENING COMPLETE
                            </Typography>

                            <Typography variant="h3" gutterBottom sx={{
                                fontFamily: 'Cinzel Decorative',
                                color: '#fff',
                                textShadow: '0 0 10px rgba(212, 175, 55, 0.5)',
                                mt: 2
                            }}>
                                {result.archetype}
                            </Typography>

                            <Divider sx={{ my: 3, borderColor: 'rgba(212,175,55,0.3)', width: '50%', mx: 'auto' }} />

                            <Typography variant="h5" sx={{ color: '#E0E0E0', mb: 1 }}>
                                Spirit Animal: <span style={{ color: '#D4AF37' }}>{result.animal}</span>
                            </Typography>

                            <Typography variant="body1" sx={{ color: '#B0BEC5', fontStyle: 'italic', mb: 4 }}>
                                &quot;{result.item}, surrounded by {result.vibe}&quot;
                            </Typography>

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
                                Enter The Great Cruising Era
                            </Button>
                        </CardContent>
                    </Card>
                </Container>
            </Fade>
        );
    }

    return (
        <Container maxWidth="md">
            <Fade in={true} key={step} timeout={500}>
                <Card
                    elevation={isAwakening ? 0 : 4}
                    sx={{
                        minHeight: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        bgcolor: isAwakening ? 'rgba(0,0,0,0.4)' : 'background.paper',
                        backdropFilter: isAwakening ? 'blur(5px)' : 'none',
                        border: isAwakening ? '1px solid rgba(212, 175, 55, 0.3)' : 'none',
                        borderRadius: 4,
                        position: 'relative',
                        overflow: 'visible'
                    }}
                >
                    <CardContent sx={{ textAlign: 'center', px: { xs: 2, md: 8 } }}>
                        {isAwakening && (
                            <Box sx={{
                                position: 'absolute',
                                top: -20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                bgcolor: '#000',
                                px: 2,
                                py: 0.5,
                                border: '1px solid #D4AF37',
                                borderRadius: 10
                            }}>
                                <Typography variant="caption" sx={{ letterSpacing: 3, color: '#D4AF37' }}>
                                    THE ORACLE ({step + 1}/3)
                                </Typography>
                            </Box>
                        )}

                        <Typography variant="h4" paragraph sx={{
                            mb: 6,
                            mt: 4,
                            fontFamily: isAwakening ? 'Cinzel Decorative' : 'inherit',
                            color: isAwakening ? '#fff' : 'inherit',
                            textShadow: isAwakening ? '0 2px 4px rgba(0,0,0,0.5)' : 'none',
                            lineHeight: 1.6
                        }}>
                            {currentQ.text}
                        </Typography>

                        <Stack spacing={2} direction="column" alignItems="stretch" maxWidth={500} mx="auto">
                            {renderOptions()}
                        </Stack>
                    </CardContent>
                </Card>
            </Fade>
        </Container>
    );
}
