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

interface NotificationCenterProps {
    userAddress: string | null;
}

export function NotificationCenter({ userAddress }: NotificationCenterProps) {
    const { t } = useLanguage();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const open = Boolean(anchorEl);

    const fetchNotifications = async () => {
        if (!supabase || !userAddress) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                // Show global notifications (user_id is null) OR user-specific ones
                .or(`user_id.eq.${userAddress},user_id.is.null`)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setNotifications(data || []);
            setUnreadCount((data as Notification[] || []).filter((n: Notification) => !n.is_read).length);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userAddress) {
            fetchNotifications();

            // Set up realtime subscription
            const channel = supabase!
                .channel('notifications_changes')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userAddress}`
                }, (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10));
                    setUnreadCount(prev => prev + 1);
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=is.null`
                }, (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10));
                    setUnreadCount(prev => prev + 1);
                })
                .subscribe();

            return () => {
                supabase!.removeChannel(channel);
            };
        }
    }, [userAddress, fetchNotifications]);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAsRead = async (id: string) => {
        if (!supabase) return;
        try {
            const notification = notifications.find(n => n.id === id);
            if (notification && !notification.is_read) {
                await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', id);

                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
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
                    sx: { borderRadius: 3, width: 320, mt: 1, maxHeight: 400 }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        {t.notifications.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {notifications.length > 0 && (
                            <IconButton size="small" onClick={handleClearAll} title="Clear All">
                                <ClearAllIcon fontSize="small" />
                            </IconButton>
                        )}
                        {loading && <CircularProgress size={16} />}
                    </Box>
                </Box>
                <Divider />

                <List sx={{ py: 0 }}>
                    <AnimatePresence initial={false}>
                        {notifications.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <MenuItem disabled>
                                    <Typography variant="body2">{t.notifications.empty}</Typography>
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
                                            borderLeft: notification.is_read ? 'none' : '4px solid #006493',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            pr: 1
                                        }}
                                        onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                        <ListItemText
                                            primary={notification.title}
                                            secondary={
                                                <>
                                                    <Typography variant="body2" component="span" display="block">
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
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </List>
            </Menu>
        </>
    );
}
