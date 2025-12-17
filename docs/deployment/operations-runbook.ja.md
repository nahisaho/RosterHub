# RosterHub 運用ランブック

## 概要

本ドキュメントは、RosterHub システムの本番環境における運用手順、トラブルシューティング、および緊急対応手順を記載します。

---

## 1. システム概要

### コンポーネント構成

| コンポーネント | 技術 | ポート | 役割 |
|--------------|------|--------|------|
| API Server | NestJS 11.x | 3000 | REST API エンドポイント |
| PostgreSQL | 15.x | 5432 | メインデータベース |
| Redis | 7.x | 6379 | キャッシュ、ジョブキュー |
| Nginx | Latest | 80/443 | リバースプロキシ |

### ヘルスチェックエンドポイント

```
GET /health/live    # Liveness probe
GET /health/ready   # Readiness probe
GET /health         # 詳細ヘルスチェック
GET /metrics        # Prometheus メトリクス
```

---

## 2. 起動・停止手順

### 2.1 Docker Compose 環境

```bash
# 起動
cd /path/to/RosterHub
docker compose up -d

# 停止
docker compose down

# ログ確認
docker compose logs -f api

# 再起動
docker compose restart api
```

### 2.2 Kubernetes 環境

```bash
# デプロイ
kubectl apply -k k8s/overlays/production

# Pod 確認
kubectl get pods -n rosterhub

# ログ確認
kubectl logs -f deployment/rosterhub-api -n rosterhub

# ローリング再起動
kubectl rollout restart deployment/rosterhub-api -n rosterhub

# ロールバック
kubectl rollout undo deployment/rosterhub-api -n rosterhub
```

---

## 3. 日常運用タスク

### 3.1 ログローテーション

ログは自動でローテーションされますが、手動で確認する場合：

```bash
# Docker ログサイズ確認
docker system df

# ログ削除
docker system prune --volumes -f
```

### 3.2 データベースバックアップ

```bash
# 手動バックアップ
pg_dump -h localhost -U rosterhub -d rosterhub > backup_$(date +%Y%m%d_%H%M%S).sql

# 自動バックアップ（cron 設定例）
0 3 * * * pg_dump -h localhost -U rosterhub -d rosterhub | gzip > /backups/rosterhub_$(date +\%Y\%m\%d).sql.gz
```

### 3.3 キャッシュクリア

```bash
# Redis キャッシュクリア
redis-cli FLUSHDB

# 特定パターンのキーのみ削除
redis-cli --scan --pattern "cache:*" | xargs redis-cli DEL
```

### 3.4 ジョブキュー管理

```bash
# BullMQ キュー状態確認
# Redis CLI で確認
redis-cli LLEN bull:csv-import:wait
redis-cli LLEN bull:csv-import:active
redis-cli LLEN bull:csv-import:failed

# 失敗ジョブのクリア
redis-cli DEL bull:csv-import:failed
```

---

## 4. 監視とアラート

### 4.1 重要メトリクス

| メトリクス | 正常値 | 警告閾値 | 危険閾値 |
|-----------|--------|----------|----------|
| API レスポンスタイム (p95) | < 200ms | > 500ms | > 1000ms |
| エラー率 | < 1% | > 3% | > 5% |
| CPU 使用率 | < 60% | > 80% | > 90% |
| メモリ使用率 | < 70% | > 85% | > 95% |
| DB コネクション | < 50 | > 80 | > 95 |

### 4.2 Grafana ダッシュボード

- **概要**: `/grafana/d/oneroster-overview`
- **API パフォーマンス**: `/grafana/d/oneroster-api`
- **データベース**: `/grafana/d/oneroster-db`

### 4.3 アラート設定例

```yaml
# Prometheus AlertManager ルール
groups:
  - name: rosterhub
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: warning
```

---

## 5. トラブルシューティング

### 5.1 API が応答しない

**症状**: API エンドポイントがタイムアウトまたは 5xx エラー

**確認手順**:
```bash
# 1. Pod/コンテナ状態確認
kubectl get pods -n rosterhub
# または
docker compose ps

# 2. ログ確認
kubectl logs deployment/rosterhub-api -n rosterhub --tail=100
# または
docker compose logs api --tail=100

# 3. ヘルスチェック
curl -v http://localhost:3000/health

# 4. リソース使用状況
kubectl top pods -n rosterhub
```

**対処**:
1. Pod/コンテナを再起動
2. DB 接続を確認
3. Redis 接続を確認
4. 必要に応じてスケールアウト

### 5.2 データベース接続エラー

**症状**: `ECONNREFUSED` または `Connection timeout`

**確認手順**:
```bash
# DB 接続確認
psql -h localhost -U rosterhub -d rosterhub -c "SELECT 1"

# コネクション数確認
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'rosterhub'"

# 長時間クエリ確認
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
         FROM pg_stat_activity 
         WHERE state = 'active' 
         AND query NOT LIKE '%pg_stat_activity%'
         ORDER BY duration DESC"
```

**対処**:
1. 長時間クエリを終了: `SELECT pg_terminate_backend(PID)`
2. コネクションプールサイズを調整
3. PostgreSQL を再起動（最終手段）

### 5.3 メモリ不足

