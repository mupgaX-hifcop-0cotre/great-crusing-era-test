"use client";

import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ButtonBase,
    Chip,
    CircularProgress
} from "@mui/material";
import { Task } from "@/types";
import { supabase } from "@/lib/supabase";
import { TaskDetailDialog } from "./task-detail-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { createWalletClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";

export function ArchivedTasks() {
    const { provider, loggedIn } = useAuth();
    const { t } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
    const [currentUserRank, setCurrentUserRank] = useState<number>(0);

    const fetchArchivedTasks = async () => {
        setLoading(true);
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('status', 'archived')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setTasks((data || []) as Task[]);
        } catch (error) {
            console.error("Error fetching archived tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArchivedTasks();
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!loggedIn || !provider || !supabase) return;
            try {
                const walletClient = createWalletClient({
                    chain: polygonAmoy,
                    transport: custom(provider),
                });
                const [addr] = await walletClient.requestAddresses();
                setCurrentUserAddress(addr);

                const { data } = await supabase
                    .from('profiles')
                    .select('rank')
                    .eq('wallet_address', addr)
                    .single();

                if (data) {
                    setCurrentUserRank(data.rank || 0);
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            }
        };
        fetchUserData();
    }, [loggedIn, provider]);

    if (loading) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>{t.common.loading}</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }} elevation={0} variant="outlined">
                <Table>
                    <TableHead sx={{ bgcolor: 'surface.variant' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>{t.guild.createDialog.taskTitle}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{t.guild.taskDetail.storyPoints}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{t.guild.taskDetail.assignee}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{t.guild.columns.done}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Tags</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.disabled">{t.common.noTasks}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tasks.map((task) => (
                                <TableRow
                                    key={task.id}
                                    component={ButtonBase}
                                    onClick={() => setSelectedTask(task)}
                                    sx={{
                                        display: 'table-row',
                                        width: '100%',
                                        '&:hover': { bgcolor: 'action.hover' },
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {task.title}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={`${task.story_points || 0} SP`} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            {task.assignee_id ? `${task.assignee_id.slice(0, 6)}...${task.assignee_id.slice(-4)}` : '-'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(task.updated_at).toLocaleDateString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            {task.tags?.slice(0, 2).map((tag) => (
                                                <Chip key={tag} label={tag} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                                            ))}
                                            {task.tags && task.tags.length > 2 && (
                                                <Typography variant="caption">+{task.tags.length - 2}</Typography>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TaskDetailDialog
                open={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                currentUserAddress={currentUserAddress}
                currentUserRank={currentUserRank}
                onUpdated={fetchArchivedTasks}
            />
        </Box>
    );
}
