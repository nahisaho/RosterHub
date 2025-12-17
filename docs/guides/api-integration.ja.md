# API 統合ガイド

このガイドでは、アプリケーションを RosterHub OneRoster API と統合する方法を説明します。

## 概要

RosterHub は **OneRoster Japan Profile 1.2.2** に準拠した REST API を提供しています。API は以下をサポートしています：

- **バルク操作**: 初期同期のための全データアクセス
- **デルタ/増分同期**: タイムスタンプフィルタリングによる効率的な更新
- **CRUD 操作**: すべてのエンティティの作成、読み取り、更新、削除
- **CSV インポート/エクスポート**: CSV ファイルによる一括データ操作

## 認証

### API キー認証

すべての API リクエストには `X-API-Key` ヘッダーでの API キー認証が必要です：

```bash
curl -X GET \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  https://your-rosterhub-instance/ims/oneroster/v1p2/users
```

### API キーの取得

API キーは RosterHub 管理者にお問い合わせください。キーには以下の設定が可能です：

- **IP ホワイトリスト**: 特定の IP アドレスからのアクセスのみ許可
- **レート制限**: クライアントごとのカスタムレート制限
- **権限**: 読み取り専用またはフルアクセス

## ベース URL

API のベース URL は OneRoster 仕様に従います：

```
https://your-rosterhub-instance/ims/oneroster/v1p2/
```

## エンドポイント

### ユーザー（Users）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/users` | 全ユーザー一覧 |
| GET | `/users/{sourcedId}` | 単一ユーザー取得 |
| POST | `/users` | 新規ユーザー作成 |
| PUT | `/users/{sourcedId}` | ユーザー更新 |
| DELETE | `/users/{sourcedId}` | ユーザー削除（論理削除） |

### 組織（Organizations）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/orgs` | 全組織一覧 |
| GET | `/orgs/{sourcedId}` | 単一組織取得 |
| POST | `/orgs` | 新規組織作成 |
| PUT | `/orgs/{sourcedId}` | 組織更新 |
| DELETE | `/orgs/{sourcedId}` | 組織削除 |

### クラス（Classes）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/classes` | 全クラス一覧 |
| GET | `/classes/{sourcedId}` | 単一クラス取得 |
| POST | `/classes` | 新規クラス作成 |
| PUT | `/classes/{sourcedId}` | クラス更新 |
| DELETE | `/classes/{sourcedId}` | クラス削除 |

### コース（Courses）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/courses` | 全コース一覧 |
| GET | `/courses/{sourcedId}` | 単一コース取得 |
| POST | `/courses` | 新規コース作成 |
| PUT | `/courses/{sourcedId}` | コース更新 |
| DELETE | `/courses/{sourcedId}` | コース削除 |

### 在籍情報（Enrollments）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/enrollments` | 全在籍情報一覧 |
| GET | `/enrollments/{sourcedId}` | 単一在籍情報取得 |
| POST | `/enrollments` | 新規在籍情報作成 |
| PUT | `/enrollments/{sourcedId}` | 在籍情報更新 |
| DELETE | `/enrollments/{sourcedId}` | 在籍情報削除 |

### 学期（Academic Sessions）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/academicSessions` | 全学期一覧 |
| GET | `/academicSessions/{sourcedId}` | 単一学期取得 |
| POST | `/academicSessions` | 新規学期作成 |
| PUT | `/academicSessions/{sourcedId}` | 学期更新 |
| DELETE | `/academicSessions/{sourcedId}` | 学期削除 |

