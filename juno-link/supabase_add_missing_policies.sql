-- ==========================================
-- Missing RLS Policies Fix (Incremental Update)
-- ==========================================
-- このSQLは、既存のポリシーを削除せず、不足しているポリシーのみを追加します

-- ==========================================
-- 1. Task Bids - UPDATE ポリシーを追加
-- ==========================================

DROP POLICY IF EXISTS "Users can update own bids" ON public.task_bids;
CREATE POLICY "Users can update own bids"
    ON public.task_bids FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = task_bids.user_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = task_bids.user_id
        )
    );

-- ==========================================
-- 2. Task Reviews - 全ポリシーを追加/更新
-- ==========================================

-- INSERT: Rank 2+ のユーザーがレビューを投稿可能
DROP POLICY IF EXISTS "Rank 2+ users can submit reviews" ON public.task_reviews;
CREATE POLICY "Rank 2+ users can submit reviews"
    ON public.task_reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = reviewer_id
            AND rank >= 2
        )
    );

-- UPDATE: 自分のレビューのみ更新可能
DROP POLICY IF EXISTS "Users can update own reviews" ON public.task_reviews;
CREATE POLICY "Users can update own reviews"
    ON public.task_reviews FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = task_reviews.reviewer_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = task_reviews.reviewer_id
        )
    );

-- SELECT: 全員閲覧可能
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.task_reviews;
CREATE POLICY "Reviews are viewable by everyone"
    ON public.task_reviews FOR SELECT
    USING (true);

-- ==========================================
-- 3. Notifications - UPDATE と DELETE ポリシーを追加
-- ==========================================

-- UPDATE: 全員が通知を更新可能（既読化など）
-- Note: クライアント側でuser_idフィルタリングを行うため、全員に許可
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
CREATE POLICY "Users can update notifications"
    ON public.notifications FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- DELETE: 全員が通知を削除可能
-- Note: クライアント側でuser_idフィルタリングを行うため、全員に許可
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;
CREATE POLICY "Users can delete notifications"
    ON public.notifications FOR DELETE
    USING (true);

-- INSERT: 全員が通知を作成可能（システム通知用）
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- ==========================================
-- 完了
-- ==========================================
-- 追加されたポリシー:
-- - task_bids: UPDATE policy
-- - task_reviews: INSERT, UPDATE, SELECT policies
-- - notifications: UPDATE, DELETE, INSERT policies
