"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Paper, Stack } from "@mui/material";
import { Task, TaskStatus } from "@/types";
import { supabase } from "@/lib/supabase";
import { TaskCard } from "./task-card";
import { TaskDetailDialog } from "./task-detail-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { createWalletClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";

import { useLanguage } from "@/components/providers/language-provider";

export function KanbanBoard({ refreshTrigger }: { refreshTrigger: number }) {
    const { provider, loggedIn } = useAuth();
    const { t, language } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
    const [currentUserRank, setCurrentUserRank] = useState<number>(0);

    // Columns defined with i18n
    const columns: { id: TaskStatus; label: string }[] = [
        { id: 'voting', label: t.guild.columns.voting },
        { id: 'bidding', label: t.guild.columns.bidding },
        { id: 'assigned', label: t.guild.columns.assigned },
        { id: 'review', label: t.guild.columns.review },
        { id: 'done', label: t.guild.columns.done },
    ];

    const fetchTasks = async () => {
        setLoading(true);
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedTasks = (data || []) as Task[];
            setTasks(fetchedTasks);

            // Lazy Status Transition Logic
            // Only run if user is logged in (likely has permissions)
            if (loggedIn && fetchedTasks.length > 0) {
                const now = new Date();

                // 1. Voting -> Bidding
                const expiredVoting = fetchedTasks.filter(task =>
                    task.status === 'voting' &&
                    task.voting_ends_at &&
                    new Date(task.voting_ends_at) < now
                );

                if (expiredVoting.length > 0) {
                    console.log("Transitioning expired voting tasks:", expiredVoting.length);

                    const updates = expiredVoting.map(async (task) => {
                        // bidding_duration is in minutes. Default to 48h (2880m) if not set.
                        const durationMinutes = task.bidding_duration || 2880;
                        const biddingEndsAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

                        // Calculate Consensus Story Points
                        const { data: voteData } = await supabase!
                            .from('task_votes')
                            .select('points')
                            .eq('task_id', task.id);

                        let storyPoints = null;
                        if (voteData && voteData.length > 0) {
                            const sortedPoints = voteData.map((v: { points: number }) => v.points).sort((a: number, b: number) => a - b);
                            const mid = Math.floor(sortedPoints.length / 2);
                            storyPoints = sortedPoints.length % 2 !== 0
                                ? sortedPoints[mid]
                                : Math.round((sortedPoints[mid - 1] + sortedPoints[mid]) / 2);
                        }

                        // Insert notification
                        await supabase!
                            .from('notifications')
                            .insert({
                                title: t.notifications.title,
                                message: language === 'ja'
                                    ? `「${task.title}」${t.notifications.votingEnded}`
                                    : `${t.notifications.votingEnded}"${task.title}"`,
                                is_read: false,
                                link: '/guild'
                            });

                        return supabase!
                            .from('tasks')
                            .update({
                                status: 'bidding',
                                bidding_ends_at: biddingEndsAt,
                                story_points: storyPoints
                            })
                            .eq('id', task.id);
                    });

                    await Promise.all(updates);

                    fetchTasks();
                    return;
                }

                // 2. Bidding -> Assigned
                const expiredBidding = fetchedTasks.filter(task =>
                    task.status === 'bidding' &&
                    task.bidding_ends_at &&
                    new Date(task.bidding_ends_at) < now
                );

                if (expiredBidding.length > 0) {
                    console.log("Transitioning expired bidding tasks:", expiredBidding.length);

                    const updates = expiredBidding.map(async (task) => {
                        // 1. Fetch all bids to find the lowest
                        const { data: bids } = await supabase!
                            .from('task_bids')
                            .select('user_id, bid_amount, created_at')
                            .eq('task_id', task.id)
                            .order('bid_amount', { ascending: true })
                            .order('created_at', { ascending: true }); // Tie-breaker: earlier bid

                        const winner = bids && bids.length > 0 ? bids[0] : null;

                        // 2. Insert general notification
                        await supabase!
                            .from('notifications')
                            .insert({
                                title: t.notifications.title,
                                message: language === 'ja'
                                    ? `「${task.title}」${t.notifications.biddingEnded}`
                                    : `${t.notifications.biddingEnded}"${task.title}"`,
                                is_read: false,
                                link: '/guild'
                            });

                        // 3. Insert notification for winner
                        if (winner) {
                            await supabase!
                                .from('notifications')
                                .insert({
                                    user_id: winner.user_id,
                                    title: 'Mission Assigned!',
                                    message: `You have been automatically selected for mission: ${task.title}`,
                                    is_read: false,
                                    link: '/guild'
                                });
                        }

                        // 4. Update task
                        return supabase!
                            .from('tasks')
                            .update({
                                status: 'assigned',
                                assignee_id: winner?.user_id || null
                            })
                            .eq('id', task.id);
                    });

                    await Promise.all(updates);
                    fetchTasks();
                    return;
                }

                // 3. Done -> Archived (7 Days)
                const expiredDone = fetchedTasks.filter(task =>
                    task.status === 'done' &&
                    task.updated_at &&
                    (now.getTime() - new Date(task.updated_at).getTime()) > 7 * 24 * 60 * 60 * 1000
                );

                if (expiredDone.length > 0) {
                    console.log("Archiving old completed tasks:", expiredDone.length);
                    const updates = expiredDone.map(task =>
                        supabase!
                            .from('tasks')
                            .update({ status: 'archived' })
                            .eq('id', task.id)
                    );
                    await Promise.all(updates);
                    fetchTasks();
                    return;
                }
            }

        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [refreshTrigger, fetchTasks]);

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

                // Fetch Rank
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

    if (loading && tasks.length === 0) {
        return <Typography sx={{ p: 4 }}>{t.common.loading}</Typography>;
    }

    // Group tasks by status
    const tasksByStatus = columns.reduce((acc, col) => {
        acc[col.id] = tasks.filter(t => t.status === col.id);
        return acc;
    }, {} as Record<TaskStatus, Task[]>);

    return (
        <Box sx={{ overflowX: 'auto', pb: 2 }}>
            <Stack direction="row" spacing={3} sx={{ minWidth: 1000 }}>
                {columns.map((col) => (
                    <Paper
                        key={col.id}
                        sx={{
                            flex: 1,
                            minWidth: 280,
                            bgcolor: 'surface.variant',
                            p: 2,
                            borderRadius: 3
                        }}
                        elevation={0}
                    >
                        <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                mb: 2,
                                fontWeight: 700
                            }}
                        >
                            {col.label} ({tasksByStatus[col.id]?.length || 0})
                        </Typography>

                        <Stack spacing={0}>
                            {tasksByStatus[col.id]?.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onClick={setSelectedTask}
                                />
                            ))}
                            {tasksByStatus[col.id]?.length === 0 && (
                                <Box
                                    sx={{
                                        py: 4,
                                        border: '1px dashed',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Typography variant="body2" color="text.disabled">
                                        {t.common.noTasks}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                ))}
            </Stack>

            <TaskDetailDialog
                open={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                currentUserAddress={currentUserAddress}
                currentUserRank={currentUserRank}
                onUpdated={fetchTasks}
            />
        </Box>
    );
}
