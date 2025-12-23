-- ==========================================
-- Migration Script: Rename knot_balance to nm_balance
-- ==========================================
-- データベース上のカラム名が `knot_balance` のままになっている場合に
-- `nm_balance` に変更するスクリプトです。

DO $$ 
BEGIN
    -- 1. Check if 'knot_balance' exists in 'profiles'
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'knot_balance'
    ) THEN
        -- Rename checking if 'nm_balance' doesn't exist to avoid collision
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'nm_balance'
        ) THEN
            ALTER TABLE public.profiles RENAME COLUMN knot_balance TO nm_balance;
        ELSE
            -- Both exist? Merge or Drop knot_balance? 
            -- Assuming we want to keep data from knot_balance if it was the active one:
            -- UPDATE public.profiles SET nm_balance = knot_balance;
            -- ALTER TABLE public.profiles DROP COLUMN knot_balance;
            -- For safety, let's just raise a notice if both exist
            RAISE NOTICE 'Both nm_balance and knot_balance exist. Please handle manually if data migration is needed.';
        END IF;
    END IF;

    -- 2. Ensure nm_balance exists (Simple safety check)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'nm_balance'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN nm_balance integer default 0;
    END IF;
END $$;
