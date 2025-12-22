"use client";

import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Chip,
    Typography,
    Alert,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from "@mui/material";
import { Check as CheckIcon } from "@mui/icons-material";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";
// import { useAuth } from "@/components/providers/auth-provider";

interface CreateTaskDialogProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    creatorAddress: string | null;
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

export function CreateTaskDialog({ open, onClose, onCreated, creatorAddress }: CreateTaskDialogProps) {
    // const { provider } = useAuth(); 
    const { t } = useLanguage();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [durationHours, setDurationHours] = useState(24);
    const [biddingDurationHours, setBiddingDurationHours] = useState(48);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleTag = (tag: string) => {
        setTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;
        setIsSubmitting(true);
        setError(null);

        try {
            if (!supabase) throw new Error("Supabase client not initialized");

            const votingEndsAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

            const { error: insertError } = await supabase
                .from('tasks')
                .insert({
                    title,
                    description,
                    status: 'voting',
                    tags,
                    voting_ends_at: votingEndsAt,
                    bidding_duration: biddingDurationHours * 60, // Store in minutes
                    creator_id: creatorAddress
                });

            if (insertError) throw insertError;

            // Send Notification (Global for now, by omitting user_id)
            await supabase.from('notifications').insert({
                title: t.notifications.title,
                message: `${t.notifications.newMission}${title}`,
                is_read: false,
                link: '/guild'
            });

            setTitle("");
            setDescription("");
            setTags([]);
            setDurationHours(24);
            setBiddingDurationHours(48);
            onCreated();
            onClose();
        } catch (err: unknown) {
            console.error("Error creating task:", err);
            setError((err as Error).message || "Failed to create task");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t.guild.createDialog.title}</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField
                        autoFocus
                        label={t.guild.createDialog.taskTitle}
                        fullWidth
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSubmitting}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>{t.guild.createDialog.votingDuration}</InputLabel>
                            <Select
                                value={durationHours}
                                label={t.guild.createDialog.votingDuration}
                                onChange={(e) => setDurationHours(Number(e.target.value))}
                                disabled={isSubmitting}
                            >
                                <MenuItem value={1}>1 Hour (Testing)</MenuItem>
                                <MenuItem value={12}>12 Hours</MenuItem>
                                <MenuItem value={24}>24 Hours</MenuItem>
                                <MenuItem value={48}>48 Hours</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>{t.guild.createDialog.biddingDuration}</InputLabel>
                            <Select
                                value={biddingDurationHours}
                                label={t.guild.createDialog.biddingDuration}
                                onChange={(e) => setBiddingDurationHours(Number(e.target.value))}
                                disabled={isSubmitting}
                            >
                                <MenuItem value={1}>1 Hour (Testing)</MenuItem>
                                <MenuItem value={24}>24 Hours</MenuItem>
                                <MenuItem value={48}>48 Hours</MenuItem>
                                <MenuItem value={72}>72 Hours</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                            {t.guild.createDialog.requiredSkills}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {AVAILABLE_SKILLS.map((skill) => {
                                const selected = tags.includes(skill);
                                return (
                                    <Chip
                                        key={skill}
                                        label={skill}
                                        onClick={() => toggleTag(skill)}
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
                        label={t.guild.createDialog.description}
                        fullWidth
                        multiline
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSubmitting}>{t.guild.createDialog.cancel}</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting || !title.trim()}>
                    {isSubmitting ? t.guild.createDialog.creating : t.guild.createDialog.create}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