### 人口統計（Demographics）

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/demographics` | 全人口統計一覧 |
| GET | `/demographics/{sourcedId}` | 単一人口統計取得 |
| POST | `/demographics` | 新規人口統計作成 |
| PUT | `/demographics/{sourcedId}` | 人口統計更新 |
| DELETE | `/demographics/{sourcedId}` | 人口統計削除 |

## クエリパラメータ

### ページネーション

返却レコード数を制御します：

| パラメータ | 説明 | デフォルト | 最大 |
|-----------|------|-----------|------|
| `limit` | 返却するレコード数 | 100 | 10000 |
| `offset` | スキップするレコード数 | 0 | - |

**例：**
```bash
GET /ims/oneroster/v1p2/users?limit=50&offset=100
```

### フィルタリング

`filter` パラメータと OneRoster フィルタ構文を使用して結果をフィルタリングします：

| 演算子 | 説明 | 例 |
|--------|------|-----|
| `=` | 等しい | `filter=role='student'` |
| `!=` | 等しくない | `filter=status!='tobedeleted'` |
| `>` | より大きい | `filter=dateLastModified>'2025-01-01'` |
| `>=` | 以上 | `filter=dateLastModified>='2025-01-01T00:00:00Z'` |
| `<` | より小さい | `filter=dateLastModified<'2025-12-31'` |
| `<=` | 以下 | `filter=dateLastModified<='2025-12-31T23:59:59Z'` |
| `~` | 含む（like） | `filter=familyName~'田'` |

**複数フィルタ（AND）：**
```bash
GET /ims/oneroster/v1p2/users?filter=role='student' AND status='active'
```

**例 - 児童・生徒を取得：**
```bash
GET /ims/oneroster/v1p2/users?filter=role='student'
```

**例 - 教員を取得：**
```bash
GET /ims/oneroster/v1p2/users?filter=role='teacher'
```

### ソート

`sort` と `orderBy` パラメータを使用して結果をソートします：

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| `sort` | ソートするフィールド | `sort=familyName` |
| `orderBy` | ソート方向 | `orderBy=asc` または `orderBy=desc` |

**例：**
```bash
GET /ims/oneroster/v1p2/users?sort=familyName&orderBy=asc
```

### フィールド選択

`fields` パラメータを使用して返却する特定のフィールドを選択します：

```bash
GET /ims/oneroster/v1p2/users?fields=sourcedId,givenName,familyName,email
```

## デルタ/増分同期

効率的な同期のために、タイムスタンプベースのフィルタリングを使用して変更されたレコードのみを取得します：

```bash
# 特定の時刻以降に変更されたすべてのレコードを取得
GET /ims/oneroster/v1p2/users?filter=dateLastModified>='2025-01-15T00:00:00Z'

# 削除されたレコードを取得（status = 'tobedeleted'）
GET /ims/oneroster/v1p2/users?filter=status='tobedeleted' AND dateLastModified>='2025-01-15T00:00:00Z'
```

### 同期戦略

1. **初期同期**: フィルタなしですべてのレコードを取得
2. **タイムスタンプの保存**: 現在のタイムスタンプを保存
3. **増分同期**: `dateLastModified>='{lastSyncTime}'` フィルタを使用
4. **削除の処理**: `status='tobedeleted'` のレコードを確認

## レスポンス形式

### 成功レスポンス

すべてのレスポンスは OneRoster JSON 形式に従います：

**単一リソース：**
```json
{
  "user": {
    "sourcedId": "user-001",
    "status": "active",
    "dateLastModified": "2025-01-15T10:30:00Z",
    "enabledUser": true,
    "username": "yamada.taro",
    "givenName": "太郎",
    "familyName": "山田",
    "role": "student",
    "email": "yamada.taro@example.ed.jp",
    "metadata": {
      "jp": {
        "kanaGivenName": "タロウ",
        "kanaFamilyName": "ヤマダ"
      }
    }
  }
}
```

**コレクション：**
```json
{
  "users": [
    {
      "sourcedId": "user-001",
      "status": "active",
      ...
    },
    {
      "sourcedId": "user-002",
      "status": "active",
      ...
    }
  ]
}
```

### エラーレスポンス

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

### HTTP ステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | Bad Request（バリデーションエラー） |
| 401 | Unauthorized（API キーが無効または未指定） |
| 403 | Forbidden（IP がホワイトリストに未登録） |
| 404 | Not Found |
| 429 | Too Many Requests（レート制限超過） |
| 500 | Internal Server Error |

## Japan Profile 拡張

RosterHub は `metadata.jp` 名前空間で OneRoster Japan Profile 1.2.2 メタデータ拡張をサポートしています：

### ユーザー

```json
{
  "metadata": {
    "jp": {
      "kanaGivenName": "タロウ",
      "kanaFamilyName": "ヤマダ",
      "homeClass": "class-001"
    }
  }
}
```

### 組織

```json
{
  "metadata": {
    "jp": {
      "kanaName": "トウキョウトリツダイイチショウガッコウ",
      "schoolCode": "A100001",
      "address": "東京都千代田区..."
    }
  }
}
```

## コード例

### JavaScript/TypeScript

```typescript
const API_BASE = 'https://your-rosterhub-instance/ims/oneroster/v1p2';
const API_KEY = 'your-api-key';

