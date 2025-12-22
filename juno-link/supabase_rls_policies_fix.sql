-- ==========================================
-- RLS Policies Fix for Great Cruising Era
-- ==========================================
-- このSQLファイルを Supabase SQL Editor で実行してください
-- 既存のポリシーを完全に削除し、修正版を再作成します

-- ==========================================
-- 全ての既存ポリシーを一括削除
-- ==========================================

-- Notifications のポリシーを削除
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.notifications';
    END LOOP;
END $$;

-- Task Bids のポリシーを削除（新規ポリシーを除く）
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'task_bids' AND schemaname = 'public' 
              AND policyname != 'Rank 1+ users can bid') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.task_bids';
    END LOOP;
END $$;

-- Task Reviews のポリシーを削除
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'task_reviews' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.task_reviews';
    END LOOP;
END $$;

-- Avatar Generations のポリシーを削除（テーブルが存在する場合のみ）
DO $$ 
DECLARE 
    r RECORD;
    table_exists boolean;
BEGIN
    -- テーブルの存在を確認
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'avatar_generations'
    ) INTO table_exists;
    
    -- テーブルが存在する場合のみポリシーを削除
    IF table_exists THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'avatar_generations' AND schemaname = 'public'
                  AND policyname NOT IN ('Users can view their own generation stats')) LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.avatar_generations';
        END LOOP;
    END IF;
END $$;

-- ==========================================
-- 1. Notifications テーブルのポリシー作成
-- ==========================================

-- SELECT: 自分宛の通知 OR グローバル通知（user_id IS NULL）を閲覧可能
CREATE POLICY "Users can view own and global notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid()::text OR user_id IS NULL);

-- INSERT: システムと全ユーザーが通知を作成可能（MVP用）
CREATE POLICY "Users and system can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- UPDATE: 自分宛の通知のみ更新可能（既読状態など）
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- DELETE: 自分宛の通知 OR グローバル通知を削除可能
CREATE POLICY "Users can delete own and global notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid()::text OR user_id IS NULL);

-- ==========================================
-- 2. Task Bids テーブルのポリシー作成
-- ==========================================

-- SELECT: 自分の入札 OR 管理者（rank >= 100） OR タスク作成者が閲覧可能
CREATE POLICY "Users can view bids with restrictions"
    ON public.task_bids FOR SELECT
    USING (
        user_id = auth.uid()::text 
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = auth.uid()::text
            AND rank >= 100
        )
        OR EXISTS (
            SELECT 1 FROM public.tasks
            WHERE tasks.id = task_bids.task_id
            AND tasks.creator_id = auth.uid()::text
        )
    );

-- UPDATE: 自分の入札のみ更新可能
CREATE POLICY "Users can update own bids"
    ON public.task_bids FOR UPDATE
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

-- ==========================================
-- 3. Task Reviews テーブルの作成とポリシー設定
-- ==========================================

-- テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS public.task_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES public.tasks(id) NOT NULL,
    reviewer_id text REFERENCES public.profiles(wallet_address) NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(task_id, reviewer_id)
);

-- RLSを有効化
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;

-- SELECT: 全員が閲覧可能
CREATE POLICY "Reviews are viewable by everyone"
    ON public.task_reviews FOR SELECT
    USING (true);

-- INSERT: Rank 2+ のユーザーが投稿可能
CREATE POLICY "Rank 2+ users can submit reviews"
    ON public.task_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = auth.uid()::text
            AND rank >= 2
        )
    );

-- UPDATE: 自分のレビューのみ更新可能
CREATE POLICY "Users can update own reviews"
    ON public.task_reviews FOR UPDATE
    USING (reviewer_id = auth.uid()::text)
    WITH CHECK (reviewer_id = auth.uid()::text);

-- ==========================================
-- 4. Avatar Generations テーブルのポリシー追加（テーブルが存在する場合のみ）
-- ==========================================

DO $$ 
DECLARE 
    table_exists boolean;
BEGIN
    -- テーブルの存在を確認
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'avatar_generations'
    ) INTO table_exists;
    
    -- テーブルが存在する場合のみポリシーを作成
    IF table_exists THEN
        -- INSERT: 自分の生成リクエストを作成可能
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'avatar_generations' 
            AND policyname = 'Users can insert own generation requests'
        ) THEN
            EXECUTE 'CREATE POLICY "Users can insert own generation requests"
                ON public.avatar_generations FOR INSERT
                WITH CHECK (user_id = auth.uid()::text)';
        END IF;
        
        -- UPDATE: 自分の生成リクエストのみ更新可能
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'avatar_generations' 
            AND policyname = 'Users can update own generation requests'
        ) THEN
            EXECUTE 'CREATE POLICY "Users can update own generation requests"
                ON public.avatar_generations FOR UPDATE
                USING (user_id = auth.uid()::text)
                WITH CHECK (user_id = auth.uid()::text)';
        END IF;
    END IF;
END $$;

-- ==========================================
-- 5. Profiles テーブルのポリシー確認
-- ==========================================

-- プロファイルが正しく閲覧できるか確認
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Profiles are viewable by everyone"
            ON public.profiles FOR SELECT
            USING (true);
    END IF;
END $$;

-- ==========================================
-- 完了
-- ==========================================
-- すべてのポリシーが正常に更新されました！
-- アプリケーションをリロードして変更を確認してください。
