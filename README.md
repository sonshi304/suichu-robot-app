# 水中ロボット部 活動管理システム

予約・入退室チェック・ダッシュボードを1つのWebアプリで管理するシステムです。
LINE公式アカウントと連携して、生徒のスマホから予約、iPadで入退室チェック、PCでダッシュボード確認ができます。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + React 18
- **データベース**: Firebase Firestore
- **LINE連携**: LIFF SDK
- **ホスティング**: Vercel

## セットアップ手順

### 1. Firebase プロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `suichu-robot`）
4. 「Firestore Database」を有効化（テストモードで開始）
5. 「プロジェクトの設定」→「全般」からFirebase設定値をコピー

### 2. 環境変数を設定

`.env.local.example` をコピーして `.env.local` を作成し、Firebase設定値とLIFF IDを入力：

```bash
cp .env.local.example .env.local
```

### 3. ローカルで起動

```bash
npm install
npm run dev
```

http://localhost:3000 で動作確認できます。

### 4. Vercelにデプロイ

1. GitHubにリポジトリを作成してコードをpush
2. [Vercel](https://vercel.com) でGitHubログイン
3. リポジトリをインポート
4. 環境変数（`.env.local`の内容）をVercelの設定画面で入力
5. デプロイ

### 5. LINE設定

詳しくは「LINE設定手順書」を参照してください。

## ファイル構成

```
suichu-robot-app/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # 役割選択画面（トップページ）
│   ├── globals.css         # 全体スタイル
│   ├── student/
│   │   └── page.tsx        # 生徒用ページ（予約・マイページ）
│   ├── teacher/
│   │   └── page.tsx        # 先生用ページ（管理・ダッシュボード）
│   └── ipad/
│       └── page.tsx        # iPad用ページ（入退室チェック）
├── components/
│   ├── AppShell.tsx         # 共通ヘッダー＆ナビゲーション
│   └── Calendar.tsx         # カレンダーコンポーネント
├── lib/
│   ├── firebase.ts          # Firebase接続＆データ操作
│   └── liff.ts              # LIFF初期化
├── .env.local.example       # 環境変数テンプレート
├── package.json
├── tsconfig.json
└── next.config.js
```

## Firestore セキュリティルール（本番用）

テストモードから本番に移行する際は、以下のルールを設定してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 全コレクション読み取り可能
    match /{document=**} {
      allow read: if true;
    }
    // 書き込みは認証済みユーザーのみ
    match /reservations/{date} {
      allow write: if true; // 予約は誰でも可能
    }
    match /checkins/{date} {
      allow write: if true; // チェックインは誰でも可能
    }
    match /activities/{date} {
      allow write: if true; // TODO: 先生のみに制限
    }
    match /members/{id} {
      allow write: if true; // TODO: 先生のみに制限
    }
    match /announcements/{id} {
      allow write: if true; // TODO: 先生のみに制限
    }
  }
}
```
