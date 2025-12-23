# Juno Link (Great Cruising Era DAO)

> *The Official dApp for the Great Cruising Era DAO*
> *大航海時代DAO 公式dApp*

---

## 📖 About / 概要
**Juno Link** is the central hub for the Great Cruising Era community. It acts as the gateway for members ("crew") to join the DAO, manage their identity, and participate in governance.
**Juno Link**は、大航海時代DAO（Great Cruising Era DAO）の活動拠点です。メンバー（「クルー」）がDAOに参加し、アイデンティティを管理し、ガバナンスに参加するためのゲートウェイとして機能します。

### 🛠 Role & Features / 役割と機能
- **Identity (The Awakening)**: Generate your unique Web3 avatar based on your personality.
- **DAO Governance**: View, vote, and bid on community tasks.
- **Guild Management**: Track your rank, reputation ($NM), and contributions.

- **アイデンティティ（覚醒）**: 性格診断に基づき、あなただけのWeb3アバターを生成します。
- **DAOガバナンス**: コミュニティタスクの閲覧、投票、入札を行います。
- **ギルド管理**: ランク、評判（$NM）、貢献履歴を管理します。

---

## 🚀 User Guide / ユーザーガイド

### Getting Started / 始め方
1. **Connect Wallet**: 
   Click "Connect Wallet" on the landing page. We support social logins via Web3Auth.
   "Connect Wallet"をクリックしてログインします。Web3Auth経由でソーシャルログインも可能です。

2. **The Awakening (Genesis)**: 
   Complete the "Oracle's Questions" to reveal your **Archetype** and mint your **Avatar**.
   「オラクルの問い」に答え、あなたの**アーキタイプ**と**アバター**を目覚めさせます。

3. **Join the Crew**: 
   Access the Dashboard to view your Rank (Guest -> Admiral) and active missions.
   ダッシュボードにアクセスし、ランク（ゲスト〜提督）やアクティブなミッションを確認します。

4. **Contribute**: 
   Vote on proposed tasks or bid to solve them to earn rewards and increase your reputation.
   提案されたタスクへの投票や入札を行い、報酬を獲得して評判を高めましょう。

---

## 📚 Documentation / ドキュメント
For detailed specifications, architecture, and database schema, please refer to the **Specification Document**.
詳細な仕様、アーキテクチャ、データベーススキーマについては、**仕様書**をご覧ください。

👉 [**SPECIFICATION.md**](./SPECIFICATION.md)

---

## 💻 Developer Guide / 開発者ガイド

This project is a [Next.js](https://nextjs.org) application.

### Setup Instructions

#### 1. Environment Variables
Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Key requirements:
- `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`: From Web3Auth Dashboard.
- `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`: From Supabase Project Settings.
- `PRIVATE_KEY`: Your deployer wallet's private key (for Hardhat scripts).

#### 2. Database Setup (Supabase)
Run the following SQL scripts in the Supabase SQL Editor:
1. `supabase_schema_v2.sql`: Sets up tables, enums, and basic RLS.
2. `supabase_rls_policies_fix.sql`: Applies refined RLS policies for security.

#### 3. Local Development
Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Deployment

#### Vercel
1. Set the **Root Directory** to `juno-link`.
2. Add all environment variables from `.env` in the Vercel Dashboard.
3. **Important**: Add your Vercel deployment URL to the **Whitelist** in the Web3Auth Dashboard.

---
*Built for the Great Cruising Era DAO*
