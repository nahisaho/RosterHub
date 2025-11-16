# RosterHub フェーズ2実装計画

**バージョン**: 1.0
**日付**: 2025-11-16
**ステータス**: 計画中
**期間**: 6ヶ月 (7-12ヶ月目)

---

## 📋 エグゼクティブサマリー

フェーズ2は**運用強化**に焦点を当て、ユーザーエクスペリエンス、可観測性、システムの信頼性を向上させます。フェーズ1の堅固な基盤(100% E2Eテストカバレッジ、本番環境対応インフラ)の上に、本番環境での大規模展開をサポートする運用ツールと高度な機能を追加します。

### フェーズ2の目標
1. ✅ 完全なE2Eテストカバレッジ(全7エンティティ)
2. ✅ パフォーマンスと負荷テスト
3. ✅ 高度な監視と可観測性
4. ✅ WebベースのCSVインポートUI
5. ✅ 非同期操作のWebhook通知
6. ✅ 構成管理の強化

---

## 🎯 フェーズ2の目的

| 目的 | 優先度 | タイムライン | 成功基準 |
|------|--------|--------------|----------|
| E2Eテストカバレッジ完了 | **重要** | 1-2週 | 全7エンティティで100%カバレッジ |
| パフォーマンス・負荷テスト | **高** | 2-4週 | ベースライン確立、ボトルネック特定 |
| 監視ダッシュボード | **高** | 3-6週 | Prometheus + Grafana導入 |
| WebベースCSV UI | **中** | 5-10週 | ドラッグ&ドロップアップロード対応Reactアプリ |
| Webhook通知 | **中** | 8-12週 | ジョブイベント用設定可能Webhook |
| データマッピング設定 | **低** | 10-15週 | カスタムフィールドマッピング用UI |
| パフォーマンス最適化 | **中** | 12-18週 | 主要メトリクスで50%改善 |
| Kubernetesデプロイ | **低** | 16-20週 | Helmチャート + 本番環境マニフェスト |

---

## 📊 現状 (フェーズ1完了)

### ✅ 完了済み機能
- OneRoster v1.2 REST API (7エンティティ: users, orgs, classes, courses, enrollments, demographics, academicSessions)
- CSVインポート/エクスポート(ストリーミング処理、100MB+ファイル対応)
- Delta/Incremental API
- 高度なフィルタリング(全OneRosterオペレータ)
- セキュリティ(APIキー、IPホワイトリスト、レート制限、監査ログ)
- バックグラウンドジョブ処理(BullMQ)
- Dockerインフラ(PostgreSQL、Redis)
- CI/CDパイプライン(GitHub Actions)
- **E2Eテストカバレッジ**: 33/33テスト(100% for users, orgs, CSV import)

### 🔍 フェーズ2で対応すべきギャップ

#### テストのギャップ
- **不足しているE2Eテスト**: 5エンティティ(classes, courses, enrollments, demographics, academicSessions)
  - 現状: 33/33テスト(users: 15, orgs: 6, CSV: 11, health: 1)
  - 目標: ~80テスト(残りエンティティに47テスト追加)

- **パフォーマンステスト**: フレームワークは存在するがベースラインメトリクスなし
  - 必要: レスポンスタイムベースライン、スループットメトリクス、リソース使用率

- **負荷テスト**: ストレス/負荷テストなし
  - 必要: 同時ユーザーテスト、CSVアップロードストレステスト、APIレート制限検証

#### 運用のギャップ
- **監視**: 基本的なヘルスチェックのみ
  - 必要: メトリクス(Prometheus)、ダッシュボード(Grafana)、アラート

- **可観測性**: アプリケーションログのみ
  - 必要: 分散トレーシング(Jaeger)、構造化ログ、相関ID

- **ユーザーエクスペリエンス**: APIのみのインターフェース
  - 必要: CSVアップロード用WebUI、ジョブステータス監視

#### 機能のギャップ
- **Webhook**: 非同期通知なし
  - 必要: ジョブ完了、エラー用の設定可能Webhook

- **設定**: ハードコードされたフィールドマッピング
  - 必要: カスタムCSV-エンティティマッピング用UI

---

## 🏗️ フェーズ2実装計画

### スプリント1-2: E2Eテストカバレッジ完了 (1-2週)

**目標**: 全7 OneRosterエンティティで100% E2Eテストカバレッジを達成