// 全児童・生徒を取得
async function getStudents() {
  const response = await fetch(`${API_BASE}/users?filter=role='student'`, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.users;
}

// 新規ユーザーを作成
async function createUser(userData) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// デルタ同期 - 前回同期以降の変更を取得
async function getDeltaChanges(lastSyncTime) {
  const filter = encodeURIComponent(`dateLastModified>='${lastSyncTime}'`);
  const response = await fetch(`${API_BASE}/users?filter=${filter}`, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}
```

### Python

```python
import requests
from datetime import datetime

API_BASE = 'https://your-rosterhub-instance/ims/oneroster/v1p2'
API_KEY = 'your-api-key'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# 全児童・生徒を取得
def get_students():
    response = requests.get(
        f"{API_BASE}/users",
        headers=headers,
        params={'filter': "role='student'"}
    )
    response.raise_for_status()
    return response.json()['users']

# 新規ユーザーを作成
def create_user(user_data):
    response = requests.post(
        f"{API_BASE}/users",
        headers=headers,
        json=user_data
    )
    response.raise_for_status()
    return response.json()

# デルタ同期
def get_delta_changes(last_sync_time):
    response = requests.get(
        f"{API_BASE}/users",
        headers=headers,
        params={'filter': f"dateLastModified>='{last_sync_time}'"}
    )
    response.raise_for_status()
    return response.json()['users']
```

### cURL

```bash
# 全ユーザーを取得
curl -X GET \
  -H "X-API-Key: your-api-key" \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users"

# 児童・生徒のみを取得
curl -X GET \
  -H "X-API-Key: your-api-key" \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users?filter=role='student'"

# 新規ユーザーを作成
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sourcedId": "user-new-001",
    "enabledUser": true,
    "username": "suzuki.hanako",
    "givenName": "花子",
    "familyName": "鈴木",
    "role": "student",
    "email": "suzuki.hanako@example.ed.jp"
  }' \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users"

# ユーザーを更新
curl -X PUT \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "suzuki.hanako.new@example.ed.jp"
  }' \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users/user-new-001"

# ユーザーを削除（論理削除）
curl -X DELETE \
  -H "X-API-Key: your-api-key" \
  "https://your-rosterhub-instance/ims/oneroster/v1p2/users/user-new-001"
```

## レート制限

API は公平な使用を保証するためにレート制限を実装しています：

- **デフォルト制限**: 1分あたり100リクエスト
- **バースト制限**: 1秒あたり20リクエスト

レート制限に達すると、`429 Too Many Requests` レスポンスが返されます：

```json
{
  "statusCode": 429,
  "message": "Too Many Requests"
}
```

**ベストプラクティス：**
- 429 レスポンスに対して指数バックオフを実装する
- 可能な場合は全同期ではなくデルタ同期を使用する
- 適切な場合はレスポンスをキャッシュする

## Webhook（オプション）

RosterHub は Webhook を介してデータ変更をアプリケーションに通知できます：

### Webhook ペイロード

```json
{
  "event": "user.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "sourcedId": "user-001",
    "status": "active",
    "dateLastModified": "2025-01-15T10:30:00Z"
  }
}
```

### イベントタイプ

- `user.created`, `user.updated`, `user.deleted`
- `org.created`, `org.updated`, `org.deleted`
- `class.created`, `class.updated`, `class.deleted`
- `enrollment.created`, `enrollment.updated`, `enrollment.deleted`

## トラブルシューティング

### 401 Unauthorized

- API キーが正しいか確認してください
- `X-API-Key` ヘッダーが含まれているか確認してください

### 403 Forbidden

- IP アドレスがホワイトリストに登録されていない可能性があります
- 管理者にお問い合わせください

### 429 Too Many Requests

- クライアント側でレート制限を実装してください
- 指数バックオフを使用してください

### 空の結果

- フィルタ構文を確認してください
- システムにデータが存在するか確認してください

## サポート

- **API ドキュメント**: `/api` で Swagger UI にアクセス可能
- **GitHub Issues**: [問題を報告する](https://github.com/nahisaho/RosterHub/issues)
- **OneRoster 仕様**: [IMS Global OneRoster](https://www.imsglobal.org/oneroster)

---

**RosterHub** - OneRoster Japan Profile 1.2.2 統合ハブ
