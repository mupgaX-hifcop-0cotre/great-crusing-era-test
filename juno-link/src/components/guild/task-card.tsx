"use client";

import { Card, CardContent, Typography, Avatar, Stack, Chip } from "@mui/material";
import { Task } from "@/types";
import { motion } from "framer-motion";

interface TaskCardProps {
    task: Task;
    onClick: (task: Task) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
    return (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
                onClick={() => onClick(task)}
                sx={{
                    cursor: 'pointer',
                    mb: 2,
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2
                    }
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {task.title}
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
                        <Chip
                            size="small"
                            label={`SP: ${task.story_points ?? '-'}`}
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                        />

                        {task.assignee_id ? (
                            <Avatar
                                sx={{
                                    width: 24,
                                    height: 24,
                                    fontSize: '0.75rem',
                                    bgcolor: 'secondary.main'
                                }}
                            >
                                {task.assignee_id.substring(0, 2).toUpperCase()}
                            </Avatar>
                        ) : (
                            <Avatar
                                sx={{
                                    width: 24,
                                    height: 24,
                                    fontSize: '0.75rem',
                                    bgcolor: 'action.disabledBackground',
                                    color: 'text.disabled'
                                }}
                            >
                                ?
                            </Avatar>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </motion.div>
    );
}
