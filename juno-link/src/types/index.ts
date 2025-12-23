export type TaskStatus = 'voting' | 'bidding' | 'assigned' | 'review' | 'done' | 'archived';

export interface Profile {
    wallet_address: string;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    rank: number;
    updated_at: string;
    skills: string[] | null;
    nm_balance: number;
    email?: string | null;
    archetype?: string | null;
    avatar_metadata?: Record<string, unknown>;
}

export interface Task {
    id: string; // UUID
    title: string;
    description: string | null;
    status: TaskStatus;
    tags: string[] | null;
    voting_ends_at: string | null;
    bidding_ends_at: string | null;
    bidding_duration: number | null; // minutes
    story_points: number | null;
    final_reward: number | null;
    assignee_id: string | null; // FK to profiles.wallet_address
    creator_id: string | null; // FK to profiles.wallet_address
    completion_report: string | null;
    completion_link: string | null;
    created_at: string;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string | null;
    title: string;
    message: string | null;
    is_read: boolean;
    link: string | null;
    type: 'info' | 'success' | 'warning' | 'error';
    created_at: string;
}

export interface TaskVote {
    task_id: string; // FK to tasks.id
    user_id: string; // FK to profiles.wallet_address
    points: number;
    created_at: string;
}

export interface TaskBid {
    task_id: string; // FK to tasks.id
    user_id: string; // FK to profiles.wallet_address
    bid_amount: number;
    comment: string | null;
    created_at: string;
    profiles?: {
        username: string | null;
    };
}

export interface TaskReview {
    id: string;
    task_id: string;
    reviewer_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    profiles?: {
        username: string | null;
    };
}

export interface TaskFavorite {
    task_id: string; // FK to tasks.id
    user_id: string; // FK to profiles.wallet_address
    created_at: string;
}

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Profile;
                Update: Partial<Profile>;
            };
            tasks: {
                Row: Task;
                Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;
            };
            task_votes: {
                Row: TaskVote;
                Insert: Omit<TaskVote, 'created_at'>;
                Update: Partial<Omit<TaskVote, 'created_at'>>;
            };
            task_bids: {
                Row: TaskBid;
                Insert: Omit<TaskBid, 'created_at'>;
                Update: Partial<Omit<TaskBid, 'created_at'>>;
            };
            notifications: {
                Row: Notification;
                Insert: Omit<Notification, 'id' | 'created_at' | 'type'> & { type?: 'info' | 'success' | 'warning' | 'error' };
                Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
            };
            task_reviews: {
                Row: TaskReview;
                Insert: Omit<TaskReview, 'id' | 'created_at' | 'profiles'>;
                Update: Partial<Omit<TaskReview, 'id' | 'created_at' | 'profiles'>>;
            };
            task_favorites: {
                Row: TaskFavorite;
                Insert: Omit<TaskFavorite, 'created_at'>;
                Update: Partial<Omit<TaskFavorite, 'created_at'>>;
            };
        };
    };
}
