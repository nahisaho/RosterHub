# Technology Stack

**Project**: RosterHub
**Last Updated**: 2025-12-17
**Status**: 実装中 (20% 完了)

---

## Overview

RosterHubは、教育委員会レベルでの大規模展開（10,000〜200,000ユーザー）を想定した、OneRoster Japan Profile 1.2.2準拠の教育データ連携ハブです。

## Core Technology Stack

### バックエンド (API)

| カテゴリ | 技術 | バージョン | 目的 |
|---------|------|-----------|------|
| **ランタイム** | Node.js | 20.x | サーバー実行環境 |
| **言語** | TypeScript | 5.7 | 型安全な開発 |
| **フレームワーク** | NestJS | 11.x | エンタープライズ向けバックエンドフレームワーク |
| **ORM** | Prisma | 6.x | 型安全なデータベースアクセス |
| **データベース** | PostgreSQL | 15 | メインデータストア |
| **キャッシュ** | Redis | 7 | キャッシュ・セッション管理 |
| **キュー** | BullMQ | 5.x | バックグラウンドジョブ処理 |
| **認証** | bcryptjs | 3.x | APIキーハッシュ化 |
| **バリデーション** | class-validator | 0.14 | リクエスト検証 |
| **API文書** | Swagger/OpenAPI | 11.x | API仕様ドキュメント |

### フロントエンド (Web)

| カテゴリ | 技術 | バージョン | 目的 |
|---------|------|-----------|------|
| **ライブラリ** | React | 18.x | UIコンポーネント |
| **ビルドツール** | Vite | 5.x | 高速ビルド・HMR |
| **ルーティング** | React Router | 6.x | クライアントルーティング |
| **状態管理** | Zustand | 4.x | 軽量状態管理 |
| **データ取得** | TanStack Query | 5.x | サーバー状態管理 |
| **HTTP** | Axios | 1.x | API通信 |
| **言語** | TypeScript | 5.3 | 型安全な開発 |

### インフラストラクチャ

| カテゴリ | 技術 | 目的 |
|---------|------|------|
| **コンテナ** | Docker | アプリケーションコンテナ化 |
| **オーケストレーション** | Docker Compose | ローカル開発環境 |
| **Kubernetes** | K8s | 本番オーケストレーション |
| **Helm** | Helm Charts | Kubernetesパッケージ管理 |

### テスト

| カテゴリ | 技術 | バージョン | 目的 |
|---------|------|-----------|------|
| **ユニットテスト** | Jest | 30.x | ユニット・統合テスト |
| **E2Eテスト** | Supertest | 7.x | API E2Eテスト |

---

## 主要な設計決定

### ADR-001: NestJSの採用
- TypeScriptネイティブ、モジュラーアーキテクチャ、DIコンテナ内蔵

### ADR-002: Prisma ORMの採用
- 型安全なクエリ、スキーマファーストアプローチ

### ADR-003: BullMQによる非同期処理
- 大容量CSV処理（100MB+、200,000+レコード）の信頼性の高い非同期処理

---

*Run `#sdd-steering` to update this document after technology changes.*