#### タスク

##### 1.1 Classes E2Eテスト (8テスト)
- ✅ GET /ims/oneroster/v1p2/classes (ページネーション付きリスト)
- ✅ GET /ims/oneroster/v1p2/classes/:id (単一クラス)
- ✅ GET /ims/oneroster/v1p2/classes?filter=title='Math 101' (フィルタリング)
- ✅ GET /ims/oneroster/v1p2/classes?fields=sourcedId,title (フィールド選択)
- ✅ GET /ims/oneroster/v1p2/classes?sort=title (ソート)
- ✅ PUT /ims/oneroster/v1p2/classes/:id (更新)
- ✅ DELETE /ims/oneroster/v1p2/classes/:id (論理削除)
- ✅ Japan Profileメタデータ検証

**ファイル**:
- 作成: `apps/api/test/oneroster-classes.e2e-spec.ts`

##### 1.2 Courses E2Eテスト (8テスト)
- ✅ GET /ims/oneroster/v1p2/courses (リスト)
- ✅ GET /ims/oneroster/v1p2/courses/:id (単一)
- ✅ フィルタリング、フィールド選択、ソート
- ✅ PUT、DELETE操作
- ✅ Japan Profileメタデータ

**ファイル**:
- 作成: `apps/api/test/oneroster-courses.e2e-spec.ts`

##### 1.3 Enrollments E2Eテスト (10テスト)
- ✅ GET /ims/oneroster/v1p2/enrollments (リスト)
- ✅ GET /ims/oneroster/v1p2/enrollments/:id (単一)
- ✅ GET /ims/oneroster/v1p2/classes/:classId/enrollments (クラス別登録)
- ✅ GET /ims/oneroster/v1p2/users/:userId/enrollments (ユーザー別登録)
- ✅ role、beginDate、endDateによるフィルタリング
- ✅ フィールド選択、ソート
- ✅ PUT、DELETE操作
- ✅ Japan Profileメタデータ

**ファイル**:
- 作成: `apps/api/test/oneroster-enrollments.e2e-spec.ts`

##### 1.4 Demographics E2Eテスト (7テスト)
- ✅ GET /ims/oneroster/v1p2/demographics/:id
- ✅ フィルタリング、フィールド選択
- ✅ PUT操作
- ✅ Japan Profile検証(かなフィールド)

**ファイル**:
- 作成: `apps/api/test/oneroster-demographics.e2e-spec.ts`

##### 1.5 AcademicSessions E2Eテスト (8テスト)
- ✅ GET /ims/oneroster/v1p2/academicSessions (リスト)
- ✅ GET /ims/oneroster/v1p2/academicSessions/:id (単一)
- ✅ type、startDate、endDateによるフィルタリング
- ✅ フィールド選択、ソート
- ✅ PUT、DELETE操作
- ✅ ネストされた学期(親/子)

**ファイル**:
- 作成: `apps/api/test/oneroster-academic-sessions.e2e-spec.ts`

##### 1.6 CSVインポートE2Eテスト (6追加テスト)
- ✅ classes、courses、enrollments、demographics、academicSessionsのCSVインポート
- ✅ 全エンティティのCSVエクスポート(deltaモード)

**ファイル**:
- 更新: `apps/api/test/csv-import.e2e-spec.ts`

**成果物**:
- 47新規E2Eテスト
- **総E2Eテスト数**: 80 (現在33 + 新規47)
- 全テスト成功(100%)
- CIパイプライン更新

**受入基準**:
- 全7エンティティのE2Eテスト
- CIで100%成功率
- テストカバレッジレポート生成

---

### スプリント3-4: パフォーマンス・負荷テスト (2-4週)

**目標**: パフォーマンスベースラインを確立し、ボトルネックを特定

#### タスク

##### 2.1 パフォーマンステストインフラ
- ✅ k6負荷テストツール導入
- ✅ テストシナリオ設定(smoke, load, stress, spike)
- ✅ CIパイプラインへのパフォーマンステスト追加(オプション)

**ファイル**:
- 作成: `apps/api/test/performance/k6/`
  - `smoke-test.js` (最小負荷)
  - `load-test.js` (想定負荷)
  - `stress-test.js` (限界点)
  - `spike-test.js` (急激なトラフィック)

##### 2.2 APIパフォーマンステスト
**テストシナリオ**:
1. **GET /users** (リストエンドポイント)
   - 目標: 100 RPS、p95 < 200ms

