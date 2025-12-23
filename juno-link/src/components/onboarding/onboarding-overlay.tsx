"use client";

import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Stack,
    Dialog,
    IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import {
    ArrowForward,
    Close as CloseIcon
} from '@mui/icons-material';
import { useLanguage } from '@/components/providers/language-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useTutorial } from '@/components/providers/tutorial-provider';

interface OnboardingOverlayProps {
    walletAddress: string;
    onComplete: () => void;
}

export function OnboardingOverlay({ walletAddress, onComplete }: OnboardingOverlayProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();
    const { step, setStep } = useTutorial();

    const cardVariants = {
        hidden: { y: 50, opacity: 0, scale: 0.9 },
        visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } },
        exit: { y: -20, opacity: 0, scale: 0.95 }
    } as const;

    // Check balance on mount - if they already have 100 NM, skip the intro
    useEffect(() => {
        const checkExistingFunds = async () => {
            if (!walletAddress || step !== 'NONE') return;
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data } = await supabase
                .from('profiles')
                .select('nm_balance, rank')
                .ilike('wallet_address', walletAddress)
                .maybeSingle();

            if (data && ((data as any).nm_balance >= 100 || (data as any).rank > 0)) { // eslint-disable-line @typescript-eslint/no-explicit-any
                // Already has funds or rank, don't show welcome tutorial
                onComplete();
            } else {
                setStep('WELCOME');
            }
        };
        checkExistingFunds();
    }, [walletAddress, setStep, onComplete, step]);

    // Handle path-based step advancement
    useEffect(() => {
        if (step === 'GO_TO_GUILD' && pathname === '/guild') {
            setStep('CREATE_TASK');
        }
    }, [pathname, step, setStep]);


    const handleBeginAwakening = () => {
        router.push('/awakening');
        setStep('NONE');
        onComplete();
    };

    if (step === 'NONE' || step === 'COMPLETED') return null;

    // If step is WELCOME, show full dialog. Otherwise, show floating guide.
    const isWelcome = step === 'WELCOME';

    const renderWelcome = () => (
        <Box sx={{ textAlign: 'center', p: 2 }}>
            <Box
                component="img"
                src="/assets/mascot.jpg"
                sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    border: '3px solid #D4AF37',
                    mb: 3,
                    boxShadow: '0 0 20px rgba(212,175,55,0.4)'
                }}
            />
            <Typography variant="h4" sx={{ fontFamily: 'var(--font-cinzel)', color: '#D4AF37', mb: 2 }}>
                {t.tutorial.welcome.title}
            </Typography>
            <Typography variant="body1" sx={{ color: '#E0E6ED', mb: 4, lineHeight: 1.6 }}>
                {t.tutorial.welcome.desc}
            </Typography>
            <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => setStep('GO_TO_GUILD')}
                sx={{ bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#F9A825' } }}
            >
                {t.tutorial.welcome.button}
            </Button>
        </Box>
    );

    const renderGuide = () => (
        <Stack direction="row" spacing={2} alignItems="center">
            <Box
                component="img"
                src="/assets/mascot.jpg"
                sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    border: '2px solid #D4AF37',
                    boxShadow: '0 0 10px rgba(212,175,55,0.3)'
                }}
            />
            <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                    GUIDE · {step}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.9rem' }}>
                    {t.tutorial.steps[step as keyof typeof t.tutorial.steps] || (step === 'AWAKENING' ? t.tutorial.steps.AWAKENING : '')}
                </Typography>
                {step === 'AWAKENING' && (
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleBeginAwakening}
                        sx={{ mt: 1, bgcolor: '#D4AF37', color: '#000', py: 0 }}
                    >
                        {t.awakening.begin}
                    </Button>
                )}
            </Box>
            <IconButton size="small" onClick={() => { setStep('NONE'); onComplete(); }} sx={{ color: 'rgba(255,255,255,0.3)' }}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </Stack>
    );

    return (
        <Box sx={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none', inset: 0 }}>
            <Dialog
                open={isWelcome}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    style: {
                        background: 'transparent',
                        boxShadow: 'none',
                        overflow: 'visible'
                    }
                }}
            >
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="glass-panel"
                    style={{
                        background: 'rgba(5, 30, 62, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                        padding: '32px',
                        position: 'relative',
                        overflow: 'hidden',
                        pointerEvents: 'auto'
                    }}
                >
                    <Box sx={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                        opacity: 0.8
                    }} />
                    {renderWelcome()}
                </motion.div>
            </Dialog>

            {!isWelcome && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: 320,
                        pointerEvents: 'auto'
                    }}
                >
                    <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="glass-panel"
                        style={{
                            background: 'rgba(5, 30, 62, 0.9)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            padding: '16px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}
                    >
                        {renderGuide()}
                    </motion.div>
                </Box>
            )}
        </Box>
    );
}

