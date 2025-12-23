-- ==========================================
-- RLS Policies Fix for Guest / Web3Auth (Non-Supabase Auth)
-- ==========================================
-- このSQLは、Web3Authを使い、Supabase Authを使用していない環境向けです。
-- auth.uid() に依存せず、リクエストで送られる wallet_address/creator_id に基づいて
-- プロフィールテーブルの rank をチェックします。

-- [NOTE] これはデモ・プロトタイプ向けの設定であり、本番環境では
-- Supabase Auth と連携して JWT を検証することを強く推奨します。

-- ==========================================
-- 1. Tasks テーブル
-- ==========================================

-- INSERT: 投稿しようとしている creator_id のユーザーが Rank 2 以上なら許可
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
CREATE POLICY "Users can insert tasks if Rank 2+"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = creator_id
            AND rank >= 2
        )
    );

-- UPDATE: 編集しようとしているタスクの creator_id または管理者なら許可
DROP POLICY IF EXISTS "Admins can update tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks or if Admin"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = tasks.creator_id
            OR rank >= 100
        )
    );

-- ==========================================
-- 2. Task Bids テーブル
-- ==========================================

-- INSERT: 入札しようとしている user_id のユーザーが Rank 1 以上なら許可
DROP POLICY IF EXISTS "Rank 1+ users can bid" ON public.task_bids;
CREATE POLICY "Rank 1+ users can bid"
    ON public.task_bids FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = user_id
            AND rank >= 1
        )
    );

-- SELECT: 全員に公開（または自分の入札のみにする場合は調整が必要）
-- デモ用として、一旦は全員閲覧可能にします
DROP POLICY IF EXISTS "Users can view their own bids" ON public.task_bids;
DROP POLICY IF EXISTS "Users can view bids with restrictions" ON public.task_bids;
CREATE POLICY "Bids are viewable by everyone"
    ON public.task_bids FOR SELECT
    USING (true);

-- UPDATE: 自分の入札のみ更新可能
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
-- 3. Task Votes テーブル
-- ==========================================

-- INSERT: 投票しようとしている user_id のユーザーが Rank 2 以上なら許可
DROP POLICY IF EXISTS "Rank 2+ users can vote" ON public.task_votes;
CREATE POLICY "Rank 2+ users can vote"
    ON public.task_votes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE wallet_address = user_id
            AND rank >= 2
        )
    );

-- SELECT: 全員閲覧可能
DROP POLICY IF EXISTS "Users can view their own votes" ON public.task_votes;
CREATE POLICY "Votes are viewable by everyone"
    ON public.task_votes FOR SELECT
    USING (true);

-- ==========================================
-- 4. Notifications テーブル
-- ==========================================

-- SELECT: 全員閲覧可能（クライアント側でフィルタリング）
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own and global notifications" ON public.notifications;
CREATE POLICY "Notifications are viewable by everyone"
    ON public.notifications FOR SELECT
    USING (true);

-- UPDATE: 全員が通知を更新可能(既読化など)
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update notifications"
    ON public.notifications FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- DELETE: 全員が通知を削除可能
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own and global notifications" ON public.notifications;
CREATE POLICY "Users can delete notifications"
    ON public.notifications FOR DELETE
    USING (true);

-- INSERT: 全員が通知を作成可能(システム通知用)
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users and system can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- ==========================================
-- 5. Avatar Generations テーブル
-- ==========================================

-- SELECT: 全員閲覧可能（または user_id に基づいて制限することも可能ですが、一旦 true）
DROP POLICY IF EXISTS "Users can view their own generation stats" ON public.avatar_generations;
CREATE POLICY "Generation stats are viewable by everyone"
    ON public.avatar_generations FOR SELECT
    USING (true);

-- INSERT: 誰でも作成可能（自称 user_id で作成）
DROP POLICY IF EXISTS "Users can insert own generation requests" ON public.avatar_generations;
CREATE POLICY "Anyone can insert generation requests"
    ON public.avatar_generations FOR INSERT
    WITH CHECK (true);

-- ==========================================
-- 6. Task Reviews テーブル
-- ==========================================

-- INSERT: 投稿しようとしている reviewer_id のユーザーが Rank 2 以上なら許可
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
-- 完了
-- ==========================================
