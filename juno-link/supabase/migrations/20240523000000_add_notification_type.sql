-- Add type column to notifications table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE notifications ADD COLUMN type text NOT NULL DEFAULT 'info';
        -- Add constraint to ensure valid types
        ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error'));
    END IF;
END $$;
