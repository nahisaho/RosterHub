# RosterHub CSV Manager - Web UI

OneRoster CSVのインポート/エクスポート操作を管理するWebベースのユーザーインターフェース。

## 機能

- **CSVインポート**: すべてのOneRosterエンティティタイプに対応したドラッグ&ドロップによるCSVファイルアップロード
- **ジョブ監視**: 自動更新と詳細なステータス表示によるインポートジョブのリアルタイム追跡
- **CSVエクスポート**: デルタ/増分エクスポートを含む複数のフィルタリングモードでのデータエクスポート
- **OneRoster Japan Profile 1.2.2**: 日本固有のメタデータ拡張に完全対応

## 技術スタック

- **React 18.2.0** - UIフレームワーク
- **TypeScript 5.3.3** - 型安全性
- **Vite 5.0.8** - ビルドツールと開発サーバー
- **React Router 6.21.0** - クライアントサイドルーティング
- **Axios 1.6.2** - HTTPクライアント
- **Zustand 4.4.7** - ステート管理

## 前提条件

- Node.js 18.x以上
- npm 9.x以上
- RosterHub APIサーバーが`http://localhost:3000`で稼働していること

## クイックスタート

### 1. 依存関係のインストール

```bash
cd apps/web
npm install
```

### 2. 環境設定

テンプレートから`.env`ファイルを作成:

```bash
cp .env.example .env
```

`.env`を編集してAPIキーを設定:

```
VITE_API_URL=/ims/oneroster/v1p2
VITE_API_KEY=your-actual-api-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは`http://localhost:3002`で利用可能になります。

### 4. 本番用ビルド

```bash
npm run build
```

本番ファイルは`dist/`ディレクトリに出力されます。

### 5. 本番ビルドのプレビュー

```bash
npm run preview
```

## 利用可能なスクリプト

| スクリプト | 説明 |
|--------|-------------|
| `npm run dev` | ポート3002で開発サーバーを起動 |
| `npm run build` | 本番用にビルド |
| `npm run preview` | 本番ビルドをプレビュー |
| `npm run lint` | ESLintを実行 |
| `npm run format` | Prettierでコードをフォーマット |

## アプリケーション構造

```
apps/web/
├── public/              # 静的アセット
├── src/
│   ├── components/      # Reactコンポーネント
│   │   ├── CsvUpload.tsx    # CSVインポートインターフェース
│   │   ├── JobMonitor.tsx   # ジョブ監視ダッシュボード
│   │   └── CsvExport.tsx    # CSVエクスポートインターフェース
│   ├── services/        # APIサービス
│   │   └── api.ts           # AxiosベースのAPIクライアント
│   ├── stores/          # ステート管理
│   │   └── useJobStore.ts   # ジョブステート (Zustand)
│   ├── types/           # TypeScript型定義
│   │   └── oneroster.ts     # OneRosterエンティティ型
│   ├── styles/          # CSSスタイル
│   │   └── app.css          # アプリケーションスタイル
│   ├── App.tsx          # メインアプリコンポーネント
│   └── main.tsx         # エントリーポイント
├── index.html           # HTMLテンプレート
├── vite.config.ts       # Vite設定
├── tsconfig.json        # TypeScript設定
└── package.json         # 依存関係
```

## 使い方ガイド

### CSVインポート

1. **Import**タブに移動
2. ドロップダウンからエンティティタイプを選択:
   - Users (ユーザー)
   - Organizations (組織)
   - Classes (クラス)
   - Courses (コース)
   - Enrollments (在籍)
   - Demographics (人口統計)
   - Academic Sessions (学期)
3. CSVファイルをドラッグ&ドロップするか、**Browse**をクリックしてファイルを選択
4. **Upload CSV**ボタンをクリック
5. **Job Monitor**タブで進捗を確認

**CSVフォーマット要件:**
- ファイルは`.csv`拡張子である必要があります
- 1行目は列ヘッダーである必要があります
- 必須フィールドはエンティティタイプによって異なります(OneRoster仕様を参照)

### ジョブ監視

1. **Job Monitor**タブに移動
2. インポートジョブのリストを表示:
   - エンティティタイプ
   - ステータス (待機中/処理中/完了/失敗)
   - 進捗率
   - ファイル名とサイズ
   - アップロード日時
3. **Auto-refresh**を有効にしてリアルタイム更新(5秒間隔)
4. ジョブをクリックして詳細情報を表示
5. 失敗したジョブの場合、エラーメッセージと影響を受けた行を表示

**ジョブステータス:**
- **待機中 (Pending)**: ジョブがキューに入り、開始を待機中
- **処理中 (Processing)**: ジョブが現在レコードを処理中
- **完了 (Completed)**: ジョブが正常に終了
- **失敗 (Failed)**: ジョブでエラーが発生

