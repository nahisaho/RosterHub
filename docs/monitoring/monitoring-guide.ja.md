# モニタリング & 可観測性ガイド

このドキュメントは、PrometheusとGrafanaを使用したRosterHub OneRoster APIのモニタリングに関する包括的なガイダンスを提供します。

## 目次

- [概要](#概要)
- [アーキテクチャ](#アーキテクチャ)
- [クイックスタート](#クイックスタート)
- [メトリクスリファレンス](#メトリクスリファレンス)
- [Grafanaダッシュボード](#grafanaダッシュボード)
- [ヘルスチェック](#ヘルスチェック)
- [アラート](#アラート)
- [トラブルシューティング](#トラブルシューティング)
- [本番環境デプロイ](#本番環境デプロイ)

## 概要

RosterHubは包括的なモニタリングと可観測性機能を実装しています：

- **Prometheus** - メトリクス収集と時系列データベース
- **Grafana** - 可視化とダッシュボード
- **カスタムメトリクス** - OneRoster APIのビジネスおよび技術メトリクス
- **ヘルスチェック** - コンテナオーケストレーション用のLiveness/Readinessエンドポイント

### モニタリングスタック

```
┌─────────────────┐
│  OneRoster API  │ ← /metricsエンドポイントを公開
└────────┬────────┘
         │
         │ (10秒ごとにスクレイプ)
         ▼
┌─────────────────┐
│   Prometheus    │ ← 時系列データを保存
└────────┬────────┘
         │
         │ (クエリ)
         ▼
┌─────────────────┐
│    Grafana      │ ← メトリクスを可視化
└─────────────────┘
```

## アーキテクチャ

### コンポーネント

1. **メトリクスサービス** (`src/monitoring/metrics.service.ts`)
   - メトリクスの収集と保存
   - Prometheus形式でのメトリクス公開
   - メトリクス記録用のヘルパーメソッド提供

2. **メトリクスインターセプター** (`src/monitoring/metrics.interceptor.ts`)
   - HTTPリクエストメトリクスの自動追跡
   - レスポンス時間とステータスコードの記録
   - タイプ別エラー追跡

3. **メトリクスコントローラー** (`src/monitoring/metrics.controller.ts`)
   - `GET /metrics` - Prometheusテキスト形式
   - `GET /metrics/json` - デバッグ用JSON形式

4. **ヘルスコントローラー** (`src/monitoring/health.controller.ts`)
   - `GET /health` - 基本的なヘルスチェック
   - `GET /health/ready` - Readinessプローブ（依存関係チェック）
   - `GET /health/live` - Livenessプローブ（アプリケーション状態チェック）

## クイックスタート

### 1. モニタリングスタックの起動

```bash
cd apps/api/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

これにより以下が起動します：
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

### 2. APIサーバーの起動

```bash
cd apps/api
npm run start:dev
```

### 3. Grafanaへのアクセス

1. http://localhost:3001 を開く
2. `admin` / `admin` でログイン（初回ログイン時に変更）
3. "Dashboards" → "OneRoster" → "OneRoster API - Overview Dashboard" に移動

### 4. メトリクス収集の確認

```bash
# メトリクスエンドポイントを確認
curl http://localhost:3000/metrics

# Prometheusターゲットを確認
# http://localhost:9090/targets を開く
```

## メトリクスリファレンス

### HTTPリクエストメトリクス

#### `oneroster_http_requests_total`

**タイプ:** Counter
**ラベル:** `method`, `endpoint`, `status`
**説明:** HTTPリクエストの総数

**例:**
```
oneroster_http_requests_total{method="GET",endpoint="/ims/oneroster/v1p2/users",status="200"} 1234
```

**使用方法:**
```promql
# 秒あたりのリクエストレート
rate(oneroster_http_requests_total[1m])

# エンドポイント別の総リクエスト数
sum by (endpoint) (oneroster_http_requests_total)
```

#### `oneroster_http_request_duration_seconds`

**タイプ:** Histogram
**ラベル:** `method`, `endpoint`, `status`
**バケット:** 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s
**説明:** HTTPリクエスト時間（秒）

**使用方法:**
```promql
# p95レスポンス時間
histogram_quantile(0.95, rate(oneroster_http_request_duration_seconds_bucket[5m]))

# p99レスポンス時間
histogram_quantile(0.99, rate(oneroster_http_request_duration_seconds_bucket[5m]))

# 平均レスポンス時間
rate(oneroster_http_request_duration_seconds_sum[5m]) / rate(oneroster_http_request_duration_seconds_count[5m])
```

### エンティティ操作メトリクス

#### `oneroster_entity_operations_total`

**タイプ:** Counter
**ラベル:** `entity`, `operation` (create, read, update, delete)
**説明:** エンティティ操作の総数

**使用方法:**
```promql
# エンティティ別の秒あたり操作数
rate(oneroster_entity_operations_total[1m])

# 作成 vs 削除の総数
sum by (operation) (oneroster_entity_operations_total)
```

### CSV操作メトリクス

#### `oneroster_csv_import_total`

**タイプ:** Counter
**ラベル:** `entity`, `status` (success, failed)
**説明:** CSVインポート操作の総数

#### `oneroster_csv_export_total`

**タイプ:** Counter
**ラベル:** `entity`, `status` (success, failed)
**説明:** CSVエクスポート操作の総数

#### `oneroster_csv_processing_duration_seconds`

**タイプ:** Histogram
**ラベル:** `entity`, `operation`
**バケット:** 0.1s, 0.5s, 1s, 2s, 5s, 10s, 30s, 60s, 120s, 300s
**説明:** CSV処理時間（秒）

**使用方法:**
```promql
# CSVインポート成功率
sum(rate(oneroster_csv_import_total{status="success"}[5m])) / sum(rate(oneroster_csv_import_total[5m])) * 100

# 平均CSV処理時間
rate(oneroster_csv_processing_duration_seconds_sum[5m]) / rate(oneroster_csv_processing_duration_seconds_count[5m])
```

### データベースメトリクス

#### `oneroster_db_query_duration_seconds`

**タイプ:** Histogram
**ラベル:** `operation`, `table`
**説明:** データベースクエリ時間（秒）

#### `oneroster_db_connections`

**タイプ:** Gauge
**ラベル:** `state` (active, idle)
**説明:** 現在のデータベース接続数

### キャッシュメトリクス

#### `oneroster_cache_hit_rate`

**タイプ:** Gauge
**説明:** キャッシュヒット率（0-1）

**使用方法:**
```promql
# キャッシュヒット率パーセンテージ
oneroster_cache_hit_rate * 100
```

### エラーメトリクス

#### `oneroster_errors_total`

**タイプ:** Counter
**ラベル:** `type` (validation, database, internal, etc.), `endpoint`
**説明:** エラーの総数

**使用方法:**
```promql
# エラーレート
rate(oneroster_errors_total[5m])

# タイプ別エラー
sum by (type) (oneroster_errors_total)
```

### Japan Profileメトリクス

#### `oneroster_japan_profile_validations_total`

**タイプ:** Counter
**ラベル:** `entity`, `field`, `result` (pass, fail)
**説明:** Japan Profileメタデータ検証の総数

**使用方法:**
```promql
# 検証成功率
sum(oneroster_japan_profile_validations_total{result="pass"}) / sum(oneroster_japan_profile_validations_total) * 100
```

## Grafanaダッシュボード

### OneRoster API - Overview Dashboard

場所: `apps/api/monitoring/grafana/dashboards/oneroster-api-overview.json`

**パネル:**

1. **Request Rate** - エンドポイント別リクエスト/秒
2. **Response Time (p95)** - 95パーセンタイルおよび99パーセンタイルのレスポンス時間
3. **Error Rate (%)** - 4xxおよび5xxエラーレート
4. **Total Requests** - 総リクエスト数
5. **Active Database Connections** - 現在のアクティブDB接続数
6. **Entity Operations** - CRUD操作/秒
7. **CSV Operations** - インポート/エクスポート操作/秒
8. **Cache Hit Rate** - キャッシュ効果ゲージ
9. **Database Query Duration (p95)** - DBクエリパフォーマンス
10. **Error Breakdown** - タイプ別エラーの円グラフ
11. **Japan Profile Validation Success Rate** - メタデータ検証の健全性

**変数:**
- `endpoint` - APIエンドポイントでフィルター
- `entity` - エンティティタイプでフィルター（users, orgs, classesなど）

## ヘルスチェック

### GET /health

基本的なヘルスチェック - APIが稼働中の場合200を返す。

```bash
curl http://localhost:3000/health
```

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "service": "oneroster-api",
  "version": "0.0.1"
}
```

### GET /health/ready

Readinessチェック - APIがトラフィックを受け入れられるか検証（データベース、Redisなどをチェック）。

```bash
curl http://localhost:3000/health/ready
```

**レスポンス（正常）:**
```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 0
    },
    "redis": {
      "status": "not_configured"
    }
  }
}
```

### Kubernetesでの使用

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

## アラート

### Prometheusでのアラート設定

`prometheus/alerts/api-alerts.yml`にアラートルールを作成：

```yaml
groups:
  - name: oneroster_api
    interval: 30s
    rules:
      # 高エラーレート
      - alert: HighErrorRate
        expr: sum(rate(oneroster_http_requests_total{status=~"5.."}[5m])) / sum(rate(oneroster_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "高エラーレート検出"
          description: "エラーレート: {{ $value | humanizePercentage }}"

      # 遅いレスポンス時間
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(oneroster_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "APIレスポンス時間が遅い"
          description: "p95レスポンス時間: {{ $value }}s"
```

## トラブルシューティング

### メトリクスが表示されない

**問題:** メトリクスエンドポイントが空またはデータが少ない

**解決策:**
1. APIがトラフィックを受信していることを確認: `curl http://localhost:3000/health`
2. メトリクスエンドポイントを確認: `curl http://localhost:3000/metrics`
3. AppModuleにMonitoringModuleがインポートされていることを確認
4. インターセプターが登録されていることを確認

### PrometheusがスクレイプしていないPrometheusがスクレイプしていない

**問題:** Prometheusがターゲットを"DOWN"と表示

**解決策:**
1. Prometheus設定を確認: http://localhost:9090/config
2. `prometheus.yml`のAPI URLを確認
3. ネットワーク接続を確認: `docker network inspect monitoring_monitoring`
4. Prometheusログを確認: `docker logs oneroster-prometheus`

### Grafanaが"No Data"を表示

**問題:** ダッシュボードが"No data"または空のグラフを表示

**解決策:**
1. Prometheusデータソースが設定されていることを確認
2. 時間範囲を確認（デフォルト: 過去1時間）
3. パネルのクエリを確認: Edit → Query inspector
4. Prometheusにデータがあることを確認: http://localhost:9090/graph

## 本番環境デプロイ

### ベストプラクティス

1. **永続ボリュームを使用** PrometheusとGrafanaデータ用
2. **認証を設定** Grafana用（デフォルトのadmin/adminを無効化）
3. **アラートを設定** 適切な通知チャネルで
4. **メトリクスストレージを監視** 保持ポリシーを設定
5. **HTTPSを使用** Grafanaアクセス用
6. **Grafanaダッシュボードをバックアップ** 定期的に

## リソース

- [Prometheusドキュメント](https://prometheus.io/docs/)
- [Grafanaドキュメント](https://grafana.com/docs/)
- [PromQL基礎](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafanaダッシュボードベストプラクティス](https://grafana.com/docs/grafana/latest/best-practices/)

## サポート

モニタリング関連の質問については：
- このドキュメントを確認
- Prometheus/Grafanaログを確認
- GitHubでissueを作成
- DevOpsチームに連絡
