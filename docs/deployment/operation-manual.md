# RosterHub 運用マニュアル

**バージョン**: 1.0.0
**最終更新日**: 2025-11-15
**対象読者**: 運用担当者、システム管理者
**前提知識**: RosterHubの基本概念、デプロイ完了済み

---

## 目次

1. [日常運用](#日常運用)
2. [定期メンテナンス](#定期メンテナンス)
3. [アップデート手順](#アップデート手順)
4. [スケールアップ・スケールアウト](#スケールアップスケールアウト)
5. [障害対応](#障害対応)
6. [パフォーマンスチューニング](#パフォーマンスチューニング)
7. [セキュリティ運用](#セキュリティ運用)
8. [APIキー管理](#apiキー管理)
9. [データ管理](#データ管理)
10. [よくある質問 (FAQ)](#よくある質問-faq)

---

## 日常運用

### 毎日の確認事項

#### 1. サービス稼働確認 (所要時間: 5分)

```bash
# ヘルスチェック実行
curl -f https://rosterhub.example.com/health

# 期待される結果
# HTTP 200 OK
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}

# 異常時のアクション
# - HTTP 503またはエラーレスポンス → サービス再起動
# - タイムアウト → ネットワーク確認、Nginx確認
```

#### 2. ログ確認 (所要時間: 10分)

```bash
# エラーログ確認 (過去24時間)
docker compose logs --since 24h api | grep -i error | tail -50

# アクセスログ確認 (リクエスト数)
docker compose logs --since 24h nginx | wc -l

# 異常パターン
# - 同一エラーが大量発生 → 調査・修正必要
# - リクエスト数が通常の10倍以上 → DDoS攻撃の可能性
# - データベース接続エラー → PostgreSQL確認
```

#### 3. リソース使用状況確認 (所要時間: 5分)

```bash
# Docker Stats
docker stats --no-stream

# 確認ポイント
# - CPU使用率: 通常 < 50% (ピーク時 < 80%)
# - メモリ使用率: 通常 < 60% (ピーク時 < 80%)
# - ディスク使用率: < 70%

# 異常時のアクション
# - CPU 80%超が継続 → スケールアップ検討
# - メモリ 80%超が継続 → メモリリーク調査またはスケールアップ
# - ディスク 70%超 → 古いログ・バックアップ削除
```

#### 4. バックアップ確認 (所要時間: 3分)

```bash
# 最新バックアップ確認
ls -lht /opt/rosterhub/backups/ | head -5

# 確認ポイント
# - 最新バックアップが24時間以内
# - ファイルサイズが極端に小さくない (> 1MB)
# - バックアップログにエラーがない

# バックアップログ確認
tail -20 /var/log/rosterhub-backup.log

# 異常時のアクション
# - バックアップ未実行 → 手動バックアップ実行
# - ファイルサイズ異常 → バックアップスクリプト確認
```

### 週次の確認事項

#### 1. セキュリティログ確認 (所要時間: 15分)

```bash
# 不正アクセス試行確認
sudo journalctl -u fail2ban --since "1 week ago" | grep "Ban"

# 監査ログ確認 (不審なAPI呼び出し)
docker compose exec postgres psql -U rosterhub rosterhub_production -c "
SELECT
    api_key,
    endpoint,
    COUNT(*) as request_count,
    MAX(created_at) as last_access
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY api_key, endpoint
ORDER BY request_count DESC
LIMIT 20;
"

# 確認ポイント
# - 異常に多いリクエスト (> 10,000/日)
# - 未知のAPIキー
# - 深夜帯の大量アクセス
```

#### 2. ディスク使用量確認 (所要時間: 10分)

```bash
# ディスク使用量確認
df -h /opt/rosterhub

# Dockerボリューム確認
docker system df -v

# 大容量ファイル検索
du -sh /opt/rosterhub/* | sort -rh | head -10

# クリーンアップ (必要に応じて)
# 古いバックアップ削除 (30日以上前)
find /opt/rosterhub/backups -name "*.sql.gz" -mtime +30 -delete

# Dockerリソース削除
docker system prune -a --volumes --filter "until=720h"  # 30日前
```

#### 3. SSL証明書有効期限確認 (所要時間: 5分)

```bash
# 証明書有効期限確認
sudo certbot certificates

# 確認ポイント
# - 有効期限が30日以上先
# - 証明書ステータスが VALID

# 期限が30日以内の場合
sudo certbot renew
sudo cp /etc/letsencrypt/live/rosterhub.example.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/rosterhub.example.com/privkey.pem nginx/ssl/key.pem
docker compose restart nginx
```

### 月次の確認事項

#### 1. パフォーマンスレポート作成 (所要時間: 30分)

```bash
# API呼び出し統計
docker compose exec postgres psql -U rosterhub rosterhub_production -c "
SELECT
    DATE(created_at) as date,
    endpoint,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time_ms
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), endpoint
ORDER BY date DESC, request_count DESC;
" > /opt/rosterhub/reports/monthly-api-stats-$(date +%Y%m).txt

# データベースサイズ推移
docker compose exec postgres psql -U rosterhub rosterhub_production -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" > /opt/rosterhub/reports/monthly-db-size-$(date +%Y%m).txt
```

#### 2. セキュリティパッチ適用 (所要時間: 1時間)

```bash
# システムアップデート
sudo apt-get update
sudo apt-get upgrade -y

# Dockerイメージ更新
cd /opt/rosterhub
docker compose pull
docker compose up -d

# マイグレーション実行 (新バージョンの場合)
docker compose exec api npx prisma migrate deploy

# 動作確認
curl -f https://rosterhub.example.com/health
```

---

## 定期メンテナンス

### データベースメンテナンス

#### 毎週実行: VACUUM ANALYZE (所要時間: 10-30分)

```bash
# PostgreSQL接続
docker compose exec postgres psql -U rosterhub rosterhub_production

-- 全テーブルのVACUUM ANALYZE
VACUUM ANALYZE;

-- 個別テーブルのVACUUM (大容量テーブルのみ)
VACUUM ANALYZE users;
VACUUM ANALYZE enrollments;
VACUUM ANALYZE audit_logs;

-- 統計情報確認
SELECT
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY last_vacuum DESC;

\q
```

#### 毎月実行: インデックス再構築 (所要時間: 30分-2時間)

```bash
# PostgreSQL接続
docker compose exec postgres psql -U rosterhub rosterhub_production

-- インデックスの肥大化確認
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexrelname)
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- インデックス再構築 (CONCURRENTLY使用で停止時間なし)
REINDEX INDEX CONCURRENTLY users_pkey;
REINDEX INDEX CONCURRENTLY users_username_key;
REINDEX INDEX CONCURRENTLY idx_users_status;
REINDEX INDEX CONCURRENTLY idx_users_date_last_modified;

\q
```

### Redisメンテナンス

#### 毎日実行: キャッシュクリア (所要時間: 1分)

```bash
# Redis CLI接続
docker compose exec redis redis-cli -a <REDIS_PASSWORD>

# キャッシュ統計確認
INFO stats

# 期限切れキー削除
SCAN 0 COUNT 1000

# メモリ使用状況確認
INFO memory

# 終了
quit
```

### ログローテーション

#### 毎週実行: ログファイル圧縮・削除 (所要時間: 10分)

```bash
# ログローテーションスクリプト作成
sudo tee /opt/rosterhub/scripts/rotate-logs.sh << 'EOF'
#!/bin/bash

LOG_DIR="/opt/rosterhub/apps/api/logs"
RETENTION_DAYS=30

# ログファイル圧縮 (7日以上前)
find $LOG_DIR -name "*.log" -mtime +7 ! -name "*.gz" -exec gzip {} \;

# 圧縮ログ削除 (30日以上前)
find $LOG_DIR -name "*.log.gz" -mtime +$RETENTION_DAYS -delete

# Dockerログローテーション
docker compose logs --no-color --no-log-prefix > /opt/rosterhub/logs/docker-$(date +%Y%m%d).log
gzip /opt/rosterhub/logs/docker-$(date +%Y%m%d).log

# 古いDockerログ削除
find /opt/rosterhub/logs -name "docker-*.log.gz" -mtime +30 -delete

echo "[$(date)] Log rotation completed"
EOF

# 実行権限付与
sudo chmod +x /opt/rosterhub/scripts/rotate-logs.sh

# cronジョブ追加 (毎週日曜日 午前4時)
crontab -e
# 0 4 * * 0 /opt/rosterhub/scripts/rotate-logs.sh >> /var/log/rosterhub-logrotate.log 2>&1
```

---

## アップデート手順

### マイナーバージョンアップデート (例: v1.0.0 → v1.1.0)

**所要時間**: 30分-1時間
**ダウンタイム**: 約5分

#### 事前準備

```bash
# 1. バックアップ作成
/opt/rosterhub/scripts/backup-database.sh

# 2. 現在のバージョン確認
cd /opt/rosterhub
git describe --tags

# 3. リリースノート確認
# https://github.com/your-org/RosterHub/releases
```

#### アップデート実行

```bash
# 1. 最新コード取得
git fetch --tags
git checkout tags/v1.1.0

# 2. .env ファイル確認 (新しい環境変数がある場合は追加)
diff .env.docker.example .env

# 3. Dockerイメージ再ビルド
docker compose build --no-cache

# 4. サービス停止
docker compose down

# 5. サービス起動 (新バージョン)
docker compose --profile production up -d

# 6. マイグレーション実行
docker compose exec api npx prisma migrate deploy

# 7. 動作確認
curl -f https://rosterhub.example.com/health

# 8. ログ確認
docker compose logs -f api
```

#### ロールバック手順 (問題発生時)

```bash
# 1. サービス停止
docker compose down

# 2. 旧バージョンに戻す
git checkout tags/v1.0.0

# 3. Dockerイメージ再ビルド
docker compose build --no-cache

# 4. データベース復元
gunzip < /opt/rosterhub/backups/db-backup-YYYYMMDD-HHMMSS.sql.gz | \
    docker compose exec -T postgres psql -U rosterhub rosterhub_production

# 5. サービス起動
docker compose --profile production up -d

# 6. 動作確認
curl -f https://rosterhub.example.com/health
```

### メジャーバージョンアップデート (例: v1.x → v2.0)

**所要時間**: 2-4時間
**ダウンタイム**: 30分-1時間
**注意**: 破壊的変更が含まれる可能性があるため、必ずステージング環境でテスト

#### 事前準備 (本番実施の1週間前)

```bash
# 1. ステージング環境で完全テスト
# 2. APIクライアントへの事前通知 (破壊的変更がある場合)
# 3. ロールバック手順の確認
# 4. メンテナンス時間の調整 (利用者への通知)
```

#### アップデート実行 (本番環境)

```bash
# 1. メンテナンスモード有効化 (Nginxで503返す)
sudo tee /opt/rosterhub/nginx/maintenance.conf << 'EOF'
server {
    listen 80 default_server;
    listen 443 ssl default_server;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    return 503 "System maintenance in progress. Please try again later.";
}
EOF

docker compose restart nginx

# 2. フルバックアップ作成
/opt/rosterhub/scripts/backup-database.sh

# バックアップファイルを別サーバーにコピー (推奨)
scp /opt/rosterhub/backups/db-backup-*.sql.gz backup-server:/backups/

# 3. アップデート実行 (マイナーバージョンと同様)
git fetch --tags
git checkout tags/v2.0.0
docker compose build --no-cache
docker compose down
docker compose --profile production up -d
docker compose exec api npx prisma migrate deploy

# 4. データ移行スクリプト実行 (ある場合)
docker compose exec api npm run migrate:v2

# 5. 動作確認
curl -f https://rosterhub.example.com/health

# 6. 機能テスト (すべてのエンドポイント確認)
# - ユーザー一覧取得
# - CSV インポート
# - CSV エクスポート
# - フィルタリング

# 7. メンテナンスモード解除
rm /opt/rosterhub/nginx/maintenance.conf
docker compose restart nginx

# 8. 本番監視 (1時間)
docker compose logs -f api
```

---

## スケールアップ・スケールアウト

### 垂直スケール (Vertical Scaling) - リソース増強

#### CPUとメモリの増強

**手順**:
1. サーバーのリソース増強 (AWS/Azure/GCPでインスタンスタイプ変更)
2. PostgreSQLのメモリ設定調整
3. サービス再起動

```bash
# PostgreSQLメモリ設定調整
docker compose exec postgres psql -U rosterhub rosterhub_production

-- shared_buffers増加 (メモリの25%推奨)
-- max_connections増加
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET effective_cache_size = '12GB';

-- 設定反映
SELECT pg_reload_conf();

\q

# サービス再起動
docker compose restart postgres
```

### 水平スケール (Horizontal Scaling) - サーバー追加

#### ロードバランサー構成

**アーキテクチャ**:
```
                Internet
                    |
            [Load Balancer]
                    |
        +-----------+-----------+
        |                       |
    [API Server 1]         [API Server 2]
        |                       |
        +-----------+-----------+
                    |
            [PostgreSQL Master]
                    |
            [PostgreSQL Replica]
```

**手順**:

1. **PostgreSQL レプリケーション設定**

```bash
# マスターサーバーでレプリケーションユーザー作成
docker compose exec postgres psql -U rosterhub rosterhub_production

CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replication_password';

\q

# レプリカサーバー設定 (別サーバー)
# docker-compose.yml に環境変数追加
# POSTGRES_REPLICATION_MODE=replica
# POSTGRES_MASTER_HOST=master-server-ip
# POSTGRES_REPLICATION_USER=replicator
# POSTGRES_REPLICATION_PASSWORD=replication_password
```

2. **APIサーバー複製**

```bash
# サーバー2でRosterHubセットアップ
# - 同じ.envファイルを使用
# - DATABASE_URLはリードレプリカを指定 (読み取り専用クエリ用)
# - Nginxは無効化 (ロードバランサーを使用)

docker compose up -d api postgres redis
```

3. **ロードバランサー設定 (Nginx)**

```nginx
upstream api_backend {
    least_conn;  # 最小コネクション数でルーティング
    server api-server-1:3000 max_fails=3 fail_timeout=30s;
    server api-server-2:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name rosterhub.example.com;

    location / {
        proxy_pass http://api_backend;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}
```

---

## 障害対応

### 障害レベル定義

| レベル | 影響範囲 | 対応時間 | 例 |
|--------|----------|----------|-----|
| P0 (Critical) | 全サービス停止 | 即座 (15分以内) | データベースダウン、APIサーバーダウン |
| P1 (High) | 一部機能停止 | 1時間以内 | CSV インポート失敗、認証エラー |
| P2 (Medium) | パフォーマンス低下 | 4時間以内 | レスポンス遅延、メモリ使用率高 |
| P3 (Low) | 軽微な問題 | 1営業日以内 | ログ警告、軽微なUI不具合 |

### P0 障害対応フロー

#### 1. 初動対応 (0-5分)

```bash
# 1. 障害確認
curl -f https://rosterhub.example.com/health

# 2. サービスステータス確認
docker compose ps

# 3. 緊急連絡 (Slack/メール/電話)
# - 開発チームリーダー
# - インフラ担当
# - ビジネス担当
```

#### 2. 原因調査 (5-15分)

```bash
# ログ確認
docker compose logs --tail=100 api
docker compose logs --tail=100 postgres
docker compose logs --tail=100 nginx

# リソース確認
docker stats --no-stream
free -h
df -h

# ネットワーク確認
ping -c 3 rosterhub.example.com
curl -I https://rosterhub.example.com
```

#### 3. 復旧作業 (15-30分)

**パターンA: サービス再起動で復旧**
```bash
docker compose restart api
docker compose logs -f api
curl -f https://rosterhub.example.com/health
```

**パターンB: データベース復旧**
```bash
docker compose restart postgres
# または
docker compose down
docker compose up -d
```

**パターンC: 完全ロールバック**
```bash
# 前バージョンに戻す
git checkout tags/v1.0.0
docker compose down
docker compose build --no-cache
docker compose --profile production up -d
```

#### 4. 事後対応 (30分-1時間)

```bash
# 1. 障害報告書作成
# - 発生時刻
# - 影響範囲
# - 原因
# - 対応内容
# - 再発防止策

# 2. ポストモーテム実施 (1週間以内)
# - 根本原因分析
# - プロセス改善
# - モニタリング強化
```

### よくある障害パターンと対処法

#### 障害1: データベース接続タイムアウト

**症状**: API が 500エラー、ログに `Connection timeout`

**原因**: PostgreSQL接続プール枯渇

**対処法**:
```bash
# 接続数確認
docker compose exec postgres psql -U rosterhub rosterhub_production -c \
    "SELECT count(*) FROM pg_stat_activity;"

# アイドル接続終了
docker compose exec postgres psql -U rosterhub rosterhub_production -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"

# max_connections増加 (恒久対策)
docker compose exec postgres psql -U rosterhub rosterhub_production -c \
    "ALTER SYSTEM SET max_connections = 200;"

docker compose restart postgres
```

#### 障害2: メモリ不足 (OOM Kill)

**症状**: コンテナが突然停止、`docker logs` に OOM

**原因**: メモリリーク、大量データ処理

**対処法**:
```bash
# メモリ制限設定 (docker-compose.yml)
services:
  api:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

# サービス再起動
docker compose down
docker compose --profile production up -d

# メモリ監視強化
docker stats
```

#### 障害3: ディスク容量不足

**症状**: データベース書き込みエラー、ログ出力停止

**原因**: ログファイル肥大化、バックアップ肥大化

**対処法**:
```bash
# ディスク使用量確認
df -h /opt/rosterhub

# 大容量ファイル検索
du -sh /opt/rosterhub/* | sort -rh | head -10

# クリーンアップ
# 古いバックアップ削除
find /opt/rosterhub/backups -name "*.sql.gz" -mtime +7 -delete

# Dockerリソース削除
docker system prune -a --volumes

# ログ圧縮
find /opt/rosterhub/apps/api/logs -name "*.log" -exec gzip {} \;
```

---

## パフォーマンスチューニング

### PostgreSQL チューニング

#### 基本設定 (16GB RAM サーバーの場合)

```bash
docker compose exec postgres psql -U rosterhub rosterhub_production

-- 共有バッファ (メモリの25%)
ALTER SYSTEM SET shared_buffers = '4GB';

-- 実効キャッシュサイズ (メモリの75%)
ALTER SYSTEM SET effective_cache_size = '12GB';

-- ワークメモリ (RAM / max_connections / 2)
ALTER SYSTEM SET work_mem = '40MB';

-- メンテナンスワークメモリ
ALTER SYSTEM SET maintenance_work_mem = '1GB';

-- WAL設定
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- クエリプランナー
ALTER SYSTEM SET random_page_cost = 1.1;  -- SSD使用の場合

-- 接続設定
ALTER SYSTEM SET max_connections = 200;

-- 設定反映
SELECT pg_reload_conf();

\q

# PostgreSQL再起動 (shared_buffers変更時は必須)
docker compose restart postgres
```

#### インデックス最適化

```bash
docker compose exec postgres psql -U rosterhub rosterhub_production

-- 頻繁に使用されるクエリのインデックス追加

-- ユーザーテーブル
CREATE INDEX CONCURRENTLY idx_users_status ON users(status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY idx_users_org_sourced_ids ON users USING GIN(org_sourced_ids);
CREATE INDEX CONCURRENTLY idx_users_date_last_modified ON users(date_last_modified);

-- クラステーブル
CREATE INDEX CONCURRENTLY idx_classes_course_sourced_id ON classes(course_sourced_id);
CREATE INDEX CONCURRENTLY idx_classes_school_sourced_id ON classes(school_sourced_id);

-- エンロールメントテーブル
CREATE INDEX CONCURRENTLY idx_enrollments_class_sourced_id ON enrollments(class_sourced_id);
CREATE INDEX CONCURRENTLY idx_enrollments_user_sourced_id ON enrollments(user_sourced_id);
CREATE INDEX CONCURRENTLY idx_enrollments_role ON enrollments(role);

-- 監査ログテーブル (パーティショニング推奨)
CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX CONCURRENTLY idx_audit_logs_api_key ON audit_logs(api_key);

\q
```

### Redis チューニング

```bash
# Redis設定確認
docker compose exec redis redis-cli -a <REDIS_PASSWORD> CONFIG GET maxmemory

# メモリ上限設定 (2GB)
docker compose exec redis redis-cli -a <REDIS_PASSWORD> CONFIG SET maxmemory 2gb

# メモリポリシー設定 (LRU)
docker compose exec redis redis-cli -a <REDIS_PASSWORD> CONFIG SET maxmemory-policy allkeys-lru

# 永続化
docker compose exec redis redis-cli -a <REDIS_PASSWORD> CONFIG SET save "900 1 300 10 60 10000"
```

### NestJS API チューニング

#### 環境変数調整

```bash
# .env ファイル編集
cat << 'EOF' >> .env

# Node.js メモリ上限 (MB)
NODE_OPTIONS=--max-old-space-size=2048

# ワーカープロセス数 (CPUコア数)
WEB_CONCURRENCY=4

# Keep-Alive タイムアウト
KEEP_ALIVE_TIMEOUT=65000

EOF

# サービス再起動
docker compose restart api
```

---

## セキュリティ運用

### 定期的なセキュリティチェック

#### 毎週実行

```bash
# 1. 脆弱性スキャン
docker scan rosterhub-api:latest

# 2. 不正アクセス試行確認
sudo journalctl -u fail2ban --since "1 week ago" | grep "Ban" | wc -l

# 3. 異常なAPIキー使用確認
docker compose exec postgres psql -U rosterhub rosterhub_production -c "
SELECT
    api_key,
    COUNT(*) as request_count,
    MAX(created_at) as last_access
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
  AND (
      response_status >= 400
      OR response_time_ms > 5000
  )
GROUP BY api_key
ORDER BY request_count DESC;
"
```

### セキュリティインシデント対応

#### レベル1: 不正アクセス検知

```bash
# 1. 該当APIキー無効化
docker compose exec postgres psql -U rosterhub rosterhub_production -c \
    "UPDATE api_keys SET is_active = false WHERE key = 'suspected-key';"

# 2. 該当IPアドレスブロック
sudo ufw deny from 203.0.113.100

# 3. 監査ログ調査
docker compose exec postgres psql -U rosterhub rosterhub_production -c "
SELECT * FROM audit_logs
WHERE api_key = 'suspected-key'
ORDER BY created_at DESC
LIMIT 100;
"
```

#### レベル2: データ漏洩疑い

```bash
# 1. 即座にサービス停止
docker compose stop api nginx

# 2. 調査実施
# - アクセスログ分析
# - データベースダンプ取得
# - フォレンジック調査

# 3. 影響範囲特定

# 4. 復旧計画策定

# 5. 関係者への報告
# - 法務部門
# - 個人情報保護委員会
# - 影響を受けたユーザー
```

---

## APIキー管理

### APIキー発行

```bash
# PostgreSQLシェル接続
docker compose exec postgres psql -U rosterhub rosterhub_production

-- 新規APIキー発行
INSERT INTO api_keys (key, name, description, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'School C LMS',
    'API key for School C Learning Management System',
    true,
    NOW(),
    NOW()
)
RETURNING key, name;

-- 発行されたAPIキーをコピーして顧客に提供

\q
```

### APIキー無効化

```bash
docker compose exec postgres psql -U rosterhub rosterhub_production

-- APIキー無効化
UPDATE api_keys
SET is_active = false, updated_at = NOW()
WHERE key = 'api-key-to-disable';

-- 確認
SELECT key, name, is_active FROM api_keys WHERE key = 'api-key-to-disable';

\q
```

### APIキー使用状況確認

```bash
docker compose exec postgres psql -U rosterhub rosterhub_production

-- 過去30日間の使用統計
SELECT
    ak.name,
    ak.key,
    COUNT(al.*) as total_requests,
    COUNT(CASE WHEN al.response_status < 400 THEN 1 END) as success_requests,
    COUNT(CASE WHEN al.response_status >= 400 THEN 1 END) as error_requests,
    MAX(al.created_at) as last_used
FROM api_keys ak
LEFT JOIN audit_logs al ON ak.key = al.api_key
WHERE al.created_at > NOW() - INTERVAL '30 days'
GROUP BY ak.name, ak.key
ORDER BY total_requests DESC;

\q
```

---

## データ管理

### CSV インポート運用

#### 大量データインポート (10万件以上)

```bash
# 1. ピーク時間外に実施 (深夜推奨)

# 2. バックアップ作成
/opt/rosterhub/scripts/backup-database.sh

# 3. バッチサイズ増加
# .env ファイル編集
CSV_BATCH_SIZE=5000

# 4. サービス再起動
docker compose restart api

# 5. CSV アップロード
curl -X POST "https://rosterhub.example.com/api/v1.2/csv/import/users" \
    -H "X-API-Key: your-api-key" \
    -F "file=@users-large.csv"

# 6. ジョブステータス確認
# BullMQ ダッシュボード or ログ確認
docker compose logs -f api | grep "CSV import"

# 7. 完了確認
# 正常終了: "CSV import completed: 100000 records processed"
# エラー: "CSV import failed: ..."
```

### データクリーンアップ

#### 古い監査ログ削除 (90日以上前)

```bash
docker compose exec postgres psql -U rosterhub rosterhub_production

-- 削除対象件数確認
SELECT COUNT(*) FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- 削除実行 (バッチ削除)
DELETE FROM audit_logs
WHERE id IN (
    SELECT id FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '90 days'
    LIMIT 10000
);

-- 完全に削除されるまで繰り返し実行

-- VACUUM実行
VACUUM ANALYZE audit_logs;

\q
```

---

## よくある質問 (FAQ)

### Q1: CSV インポートが遅い。どうすれば高速化できますか？

**A**: 以下の方法を試してください:

1. バッチサイズ増加 (`.env` で `CSV_BATCH_SIZE=5000`)
2. ピーク時間外に実施
3. PostgreSQLのチューニング (shared_buffers, work_mem増加)
4. 一時的にインデックス削除 → インポート → インデックス再作成

```bash
# インデックス削除 (インポート前)
DROP INDEX idx_users_status;
DROP INDEX idx_users_date_last_modified;

# CSV インポート実行

# インデックス再作成 (インポート後)
CREATE INDEX CONCURRENTLY idx_users_status ON users(status);
CREATE INDEX CONCURRENTLY idx_users_date_last_modified ON users(date_last_modified);
```

### Q2: メモリ使用量が増え続けます。メモリリークですか？

**A**: 以下を確認してください:

1. Node.jsのメモリ上限設定 (`NODE_OPTIONS=--max-old-space-size=2048`)
2. Redisのメモリポリシー (`maxmemory-policy allkeys-lru`)
3. PostgreSQL接続プールのリーク確認
4. 定期的なコンテナ再起動 (週次メンテナンス)

### Q3: HTTPS証明書が期限切れになりました。どうすれば更新できますか？

**A**: Let's Encrypt証明書の手動更新:

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/rosterhub.example.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/rosterhub.example.com/privkey.pem nginx/ssl/key.pem
docker compose restart nginx
```

自動更新が設定されていれば、月次で自動更新されます。

### Q4: データベースのディスク容量が足りなくなりました。どうすればいいですか？

**A**: 緊急対応と恒久対策:

**緊急対応**:
```bash
# 古い監査ログ削除 (90日以上前)
# 古いバックアップ削除 (30日以上前)
# Dockerリソース削除
docker system prune -a --volumes
```

**恒久対策**:
1. ディスク増量 (AWS EBS拡張など)
2. 監査ログの定期削除自動化
3. データアーカイブ戦略策定

### Q5: ロールバックしたいのですが、どのバージョンに戻せばいいですか？

**A**: 以下を確認してください:

1. GitHubのリリースノートで安定版を確認
2. ステージング環境で事前テスト
3. バックアップからデータベース復元

**推奨**: 直前の安定版 (例: v1.0.0 → v1.1.0でトラブル → v1.0.0に戻す)

---

**最終更新**: 2025-11-15
**バージョン**: 1.0.0
**作成者**: RosterHub Development Team