### CSVエクスポート

1. **Export**タブに移動
2. ドロップダウンからエンティティタイプを選択
3. フィルターモードを選択:
   - **No filter**: すべてのレコードをエクスポート
   - **Predefined filter**: 一般的なフィルター(アクティブのみ、ロール別、タイプ別)を使用
   - **Custom filter**: OneRosterフィルター構文を入力
   - **Delta export**: 特定の日付以降に変更されたレコードのみをエクスポート
4. **Export CSV**ボタンをクリック
5. タイムスタンプ付きのファイル名で自動ダウンロード

**フィルター例:**
- アクティブなユーザーのみ: `status='active'`
- 教師のみ: `role='teacher'`
- 日付以降の変更: デルタエクスポートモードを使用

## API統合

Web UIは以下のエンドポイントを介してRosterHub APIサーバーと通信します:

| エンドポイント | メソッド | 目的 |
|----------|--------|---------|
| `/ims/oneroster/v1p2/csv/import` | POST | CSVファイルをアップロード |
| `/ims/oneroster/v1p2/csv/jobs` | GET | インポートジョブをリスト |
| `/ims/oneroster/v1p2/csv/jobs/:jobId` | GET | ジョブステータスを取得 |
| `/ims/oneroster/v1p2/csv/export/:entityType` | GET | CSVをエクスポート |
| `/health` | GET | ヘルスチェック |
| `/health/ready` | GET | 準備状態チェック |

**認証:**
すべてのAPIリクエストは`Authorization`ヘッダーを介したBearerトークン認証を含みます。

## 開発プロキシ

開発中、ViteはCORS問題を回避するためにAPIリクエストをプロキシします:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/ims/oneroster': { target: 'http://localhost:3000' },
    '/metrics': { target: 'http://localhost:3000' },
    '/health': { target: 'http://localhost:3000' },
  }
}
```

## ステート管理

アプリケーションは軽量なステート管理にZustandを使用します:

```typescript
// ジョブストア
interface JobStore {
  jobs: CsvImportJob[];
  selectedJob: CsvImportJob | null;
  isLoading: boolean;
  error: string | null;

  setJobs: (jobs: CsvImportJob[]) => void;
  addJob: (job: CsvImportJob) => void;
  updateJob: (jobId: string, updates: Partial<CsvImportJob>) => void;
  selectJob: (job: CsvImportJob | null) => void;
}
```

## TypeScript型定義

すべてのOneRosterエンティティは完全に型付けされています:

```typescript
// ベースエンティティ
interface BaseEntity {
  sourcedId: string;
  status: 'active' | 'tobedeleted';
  dateLastModified: string;
  metadata?: { jp?: Record<string, any> };
}

// ユーザーエンティティ
interface User extends BaseEntity {
  enabledUser: 'true' | 'false';
  username: string;
  givenName: string;
  familyName: string;
  role: 'student' | 'teacher' | 'administrator';
  // ... 追加フィールド
}
```

## トラブルシューティング

### API接続の問題

**問題**: APIサーバーに接続できない
**解決策**:
- APIサーバーが`http://localhost:3000`で稼働していることを確認
- `.env`ファイルに正しい`VITE_API_URL`が設定されているか確認
- `.env`のAPIキーが正しいか確認

### 認証エラー

**問題**: 401 Unauthorizedレスポンス
**解決策**:
- `.env`の`VITE_API_KEY`がサーバーのAPIキーと一致するか確認
- APIキーが期限切れでないか確認

### ビルドエラー

**問題**: TypeScriptコンパイルエラー
**解決策**:
- `npm install`を実行してすべての依存関係がインストールされているか確認
- Node.jsバージョンが18.x以上か確認
- `node_modules`を削除して`npm install`を再実行

### 自動更新が機能しない

**問題**: ジョブステータスが自動的に更新されない
**解決策**:
- Job Monitorで**Auto-refresh**トグルが有効になっているか確認
- ブラウザコンソールでエラーを確認
- ネットワークタブで失敗したAPIリクエストを確認

## ブラウザサポート

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## パフォーマンスに関する考慮事項

- **自動更新**: ステータスが'pending'または'processing'のジョブのみをポーリング
- **ファイルサイズ**: 大きなCSVアップロード(>10MB)は処理に時間がかかる場合があります
- **ジョブリスト**: 最新の100ジョブまで表示

## セキュリティ

- **APIキー**: 環境変数に保存、gitにコミットしない
- **HTTPS**: 本番環境ではAPI通信にHTTPSを使用
- **CORS**: Web UIのオリジンを許可するようにAPIサーバーで設定
- **入力検証**: ファイルタイプとエンティティタイプのクライアントサイド検証

## ライセンス

Copyright (c) 2025 RosterHub. All rights reserved.
