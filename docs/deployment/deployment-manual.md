# RosterHub デプロイメントマニュアル

**バージョン**: 1.0.0
**最終更新日**: 2025-11-15
**対象読者**: システム管理者、インフラエンジニア
**前提知識**: Linux基本操作、Docker基礎知識

---

## 目次

1. [概要](#概要)
2. [システム要件](#システム要件)
3. [事前準備](#事前準備)
4. [開発環境デプロイ](#開発環境デプロイ)
5. [ステージング環境デプロイ](#ステージング環境デプロイ)
6. [本番環境デプロイ](#本番環境デプロイ)
7. [データベース初期設定](#データベース初期設定)
8. [セキュリティ設定](#セキュリティ設定)
9. [バックアップ設定](#バックアップ設定)
10. [監視・ヘルスチェック](#監視ヘルスチェック)
11. [トラブルシューティング](#トラブルシューティング)
12. [チェックリスト](#チェックリスト)

---

## 概要

### RosterHubアーキテクチャ

RosterHubは以下のコンポーネントで構成されています:

```
┌─────────────────────────────────────────────────┐
│                   Nginx (HTTPS)                 │
│           (Reverse Proxy / Load Balancer)       │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              NestJS API Application             │
│         (OneRoster REST API Endpoints)          │
└─────┬──────────────────────────────────┬────────┘
      │                                  │
┌─────▼──────────────┐    ┌──────────────▼────────┐
│  PostgreSQL 15     │    │      Redis 7          │
│  (Main Database)   │    │  (Cache + Queue)      │
└────────────────────┘    └───────────────────────┘
```

**サービス構成**:
- **Nginx**: HTTPSリバースプロキシ、レート制限
- **NestJS API**: OneRoster v1.2 REST APIアプリケーション
- **PostgreSQL 15**: メインデータベース (ユーザー、組織、クラス等)
- **Redis 7**: APIキーキャッシュ、レート制限、BullMQジョブキュー

---

## システム要件

### ハードウェア要件

#### 開発環境
- **CPU**: 2コア以上
- **メモリ**: 4 GB以上
- **ディスク**: 20 GB以上 (SSD推奨)

#### ステージング環境
- **CPU**: 4コア以上
- **メモリ**: 8 GB以上
- **ディスク**: 50 GB以上 (SSD推奨)

#### 本番環境
- **CPU**: 8コア以上 (推奨: 16コア)
- **メモリ**: 16 GB以上 (推奨: 32 GB)
- **ディスク**: 500 GB以上 (SSD必須)
- **バックアップ用ストレージ**: 500 GB以上 (別ドライブ推奨)

### ソフトウェア要件

#### OS (サポート対象)
- **Ubuntu**: 22.04 LTS / 24.04 LTS (推奨)
- **Debian**: 11 (Bullseye) / 12 (Bookworm)
- **Rocky Linux**: 9.x
- **Amazon Linux**: 2023

#### 必須ソフトウェア
- **Docker**: 20.10 以上
- **Docker Compose**: 2.0 以上 (Docker Desktop含む)
- **Git**: 2.x 以上

#### 推奨ソフトウェア
- **curl**: HTTPリクエストテスト用
- **jq**: JSON整形用
- **htop**: リソース監視用
- **vim / nano**: 設定ファイル編集用

### ネットワーク要件

#### ファイアウォール設定

| ポート | プロトコル | 用途 | 公開範囲 |
|--------|-----------|------|----------|
| 22 | TCP | SSH管理 | 管理者IPのみ |
| 80 | TCP | HTTP (HTTPS転送用) | インターネット |
| 443 | TCP | HTTPS (API) | インターネット |
| 5432 | TCP | PostgreSQL | ローカルのみ |
| 6379 | TCP | Redis | ローカルのみ |

#### 帯域幅要件
- **最小**: 100 Mbps
- **推奨**: 1 Gbps (大量CSV処理時)

---

## 事前準備

### 1. サーバーセットアップ

#### Ubuntu 22.04 LTS の場合

```bash
# システムアップデート
sudo apt-get update
sudo apt-get upgrade -y

# 基本パッケージインストール
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    vim \
    htop \
    jq

# タイムゾーン設定 (日本時間)
sudo timedatectl set-timezone Asia/Tokyo

# ホスト名設定 (本番環境の場合)
sudo hostnamectl set-hostname rosterhub-prod
```

### 2. Dockerインストール

```bash
# Dockerの公式GPGキー追加
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Dockerリポジトリ追加
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Dockerインストール
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Dockerサービス起動
sudo systemctl enable docker
sudo systemctl start docker

# インストール確認
docker --version
docker compose version
```

**期待される出力**:
```
Docker version 24.0.x, build xxxxx
Docker Compose version v2.x.x
```

### 3. Dockerユーザー設定 (オプション)

```bash
# 現在のユーザーをdockerグループに追加
sudo usermod -aG docker $USER

# グループ変更を反映 (再ログインまたは以下を実行)
newgrp docker

# 確認 (sudoなしで実行可能)
docker ps
```

### 4. ファイアウォール設定

```bash
# UFW (Ubuntu Firewall) インストール
sudo apt-get install -y ufw

# デフォルトポリシー設定
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要なポート開放
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# ファイアウォール有効化
sudo ufw enable

# ステータス確認
sudo ufw status verbose
```

### 5. リポジトリクローン

```bash
# 作業ディレクトリ作成
sudo mkdir -p /opt/rosterhub
sudo chown $USER:$USER /opt/rosterhub

# リポジトリクローン
cd /opt/rosterhub
git clone https://github.com/your-organization/RosterHub.git .

# ブランチ確認
git branch -a
git checkout main  # または develop
```

---

## 開発環境デプロイ

### 概要

開発環境は**ローカルマシンまたは開発サーバー**で実行します。Adminerが含まれます。

### 手順

#### 1. 環境変数ファイル作成

```bash
cd /opt/rosterhub

# テンプレートをコピー
cp .env.docker.example .env

# 開発環境用の設定
cat << 'EOF' > .env
# ============================================
# 開発環境設定
# ============================================
NODE_ENV=development
API_PORT=3000

# ============================================
# PostgreSQL (開発用デフォルト)
# ============================================
POSTGRES_USER=rosterhub
POSTGRES_PASSWORD=rosterhub_dev_password
POSTGRES_DB=rosterhub_dev
POSTGRES_PORT=5432

# ============================================
# Redis (開発用デフォルト)
# ============================================
REDIS_PASSWORD=rosterhub_redis_dev

# ============================================
# JWT (開発用デフォルト)
# ============================================
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRATION=24h

# ============================================
# セキュリティ (開発環境は緩和)
# ============================================
API_KEY_ENABLED=false
IP_WHITELIST_ENABLED=false
RATE_LIMIT_ENABLED=false

# ============================================
# 監査ログ
# ============================================
AUDIT_LOG_ENABLED=true

# ============================================
# CSV処理
# ============================================
CSV_UPLOAD_MAX_SIZE=52428800
CSV_BATCH_SIZE=1000

# ============================================
# OneRoster
# ============================================
ONEROSTER_VERSION=1.2
JAPAN_PROFILE_VERSION=1.2.2

# ============================================
# Adminer (開発環境)
# ============================================
ADMINER_PORT=8080
EOF
```

#### 2. サービス起動 (開発プロファイル)

```bash
# 開発プロファイルで起動 (Adminer含む)
docker compose --profile development up -d

# 起動確認
docker compose ps
```

**期待される出力**:
```
NAME                  COMMAND                  SERVICE     STATUS      PORTS
rosterhub-adminer     "entrypoint.sh php..."   adminer     running     0.0.0.0:8080->8080/tcp
rosterhub-api         "dumb-init -- node..."   api         running     0.0.0.0:3000->3000/tcp
rosterhub-postgres    "docker-entrypoint..."   postgres    running     0.0.0.0:5432->5432/tcp
rosterhub-redis       "docker-entrypoint..."   redis       running     0.0.0.0:6379->6379/tcp
```

#### 3. データベース初期化

```bash
# マイグレーション実行
docker compose exec api npx prisma migrate deploy

# マイグレーションステータス確認
docker compose exec api npx prisma migrate status
```

#### 4. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/health

# 期待されるレスポンス
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}

# Adminer (データベース管理UI)
# ブラウザで http://localhost:8080 にアクセス
# System: PostgreSQL
# Server: postgres
# Username: rosterhub
# Password: rosterhub_dev_password
# Database: rosterhub_dev
```

#### 5. ログ確認

```bash
# 全サービスのログ表示 (リアルタイム)
docker compose logs -f

# 特定サービスのログ表示
docker compose logs -f api
docker compose logs -f postgres
docker compose logs -f redis
```

### 開発環境のシャットダウン

```bash
# サービス停止 (データは保持)
docker compose stop

# サービス停止 & コンテナ削除 (データは保持)
docker compose down

# すべて削除 (データも削除) - 注意!
docker compose down -v
```

---

## ステージング環境デプロイ

### 概要

ステージング環境は**本番環境のミラー**です。本番デプロイ前のテストに使用します。

### 手順

#### 1. サーバー準備

```bash
# ステージングサーバーにSSH接続
ssh user@staging.rosterhub.example.com

# 作業ディレクトリ作成
sudo mkdir -p /opt/rosterhub
sudo chown $USER:$USER /opt/rosterhub
cd /opt/rosterhub

# リポジトリクローン
git clone https://github.com/your-organization/RosterHub.git .
git checkout develop  # ステージングはdevelopブランチ
```

#### 2. 環境変数ファイル作成

```bash
# セキュアなパスワード生成
POSTGRES_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# .env ファイル作成
cat << EOF > .env
# ============================================
# ステージング環境設定
# ============================================
NODE_ENV=production
API_PORT=3000

# ============================================
# PostgreSQL
# ============================================
POSTGRES_USER=rosterhub
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=rosterhub_staging
POSTGRES_PORT=5432

# ============================================
# Redis
# ============================================
REDIS_PASSWORD=${REDIS_PASSWORD}

# ============================================
# JWT
# ============================================
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=1h

# ============================================
# セキュリティ (本番と同じ設定)
# ============================================
API_KEY_ENABLED=true
IP_WHITELIST_ENABLED=false
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# ============================================
# 監査ログ
# ============================================
AUDIT_LOG_ENABLED=true

# ============================================
# CSV処理
# ============================================
CSV_UPLOAD_MAX_SIZE=52428800
CSV_BATCH_SIZE=1000

# ============================================
# OneRoster
# ============================================
ONEROSTER_VERSION=1.2
JAPAN_PROFILE_VERSION=1.2.2

# ============================================
# Nginx
# ============================================
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
EOF

# パスワード情報を安全に保存
echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" >> /opt/rosterhub/.passwords
echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> /opt/rosterhub/.passwords
echo "JWT_SECRET=${JWT_SECRET}" >> /opt/rosterhub/.passwords
chmod 600 /opt/rosterhub/.passwords
```

#### 3. SSL証明書設定 (Let's Encrypt)

```bash
# Certbotインストール
sudo apt-get install -y certbot

# 証明書取得 (Nginxを起動していない状態で)
sudo certbot certonly --standalone \
    -d staging.rosterhub.example.com \
    --email admin@example.com \
    --agree-tos \
    --non-interactive

# 証明書をNginxディレクトリにコピー
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/staging.rosterhub.example.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/staging.rosterhub.example.com/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem

# 自動更新設定 (cronで毎月1日2時に実行)
sudo crontab -e
# 以下を追加:
# 0 2 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/staging.rosterhub.example.com/fullchain.pem /opt/rosterhub/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/staging.rosterhub.example.com/privkey.pem /opt/rosterhub/nginx/ssl/key.pem && cd /opt/rosterhub && docker compose restart nginx
```

#### 4. サービス起動 (本番プロファイル)

```bash
# 本番プロファイルで起動 (Nginx含む)
docker compose --profile production up -d --build

# 起動確認
docker compose ps
```

**期待される出力**:
```
NAME                  COMMAND                  SERVICE     STATUS      PORTS
rosterhub-api         "dumb-init -- node..."   api         running     0.0.0.0:3000->3000/tcp
rosterhub-nginx       "/docker-entrypoint..."  nginx       running     0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
rosterhub-postgres    "docker-entrypoint..."   postgres    running     5432/tcp
rosterhub-redis       "docker-entrypoint..."   redis       running     6379/tcp
```

#### 5. データベース初期化

```bash
# マイグレーション実行
docker compose exec api npx prisma migrate deploy

# シードデータ投入 (オプション)
docker compose exec api npm run seed  # seedスクリプトがある場合
```

#### 6. 動作確認

```bash
# ローカルヘルスチェック
curl http://localhost:3000/health

# HTTPS経由のヘルスチェック
curl https://staging.rosterhub.example.com/health

# 期待されるレスポンス
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}
```

---

## 本番環境デプロイ

### 概要

本番環境は**最高レベルのセキュリティと可用性**が必要です。

### デプロイ前チェックリスト

- [ ] ステージング環境で十分なテストを実施済み
- [ ] データベースバックアップ体制が整っている
- [ ] SSL証明書が有効
- [ ] セキュリティパッチが最新
- [ ] ロールバック手順を確認済み
- [ ] 監視体制が整っている
- [ ] 緊急連絡先リストが準備済み

### 手順

#### 1. サーバー準備

```bash
# 本番サーバーにSSH接続
ssh user@rosterhub.example.com

# 作業ディレクトリ作成
sudo mkdir -p /opt/rosterhub
sudo chown $USER:$USER /opt/rosterhub
cd /opt/rosterhub

# リポジトリクローン
git clone https://github.com/your-organization/RosterHub.git .
git checkout main  # 本番はmainブランチ

# タグ確認 (本番は必ずタグでデプロイ)
git tag -l
git checkout tags/v1.0.0  # 最新の安定版タグ
```

#### 2. 環境変数ファイル作成 (本番用)

```bash
# 非常に強力なパスワード生成 (32-64文字)
POSTGRES_PASSWORD=$(openssl rand -base64 48)
REDIS_PASSWORD=$(openssl rand -base64 48)
JWT_SECRET=$(openssl rand -base64 96)

# .env ファイル作成
cat << EOF > .env
# ============================================
# 本番環境設定
# ============================================
NODE_ENV=production
API_PORT=3000

# ============================================
# PostgreSQL (本番)
# ============================================
POSTGRES_USER=rosterhub
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=rosterhub_production
POSTGRES_PORT=5432

# ============================================
# Redis (本番)
# ============================================
REDIS_PASSWORD=${REDIS_PASSWORD}

# ============================================
# JWT (本番)
# ============================================
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=1h

# ============================================
# セキュリティ (すべて有効化)
# ============================================
API_KEY_ENABLED=true
IP_WHITELIST_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# ============================================
# 監査ログ (必須)
# ============================================
AUDIT_LOG_ENABLED=true

# ============================================
# CSV処理
# ============================================
CSV_UPLOAD_MAX_SIZE=52428800
CSV_BATCH_SIZE=1000

# ============================================
# OneRoster
# ============================================
ONEROSTER_VERSION=1.2
JAPAN_PROFILE_VERSION=1.2.2

# ============================================
# Nginx (本番)
# ============================================
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
EOF

# パスワード情報を暗号化して保存
echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" >> /opt/rosterhub/.passwords
echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> /opt/rosterhub/.passwords
echo "JWT_SECRET=${JWT_SECRET}" >> /opt/rosterhub/.passwords
chmod 400 /opt/rosterhub/.passwords  # 読み取り専用

# パスワードをパスワード管理ツールにも保存 (推奨)
# 例: 1Password, Bitwarden, AWS Secrets Manager, etc.
```

#### 3. SSL証明書設定 (本番用)

```bash
# Certbotインストール
sudo apt-get install -y certbot

# 本番ドメインの証明書取得
sudo certbot certonly --standalone \
    -d rosterhub.example.com \
    -d www.rosterhub.example.com \
    --email admin@example.com \
    --agree-tos \
    --non-interactive

# 証明書をNginxディレクトリにコピー
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/rosterhub.example.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/rosterhub.example.com/privkey.pem nginx/ssl/key.pem
sudo chown $USER:$USER nginx/ssl/*
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem

# 自動更新設定
sudo crontab -e
# 以下を追加:
# 0 2 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/rosterhub.example.com/fullchain.pem /opt/rosterhub/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/rosterhub.example.com/privkey.pem /opt/rosterhub/nginx/ssl/key.pem && cd /opt/rosterhub && docker compose restart nginx
```

#### 4. サービス起動 (本番)

```bash
# 本番プロファイルで起動
docker compose --profile production up -d --build

# 起動確認
docker compose ps

# ログ確認
docker compose logs -f api
```

#### 5. データベース初期化

```bash
# マイグレーション実行
docker compose exec api npx prisma migrate deploy

# マイグレーション確認
docker compose exec api npx prisma migrate status
```

#### 6. 初期データ投入 (本番)

```bash
# PostgreSQL直接接続
docker compose exec postgres psql -U rosterhub rosterhub_production

# 管理者APIキー作成
INSERT INTO api_keys (key, name, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'System Administrator',
    true,
    NOW(),
    NOW()
);

# 作成されたAPIキーを取得 (後で使用)
SELECT key, name FROM api_keys WHERE name = 'System Administrator';

# 許可IPアドレス追加 (学校ネットワークのIPなど)
INSERT INTO ip_whitelist (ip_address, description, is_active, created_at, updated_at)
VALUES (
    '203.0.113.0/24',  # 学校ネットワークのCIDR
    'School Network',
    true,
    NOW(),
    NOW()
);

# 終了
\q
```

**重要**: 生成されたAPIキーを安全に保存してください。

#### 7. 動作確認 (本番)

```bash
# ローカルヘルスチェック
curl http://localhost:3000/health

# HTTPS経由のヘルスチェック
curl https://rosterhub.example.com/health

# API動作確認 (APIキー必要)
API_KEY="your-generated-api-key"

# ユーザー一覧取得テスト
curl -X GET "https://rosterhub.example.com/api/v1.2/users" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json"

# 期待されるレスポンス (空の配列またはユーザーリスト)
# {"users":[],"pagination":{"total":0,"offset":0,"limit":100,"hasMore":false}}
```

#### 8. セキュリティ最終チェック

```bash
# SSLテスト (SSL Labs相当のチェック)
curl -I https://rosterhub.example.com

# 期待されるヘッダー確認
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: no-referrer-when-downgrade

# APIキーなしでアクセス (401エラーになること)
curl -X GET "https://rosterhub.example.com/api/v1.2/users"

# 期待されるレスポンス
# {"statusCode":401,"message":"Unauthorized"}
```

---

## データベース初期設定

### 1. 管理者APIキー作成

```bash
# PostgreSQLシェル接続
docker compose exec postgres psql -U rosterhub rosterhub_production

# APIキー作成
INSERT INTO api_keys (key, name, description, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'School A LMS Integration',
    'API key for School A Learning Management System',
    true,
    NOW(),
    NOW()
);

# 複数のAPIキー作成例
INSERT INTO api_keys (key, name, description, is_active, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'School B Portal', 'School B Student Portal', true, NOW(), NOW()),
    (gen_random_uuid(), 'Test Integration', 'Test environment API key', true, NOW(), NOW());

# 作成されたAPIキー確認
SELECT key, name, description, is_active, created_at FROM api_keys ORDER BY created_at DESC;

# 終了
\q
```

### 2. IPホワイトリスト設定

```bash
# PostgreSQLシェル接続
docker compose exec postgres psql -U rosterhub rosterhub_production

# IPアドレス追加 (単一IP)
INSERT INTO ip_whitelist (ip_address, description, is_active, created_at, updated_at)
VALUES (
    '203.0.113.50',
    'School A Server',
    true,
    NOW(),
    NOW()
);

# CIDR形式でネットワーク追加 (サブネット全体)
INSERT INTO ip_whitelist (ip_address, description, is_active, created_at, updated_at)
VALUES (
    '203.0.113.0/24',
    'School B Network',
    true,
    NOW(),
    NOW()
);

# 複数IP追加例
INSERT INTO ip_whitelist (ip_address, description, is_active, created_at, updated_at)
VALUES
    ('192.168.1.100', 'Development Server', true, NOW(), NOW()),
    ('10.0.0.0/8', 'Internal Network', true, NOW(), NOW());

# 設定確認
SELECT ip_address, description, is_active, created_at FROM ip_whitelist ORDER BY created_at DESC;

# 終了
\q
```

### 3. 組織(Org)マスターデータ投入

```bash
# PostgreSQLシェル接続
docker compose exec postgres psql -U rosterhub rosterhub_production

# サンプル組織データ投入
INSERT INTO orgs (sourced_id, status, date_last_modified, name, type, identifier, parent_sourced_id, metadata, created_at, updated_at)
VALUES
    (
        'org-00001',
        'active',
        NOW(),
        '東京都教育委員会',
        'district',
        'tokyo-edu',
        NULL,
        '{}',
        NOW(),
        NOW()
    ),
    (
        'org-00002',
        'active',
        NOW(),
        '渋谷区立第一小学校',
        'school',
        'shibuya-elem-001',
        'org-00001',
        '{"jp": {"schoolCode": "13113001"}}',
        NOW(),
        NOW()
    );

# 終了
\q
```

---

## セキュリティ設定

### 1. ファイアウォール設定 (再確認)

```bash
# UFWステータス確認
sudo ufw status verbose

# 許可されているポート
# 22/tcp (SSH) - ALLOW IN from 管理者IP
# 80/tcp (HTTP) - ALLOW IN from Anywhere
# 443/tcp (HTTPS) - ALLOW IN from Anywhere

# SSH接続を管理者IPのみに制限 (推奨)
sudo ufw delete allow 22/tcp
sudo ufw allow from 203.0.113.100 to any port 22 proto tcp comment 'Admin SSH'

# 設定反映
sudo ufw reload
```

### 2. fail2ban設定 (ブルートフォース攻撃対策)

```bash
# fail2banインストール
sudo apt-get install -y fail2ban

# Nginx用設定ファイル作成
sudo tee /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF

# fail2ban設定
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 7200
EOF

# fail2ban起動
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# ステータス確認
sudo fail2ban-client status
```

### 3. 定期的なセキュリティアップデート

```bash
# unattended-upgradesインストール
sudo apt-get install -y unattended-upgrades

# 自動更新有効化
sudo dpkg-reconfigure -plow unattended-upgrades

# 設定確認
cat /etc/apt/apt.conf.d/50unattended-upgrades
```

---

## バックアップ設定

### 1. データベースバックアップスクリプト

```bash
# バックアップスクリプト作成
sudo tee /opt/rosterhub/scripts/backup-database.sh << 'EOF'
#!/bin/bash

# バックアップ設定
BACKUP_DIR="/opt/rosterhub/backups"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

# バックアップディレクトリ作成
mkdir -p $BACKUP_DIR

# PostgreSQLバックアップ
cd /opt/rosterhub
docker compose exec -T postgres pg_dump -U rosterhub rosterhub_production > $BACKUP_DIR/db-backup-$DATE.sql

# 圧縮
gzip $BACKUP_DIR/db-backup-$DATE.sql

# 古いバックアップ削除 (30日以上前)
find $BACKUP_DIR -name "db-backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete

# ログ出力
echo "[$(date)] Backup completed: $BACKUP_DIR/db-backup-$DATE.sql.gz"

# バックアップサイズ確認
du -sh $BACKUP_DIR
EOF

# 実行権限付与
sudo chmod +x /opt/rosterhub/scripts/backup-database.sh

# バックアップディレクトリ作成
sudo mkdir -p /opt/rosterhub/backups
sudo chown $USER:$USER /opt/rosterhub/backups
```

### 2. cronでバックアップ自動化

```bash
# cronジョブ追加
crontab -e

# 毎日午前2時にバックアップ実行
# 0 2 * * * /opt/rosterhub/scripts/backup-database.sh >> /var/log/rosterhub-backup.log 2>&1

# 毎週日曜日午前3時にバックアップ実行 (週次)
# 0 3 * * 0 /opt/rosterhub/scripts/backup-database.sh >> /var/log/rosterhub-backup.log 2>&1
```

### 3. バックアップ確認

```bash
# 手動バックアップ実行テスト
/opt/rosterhub/scripts/backup-database.sh

# バックアップファイル確認
ls -lh /opt/rosterhub/backups/

# 出力例
# -rw-r--r-- 1 user user 2.5M Nov 15 02:00 db-backup-20251115-020000.sql.gz
```

### 4. リストア手順 (緊急時)

```bash
# サービス停止
cd /opt/rosterhub
docker compose stop api

# バックアップから復元
gunzip < /opt/rosterhub/backups/db-backup-20251115-020000.sql.gz | \
    docker compose exec -T postgres psql -U rosterhub rosterhub_production

# サービス再起動
docker compose start api

# 動作確認
curl https://rosterhub.example.com/health
```

---

## 監視・ヘルスチェック

### 1. ヘルスチェックエンドポイント

```bash
# API ヘルスチェック
curl https://rosterhub.example.com/health

# 期待されるレスポンス (正常時)
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}

# 異常時のレスポンス例
{
  "status": "error",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "down" }
  },
  "error": {
    "redis": { "status": "down", "message": "Connection timeout" }
  }
}
```

### 2. ログ監視スクリプト

```bash
# ログ監視スクリプト作成
sudo tee /opt/rosterhub/scripts/monitor-logs.sh << 'EOF'
#!/bin/bash

# ログファイルパス
LOG_DIR="/opt/rosterhub/apps/api/logs"
ERROR_LOG="$LOG_DIR/error.log"
ACCESS_LOG="$LOG_DIR/access.log"

# エラーログから過去1時間のエラーをカウント
ERROR_COUNT=$(docker compose exec -T api sh -c "grep 'ERROR' /app/logs/error.log | tail -100" | wc -l)

# アラート閾値
THRESHOLD=10

if [ $ERROR_COUNT -gt $THRESHOLD ]; then
    echo "[ALERT] High error count detected: $ERROR_COUNT errors in last 100 lines"
    # メール通知やSlack通知をここに追加
else
    echo "[OK] Error count: $ERROR_COUNT"
fi
EOF

# 実行権限付与
sudo chmod +x /opt/rosterhub/scripts/monitor-logs.sh

# cronで5分ごとに実行
crontab -e
# */5 * * * * /opt/rosterhub/scripts/monitor-logs.sh >> /var/log/rosterhub-monitor.log 2>&1
```

### 3. リソース監視

```bash
# Docker Statsでリソース使用状況確認
docker stats

# 出力例
CONTAINER ID   NAME                CPU %     MEM USAGE / LIMIT     MEM %     NET I/O
abc123         rosterhub-api       5.00%     512MiB / 16GiB       3.13%     1.2GB / 850MB
def456         rosterhub-postgres  2.50%     1.2GiB / 16GiB       7.50%     500MB / 300MB
ghi789         rosterhub-redis     0.50%     256MiB / 16GiB       1.56%     100MB / 80MB
```

### 4. ディスク使用量監視

```bash
# ディスク使用量確認スクリプト
sudo tee /opt/rosterhub/scripts/check-disk.sh << 'EOF'
#!/bin/bash

# ディスク使用量チェック
DISK_USAGE=$(df -h /opt/rosterhub | awk 'NR==2 {print $5}' | sed 's/%//')

# アラート閾値 (80%)
THRESHOLD=80

if [ $DISK_USAGE -gt $THRESHOLD ]; then
    echo "[ALERT] Disk usage is ${DISK_USAGE}% (threshold: ${THRESHOLD}%)"
    # メール通知をここに追加
else
    echo "[OK] Disk usage: ${DISK_USAGE}%"
fi

# Docker volumesのサイズ確認
echo "Docker volumes:"
docker system df -v | grep -A 10 "Local Volumes"
EOF

# 実行権限付与
sudo chmod +x /opt/rosterhub/scripts/check-disk.sh

# cronで毎日午前6時に実行
crontab -e
# 0 6 * * * /opt/rosterhub/scripts/check-disk.sh >> /var/log/rosterhub-disk.log 2>&1
```

---

## トラブルシューティング

### 問題1: APIコンテナが起動しない

**症状**: `docker compose ps` で api が Exit 1

**原因**: データベース接続エラー、Prisma Clientエラー

**解決方法**:
```bash
# ログ確認
docker compose logs api

# Prisma Client再生成
docker compose exec api npx prisma generate

# データベース接続確認
docker compose exec postgres pg_isready -U rosterhub

# 環境変数確認
docker compose exec api printenv | grep DATABASE_URL

# コンテナ再起動
docker compose restart api
```

### 問題2: データベース接続エラー

**症状**: `Error: Can't reach database server at postgres:5432`

**原因**: PostgreSQLが起動していない、パスワード不一致

**解決方法**:
```bash
# PostgreSQL起動確認
docker compose ps postgres

# PostgreSQLログ確認
docker compose logs postgres

# パスワード確認 (.envファイル)
cat .env | grep POSTGRES_PASSWORD

# データベース直接接続テスト
docker compose exec postgres psql -U rosterhub -d rosterhub_production

# 接続できない場合はコンテナ再起動
docker compose restart postgres
docker compose restart api
```

### 問題3: SSL証明書エラー

**症状**: HTTPS接続時に証明書エラー

**原因**: 証明書期限切れ、証明書ファイルパス間違い

**解決方法**:
```bash
# 証明書有効期限確認
sudo certbot certificates

# 証明書の存在確認
ls -la nginx/ssl/

# 証明書手動更新
sudo certbot renew

# 証明書再コピー
sudo cp /etc/letsencrypt/live/rosterhub.example.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/rosterhub.example.com/privkey.pem nginx/ssl/key.pem

# Nginx再起動
docker compose restart nginx
```

### 問題4: メモリ不足エラー

**症状**: コンテナがOOMで終了

**原因**: メモリ不足、メモリリーク

**解決方法**:
```bash
# メモリ使用状況確認
free -h
docker stats

# Dockerリソース制限設定 (docker-compose.yml)
# services:
#   api:
#     deploy:
#       resources:
#         limits:
#           memory: 2G
#         reservations:
#           memory: 512M

# 不要なコンテナ・イメージ削除
docker system prune -a --volumes

# コンテナ再起動
docker compose restart
```

### 問題5: CSV インポートが遅い

**症状**: 大量データのCSVインポートに時間がかかる

**原因**: バッチサイズが小さい、データベースインデックス不足

**解決方法**:
```bash
# バッチサイズ増加 (.env)
CSV_BATCH_SIZE=5000  # デフォルト1000から増加

# PostgreSQLパフォーマンスチューニング
docker compose exec postgres psql -U rosterhub rosterhub_production

# インデックス確認
\di

# 不足しているインデックス追加例
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_date_last_modified ON users(date_last_modified);

# VACUUM実行 (テーブル最適化)
VACUUM ANALYZE users;

\q

# サービス再起動
docker compose restart api
```

---

## チェックリスト

### デプロイ前チェックリスト

#### インフラ準備
- [ ] サーバーのスペックが要件を満たしている
- [ ] Dockerがインストールされている (20.10以上)
- [ ] Docker Composeがインストールされている (2.0以上)
- [ ] ファイアウォールが適切に設定されている
- [ ] SSL証明書が取得されている
- [ ] ドメインのDNS設定が完了している

#### コード準備
- [ ] リポジトリのクローンが完了している
- [ ] 正しいブランチ/タグがチェックアウトされている (本番はmain)
- [ ] .envファイルが作成され、全ての環境変数が設定されている
- [ ] パスワードが強力で、安全に保管されている

#### セキュリティ
- [ ] POSTGRES_PASSWORDが強力 (32文字以上)
- [ ] REDIS_PASSWORDが強力 (32文字以上)
- [ ] JWT_SECRETが強力 (64文字以上)
- [ ] API_KEY_ENABLEDがtrueに設定されている
- [ ] RATE_LIMIT_ENABLEDがtrueに設定されている
- [ ] AUDIT_LOG_ENABLEDがtrueに設定されている
- [ ] (本番のみ) IP_WHITELIST_ENABLEDがtrueに設定されている

### デプロイ後チェックリスト

#### サービス起動確認
- [ ] `docker compose ps` で全サービスが running
- [ ] `docker compose logs api` でエラーがない
- [ ] ヘルスチェックエンドポイントが200 OKを返す

#### データベース確認
- [ ] マイグレーションが正常に完了している
- [ ] 初期データ (APIキー、IPホワイトリスト) が投入されている
- [ ] バックアップスクリプトが動作する

#### セキュリティ確認
- [ ] HTTPS接続が動作する (HTTPは自動転送)
- [ ] APIキーなしのリクエストが401を返す
- [ ] 許可されていないIPからのアクセスが拒否される (本番のみ)
- [ ] レート制限が動作する

#### 監視・バックアップ確認
- [ ] バックアップcronジョブが登録されている
- [ ] ログ監視スクリプトが動作する
- [ ] ディスク監視スクリプトが動作する
- [ ] SSL証明書自動更新が設定されている

#### ドキュメント確認
- [ ] パスワード情報が安全に保管されている
- [ ] APIキーがドキュメント化されている
- [ ] 緊急連絡先リストが準備されている
- [ ] ロールバック手順が確認されている

---

## 付録

### A. 便利なコマンド集

```bash
# サービス一覧
docker compose ps

# ログ表示 (リアルタイム)
docker compose logs -f

# 特定サービスのログ表示
docker compose logs -f api

# コンテナ内シェルアクセス
docker compose exec api sh

# PostgreSQLシェルアクセス
docker compose exec postgres psql -U rosterhub rosterhub_production

# Redis CLIアクセス
docker compose exec redis redis-cli -a <REDIS_PASSWORD>

# リソース使用状況
docker stats

# ディスク使用状況
docker system df

# 不要リソース削除
docker system prune -a --volumes

# コンテナ再起動
docker compose restart

# サービス停止
docker compose stop

# サービス起動
docker compose start

# サービス削除 (データは保持)
docker compose down

# すべて削除 (データも削除)
docker compose down -v
```

### B. 環境変数一覧

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| NODE_ENV | ○ | production | Node環境 (development/production) |
| API_PORT | ○ | 3000 | APIポート |
| POSTGRES_USER | ○ | rosterhub | PostgreSQLユーザー名 |
| POSTGRES_PASSWORD | ○ | - | PostgreSQLパスワード |
| POSTGRES_DB | ○ | rosterhub_production | PostgreSQLデータベース名 |
| REDIS_PASSWORD | ○ | - | Redisパスワード |
| JWT_SECRET | ○ | - | JWT署名シークレット |
| JWT_EXPIRATION | - | 1h | JWTトークン有効期限 |
| API_KEY_ENABLED | - | true | APIキー認証有効化 |
| IP_WHITELIST_ENABLED | - | false | IPホワイトリスト有効化 |
| RATE_LIMIT_ENABLED | - | true | レート制限有効化 |
| RATE_LIMIT_TTL | - | 60 | レート制限時間窓 (秒) |
| RATE_LIMIT_MAX | - | 100 | レート制限最大リクエスト数 |
| AUDIT_LOG_ENABLED | - | true | 監査ログ有効化 |
| CSV_UPLOAD_MAX_SIZE | - | 52428800 | CSVファイル最大サイズ (バイト) |
| CSV_BATCH_SIZE | - | 1000 | CSVバッチ処理サイズ |

### C. ポート一覧

| ポート | サービス | プロトコル | 公開 | 用途 |
|--------|---------|-----------|------|------|
| 22 | SSH | TCP | 管理者のみ | サーバー管理 |
| 80 | Nginx | HTTP | インターネット | HTTP→HTTPS転送 |
| 443 | Nginx | HTTPS | インターネット | API公開 |
| 3000 | API | HTTP | ローカルのみ | NestJS API |
| 5432 | PostgreSQL | TCP | ローカルのみ | データベース |
| 6379 | Redis | TCP | ローカルのみ | キャッシュ・キュー |
| 8080 | Adminer | HTTP | ローカルのみ | DB管理UI (開発のみ) |

### D. サポート・連絡先

**技術サポート**:
- Email: support@rosterhub.example.com
- Slack: #rosterhub-support

**緊急連絡先**:
- オンコール: +81-XX-XXXX-XXXX
- Email: emergency@rosterhub.example.com

**ドキュメント**:
- GitHub: https://github.com/your-org/RosterHub
- Wiki: https://wiki.rosterhub.example.com

---

**最終更新**: 2025-11-15
**バージョン**: 1.0.0
**作成者**: RosterHub Development Team