2. **GET /users/:id** (単一リソース)
   - 目標: 200 RPS、p95 < 100ms

3. **CSVインポート** (100MBファイル)
   - 目標: < 60秒処理時間

4. **フィルタリング** (複雑なクエリ)
   - 目標: 50 RPS、p95 < 300ms

**ファイル**:
- 作成: `apps/api/test/performance/k6/api-performance.js`

##### 2.3 データベースパフォーマンス
- ✅ クエリ分析(EXPLAIN ANALYZE)
- ✅ インデックス最適化
- ✅ コネクションプールチューニング

**ファイル**:
- 作成: `docs/performance/database-optimization.md`

##### 2.4 パフォーマンスベースラインレポート
**取得メトリクス**:
- レスポンスタイム(p50、p95、p99)
- スループット(RPS)
- リソース使用率(CPU、メモリ、ディスクI/O)
- データベースクエリパフォーマンス

**ファイル**:
- 作成: `docs/performance/baseline-report.md`

**成果物**:
- k6テストスイート
- パフォーマンスベースラインレポート
- 特定されたボトルネックと最適化計画

**受入基準**:
- 全パフォーマンステストが`npm run test:perf`で実行可能
- ベースラインメトリクスをドキュメント化
- トップ3のパフォーマンスボトルネック特定

---

### スプリント5-6: 監視・可観測性 (3-6週)

**目標**: PrometheusとGrafanaによる包括的な監視を導入

#### タスク

##### 3.1 Prometheusセットアップ
- ✅ `docker-compose.yml`にPrometheusサービス追加
- ✅ メトリクス収集設定
- ✅ 保持期間とストレージ設定

**ファイル**:
- 更新: `docker-compose.yml`
- 作成: `prometheus/prometheus.yml`

##### 3.2 アプリケーションメトリクス
- ✅ `@willsoto/nestjs-prometheus`インストール
- ✅ メトリクスエンドポイント`/metrics`公開
- ✅ カスタムメトリクス追加:
  - HTTPリクエスト時間(ヒストグラム)
  - エンドポイント別リクエスト数(カウンタ)
  - CSVインポートジョブ時間(ヒストグラム)
  - アクティブCSVインポートジョブ(ゲージ)
  - クライアント別APIキー使用(カウンタ)

**ファイル**:
- 更新: `apps/api/src/common/common.module.ts`
- 作成: `apps/api/src/common/interceptors/metrics.interceptor.ts`

##### 3.3 Grafanaダッシュボード
- ✅ `docker-compose.yml`にGrafanaサービス追加
- ✅ ダッシュボード作成:
  - **API概要**: リクエストレート、エラーレート、レイテンシ
  - **CSV操作**: インポートジョブ、成功/失敗率、処理時間
  - **システムリソース**: CPU、メモリ、ディスク、ネットワーク
  - **セキュリティ**: APIキー使用、レート制限ヒット、認証失敗

**ファイル**:
- 作成: `grafana/dashboards/api-overview.json`
- 作成: `grafana/dashboards/csv-operations.json`
- 作成: `grafana/dashboards/system-resources.json`
- 作成: `grafana/dashboards/security.json`
- 作成: `grafana/provisioning/dashboards.yml`
- 作成: `grafana/provisioning/datasources.yml`

##### 3.4 アラート
- ✅ Prometheusアラートルール設定:
  - 高エラー率(>5%)
  - 高レイテンシ(p95 > 500ms)
  - CSVインポート失敗(>10%)
  - ディスク容量不足(<20%)

**ファイル**:
- 作成: `prometheus/alerts.yml`

##### 3.5 分散トレーシング(オプション)
- ✅ Jaegerサービス追加(オプション)
- ✅ OpenTelemetryによる計装

**ファイル**:
- 更新: `docker-compose.yml` (jaegerサービス追加)
- 作成: `apps/api/src/common/tracing.ts`

**成果物**:
- Prometheus + Grafanaスタック導入
- 4つのGrafanaダッシュボード
- アラートルール設定
- ドキュメント: 監視ガイド

**受入基準**:
- Grafanaでメトリクス表示
- テストシナリオでアラート発火可能
- ドキュメント完成

---

### スプリント7-10: WebベースCSVインポートUI (5-10週)

**目標**: CSVアップロード用のユーザーフレンドリーなWebインターフェースを提供