**症状**: OOMKilled または高メモリ使用率

**確認手順**:
```bash
# メモリ使用状況
kubectl top pods -n rosterhub
free -h

# OOM イベント確認
kubectl describe pod <pod-name> -n rosterhub | grep -A 10 "Last State"
```

**対処**:
1. メモリ制限を引き上げ
2. 不要なキャッシュをクリア
3. 大量 CSV インポートを制限

### 5.4 CSV インポートが遅い/失敗

**症状**: インポートジョブが長時間完了しない

**確認手順**:
```bash
# ジョブ状態確認
redis-cli LRANGE bull:csv-import:active 0 -1

# ワーカーログ確認
kubectl logs deployment/rosterhub-api -n rosterhub | grep "CSV"
```

**対処**:
1. ファイルサイズを確認（上限: 100MB）
2. メモリ使用量を確認
3. DB トランザクションロックを確認
4. 必要に応じてジョブを手動キャンセル

### 5.5 API キー認証エラー

**症状**: 401 Unauthorized

**確認手順**:
```bash
# API キー確認
psql -c "SELECT key, name, is_active, expires_at FROM api_keys WHERE key = 'your-key'"

# 有効期限切れキーの確認
psql -c "SELECT * FROM api_keys WHERE expires_at < NOW()"
```

**対処**:
1. API キーの有効性を確認
2. 有効期限を更新
3. 新しい API キーを発行

---

## 6. 緊急対応手順

### 6.1 セキュリティインシデント

1. **即時対応**:
   ```bash
   # 外部アクセスをブロック
   kubectl scale deployment rosterhub-api --replicas=0 -n rosterhub
   
   # またはネットワークポリシー適用
   kubectl apply -f network-policy-deny-all.yaml
   ```

2. **調査**:
   ```bash
   # アクセスログ確認
   kubectl logs deployment/rosterhub-api -n rosterhub | grep "401\|403\|suspicious"
   
   # 不審な API キー使用確認
   psql -c "SELECT * FROM api_key_audit_logs ORDER BY created_at DESC LIMIT 100"
   ```

3. **対処**:
   - 不正 API キーを無効化
   - ログを保全
   - インシデントレポート作成

### 6.2 データ破損

1. **即時対応**:
   ```bash
   # 書き込み停止
   kubectl scale deployment rosterhub-api --replicas=0 -n rosterhub
   ```

2. **復旧手順**:
   ```bash
   # 最新バックアップからリストア
   psql -d rosterhub < /backups/latest_backup.sql
   
   # または Point-in-Time Recovery
   pg_restore -d rosterhub -j 4 /backups/latest.dump
   ```

3. **確認**:
   ```bash
   # データ整合性確認
   psql -c "SELECT COUNT(*) FROM users"
   psql -c "SELECT COUNT(*) FROM orgs"
   ```

### 6.3 フェイルオーバー

```bash
# レプリカ DB への切り替え（PostgreSQL）
# 1. アプリケーション接続を停止
kubectl scale deployment rosterhub-api --replicas=0 -n rosterhub

# 2. レプリカをプライマリに昇格
kubectl exec -it postgres-replica-0 -n rosterhub -- pg_ctl promote

# 3. 接続先を更新
kubectl edit secret rosterhub-secrets -n rosterhub
# DATABASE_URL を新しいプライマリに変更

# 4. アプリケーション再起動
kubectl scale deployment rosterhub-api --replicas=3 -n rosterhub
```

---

## 7. スケーリング手順

### 7.1 水平スケーリング

```bash
# 手動スケール
kubectl scale deployment rosterhub-api --replicas=5 -n rosterhub

# HPA による自動スケール確認
kubectl get hpa rosterhub-api -n rosterhub
```

### 7.2 垂直スケーリング

```yaml
# リソース制限の更新
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

---

## 8. メンテナンス手順

### 8.1 計画メンテナンス

1. **事前通知**: 24時間前にユーザーに通知
2. **メンテナンスモード有効化**:
   ```bash
   kubectl set env deployment/rosterhub-api MAINTENANCE_MODE=true -n rosterhub
   ```
3. **作業実施**
4. **メンテナンスモード解除**:
   ```bash
   kubectl set env deployment/rosterhub-api MAINTENANCE_MODE=false -n rosterhub
   ```

### 8.2 アップグレード手順

```bash
# 1. 新バージョンイメージをビルド
docker build -t rosterhub/api:v1.1.0 .

# 2. イメージをプッシュ
docker push rosterhub/api:v1.1.0

# 3. ローリングアップデート
kubectl set image deployment/rosterhub-api api=rosterhub/api:v1.1.0 -n rosterhub

# 4. 進行状況確認
kubectl rollout status deployment/rosterhub-api -n rosterhub

# 5. 問題があればロールバック
kubectl rollout undo deployment/rosterhub-api -n rosterhub
```

---

## 9. 連絡先

| 役割 | 連絡先 | 対応時間 |
|------|--------|----------|
| 運用チーム | ops@example.com | 24/7 |
| 開発チーム | dev@example.com | 営業日 9:00-18:00 |
| セキュリティ | security@example.com | 24/7 |

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-01-13 | 1.0.0 | 初版作成 |

---

*最終更新: 2025-01-13*
