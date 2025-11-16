# CSVアップロード実装ガイド

**RosterHub OneRoster Japan Profile 1.2.2**

本ガイドは、RosterHubにおけるCSVファイルアップロード機能の包括的な実装詳細を提供します。ファイル形式仕様、検証ルール、API使用方法、ベストプラクティスを含みます。

---

## 目次

1. [概要](#概要)
2. [CSVファイル形式](#csvファイル形式)
3. [サポートされているエンティティタイプ](#サポートされているエンティティタイプ)
4. [ファイル要件](#ファイル要件)
5. [APIリファレンス](#apiリファレンス)
6. [実装例](#実装例)
7. [検証ルール](#検証ルール)
8. [エラーハンドリング](#エラーハンドリング)
9. [パフォーマンスに関する考慮事項](#パフォーマンスに関する考慮事項)
10. [セキュリティ](#セキュリティ)
11. [トラブルシューティング](#トラブルシューティング)

---

## 概要

RosterHubは、すべてのOneRoster Japan Profile 1.2.2エンティティの一括データアップロードをサポートする堅牢なCSVインポートシステムを提供します。このシステムは以下を使用します:

- 大容量ファイル(100MB以上)のメモリ効率的な処理のための**ストリーミングパーサー**
- ノンブロッキング操作のためのBullMQによる**バックグラウンドジョブ処理**
- 詳細なエラーレポート付きの**リアルタイム検証**
- 最適なパフォーマンスのための**バッチデータベース挿入**(1バッチ1000レコード)
- 既存レコードの更新または新規挿入のための**アップサート戦略**

### アーキテクチャ

```
クライアント → CSV アップロード → API コントローラー → BullMQ キュー → バックグラウンドワーカー
                                                                               ↓
                                                                      CSV インポートサービス
                                                                               ↓
                                                              ┌────────────────┴────────────────┐
                                                              ↓                                 ↓
                                                        CSV バリデーター                CSV エンティティマッパー
                                                              ↓                                 ↓
                                                        検証 OK                          Prisma エンティティへマップ
                                                              ↓                                 ↓
                                                              └────────────────┬────────────────┘
                                                                               ↓
                                                                         バッチ挿入
                                                                               ↓
                                                                         PostgreSQL
```

---

## CSVファイル形式

### 一般要件

すべてのCSVファイルは、OneRoster Japan Profile 1.2.2仕様に従う必要があります:

1. **形式**: CSV(カンマ区切り値)
2. **文字エンコーディング**: UTF-8(BOM有り/無し両方対応)
3. **改行コード**: LF(`\n`)またはCRLF(`\r\n`)
4. **区切り文字**: カンマ(`,`)
5. **引用文字**: ダブルクォート(`"`) - カンマや引用符を含むフィールド用
6. **ヘッダー行**: 必須(最初の行に列名を含める必要があります)

### ヘッダー行の例

```csv
sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
```

### データ行の例

```csv
user-001,active,2025-01-15T10:00:00Z,true,太郎,山田,student,yamada.taro,yamada.taro@example.jp,タロウ,ヤマダ
```

### Japan Profileメタデータフィールド

Japan Profile拡張は、CSV列名に`metadata.jp.*`プレフィックスを使用します:

| フィールド | 例 | 説明 |
|-----------|-----|------|
| `metadata.jp.kanaGivenName` | タロウ | 名のかな表記(ひらがな/カタカナ) |
| `metadata.jp.kanaFamilyName` | ヤマダ | 姓のかな表記 |
| `metadata.jp.kanaName` | トウキョウトリツコウコウ | 組織名のかな表記 |
| `metadata.jp.orgCode` | TKY-HS-001 | 組織コード |
| `metadata.jp.homeClass` | 1-A | ホームルームクラス |

---

## サポートされているエンティティタイプ

### 1. Users(ユーザー)

**エンティティタイプ**: `users`

**必須フィールド**:
- `sourcedId` - 一意識別子(例: `user-001`)
- `status` - ステータス(`active`または`tobedeleted`)
- `dateLastModified` - 最終更新日時(ISO 8601形式)
- `enabledUser` - ユーザー有効化フラグ(`true`または`false`)
- `givenName` - 名(例: `太郎`)
- `familyName` - 姓(例: `山田`)
- `role` - ユーザーロール([検証ルール](#検証ルール)を参照)
- `username` - ユーザー名(一意、例: `yamada.taro`)
- `email` - メールアドレス
- `identifier` - 代替識別子
- `userIds` - ユーザーID(複数の場合はカンマ区切り)

**Japan Profileフィールド**:
- `metadata.jp.kanaGivenName` - 名のかな表記(例: `タロウ`)
- `metadata.jp.kanaFamilyName` - 姓のかな表記(例: `ヤマダ`)
- `metadata.jp.homeClass` - ホームルームクラス(例: `1-A`)

**CSVの例**:
```csv
sourcedId,status,dateLastModified,enabledUser,givenName,familyName,role,username,email,identifier,userIds,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
user-001,active,2025-01-15T10:00:00Z,true,太郎,山田,student,yamada.taro,yamada.taro@example.jp,user-001-id,,タロウ,ヤマダ
user-002,active,2025-01-15T10:00:00Z,true,花子,佐藤,teacher,sato.hanako,sato.hanako@example.jp,user-002-id,,ハナコ,サトウ
```

### 2. Orgs(組織)

**エンティティタイプ**: `orgs`

**必須フィールド**:
- `sourcedId` - 一意識別子
- `status` - ステータス(`active`または`tobedeleted`)
- `dateLastModified` - 最終更新日時
- `name` - 組織名(例: `東京都立高校`)
- `type` - 組織タイプ([検証ルール](#検証ルール)を参照)
- `identifier` - 代替識別子

**Japan Profileフィールド**:
- `metadata.jp.kanaName` - 組織名のかな表記(例: `トウキョウトリツコウコウ`)
- `metadata.jp.orgCode` - 組織コード(例: `TKY-HS-001`)

**CSVの例**:
```csv
sourcedId,status,dateLastModified,name,type,identifier,metadata.jp.kanaName,metadata.jp.orgCode
org-001,active,2025-01-15T10:00:00Z,東京都立高校,school,tokyo-hs-001,トウキョウトリツコウコウ,TKY-HS-001
```

### 3. Classes(クラス)

**エンティティタイプ**: `classes`

**必須フィールド**:
- `sourcedId` - 一意識別子
- `status` - ステータス
- `dateLastModified` - 最終更新日時
- `title` - クラス名
- `classType` - クラスタイプ(`homeroom`または`scheduled`)
- `courseSourcedId` - コースへの参照
- `schoolSourcedId` - 学校への参照

**CSVの例**:
```csv
sourcedId,status,dateLastModified,title,classType,courseSourcedId,schoolSourcedId
class-001,active,2025-01-15T10:00:00Z,数学I,scheduled,course-001,org-001
```

### 4. Courses(コース)

**エンティティタイプ**: `courses`

**必須フィールド**:
- `sourcedId` - 一意識別子
- `status` - ステータス
- `dateLastModified` - 最終更新日時
- `title` - コース名
- `schoolSourcedId` - 学校への参照(または`orgSourcedId`を使用)

**CSVの例**:
```csv
sourcedId,status,dateLastModified,title,schoolSourcedId
course-001,active,2025-01-15T10:00:00Z,数学I,org-001
```

### 5. Enrollments(在籍情報)

**エンティティタイプ**: `enrollments`

**必須フィールド**:
- `sourcedId` - 一意識別子
- `status` - ステータス
- `dateLastModified` - 最終更新日時
- `classSourcedId` - クラスへの参照
- `schoolSourcedId` - 学校への参照
- `userSourcedId` - ユーザーへの参照
- `role` - 在籍ロール([検証ルール](#検証ルール)を参照)

**CSVの例**:
```csv
sourcedId,status,dateLastModified,classSourcedId,schoolSourcedId,userSourcedId,role
enroll-001,active,2025-01-15T10:00:00Z,class-001,org-001,user-001,student
```

### 6. Academic Sessions(学期)

**エンティティタイプ**: `academicSessions`

**必須フィールド**:
- `sourcedId` - 一意識別子
- `status` - ステータス
- `dateLastModified` - 最終更新日時
- `title` - 学期名
- `type` - 学期タイプ(`gradingPeriod`, `semester`, `schoolYear`, `term`)
- `startDate` - 開始日(ISO 8601形式)
- `endDate` - 終了日(ISO 8601形式)
- `schoolYear` - 年度(例: `2025`)

**CSVの例**:
```csv
sourcedId,status,dateLastModified,title,type,startDate,endDate,schoolYear
session-001,active,2025-01-15T10:00:00Z,2025年度 第1学期,semester,2025-04-01,2025-09-30,2025
```

### 7. Demographics(人口統計)

**エンティティタイプ**: `demographics`

**必須フィールド**:
- `sourcedId` - 一意識別子
- `status` - ステータス
- `dateLastModified` - 最終更新日時

**オプションフィールド**:
- `birthDate` - 生年月日(ISO 8601形式)
- `sex` - 性別(OneRoster仕様値)

**CSVの例**:
```csv
sourcedId,status,dateLastModified,birthDate,sex
demo-001,active,2025-01-15T10:00:00Z,2010-04-01,male
```

---

## ファイル要件

### サイズ制限

- **最大ファイルサイズ**: 100MB
- **推奨ファイルサイズ**: 高速処理のため50MB未満
- **最大レコード数**: ハード制限なし、ただし200,000レコード以上は30分以上かかる可能性

### エンコーディング

- **必須エンコーディング**: UTF-8
- **BOM**: オプション(UTF-8 BOMに対応)
- **代替エンコーディング**: サポートされていません(例: Shift-JIS、EUC-JP)

### ファイル命名

- **拡張子**: `.csv`(必須)
- **命名規則**: 説明的な名前を推奨(例: `users-2025-01-15.csv`)

---

## APIリファレンス

### CSVファイルのアップロード

**エンドポイント**: `POST /ims/oneroster/v1p2/csv/import`

**認証**: 必須(`X-API-Key`ヘッダーにAPIキー)

**リクエスト**:
- **Content-Type**: `multipart/form-data`
- **ボディパラメータ**:
  - `file`(ファイル、必須) - CSVファイル
  - `entityType`(文字列、必須) - エンティティタイプ(`users`, `orgs`, `classes`, `courses`, `enrollments`, `academicSessions`, `demographics`)

**レスポンス**: `202 Accepted`
```json
{
  "jobId": "uuid-job-id",
  "status": "pending",
  "entityType": "users",
  "fileName": "users.csv",
  "fileSize": 1024000,
  "totalRecords": 0,
  "processedRecords": 0,
  "successCount": 0,
  "errorCount": 0,
  "errors": [],
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### ジョブステータスの取得

**エンドポイント**: `GET /ims/oneroster/v1p2/csv/import/:jobId`

**認証**: 必須

**レスポンス**: `200 OK`
```json
{
  "jobId": "uuid-job-id",
  "status": "processing",
  "progress": 65,
  "entityType": "users",
  "fileName": "users.csv",
  "fileSize": 1024000,
  "totalRecords": 10000,
  "processedRecords": 6500,
  "successCount": 6450,
  "errorCount": 50,
  "errors": [
    {
      "line": 123,
      "field": "email",
      "value": "invalid-email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    }
  ],
  "startedAt": "2025-01-15T10:00:00Z",
  "completedAt": null
}
```

### すべてのジョブの一覧

**エンドポイント**: `GET /ims/oneroster/v1p2/csv/import`

**認証**: 必須

**クエリパラメータ**:
- `status`(オプション) - ステータスでフィルタ(`pending`, `processing`, `completed`, `failed`, `cancelled`)
- `entityType`(オプション) - エンティティタイプでフィルタ
- `offset`(オプション) - ページネーションオフセット(デフォルト: 0)
- `limit`(オプション) - ページネーション上限(デフォルト: 20、最大: 100)

**レスポンス**: `200 OK`
```json
{
  "jobs": [
    {
      "jobId": "uuid-job-id",
      "status": "completed",
      "entityType": "users",
      "fileName": "users.csv",
      "totalRecords": 10000,
      "successCount": 9950,
      "errorCount": 50,
      "createdAt": "2025-01-15T10:00:00Z",
      "completedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "offset": 0,
  "limit": 20
}
```

---

## 実装例

### 例1: cURL

```bash
# ユーザーCSVファイルのアップロード
curl -X POST http://localhost:3000/ims/oneroster/v1p2/csv/import \
  -H "X-API-Key: your-api-key" \
  -F "file=@users.csv" \
  -F "entityType=users"

# ジョブステータスの取得
curl -X GET http://localhost:3000/ims/oneroster/v1p2/csv/import/uuid-job-id \
  -H "X-API-Key: your-api-key"
```

### 例2: JavaScript (Fetch API)

```javascript
// CSVファイルのアップロード
async function uploadCSV(file, entityType, apiKey) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);

  const response = await fetch('http://localhost:3000/ims/oneroster/v1p2/csv/import', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`アップロード失敗: ${response.statusText}`);
  }

  const result = await response.json();
  return result.jobId;
}

// ジョブステータスのポーリング
async function pollJobStatus(jobId, apiKey) {
  const response = await fetch(`http://localhost:3000/ims/oneroster/v1p2/csv/import/${jobId}`, {
    headers: {
      'X-API-Key': apiKey,
    },
  });

  const job = await response.json();
  console.log(`ステータス: ${job.status}, 進捗: ${job.progress}%`);

  if (job.status === 'completed') {
    console.log(`成功: ${job.successCount}, エラー: ${job.errorCount}`);
    return job;
  } else if (job.status === 'failed') {
    console.error('ジョブ失敗:', job.errors);
    throw new Error('インポート失敗');
  } else {
    // 5秒後に再度ポーリング
    await new Promise(resolve => setTimeout(resolve, 5000));
    return pollJobStatus(jobId, apiKey);
  }
}

// 使用例
const fileInput = document.getElementById('csvFile');
const file = fileInput.files[0];
const apiKey = 'your-api-key';

try {
  const jobId = await uploadCSV(file, 'users', apiKey);
  console.log('ジョブ作成:', jobId);

  const finalJob = await pollJobStatus(jobId, apiKey);
  console.log('インポート完了:', finalJob);
} catch (error) {
  console.error('インポートエラー:', error);
}
```

### 例3: Python (requests)

```python
import requests
import time

API_BASE_URL = 'http://localhost:3000/ims/oneroster/v1p2/csv'
API_KEY = 'your-api-key'

def upload_csv(file_path, entity_type):
    """CSVファイルをアップロードしてインポートジョブを作成"""
    headers = {'X-API-Key': API_KEY}

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'entityType': entity_type}

        response = requests.post(
            f'{API_BASE_URL}/import',
            headers=headers,
            files=files,
            data=data
        )
        response.raise_for_status()
        return response.json()['jobId']

def get_job_status(job_id):
    """インポートジョブのステータスを取得"""
    headers = {'X-API-Key': API_KEY}

    response = requests.get(
        f'{API_BASE_URL}/import/{job_id}',
        headers=headers
    )
    response.raise_for_status()
    return response.json()

def poll_job_until_complete(job_id, poll_interval=5):
    """完了または失敗するまでジョブステータスをポーリング"""
    while True:
        job = get_job_status(job_id)
        status = job['status']

        print(f"ステータス: {status}, 進捗: {job.get('progress', 0)}%")

        if status == 'completed':
            print(f"成功: {job['successCount']}, エラー: {job['errorCount']}")
            if job['errorCount'] > 0:
                print(f"最初のエラー: {job['errors'][0]}")
            return job
        elif status == 'failed':
            print(f"ジョブ失敗: {job.get('errors', [])}")
            raise Exception('インポートジョブが失敗しました')

        time.sleep(poll_interval)

# 使用例
if __name__ == '__main__':
    job_id = upload_csv('users.csv', 'users')
    print(f'ジョブ作成: {job_id}')

    final_job = poll_job_until_complete(job_id)
    print('インポート完了:', final_job)
```

---

## 検証ルール

### 必須フィールドの検証

各エンティティタイプには特定の必須フィールドがあります。必須フィールドが欠けている場合、検証エラーが発生します。

### データ型の検証

- **ステータス**: `active`または`tobedeleted`である必要があります
- **日付**: ISO 8601形式
  - 日付のみ: `YYYY-MM-DD`(例: `2025-01-15`)
  - 日時: `YYYY-MM-DDTHH:mm:ssZ`(例: `2025-01-15T10:00:00Z`)
- **ブール値**: `true`または`false`(大文字小文字を区別しない)
- **メールアドレス**: 標準的なメール形式(RFC 5322)

### OneRoster列挙型の検証

#### ユーザーロール
- `administrator`(管理者)
- `aide`(補佐)
- `guardian`(保護者)
- `parent`(親)
- `proctor`(監督)
- `relative`(親族)
- `student`(児童生徒)
- `teacher`(教員)

#### 在籍ロール
- `administrator`
- `aide`
- `proctor`
- `student`
- `teacher`

#### 組織タイプ
- `department`(部門)
- `school`(学校)
- `district`(地区)
- `local`(地方)
- `state`(都道府県)
- `national`(国)

#### クラスタイプ
- `homeroom`(ホームルーム)
- `scheduled`(時間割)

#### 学期タイプ
- `gradingPeriod`(評価期間)
- `semester`(学期)
- `schoolYear`(年度)
- `term`(学期)

### Japan Profileの検証

#### かな名の検証

かなフィールド(`metadata.jp.kanaGivenName`, `metadata.jp.kanaFamilyName`, `metadata.jp.kanaName`)には以下のみを含める必要があります:
- **ひらがな**: U+3040–U+309F(あ-ん)
- **カタカナ**: U+30A0–U+30FF(ア-ン)
- **許可される句読点**: スペース、`・`(中黒)、`ー`(長音記号)

**有効な例**:
- `タロウ` ✅
- `ヤマダ` ✅
- `トウキョウトリツコウコウ` ✅
- `あきこ` ✅

**無効な例**:
- `Taro` ❌(ラテン文字を含む)
- `タロウ123` ❌(数字を含む)
- `山田` ❌(漢字を含む)

### ビジネスロジックの検証

- **日付範囲**: `startDate`は`endDate`より前である必要があります(Academic Sessions)
- **一意制約**: `sourcedId`はエンティティタイプ内で一意である必要があります

---

## エラーハンドリング

### エラーレスポンス形式

```json
{
  "line": 123,
  "field": "metadata.jp.kanaGivenName",
  "value": "Taro123",
  "message": "Kana name must contain only hiragana or katakana characters",
  "code": "INVALID_KANA_NAME"
}
```

### 一般的なエラーコード

| コード | 説明 | 解決方法 |
|-------|------|---------|
| `MISSING_REQUIRED_FIELD` | 必須フィールドが欠けている | CSVに欠けているフィールドを追加 |
| `INVALID_STATUS` | 無効なステータス値 | `active`または`tobedeleted`を使用 |
| `INVALID_DATE_FORMAT` | 無効な日付形式 | ISO 8601形式を使用(YYYY-MM-DDまたはYYYY-MM-DDTHH:mm:ssZ) |
| `INVALID_BOOLEAN` | 無効なブール値 | `true`または`false`を使用 |
| `INVALID_EMAIL` | 無効なメール形式 | 有効なメール形式を使用 |
| `INVALID_ENUM_VALUE` | 無効な列挙値 | 許可された列挙値のいずれかを使用 |
| `INVALID_KANA_NAME` | 無効なかな名 | ひらがなまたはカタカナのみを使用 |
| `INVALID_DATE_RANGE` | 開始日が終了日より後 | startDate < endDateを確認 |
| `DUPLICATE_SOURCED_ID` | 重複したsourcedId | 各レコードに一意のsourcedIdを使用 |

### エラー上限

- **報告される最大エラー数**: インポートジョブあたり100エラー
- **動作**: 100以上のエラーが発生した場合、最初の100のみが報告されます
- **ジョブステータス**: エラーがあってもジョブは処理を続けます(部分インポート)

---

## パフォーマンスに関する考慮事項

### ファイルサイズと処理時間

| ファイルサイズ | レコード数 | 推定時間 |
|--------------|----------|---------|
| 1MB | 約5,000レコード | 1分未満 |
| 10MB | 約50,000レコード | 5-10分 |
| 50MB | 約200,000レコード | 20-30分 |
| 100MB | 約400,000レコード | 40-60分 |

### 最適化のヒント

1. **大容量ファイルの分割**: 100MB超のファイルは複数の小さなファイルに分割
2. **不要な列の削除**: 必須および使用する列のみを含める
3. **事前のローカル検証**: アップロード前にCSVファイルを事前検証してエラーを早期発見
4. **オフピーク時のアップロード**: トラフィックの少ない時間帯にアップロードしてサーバー負荷を削減
5. **バッチインポートの使用**: 関連エンティティをグループ化(例: すべてのユーザー、次にすべての組織、次に在籍情報)

### メモリ使用量

- **ストリーミングパーサー**: 行単位で処理(定数メモリ使用量 約50MB)
- **バッチ挿入**: 1回に1000レコードをメモリにバッファリング
- **合計メモリ**: インポートジョブあたり約100-200MB

---

## セキュリティ

### 認証

- **APIキー必須**: すべてのアップロードリクエストに`X-API-Key`ヘッダーに有効なAPIキーを含める必要があります
- **IPホワイトリスト**: APIキーは特定のIPアドレスに制限できます

### ファイルアップロードセキュリティ

- **ファイルサイズ制限**: 100MB(DoS攻撃を防止)
- **ファイルタイプ検証**: `.csv`ファイルのみ受け付け
- **ウイルススキャン**: 未実装(リバースプロキシレベルでの実装を推奨)

### データプライバシー

- **監査ログ**: すべてのインポート操作をタイムスタンプ、ユーザー、IPアドレスとともに記録
- **PII処理**: CSVファイルはサーバーに一時的に保存(処理後の削除を推奨)
- **暗号化**: データ転送中のHTTPS/TLS(インフラレベル)

### レート制限

- **デフォルト制限**: APIキーあたり1000リクエスト/時間
- **適用対象**: アップロードを含むすべてのAPIエンドポイント
- **レスポンスヘッダー**: `X-RateLimit-Remaining`が残りクォータを表示

---

## トラブルシューティング

### 問題1: 413エラーでファイルアップロードが失敗

**問題**: ファイルサイズが制限を超えています

**解決方法**:
- ファイルサイズを削減するか、複数のファイルに分割
- 管理者に連絡してファイルサイズ制限の引き上げを依頼

### 問題2: ジョブステータスが"Failed"を表示

**問題**: インポートジョブが失敗しました

**解決方法**:
1. ジョブステータスレスポンスの`errors`配列を確認
2. 最初のエラーで詳細を確認
3. エラーメッセージに基づいてCSVファイルを修正
4. 修正したファイルを再アップロード

### 問題3: かな名の検証エラー

**問題**: かな名に無効な文字が含まれています

**解決方法**:
- かなフィールドにひらがなまたはカタカナのみが含まれていることを確認
- ラテン文字、漢字、数字を削除
- 変換ツールを使用して漢字をかなに変換

### 問題4: インポート処理が遅い

**問題**: インポートに予想以上の時間がかかります

**解決方法**:
- ファイルサイズを確認(大きなファイルは時間がかかります)
- ステータスAPI経由でジョブの進捗を監視
- サーバーに十分なリソース(CPU、メモリ)があることを確認
- ファイルを小さなバッチに分割することを検討

### 問題5: 重複sourcedIdエラー

**問題**: CSVに重複したsourcedIdが含まれています

**解決方法**:
- 各`sourcedId`がCSVファイル内で一意であることを確認
- Excelまたはスクリプトを使用して重複を特定
- 更新の場合は既存のsourcedIdを使用(アップサートでレコードを更新)

---

## ベストプラクティス

### CSV準備

1. **UTF-8エンコーディングを使用**: ExcelまたはテキストエディターでCSVファイルをUTF-8として保存
2. **ヘッダー行を含める**: 常に最初の行に列名を含める
3. **ローカルで検証**: アップロード前にCSV形式を確認
4. **小さなファイルで最初にテスト**: 形式を確認するために最初に10-100レコードをアップロード

### インポート戦略

1. **順序でインポート**: 依存関係の順序でエンティティをアップロード
   - 組織を最初に
   - ユーザーを2番目に
   - コースを3番目に
   - クラスを4番目に
   - 在籍情報を5番目に
   - 学期を6番目に
   - 人口統計を最後に

2. **進捗を監視**: 5-10秒ごとにジョブステータスをポーリング
3. **エラーを処理**: エラーを確認してCSVファイルを修正
4. **データを検証**: インポート完了後にデータベースを確認

### 本番環境デプロイ

1. **データベースのバックアップ**: 一括インポート前に常にバックアップ
2. **インポートをスケジュール**: オフピーク時に実行
3. **リソースを監視**: CPU、メモリ、ディスク使用量を監視
4. **アラートを設定**: 失敗したインポートのアラートを設定
5. **ログを保持**: 監査目的でインポートログを保持

---

## 関連ドキュメント

- [CSVエクスポートガイド](csv-export-implementation.ja.md) - データのCSVへのエクスポート
- [OneRoster APIリファレンス](../../apps/api/README.ja.md#apiリファレンス) - 完全なAPIドキュメント
- [OneRoster Japan Profile仕様](../research/oneroster-japan-profile-analysis.md) - Japan Profileの詳細
- [セキュリティガイド](security-guide.ja.md) - 認証とセキュリティ

---

**最終更新**: 2025-11-16
**バージョン**: 1.0.0
**ステータス**: 本番環境対応