#### タスク

##### 4.1 フロントエンドプロジェクトセットアップ
- ✅ ViteでReactアプリ作成
- ✅ TypeScript + TailwindCSS
- ✅ フォルダ構造

**ファイル**:
- 作成: `apps/web/` (新規Reactアプリ)

##### 4.2 CSVアップロードコンポーネント
**機能**:
- ドラッグ&ドロップファイルアップロード
- エンティティタイプ選択(users、orgs、classesなど)
- ファイル検証(CSVのみ、最大100MB)
- アップロード進行状況バー
- リアルタイムジョブステータス更新

**ファイル**:
- 作成: `apps/web/src/components/CsvUpload.tsx`
- 作成: `apps/web/src/components/FileDropzone.tsx`
- 作成: `apps/web/src/components/UploadProgress.tsx`

##### 4.3 ジョブステータスダッシュボード
**機能**:
- 全CSVインポートジョブのリスト
- ステータス: pending、processing、completed、failed
- 進行状況パーセンテージ
- エラー詳細(失敗時)
- 結果ダウンロード(完了時)

**ファイル**:
- 作成: `apps/web/src/components/JobDashboard.tsx`
- 作成: `apps/web/src/components/JobCard.tsx`

##### 4.4 API統合
- ✅ API呼び出し用Axiosクライアント
- ✅ リアルタイム更新用WebSocket(またはポーリング)
- ✅ 認証(APIキー入力)

**ファイル**:
- 作成: `apps/web/src/api/client.ts`
- 作成: `apps/web/src/hooks/useCsvJobs.ts`

##### 4.5 バックエンド: ジョブステータスAPI
- ✅ GET /ims/oneroster/v1p2/csv/jobs (ジョブリスト)
- ✅ GET /ims/oneroster/v1p2/csv/jobs/:id (ジョブステータス)
- ✅ WebSocketエンドポイント(オプション)

**ファイル**:
- 更新: `apps/api/src/oneroster/csv/csv-import.controller.ts`
- 作成: `apps/api/src/oneroster/csv/dto/job-status.dto.ts`

**成果物**:
- Reactウェブアプリ
- CSVアップロードUI
- ジョブステータスダッシュボード
- リアルタイム更新

**受入基準**:
- ユーザーがUI経由でCSVアップロード可能
- ジョブ進行状況がリアルタイム表示
- エラーが明確に表示
- モバイルレスポンシブ

---

### スプリント8-12: Webhook通知 (8-12週)

**目標**: CSVジョブイベントの非同期通知を有効化

#### タスク

##### 5.1 Webhook設定
- ✅ Webhook用データベーススキーマ(url、events、secret)
- ✅ Webhook管理CRUD API

**ファイル**:
- 更新: `apps/api/prisma/schema.prisma`
- 作成: `apps/api/src/oneroster/webhooks/webhooks.module.ts`
- 作成: `apps/api/src/oneroster/webhooks/webhooks.controller.ts`

##### 5.2 Webhook配信サービス
- ✅ Webhook URLへのHTTP POST
- ✅ リトライロジック(指数バックオフ)
- ✅ 署名検証(HMAC)
- ✅ Webhookイベントタイプ:
  - `csv.import.started`
  - `csv.import.completed`
  - `csv.import.failed`
  - `csv.export.completed`

**ファイル**:
- 作成: `apps/api/src/oneroster/webhooks/webhook-delivery.service.ts`

##### 5.3 イベント発行
- ✅ CSVプロセッサからWebhookをトリガー
- ✅ ペイロード: jobId、entityType、status、timestamp、metadata

**ファイル**:
- 更新: `apps/api/src/oneroster/csv/processors/csv-import.processor.ts`

##### 5.4 Webhookテスト
- ✅ Webhook配信のE2Eテスト
- ✅ テスト用モックWebhookサーバー

**ファイル**:
- 作成: `apps/api/test/webhooks.e2e-spec.ts`

**成果物**:
- Webhook管理API
- Webhook配信サービス
- E2Eテスト

**受入基準**:
- API経由でWebhook設定可能
- イベントが確実に配信される
- 署名検証が機能

---

### スプリント10-15: データマッピング設定 (10-15週)

**目標**: カスタムCSVフィールドマッピングを許可

#### タスク

