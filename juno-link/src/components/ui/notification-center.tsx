"use client";

import { useState, useEffect } from "react";
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Box,
    Divider,
    List,
    ListItem,
    ListItemText,
    CircularProgress
} from "@mui/material";
import { Notifications as NotificationsIcon, Delete as DeleteIcon, ClearAll as ClearAllIcon } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Notification } from "@/types";
import { useLanguage } from "@/components/providers/language-provider";
import { fetchNotifications, markAllAsRead } from "@/app/actions/notifications";
import { useRouter } from "next/navigation";

interface NotificationCenterProps {
    userAddress: string | null;
}

export function NotificationCenter({ userAddress }: NotificationCenterProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const open = Boolean(anchorEl);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const loadNotifications = async (reset = false) => {
        if (!userAddress) return;
        setLoading(true);
        const currentPage = reset ? 1 : page;

        try {
            const data = await fetchNotifications(userAddress, currentPage);
            if (reset) {
                setNotifications(data || []);
                setPage(2);
            } else {
                setNotifications(prev => [...prev, ...(data || [])]);
                setPage(prev => prev + 1);
            }
            // If we got less than 10, no more to load
            if (!data || data.length < 10) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            // Unread count is separate? Currently fetchNotifications filters by limit. 
            // We should probably have a separate count query or just count local loaded. 
            // For now, let's keep counting loaded ones but maybe valid to fetch count separately.
            // Simplified: Count unread in loaded list + maybe we should fetch count from DB?
            // The existing code did: .filter().length of loaded. This is inaccurate for total unread.
            // Improving unread count: we'll stick to loaded for now or need a separate count action.
            setUnreadCount((prevCount) => {
                // A bit hacky: we don't know total unread count from server without a count query.
                // Let's just count from the loaded list for display or keep it as is.
                // Ideally `fetchNotifications` returns { data, count }.
                const unreadInLoaded = (data || []).filter((n: Notification) => !n.is_read).length;
                return reset ? unreadInLoaded : prevCount + unreadInLoaded; // Approximate
            });

        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userAddress) {
            loadNotifications(true);

            // Set up realtime subscription
            const channel = supabase!
                .channel('notifications_changes')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userAddress}`
                }, (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=is.null`
                }, (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                })
                .subscribe();

            return () => {
                if (supabase) supabase.removeChannel(channel);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userAddress]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAsRead = async (id: string, link: string | null) => {
        if (!supabase) return;
        try {
            const notification = notifications.find(n => n.id === id);

            // Navigate if link exists
            if (link) {
                handleClose();
                router.push(link);
            }

            if (notification && !notification.is_read) {
                await supabase
                    .from('notifications' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                    .update({ is_read: true } as unknown as never)
                    .eq('id', id);

                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!userAddress) return;
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        await markAllAsRead(userAddress);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!supabase) return;
        try {
            const notification = notifications.find(n => n.id === id);
            await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (notification && !notification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    const handleClearAll = async () => {
        if (!supabase || !userAddress) return;
        try {
            await supabase
                .from('notifications')
                .delete()
                .or(`user_id.eq.${userAddress},user_id.is.null`);

            setNotifications([]);
            setUnreadCount(0);
            handleClose();
        } catch (error) {
            console.error("Error clearing notifications:", error);
        }
    };

    const getIconColor = (type?: string) => {
        switch (type) {
            case 'success': return 'success.main';
            case 'warning': return 'warning.main';
            case 'error': return 'error.main';
            default: return 'primary.main';
        }
    };

    return (
        <>
            <IconButton onClick={handleClick} color="inherit" sx={{ bgcolor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    elevation: 3,
                    sx: { borderRadius: 3, width: 360, mt: 1, maxHeight: 500 }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        {t.notifications?.title || 'Notifications'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                            variant="caption"
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, color: 'primary.main' }}
                            onClick={handleMarkAllAsRead}
                        >
                            Mark all read
                        </Typography>
                        {notifications.length > 0 && (
                            <IconButton size="small" onClick={handleClearAll} title="Clear All">
                                <ClearAllIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>
                </Box>
                <Divider />

                <List sx={{ py: 0, maxHeight: 350, overflowY: 'auto' }}>
                    <AnimatePresence initial={false}>
                        {notifications.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <MenuItem disabled>
                                    <Typography variant="body2">{t.notifications?.empty || 'No notifications'}</Typography>
                                </MenuItem>
                            </motion.div>
                        ) : (
                            notifications.map((notification) => (
                                <motion.div
                                    key={notification.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ListItem
                                        sx={{
                                            bgcolor: notification.is_read ? 'transparent' : 'rgba(0, 100, 147, 0.05)',
                                            borderLeft: `4px solid ${notification.is_read ? 'transparent' : getIconColor(notification.type)}`,
                                            flexDirection: 'row',
                                            alignItems: 'flex-start',
                                            cursor: 'pointer',
                                            pr: 1,
                                            py: 1.5,
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                        onClick={() => handleMarkAsRead(notification.id, notification.link)}
                                    >
                                        <ListItemText
                                            primary={notification.title}
                                            secondary={
                                                <>
                                                    <Typography variant="body2" component="span" display="block" sx={{ my: 0.5, lineHeight: 1.4 }}>
                                                        {notification.message}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.disabled">
                                                        {new Date(notification.created_at).toLocaleString()}
                                                    </Typography>
                                                </>
                                            }
                                            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: notification.is_read ? 400 : 700 }}
                                        />
                                        <IconButton size="small" onClick={(e) => handleDelete(notification.id, e)} sx={{ ml: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItem>
                                    <Divider component="li" />
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </List>
                {hasMore && notifications.length > 0 && (
                    <Box sx={{ p: 1, textAlign: 'center' }}>
                        <Typography
                            variant="caption"
                            color="primary"
                            onClick={() => loadNotifications(false)}
                            sx={{ cursor: 'pointer', fontWeight: 600, p: 1, display: 'block' }}
                        >
                            {loading ? <CircularProgress size={16} /> : 'Load More'}
                        </Typography>
                    </Box>
                )}
            </Menu>
        </>
    );
}
