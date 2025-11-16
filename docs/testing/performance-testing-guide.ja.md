# パフォーマンステストガイド

このドキュメントは、RosterHub OneRoster APIのパフォーマンステスト実行に関する包括的なガイドラインを提供します。

## 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [テストシナリオ](#テストシナリオ)
- [テストの実行](#テストの実行)
- [結果の解釈](#結果の解釈)
- [ベースラインメトリクス](#ベースラインメトリクス)
- [パフォーマンス目標](#パフォーマンス目標)
- [CI/CD統合](#cicd統合)
- [トラブルシューティング](#トラブルシューティング)

## 概要

RosterHubは、パフォーマンステストと負荷テストに[k6](https://k6.io/)を使用しています。テストスイートには、さまざまな負荷条件下でAPIパフォーマンスを検証するための複数のシナリオが含まれています。

### テストアーキテクチャ

```
apps/api/test/performance/
├── k6.config.js           # 共通k6設定
├── helpers.js             # 共有ユーティリティとメトリクス
├── scenarios/
│   ├── baseline.js        # ベースラインパフォーマンステスト
│   ├── load.js           # 通常負荷テスト
│   ├── stress.js         # ストレステスト（限界点の発見）
│   └── spike.js          # スパイクテスト（急激なトラフィック増加）
└── results/              # テスト結果ディレクトリ
```

## 前提条件

### 1. k6のインストール

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows (Chocolatey):**
```powershell
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

### 2. テスト環境の準備

1. **APIサーバーの起動:**
   ```bash
   npm run start:dev
   ```

2. **テスト用APIキーの作成:**
   ```bash
   # 既存のAPIキーを使用するか、API経由で新規作成
   export API_KEY="your-test-api-key"
   ```

3. **テストデータの準備（オプション）:**
   ```bash
   npm run seed:performance
   ```

## テストシナリオ

### 1. ベースラインテスト

**目的:** ベースラインパフォーマンスメトリクスの確立

**設定:**
- 仮想ユーザー: 10
- 期間: 1分
- 操作: すべてのエンドポイントで多様な操作

**実行:**
```bash
cd apps/api/test/performance
k6 run scenarios/baseline.js
```

### 2. ロードテスト

**目的:** 通常負荷下でのパフォーマンス検証

**設定:**
- ランプアップ: 0 → 100 VUs、2分間
- 定常状態: 100 VUs、5分間
- ランプダウン: 100 → 0 VUs、1分間
- 合計期間: 8分

**実行:**
```bash
k6 run scenarios/load.js
```

### 3. ストレステスト

**目的:** 限界点の発見

**設定:**
- ランプアップ: 0 → 300 VUs、7分間
- ピーク: 300 VUs、3分間
- ランプダウン: 300 → 0 VUs、2分間
- 合計期間: 12分

**実行:**
```bash
k6 run scenarios/stress.js
```

### 4. スパイクテスト

**目的:** 急激なトラフィック増加に対する耐性テスト

**設定:**
- 通常: 10 VUs、1分間
- スパイク: 10 → 200 VUs、10秒間
- 保持: 200 VUs、1分間
- ドロップ: 200 → 10 VUs、10秒間
- 回復: 10 VUs、1分間

**実行:**
```bash
k6 run scenarios/spike.js
```

## テストの実行

### 基本的な使用方法

```bash
# パフォーマンステストディレクトリに移動
cd apps/api/test/performance

# 特定のシナリオを実行
k6 run scenarios/baseline.js

# カスタムAPI URLで実行
k6 run --env API_URL=https://api.example.com scenarios/baseline.js

# カスタムAPIキーで実行
k6 run --env API_KEY=your-api-key scenarios/baseline.js

# 結果をJSONに出力
k6 run --out json=results/baseline-$(date +%Y%m%d-%H%M%S).json scenarios/baseline.js
```

### Dockerでの使用

```bash
docker run --rm -i \
  -v $(pwd):/scripts \
  -e API_URL=http://host.docker.internal:3000 \
  -e API_KEY=test-api-key \
  grafana/k6:latest run /scripts/scenarios/baseline.js
```

### 高度なオプション

```bash
# HTMLサマリーレポート付きで実行
k6 run --summary-export=results/summary.json scenarios/load.js

# InfluxDB出力で実行（Grafana可視化用）
k6 run --out influxdb=http://localhost:8086/k6 scenarios/load.js

# カスタム閾値で実行
k6 run --env THRESHOLD_P95=300 scenarios/baseline.js
```

## 結果の解釈

### 主要メトリクス

#### HTTPリクエスト時間
```
http_req_duration..............: avg=245ms  min=50ms  med=200ms  max=1.2s  p(90)=350ms p(95)=450ms
```

- **avg**: 平均レスポンス時間
- **med (p50)**: 中央値レスポンス時間（50パーセンタイル）
- **p(90)**: 90パーセンタイル（90%のリクエストがこれより速い）
- **p(95)**: 95パーセンタイル ⚠️ **主要SLAメトリクス**
- **p(99)**: 99パーセンタイル
- **max**: 最大レスポンス時間

#### リクエストレート
```
http_reqs......................: 12450  207.5/s
```

- 総リクエスト数と秒あたりのリクエスト数

#### エラーレート
```
http_req_failed................: 0.12%  ✓ 15   ✗ 12435
```

- 失敗したリクエストの割合

### 成功基準

✅ **合格** 条件:
- p(95)レスポンス時間 < 目標閾値
- エラーレート < 1%
- すべての閾値が緑

⚠️ **警告** 条件:
- p(95)が閾値に接近（10%以内）
- エラーレート 1-5%

❌ **不合格** 条件:
- p(95)が閾値を超過
- エラーレート > 5%
- 重要な閾値が赤

## ベースラインメトリクス

### 目標レスポンス時間（p95）

| エンドポイント              | 目標 (ms) | 許容 (ms) |
|------------------------|-------------|-----------------|
| GET /users             | 300         | 400            |
| GET /users/:id         | 200         | 300            |
| GET /orgs              | 250         | 300            |
| GET /orgs/:id          | 150         | 250            |
| GET /classes           | 300         | 400            |
| GET /classes/:id       | 200         | 300            |
| GET /courses           | 250         | 300            |
| GET /courses/:id       | 150         | 250            |
| GET /enrollments       | 350         | 500            |
| GET /enrollments/:id   | 200         | 300            |
| GET /demographics      | 300         | 400            |
| GET /demographics/:id  | 200         | 300            |
| GET /academicSessions  | 250         | 300            |
| GET /academicSessions/:id | 150      | 250            |
| GET /csv/export/*      | 1500        | 2000           |
| POST /csv/import       | 500         | 1000           |

### スループット目標

| 負荷レベル    | リクエスト/秒 | 同時ユーザー |
|--------------|-------------|------------------|
| 軽負荷        | 50          | 10               |
| 通常負荷       | 100-200     | 50-100           |
| 重負荷        | 200-500     | 100-300          |
| ピーク        | 500+        | 300+             |

### エラーレート閾値

| テストタイプ    | 最大エラーレート |
|-------------|---------------|
| ベースライン    | 0.1%          |
| ロード        | 1%            |
| ストレス      | 5%            |
| スパイク       | 10%           |

## パフォーマンス目標

### フェーズ2の目標

1. **ベースライン確立** ✅
   - すべてのエンドポイント測定
   - メトリクス文書化
   - CI/CD統合

2. **ロードテスト**（目標: 第2週）
   - 100同時ユーザー
   - < 1%エラーレート
   - p(95) < 500ms

3. **ストレステスト**（目標: 第3週）
   - 限界点の発見（目標: 300+ VUs）
   - グレースフルデグラデーション
   - エラー回復の検証

4. **最適化**（目標: 第4週）
   - p(95)レスポンス時間50%改善
   - データベースクエリ最適化
   - キャッシング実装

## CI/CD統合

### GitHub Actionsの例

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # 毎日午前2時
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start API
        run: docker-compose up -d api

      - name: Run Baseline Test
        run: |
          docker run --rm -i \
            -v $(pwd)/apps/api/test/performance:/scripts \
            -e API_URL=http://api:3000 \
            -e API_KEY=${{ secrets.PERF_API_KEY }} \
            --network=host \
            grafana/k6:latest run /scripts/scenarios/baseline.js \
            --summary-export=/scripts/results/summary.json

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: apps/api/test/performance/results/

      - name: Check Thresholds
        run: |
          # summary.jsonを解析して閾値をチェック
          # 閾値不合格の場合はexit 1
```

### 継続的パフォーマンス監視

1. **日次ベースラインテスト** - パフォーマンストレンドの追跡
2. **リリース前ロードテスト** - デプロイ前の検証
3. **デプロイ後検証** - パフォーマンス劣化がないことを確認
4. **閾値違反アラート** - 即座に通知

## トラブルシューティング

### 高レスポンス時間

**症状:** p(95) > 1000ms

**考えられる原因:**
1. データベースクエリパフォーマンス
2. インデックスの欠如
3. N+1クエリ問題
4. 非効率的なデータシリアライゼーション

**解決策:**
1. Prismaクエリログを有効化
2. スロークエリログを確認
3. データベースインデックスを追加
4. レスポンスキャッシングを実装
5. 事前ロード（Eager loading）を最適化

### 高エラーレート

**症状:** エラーレート > 5%

**考えられる原因:**
1. データベース接続プールの枯渇
2. メモリリーク
3. CPUスロットリング
4. ネットワークタイムアウト

**解決策:**
1. 接続プールサイズを増やす
2. メモリ使用トレンドを確認
3. 水平スケーリング
4. リソース集約的な操作の最適化

### 接続エラー

**症状:** `connection refused`または`timeout`エラー

**考えられる原因:**
1. APIサーバーが起動していない
2. 誤ったAPI URL
3. ネットワークファイアウォールによるブロック
4. 開いている接続が多すぎる

**解決策:**
1. APIサーバーのステータスを確認
2. API_URL環境変数を確認
3. ファイアウォールルールを確認
4. サーバー接続上限を増やす

### 一貫性のない結果

**症状:** レスポンス時間の大きなばらつき

**考えられる原因:**
1. データベースがウォームアップされていない
2. キャッシュのコールドスタート
3. バックグラウンドプロセスの干渉
4. 共有テスト環境

**解決策:**
1. テスト前にウォームアップ期間を設ける
2. 専用テスト環境を使用
3. テスト中はバックグラウンドジョブを無効化
4. 一貫したテストデータを確保

## ベストプラクティス

1. **常に独立した環境でテストを実行**
   - 専用テストサーバー
   - 別のデータベース
   - 本番トラフィックなし

2. **変更前にベースラインを確立**
   - ベースラインテストを実行
   - 現在のメトリクスを文書化
   - 変更後に比較

3. **現実的なテストデータを使用**
   - 本番環境に近いデータ量
   - 代表的なクエリパターン
   - Japan Profileメタデータを含む

4. **システムリソースを監視**
   - CPU使用率
   - メモリ消費
   - データベース接続
   - ネットワーク帯域幅

5. **発見を文書化**
   - テスト結果を保存
   - 時系列でトレンドを追跡
   - チームと知見を共有

## リソース

- [k6ドキュメント](https://k6.io/docs/)
- [OneRoster v1.2仕様](https://www.imsglobal.org/oneroster-v12-final-specification)
- [RosterHub APIドキュメント](../api/README.md)
- [パフォーマンス最適化ガイド](./performance-optimization.md)

## サポート

質問や問題がある場合:
- GitHubでissueを作成
- DevOpsチームに連絡
- #performanceのSlackチャンネルを確認