##### 6.1 マッピングスキーマ
- ✅ マッピング用データベーススキーマ
- ✅ デフォルトマッピング(OneRoster標準)
- ✅ 組織ごとのカスタムマッピング

**ファイル**:
- 更新: `apps/api/prisma/schema.prisma`

##### 6.2 マッピングAPI
- ✅ GET /ims/oneroster/v1p2/mappings/:entityType
- ✅ PUT /ims/oneroster/v1p2/mappings/:entityType
- ✅ 検証: 必須フィールドはマッピング必須

**ファイル**:
- 作成: `apps/api/src/oneroster/mappings/mappings.module.ts`
- 作成: `apps/api/src/oneroster/mappings/mappings.controller.ts`

##### 6.3 マッピングUI (Webアプリ)
- ✅ ドラッグ&ドロップフィールドマッピング
- ✅ サンプルデータ付きCSVプレビュー
- ✅ マッピング保存/リセット

**ファイル**:
- 作成: `apps/web/src/components/FieldMapper.tsx`

##### 6.4 CSVインポート統合
- ✅ インポート時にカスタムマッピング使用
- ✅ デフォルトマッピングへのフォールバック

**ファイル**:
- 更新: `apps/api/src/oneroster/csv/services/csv-import.service.ts`

**成果物**:
- マッピング管理API
- マッピングUI
- CSVインポートとの統合

**受入基準**:
- カスタムマッピング保存可能
- CSVインポートがカスタムマッピング使用
- UIがユーザーフレンドリー

---

### スプリント12-18: パフォーマンス最適化 (12-18週)

**目標**: 主要なパフォーマンスメトリクスを50%改善

#### タスク

##### 7.1 データベースクエリ最適化
- ✅ 不足しているインデックス追加(クエリ分析に基づく)
- ✅ N+1クエリ最適化(Prisma includes)
- ✅ クエリキャッシング実装(Redis)

**ファイル**:
- 更新: `apps/api/prisma/schema.prisma`
- 作成: `apps/api/src/common/cache/query-cache.service.ts`

##### 7.2 APIレスポンス最適化
- ✅ HTTPキャッシング実装(ETag、Last-Modified)
- ✅ gzip圧縮有効化
- ✅ 読み取り専用エンドポイントのレスポンスキャッシング追加

**ファイル**:
- 更新: `apps/api/src/main.ts`
- 作成: `apps/api/src/common/interceptors/cache.interceptor.ts`

##### 7.3 CSVインポート最適化
- ✅ バッチ挿入(1000から5000に増加)
- ✅ 並列処理(複数ワーカー)
- ✅ ストリーミング最適化

**ファイル**:
- 更新: `apps/api/src/oneroster/csv/services/csv-import.service.ts`

##### 7.4 再ベンチマーク
- ✅ k6テスト再実行
- ✅ ベースラインと比較
- ✅ 改善をドキュメント化

**ファイル**:
- 更新: `docs/performance/baseline-report.md`

**成果物**:
- 最適化されたクエリ
- 最適化されたCSVインポート
- パフォーマンス比較レポート

**受入基準**:
- p95レイテンシで50%改善
- CSVインポートスループットで2倍改善

---

### スプリント16-20: Kubernetesデプロイ (16-20週) [オプション]

**目標**: Kubernetesデプロイを可能にする

#### タスク

##### 8.1 Helmチャート
- ✅ RosterHub用Helmチャート作成
- ✅ 設定可能な値(レプリカ、リソースなど)
- ✅ PostgreSQLサポート(外部またはクラスタ内)

**ファイル**:
- 作成: `charts/rosterhub/Chart.yaml`
- 作成: `charts/rosterhub/values.yaml`
- 作成: `charts/rosterhub/templates/deployment.yaml`
- 作成: `charts/rosterhub/templates/service.yaml`
- 作成: `charts/rosterhub/templates/ingress.yaml`

##### 8.2 本番環境マニフェスト
- ✅ ヘルスチェック付きDeployment
- ✅ HPA (Horizontal Pod Autoscaler)
- ✅ 永続化ストレージ用PVC

**ファイル**:
- 作成: `k8s/production/deployment.yaml`
- 作成: `k8s/production/hpa.yaml`

##### 8.3 ドキュメント
- ✅ Kubernetesデプロイガイド
- ✅ Helmチャート使用方法

**ファイル**:
- 作成: `docs/deployment/kubernetes-deployment.md`

