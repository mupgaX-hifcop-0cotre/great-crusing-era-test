"use client";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Avatar,
    Stack,
    TextField,
    Rating,
    Alert,
    Paper,
} from "@mui/material";
import { Task, TaskReview, TaskBid } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/providers/language-provider";

interface TaskDetailDialogProps {
    open: boolean;
    onClose: () => void;
    task: Task | null;
    currentUserAddress?: string | null;
    currentUserRank?: number;
    onUpdated?: () => void;
}

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

export function TaskDetailDialog({ open, onClose, task, currentUserAddress, currentUserRank = 0, onUpdated }: TaskDetailDialogProps) {
    const { t, language } = useLanguage();
    const [votePoints, setVotePoints] = useState<number | null>(null);
    const [bidAmount, setBidAmount] = useState<string>("");
    const [bidComment, setBidComment] = useState<string>("");
    const [hasVoted, setHasVoted] = useState(false);
    const [hasBidded, setHasBidded] = useState(false);
    const [bidStats, setBidStats] = useState<{ count: number, minBid: number }>({ count: 0, minBid: 0 });
    const [bids, setBids] = useState<TaskBid[]>([]); // To hold full bid data for admins
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [creatorName, setCreatorName] = useState<string>("");
    const [reportComment, setReportComment] = useState("");
    const [reportLink, setReportLink] = useState("");
    const [evalRating, setEvalRating] = useState<number>(5);
    const [evalComment, setEvalComment] = useState("");
    const [reviews, setReviews] = useState<TaskReview[]>([]);
    const [hasReviewed, setHasReviewed] = useState(false);

    const fetchBidStats = useCallback(async () => {
        if (!task || !supabase) return;

        // Fetch stats for all
        const { data: statsData } = await supabase
            .from('task_bids')
            .select('bid_amount')
            .eq('task_id', task.id);

        if (statsData && statsData.length > 0) {
            const min = Math.min(...statsData.map((b: { bid_amount: number }) => b.bid_amount));
            setBidStats({ count: statsData.length, minBid: min });
        } else {
            setBidStats({ count: 0, minBid: 0 });
        }

        // Fetch full list for admins/creator if in bidding/assigned stage
        if (currentUserRank >= 100 || currentUserAddress === task.creator_id) {
            const { data: fullBids } = await supabase
                .from('task_bids')
                .select('*, profiles(username)')
                .eq('task_id', task.id)
                .order('bid_amount', { ascending: true });

            if (fullBids) setBids(fullBids);
        }
    }, [task, currentUserRank, currentUserAddress]);

    useEffect(() => {
        const fetchCreator = async () => {
            if (!task?.creator_id || !supabase) return;
            const { data } = await supabase
                .from('profiles')
                .select('username')
                .eq('wallet_address', task.creator_id)
                .single();
            if (data?.username) {
                setCreatorName(data.username);
            }
        };
        fetchCreator();
    }, [task?.creator_id]);

    useEffect(() => {
        if (!open || !task) return;

        const targetDate = task.status === 'voting' ? task.voting_ends_at : (task.status === 'bidding' ? task.bidding_ends_at : null);
        if (!targetDate) {
            setTimeLeft("");
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(targetDate).getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft(t.guild.taskDetail.expired);
            } else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${hours}h ${minutes}m`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [open, task, t]);

    const fetchReviews = useCallback(async () => {
        if (!task || !supabase) return;
        const { data } = await supabase
            .from('task_reviews')
            .select('*, profiles(username)')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false });
        if (data) {
            setReviews(data as TaskReview[]);
            if (currentUserAddress) {
                setHasReviewed(data.some((e: TaskReview) => e.reviewer_id === currentUserAddress));
            }
        }
    }, [task, currentUserAddress]);

    const checkUserStatus = useCallback(async () => {
        if (!task || !currentUserAddress || !supabase) return;

        if (task.status === 'voting') {
            const { data } = await supabase
                .from('task_votes')
                .select('points')
                .eq('task_id', task.id)
                .eq('user_id', currentUserAddress)
                .maybeSingle();

            if (data) {
                setHasVoted(true);
                setVotePoints(data.points);
            } else {
                setHasVoted(false);
                setVotePoints(null);
            }
        } else if (task.status === 'bidding') {
            const { data } = await supabase
                .from('task_bids')
                .select('*')
                .eq('task_id', task.id)
                .eq('user_id', currentUserAddress)
                .maybeSingle();

            if (data) {
                setHasBidded(true);
                setBidAmount(data.bid_amount.toString());
                setBidComment(data.comment || "");
            } else {
                setHasBidded(false);
                setBidAmount("");
                setBidComment("");
            }
        }
    }, [task, currentUserAddress]);

    const handleAssign = async (bidderAddress: string) => {
        if (!task || !supabase) return;
        setIsSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('tasks')
                .update({
                    assignee_id: bidderAddress,
                    status: 'assigned'
                })
                .eq('id', task.id);

            if (updateError) throw updateError;

            // Notification for assignee
            await supabase.from('notifications').insert({
                user_id: bidderAddress,
                title: 'Mission Assigned!',
                message: `You have been assigned to: ${task.title}. Good luck, sailor!`,
                is_read: false,
                link: '/guild'
            });

            if (onUpdated) onUpdated();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Assignment failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (open && task && currentUserAddress) {
            checkUserStatus();
            fetchBidStats();
            if (task.status === 'review' || task.status === 'done') {
                fetchReviews();
            }
        }
    }, [open, task, currentUserAddress, checkUserStatus, fetchBidStats, fetchReviews]);

    const handleVote = async (points: number) => {
        if (!task || !currentUserAddress || !supabase) return;
        setIsSubmitting(true);
        try {
            await supabase.from('task_votes').upsert({
                task_id: task.id,
                user_id: currentUserAddress,
                points,
                created_at: new Date().toISOString()
            });
            setVotePoints(points);
            setHasVoted(true);
        } catch (e) {
            console.error(e);
            alert("Vote failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForceTransition = async () => {
        if (!task || !supabase) return;
        setIsSubmitting(true);
        try {
            let nextStatus = task.status;
            const updates: Partial<Task> = {};

            if (task.status === 'voting') {
                nextStatus = 'bidding';
                const durationMinutes = task.bidding_duration || 2880;
                updates.bidding_ends_at = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

                // Calculate Consensus Story Points (Median of Fibonacci votes)
                const { data: voteData } = await supabase
                    .from('task_votes')
                    .select('points')
                    .eq('task_id', task.id);

                if (voteData && voteData.length > 0) {
                    const sortedPoints = voteData.map((v: { points: number }) => v.points).sort((a: number, b: number) => a - b);
                    const mid = Math.floor(sortedPoints.length / 2);
                    const median = sortedPoints.length % 2 !== 0
                        ? sortedPoints[mid]
                        : Math.round((sortedPoints[mid - 1] + sortedPoints[mid]) / 2);

                    updates.story_points = median;
                }
            } else if (task.status === 'bidding') {
                nextStatus = 'assigned';
                const { data: bids } = await supabase
                    .from('task_bids')
                    .select('user_id')
                    .eq('task_id', task.id)
                    .order('bid_amount', { ascending: true })
                    .order('created_at', { ascending: true });
                if (bids && bids.length > 0) {
                    updates.assignee_id = bids[0].user_id;
                }
            } else if (task.status === 'assigned') {
                nextStatus = 'review';
            } else if (task.status === 'review') {
                nextStatus = 'done';
                if (task.assignee_id) {
                    const { data: bidData } = await supabase
                        .from('task_bids')
                        .select('bid_amount')
                        .eq('task_id', task.id)
                        .eq('user_id', task.assignee_id)
                        .maybeSingle();

                    if (bidData) {
                        const bidAmountVal = bidData.bid_amount;

                        // Calculate Review Multiplier
                        const { data: reviewsData } = await supabase
                            .from('task_reviews')
                            .select('rating')
                            .eq('task_id', task.id);

                        let multiplier = 1.0;
                        if (reviewsData && reviewsData.length > 0) {
                            const avgRating = reviewsData.reduce((acc: number, curr: { rating: number }) => acc + curr.rating, 0) / reviewsData.length;
                            // Multiplier = 1 + ((Avg - 3) * 0.1) (min 1.0)
                            multiplier = Math.max(1.0, 1 + ((avgRating - 3) * 0.1));
                        }

                        const finalReward = Math.round(bidAmountVal * multiplier);
                        updates.final_reward = finalReward;

                        // Automated Payout: Increment knot_balance in profiles
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('knot_balance')
                            .eq('wallet_address', task.assignee_id)
                            .single();

                        const currentBalance = profile?.knot_balance || 0;
                        await supabase
                            .from('profiles')
                            .update({ knot_balance: currentBalance + finalReward })
                            .eq('wallet_address', task.assignee_id);
                    }
                }
            }

            if (nextStatus === task.status) return;

            const { error: updateError } = await supabase
                .from('tasks')
                .update({ status: nextStatus, ...updates })
                .eq('id', task.id);

            if (updateError) {
                console.error("Task update error:", updateError);
                throw new Error(`Update task failed: ${updateError.message} (${updateError.code})`);
            }

            // Notification
            try {
                const msgKey = nextStatus === 'bidding' ? 'votingEnded' : (nextStatus === 'assigned' ? 'biddingEnded' : null);
                if (msgKey) {
                    const notificationMessages = t.notifications as Record<string, string>;
                    await supabase.from('notifications').insert({
                        title: t.notifications.title,
                        message: language === 'ja'
                            ? `「${task.title}」${notificationMessages[msgKey]}`
                            : `${notificationMessages[msgKey]}"${task.title}"`,
                        is_read: false,
                        link: '/guild'
                    });
                }
            } catch (notifErr) {
                console.error("Notification insert error:", notifErr);
                // Don't fail the whole transition if only notification fails, 
                // but let's log it.
            }

            if (onUpdated) onUpdated();
            onClose();
        } catch (e) {
            console.error("Force transition full error:", e);
            const errorMessage = e instanceof Error ? e.message : "Unknown error";
            alert(`Transition failed: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleWorkSubmit = async () => {
        if (!task || !supabase) return;
        setIsSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('tasks')
                .update({
                    status: 'review',
                    completion_report: reportComment,
                    completion_link: reportLink
                })
                .eq('id', task.id);

            if (updateError) throw updateError;

            // Notification for creator
            if (task.creator_id) {
                await supabase.from('notifications').insert({
                    user_id: task.creator_id,
                    title: 'Work Submitted!',
                    message: `Assignee submitted work for: ${task.title}. Review needed.`,
                    is_read: false,
                    link: '/guild'
                });
            }

            if (onUpdated) onUpdated();
            onClose();
            alert(t.guild.taskDetail.submission.submitted);
        } catch (e) {
            console.error(e);
            alert("Work submission failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!task || !currentUserAddress || !supabase) return;
        if (currentUserRank < 2) {
            alert("Rank 2+ (Skipper) required to review.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error: reviewError } = await supabase
                .from('task_reviews')
                .insert({
                    task_id: task.id,
                    reviewer_id: currentUserAddress,
                    rating: evalRating,
                    comment: evalComment
                });

            if (reviewError) throw reviewError;

            fetchReviews();
            setHasReviewed(true);
            alert(t.guild.taskDetail.review360.submitted);
        } catch (e) {
            console.error(e);
            alert("Review failed");
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleBid = async () => {
        if (!task || !currentUserAddress || !bidAmount || !supabase) return;

        const sp = task.story_points || 0;
        const maxBid = sp * 10;
        if (Number(bidAmount) > maxBid) {
            alert(t.guild.taskDetail.bidding.maxBidError.replace('{limit}', maxBid.toString()));
            return;
        }

        setIsSubmitting(true);
        try {
            await supabase.from('task_bids').upsert({
                task_id: task.id,
                user_id: currentUserAddress,
                bid_amount: Number(bidAmount),
                comment: bidComment,
                created_at: new Date().toISOString()
            });
            setHasBidded(true);
            fetchBidStats();
        } catch (e) {
            console.error(e);
            alert("Bid failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!task) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="h6">{task.title}</Typography>
                            {timeLeft && (
                                <Chip label={`${t.guild.taskDetail.endsIn}${timeLeft}`} color="warning" size="small" variant="outlined" />
                            )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{t.guild.taskDetail.id}: {task.id}</Typography>
                    </Box>
                    <Chip label={task.status} color="primary" variant="outlined" size="small" />
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">{t.guild.taskDetail.description}</Typography>
                        <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                            {task.description || "No description provided."}
                        </Typography>
                    </Box>

                    {task.tags && task.tags.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">{t.guild.taskDetail.requiredSkills}</Typography>
                            <Stack direction="row" spacing={1} mt={0.5}>
                                {task.tags.map(tag => (
                                    <Chip key={tag} label={tag} size="small" />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    <Stack direction="row" spacing={4}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">{t.guild.taskDetail.storyPoints}</Typography>
                            <Typography variant="h6">{task.story_points ?? "-"}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">{t.guild.taskDetail.assignee}</Typography>
                            {task.assignee_id ? (
                                <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                        {task.assignee_id.substring(0, 2).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="body2">{task.assignee_id.substring(0, 6)}...</Typography>
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.disabled">{t.guild.taskDetail.unassigned}</Typography>
                            )}
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary">{t.guild.taskDetail.creator}</Typography>
                            <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                                    {creatorName ? creatorName.charAt(0).toUpperCase() : (task.creator_id ? task.creator_id.substring(0, 2).toUpperCase() : "?")}
                                </Avatar>
                                <Typography variant="body2">
                                    {creatorName || (task.creator_id ? `${task.creator_id.substring(0, 6)}...` : t.guild.taskDetail.unknown)}
                                </Typography>
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Voting Logic */}
                    {task.status === 'voting' && (
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                {t.guild.taskDetail.voting.title}
                            </Typography>

                            {currentUserRank >= 2 ? (
                                <>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        {t.guild.taskDetail.voting.desc}
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {FIBONACCI_POINTS.map(p => (
                                            <Button
                                                key={p}
                                                variant={votePoints === p ? "contained" : "outlined"}
                                                onClick={() => handleVote(p)}
                                                disabled={isSubmitting}
                                                sx={{ minWidth: 48, borderRadius: '50%', height: 48 }}
                                            >
                                                {p}
                                            </Button>
                                        ))}
                                    </Stack>
                                    {hasVoted && (
                                        <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                                            {t.guild.taskDetail.voting.recorded}
                                        </Typography>
                                    )}
                                </>
                            ) : (
                                <Alert severity="info">{t.guild.taskDetail.voting.requiredRank}</Alert>
                            )}
                        </Box>
                    )}

                    {/* Bidding Logic */}
                    {task.status === 'bidding' && (
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {t.guild.taskDetail.bidding.title}
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', color: bidStats.count > 3 ? 'error.main' : 'success.main' }}>
                                    {bidStats.count > 3 ? t.guild.taskDetail.bidding.reverseAuction : t.guild.taskDetail.bidding.earlyBird}
                                </Typography>
                            </Stack>

                            {currentUserRank >= 1 ? (
                                <Stack spacing={2} mt={2}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary">{t.guild.taskDetail.bidding.currentLowest}</Typography>
                                            <Typography variant="h6">{bidStats.minBid > 0 ? bidStats.minBid : '-'}</Typography>
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary">{t.guild.taskDetail.bidding.totalBidders}</Typography>
                                            <Typography variant="h6">{bidStats.count}</Typography>
                                        </Box>
                                    </Box>

                                    <TextField
                                        label={`${t.guild.taskDetail.bidding.bidAmount} (Max: ${(task.story_points || 0) * 10})`}
                                        type="number"
                                        value={bidAmount}
                                        onChange={e => setBidAmount(e.target.value)}
                                        fullWidth
                                        disabled={isSubmitting}
                                        error={Number(bidAmount) > (task.story_points || 0) * 10}
                                        helperText={Number(bidAmount) > (task.story_points || 0) * 10 ? t.guild.taskDetail.bidding.maxBidError.replace('{limit}', ((task.story_points || 0) * 10).toString()) : ""}
                                    />
                                    <TextField
                                        label={t.guild.taskDetail.bidding.comment}
                                        value={bidComment}
                                        onChange={e => setBidComment(e.target.value)}
                                        fullWidth
                                        multiline
                                        rows={2}
                                        disabled={isSubmitting}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={handleBid}
                                        disabled={isSubmitting || !bidAmount}
                                    >
                                        {hasBidded ? t.guild.taskDetail.bidding.updateBid : t.guild.taskDetail.bidding.placeBid}
                                    </Button>
                                </Stack>
                            ) : (
                                <Alert severity="info" sx={{ mt: 1 }}>{t.guild.taskDetail.bidding.requiredRank}</Alert>
                            )}
                        </Box>
                    )}

                    {/* Bidders List for Admins & Creator */}
                    {(currentUserRank >= 100 || currentUserAddress === task.creator_id) && bids.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom color="primary">
                                {t.guild.taskDetail.bids} ({bids.length})
                            </Typography>
                            <Stack spacing={1}>
                                {bids.map((bid) => (
                                    <Paper
                                        key={bid.user_id}
                                        variant="outlined"
                                        sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle2">
                                                {bid.profiles?.username || `${bid.user_id.substring(0, 8)}...`}
                                            </Typography>
                                            <Typography variant="body2" color="primary.main" fontWeight="bold">
                                                {bid.bid_amount} $KNOT
                                            </Typography>
                                            {bid.comment && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                    {bid.comment}
                                                </Typography>
                                            )}
                                        </Box>
                                        {task.status === 'bidding' && currentUserRank >= 100 && (
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => handleAssign(bid.user_id)}
                                                disabled={isSubmitting}
                                            >
                                                {t.guild.taskDetail.assign}
                                            </Button>
                                        )}
                                    </Paper>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* Work Submission Section */}
                    {(task.status === 'assigned' || task.status === 'review' || task.status === 'done') && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" color="primary" gutterBottom>
                                {t.guild.taskDetail.submission.title}
                            </Typography>
                            {task.status === 'assigned' && currentUserAddress === task.assignee_id ? (
                                <Stack spacing={2} sx={{ mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {t.guild.taskDetail.submission.desc}
                                    </Typography>
                                    <TextField
                                        label={t.guild.taskDetail.submission.comment}
                                        value={reportComment}
                                        onChange={e => setReportComment(e.target.value)}
                                        multiline
                                        rows={4}
                                        fullWidth
                                        disabled={isSubmitting}
                                    />
                                    <TextField
                                        label={t.guild.taskDetail.submission.link}
                                        value={reportLink}
                                        onChange={e => setReportLink(e.target.value)}
                                        fullWidth
                                        disabled={isSubmitting}
                                    />
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleWorkSubmit}
                                        disabled={isSubmitting || !reportComment}
                                    >
                                        {t.guild.taskDetail.submission.submit}
                                    </Button>
                                </Stack>
                            ) : (
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'surface.variant' }}>
                                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {task.completion_report || "No work submitted yet."}
                                    </Typography>
                                    {task.completion_link && (
                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                            Link: <a href={task.completion_link} target="_blank" rel="noopener noreferrer" style={{ color: '#006493' }}>
                                                {task.completion_link}
                                            </a>
                                        </Typography>
                                    )}
                                </Paper>
                            )}
                        </Box>
                    )}

                    {/* 360 Review Section */}
                    {(task.status === 'review' || task.status === 'done') && (
                        <Box sx={{ mt: 4 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="h6" color="primary">
                                    {t.guild.taskDetail.review360.title}
                                </Typography>
                                {reviews.length > 0 && (
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Typography variant="caption" color="text.secondary">{t.guild.taskDetail.review360.average}:</Typography>
                                        <Rating value={reviews.reduce((acc: number, curr: TaskReview) => acc + curr.rating, 0) / reviews.length} readOnly size="small" precision={0.5} />
                                    </Stack>
                                )}
                            </Stack>

                            {task.status === 'review' && !hasReviewed && (currentUserRank >= 100 || (currentUserAddress !== task.assignee_id && currentUserRank >= 2)) && (
                                <Stack spacing={2} sx={{ mt: 2, p: 2, border: 1, borderColor: 'outline.variant', borderRadius: 2 }}>
                                    <Typography variant="body2" color="text.secondary">{t.guild.taskDetail.review360.desc}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant="subtitle2">{t.guild.taskDetail.review360.rating}</Typography>
                                        <Rating
                                            value={evalRating}
                                            onChange={(_, newValue) => setEvalRating(newValue || 5)}
                                            size="large"
                                        />
                                    </Box>
                                    <TextField
                                        label={t.guild.taskDetail.review360.comment}
                                        value={evalComment}
                                        onChange={e => setEvalComment(e.target.value)}
                                        multiline
                                        rows={2}
                                        fullWidth
                                        disabled={isSubmitting}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={handleReviewSubmit}
                                        disabled={isSubmitting || !evalComment}
                                    >
                                        {t.guild.taskDetail.review360.submit}
                                    </Button>
                                </Stack>
                            )}

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>{t.guild.taskDetail.review360.list} ({reviews.length})</Typography>
                                <Stack spacing={1}>
                                    {reviews.map((rev) => (
                                        <Paper key={rev.id} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.paper' }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="subtitle2">
                                                    {rev.profiles?.username || `${rev.reviewer_id.substring(0, 8)}...`}
                                                </Typography>
                                                <Rating value={rev.rating} readOnly size="small" />
                                            </Stack>
                                            {rev.comment && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    {rev.comment}
                                                </Typography>
                                            )}
                                        </Paper>
                                    ))}
                                    {reviews.length === 0 && (
                                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                            No reviews yet.
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                {currentUserRank >= 100 && task.status !== 'done' && (
                    <Button
                        onClick={handleForceTransition}
                        color="secondary"
                        variant="outlined"
                        disabled={isSubmitting}
                        sx={{ mr: 'auto' }}
                    >
                        {task.status === 'review' ? t.guild.taskDetail.approveTask : t.guild.taskDetail.forceTransition}
                    </Button>
                )}
                <Button onClick={onClose}>{t.guild.taskDetail.close}</Button>
            </DialogActions>
        </Dialog>
    );
}
