-- SQL Script to Normalize Wallet Addresses to Lowercase
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Normalize notifications
UPDATE notifications 
SET user_id = LOWER(user_id) 
WHERE user_id IS NOT NULL;

-- 2. Normalize tasks
UPDATE tasks 
SET creator_id = LOWER(creator_id) 
WHERE creator_id IS NOT NULL;

UPDATE tasks 
SET assignee_id = LOWER(assignee_id) 
WHERE assignee_id IS NOT NULL;

-- 3. Normalize task_votes
UPDATE task_votes 
SET user_id = LOWER(user_id);

-- 4. Normalize task_bids
UPDATE task_bids 
SET user_id = LOWER(user_id);

-- 5. Normalize task_reviews
UPDATE task_reviews 
SET reviewer_id = LOWER(reviewer_id);

-- 6. Normalize profiles (CAUTION: This may cause unique constraint violations if duplicates exist)
-- We use a temporary table to handle potential duplicates
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN (SELECT wallet_address FROM profiles WHERE wallet_address != LOWER(wallet_address)) LOOP
        -- If the lowercase version already exists, we have a duplicate
        IF EXISTS (SELECT 1 FROM profiles WHERE wallet_address = LOWER(rec.wallet_address)) THEN
            -- Merge strategy: Keep the lowercase one, delete the mixed-case one.
            -- (Note: You might want to merge balances/stats here if necessary)
            DELETE FROM profiles WHERE wallet_address = rec.wallet_address;
        ELSE
            -- No duplicate, just update to lowercase
            UPDATE profiles SET wallet_address = LOWER(wallet_address) WHERE wallet_address = rec.wallet_address;
        END IF;
    END LOOP;
END $$;