**成果物**:
- Helmチャート
- 本番環境マニフェスト
- デプロイガイド

**受入基準**:
- Kubernetesへデプロイ可能
- ローカルクラスタ(minikube/kind)でHelmチャートテスト済み

---

## 📅 タイムライン

| 週 | スプリント | フォーカス | 成果物 |
|----|-----------|-----------|--------|
| 1-2 | 1-2 | E2Eテストカバレッジ | 47新規テスト、100%カバレッジ |
| 2-4 | 3-4 | パフォーマンステスト | k6スイート、ベースラインレポート |
| 3-6 | 5-6 | 監視 | Prometheus + Grafanaスタック |
| 5-10 | 7-10 | Web CSV UI | Reactアプリ、アップロードUI |
| 8-12 | 8-12 | Webhook | Webhook API、配信サービス |
| 10-15 | 10-15 | データマッピング | マッピングAPI + UI |
| 12-18 | 12-18 | パフォーマンス最適化 | 50%改善 |
| 16-20 | 16-20 | Kubernetes(オプション) | Helmチャート、マニフェスト |

---

## 🎯 成功メトリクス

| メトリクス | フェーズ1 | フェーズ2目標 | 測定方法 |
|-----------|----------|-------------|----------|
| E2Eテストカバレッジ | 33テスト(users、orgs、CSV) | 80テスト(全エンティティ) | CIパイプライン |
| APIレイテンシ(p95) | 不明 | < 200ms | Prometheus |
| CSVインポート(100MB) | 不明 | < 60秒 | パフォーマンステスト |
| テスト成功率 | 100% | 100% | CIパイプライン |
| 監視カバレッジ | ヘルスチェックのみ | 全メトリクス+アラート | Grafanaダッシュボード |
| ユーザーインターフェース | APIのみ | CSV用WebUI | ユーザーフィードバック |

---

## 🚀 フェーズ2成果物サマリー

### テスト
- ✅ 80 E2Eテスト(100%エンティティカバレッジ)
- ✅ k6パフォーマンステストスイート
- ✅ パフォーマンスベースラインレポート

### 監視
- ✅ Prometheus + Grafanaスタック
- ✅ 4つのGrafanaダッシュボード
- ✅ アラートルール

### ユーザーエクスペリエンス
- ✅ CSVアップロード用Reactウェブアプリ
- ✅ ジョブステータスダッシュボード
- ✅ リアルタイム進行状況更新

### 機能
- ✅ Webhook通知
- ✅ カスタムデータマッピング
- ✅ パフォーマンス最適化

### インフラ(オプション)
- ✅ Kubernetes Helmチャート
- ✅ 本番環境マニフェスト

### ドキュメント
- ✅ フェーズ2実装ガイド
- ✅ パフォーマンス最適化ガイド
- ✅ 監視ガイド
- ✅ Kubernetesデプロイガイド

---

## 🔗 関連ドキュメント

- [フェーズ1完了レポート](../../orchestrator/reports/phase1-completion-report-20251116.md)
- [フェーズ1テスト結果](../testing/phase1-test-results.md)
- [パフォーマンステストガイド](../../apps/api/docs/testing/performance-testing-guide.md)
- [デプロイメントマニュアル](../deployment/deployment-manual.md)

---

## 📝 備考

### 優先度レベル
- **重要**: ブロッカー、フェーズ2成功のために必須
- **高**: 本番環境運用に重要
- **中**: ユーザーエクスペリエンスまたは運用効率を向上
- **低**: あると良い、フェーズ3に延期可能

### 依存関係
- スプリント1-2(E2Eテスト)は他のスプリントの前に完了すべき
- 監視(スプリント5-6)はパフォーマンス最適化(スプリント12-18)に必要
- Web UI(スプリント7-10)はWebhook(スプリント8-12)と並行実行可能

### リスク軽減
- **リスク**: パフォーマンス目標未達
  - **軽減策**: 早期にベースライン確立、最適化を反復

- **リスク**: Web UI遅延
  - **軽減策**: API優先アプローチ、UIはv2機能に

- **リスク**: Kubernetes複雑性
  - **軽減策**: オプションとしてマーク、v1.0はDocker Composeに集中

---

**フェーズ2計画完了** ✅
**次のステップ**: スプリント1-2開始(E2Eテストカバレッジ)

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2025-11-16
**管理者**: RosterHub開発チーム
