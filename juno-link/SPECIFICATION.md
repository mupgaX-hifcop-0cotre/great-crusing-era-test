# Project Specification: Juno Link (Great Cruising Era DAO)

> [!NOTE]
> This document serves as the primary specification for the Juno Link project. It is written in both Japanese and English to support open-source contributors and general users.
> 本ドキュメントはJuno Linkプロジェクトの主要な仕様書です。オープンソースの貢献者や一般ユーザーのために、日本語と英語の両方で記述されています。

---

## 1. Project Overview / プロジェクト概要

### English
**Juno Link** is a decentralized application (dApp) designed for the **Great Cruising Era DAO**. It serves as a comprehensive platform for DAO members ("crew") to manage their identities, participate in governance, and contribute to the community. The platform gamifies the DAO experience using a nautical theme ("Great Cruising Era"), where members are crewmates on a grand voyage.

Key objectives:
- **Identity Management**: Unique "Avatar" generation based on personality tests (The Awakening).
- **Task Management**: A decentralized task board with voting, bidding, and review systems.
- **Reputation**: A ranking system (Guest -> Admiral) based on contribution.

### 日本語
**Juno Link**は、**大航海時代DAO（Great Cruising Era DAO）**のための分散型アプリケーション（dApp）です。DAOメンバー（「クルー」）が自身のアイデンティティを管理し、ガバナンスに参加し、コミュニティに貢献するための包括的なプラットフォームとして機能します。このプラットフォームは、「大航海時代」という航海のテーマを用いてDAO体験をゲーム化しています。

主な目的:
- **アイデンティティ管理**: 性格診断に基づく独自の「アバター」生成（覚醒/Awakening）。
- **タスク管理**: 投票、入札、レビューシステムを備えた分散型タスクボード。
- **評判システム**: 貢献度に基づくランクシステム（ゲスト -> 提督）。

---

## 2. Core Features / 機能一覧

### English
#### 1. The Awakening (Genesis)
- **Concept**: The onboarding process where users generate their unique Web3 identity.
- **Flow**: Connect Wallet -> Personality Test (Oracle's Questions) -> Generate Avatar (AI-driven) -> Mint Profile.
- **Outcome**: Users receive an archetype (e.g., Vanguard, Wisdom) and an animal avatar.

#### 2. Dashboard
- **Profile View**: Display wallet address, rank, avatar, and $NM balance.
- **Wallet Integration**: Masked wallet display with copy functionality.
- **Navigation**: Access to DAO tools and personal stats.

#### 3. Task Board (DAO Governance)
- **Voting Phase**: Community votes on proposed tasks (Rank 2+ required).
- **Bidding Phase**: Members bid to take on approved tasks (Rank 1+ required).
- **Execution & Review**: Task assignment, completion reporting, and 360-degree evaluations.
- **Status Workflow**: `Voting` -> `Bidding` -> `Assigned` -> `Review` -> `Done`.

#### 4. Notification Center
- Real-time updates on task assignments, bid results, and system announcements.

### 日本語
#### 1. 覚醒 (The Awakening / Genesis)
- **コンセプト**: ユーザーがWeb3アイデンティティを生成するオンボーディングプロセス。
- **フロー**: ウォレット接続 -> 性格診断（オラクルの問い） -> アバター生成（AI活用） -> プロフィール作成。
- **結果**: ユーザーはアーキタイプ（例：先駆者、賢者）と動物のアバターを獲得します。

#### 2. ダッシュボード
- **プロフィール表示**: ウォレットアドレス、ランク、アバター、$NM残高の表示。
- **ウォレット統合**: マスクされたアドレス表示とコピー機能。
- **ナビゲーション**: DAOツールや個人ステータスへのアクセス。

#### 3. タスクボード (DAOガバナンス)
- **投票フェーズ**: 提案されたタスクへのコミュニティ投票（ランク2以上必須）。
- **入札フェーズ**: 承認されたタスクへの入札（ランク1以上必須）。
- **実行とレビュー**: タスクの割り当て、完了報告、360度評価。
- **ステータスフロー**: `投票中` -> `入札中` -> `割当済` -> `レビュー` -> `完了`。

#### 4. 通知センター
- タスクの割り当て、入札結果、システムのお知らせに関するリアルタイム更新。

---

## 3. Technology Stack / 技術スタック

| Category | Technology | Usage |
|----------|------------|-------|
| **Frontend** | Next.js (App Router) | Core framework, React-based UI. |
| **Styling** | Tailwind CSS / Emotion | Styling and design system implementation. |
| **Auth** | Web3Auth | Wallet-based authentication and social login. |
| **Database** | Supabase (PostgreSQL) | User data, tasks, notifications. Secured with RLS. |
| **Blockchain** | Hardhat / Viem / Web3.js | Smart contract interaction and development variables. |
| **Language** | TypeScript | Type safety across the entire codebase. |

---

## 4. Database Schema / データベーススキーマ

### English
- **`profiles`**: Stores user identity.
    - `wallet_address` (PK), `rank` (0-3), `archetype`, `avatar_url`.
- **`tasks`**: Work items available in the DAO.
    - `id` (PK), `status` (enum), `voting_ends_at`, `bidding_ends_at`.
- **`task_votes`**: Community votes on tasks.
    - RLS: Only Rank 2+ can insert.
- **`task_bids`**: Bids from users to perform tasks.
    - RLS: Only Rank 1+ can insert.
- **`avatar_generations`**: Logs the Awakening process.
    - Stores diagnosis answers and generated image URLs.

### 日本語
- **`profiles`**: ユーザーアイデンティティを保存。
    - `wallet_address` (主キー), `rank` (0-3), `archetype`, `avatar_url`。
- **`tasks`**: DAO内で利用可能な作業項目。
    - `id` (主キー), `status` (列挙型), `voting_ends_at`, `bidding_ends_at`。
- **`task_votes`**: タスクに対するコミュニティの投票。
    - RLS: ランク2以上のみ挿入可能。
- **`task_bids`**: タスク実行のためのユーザーからの入札。
    - RLS: ランク1以上のみ挿入可能。
- **`avatar_generations`**: 覚醒プロセスのログ。
    - 診断の回答と生成された画像URLを保存。

---

## 5. Getting Started / セットアップガイド

### Prerequisites / 前提条件
- Node.js (v18+)
- Supabase Project
- Web3Auth Client ID

### Setup / セットアップ

#### 1. Clone & Install
```bash
git clone <repository_url>
cd juno-link
yarn install
```

#### 2. Environment Variables (.env)
```bash
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

#### 3. Database Setup
Run the SQL migrations in Supabase SQL Editor:
1. `supabase_schema_v2.sql` (Schema & Core RLS)
2. `supabase_rls_policies_fix.sql` (Security Hardening)

#### 4. Run Development Server
```bash
yarn dev
```

Visit `http://localhost:3000` to start your journey.

---

> [!TIP]
> **Contribution**: Create a Pull Request for any feature enhancements. Ensure strictly typed code and follow the ESLint rules.
> **貢献について**: 機能拡張の際はPull Requestを作成してください。厳密な型定義とESLintルールの遵守をお願いします。
