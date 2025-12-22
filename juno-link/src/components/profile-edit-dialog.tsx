"use client";

import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    IconButton,
    Stack,
    CircularProgress,
    Chip,
    Typography,
    Box,
} from "@mui/material";
import { Edit as EditIcon, Check as CheckIcon } from "@mui/icons-material";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";

interface ProfileEditDialogProps {
    walletAddress: string;
    currentUsername: string;
    currentBio: string;
    currentSkills: string[];
    onUpdate: () => void;
}

const AVAILABLE_SKILLS = [
    "Engineer",
    "Mechanic",
    "Navigator",
    "Doctor",
    "Strategist",
    "Warrior",
    "Trader",
    "Scholar"
];

export function ProfileEditDialog({ walletAddress, currentUsername, currentBio, currentSkills = [], onUpdate }: ProfileEditDialogProps) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState(currentUsername);
    const [bio, setBio] = useState(currentBio);
    const [skills, setSkills] = useState<string[]>(currentSkills || []);
    const [loading, setLoading] = useState(false);

    const handleOpen = () => {
        setUsername(currentUsername);
        setBio(currentBio);
        setSkills(currentSkills || []);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const toggleSkill = (skill: string) => {
        setSkills(prev =>
            prev.includes(skill)
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
        );
    };

    const handleSave = async () => {
        if (!supabase) return;
        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    username,
                    bio,
                    skills,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet_address', walletAddress);

            if (error) {
                console.error("Error updating profile:", error);
                alert(t.common.error);
            } else {
                onUpdate();
                setOpen(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <IconButton
                onClick={handleOpen}
                size="small"
                sx={{
                    color: "text.secondary",
                    "&:hover": {
                        color: "primary.main",
                        bgcolor: "action.hover",
                    },
                }}
            >
                <EditIcon fontSize="small" />
            </IconButton>

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    elevation: 8,
                    sx: { borderRadius: 2 },
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, color: "primary.main" }}>
                    {t.profile.editProfile}
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label={t.profile.shipName}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            fullWidth
                            inputProps={{ maxLength: 20 }}
                            helperText={`${username.length}/20 ${t.profile.maxChars}`}
                            variant="outlined"
                        />

                        <Box>
                            <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                {t.profile.skills}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {AVAILABLE_SKILLS.map((skill) => {
                                    const selected = skills.includes(skill);
                                    return (
                                        <Chip
                                            key={skill}
                                            label={skill}
                                            onClick={() => toggleSkill(skill)}
                                            icon={selected ? <CheckIcon /> : undefined}
                                            color={selected ? "primary" : "default"}
                                            variant={selected ? "filled" : "outlined"}
                                            sx={{
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    opacity: 0.8
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        </Box>

                        <TextField
                            label={t.profile.bio}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            fullWidth
                            multiline
                            rows={4}
                            inputProps={{ maxLength: 140 }}
                            helperText={`${bio.length}/140 ${t.profile.maxChars}`}
                            variant="outlined"
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        sx={{ textTransform: "none" }}
                    >
                        {t.profile.cancel}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{ textTransform: "none" }}
                    >
                        {loading ? t.common.saving : t.profile.save}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
