# 正規化分析レポート - RosterHub

**プロジェクト名**: RosterHub - OneRoster Japan Profile 1.2.2 統合ハブ
**作成日**: 2025-11-14
**作成者**: Database Schema Designer AI
**データベース**: PostgreSQL 15+
**対象テーブル**: すべてのOneRosterエンティティとシステムテーブル

---

## エグゼクティブサマリー

本ドキュメントは、RosterHubデータベーススキーマを正規化形式（1NFからBCNF）に照らして評価し、パフォーマンス最適化のための戦略的な非正規化の機会を特定します。

### 主要な発見事項

- **1NF準拠**: ✅ すべてのテーブルが準拠（`userIds[]`配列を除く - 正当化済み）
- **2NF準拠**: ✅ すべてのテーブルが準拠（部分関数従属性なし）
- **3NF準拠**: ✅ すべてのテーブルが準拠（推移的関数従属性なし）
- **BCNF準拠**: ✅ すべてのテーブルが準拠（すべての決定子が候補キー）

### 非正規化推奨事項

1. **計算フィールド**: 頻繁にアクセスされる集計のためのキャッシュカウントを追加
2. **マテリアライズドビュー**: レポートクエリ用の事前集計ビューを作成
3. **冗長外部キー**: enrollmentsに非正規化された学校参照を追加
4. **JSONBメタデータ**: Japan Profile拡張のための柔軟な構造を維持

---

## 1. 第1正規形（1NF）

### 定義
各カラムがアトミック（単一）の値を含み、繰り返しグループがないこと。

### 評価結果: ✅ 準拠（例外あり）

### 分析

#### 準拠テーブル
すべてのテーブルは個別のカラムにアトミックな値を格納:

**例: USERテーブル**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  sourcedId VARCHAR(255) UNIQUE NOT NULL,
  givenName VARCHAR(255) NOT NULL,      -- アトミック
  familyName VARCHAR(255) NOT NULL,     -- アトミック
  email VARCHAR(255) NOT NULL,          -- アトミック
  ...
);
```

#### 例外（正当化済み）

**1. userIds[]配列カラム**
```sql
-- USERテーブル
userIds TEXT[] -- 複数の識別子の配列
```

**正当化理由**:
- **OneRoster仕様要件**: `userIds`は標準で配列として定義されている
- **ユースケース**: ユーザーごとに複数の識別子（学生ID、国民ID、地方ID）
- **PostgreSQLネイティブサポート**: 配列はPostgreSQLの第一級市民
- **パフォーマンス**: 別途`user_identifiers`ジャンクションテーブルを回避
- **クエリサポート**: 効率的な配列操作（`ANY`、`@>`）

**代替案（正規化）**:
```sql
CREATE TABLE user_identifiers (
  id UUID PRIMARY KEY,
  userSourcedId VARCHAR(255) REFERENCES users(sourcedId),
  identifierType VARCHAR(50),
  identifierValue VARCHAR(255)
);
```

**決定**: OneRoster準拠とパフォーマンスのため配列形式を維持。

**2. ipWhitelist[]配列カラム（API_KEYテーブル）**
```sql
ipWhitelist TEXT[] -- 許可IPアドレスの配列
```

**正当化理由**:
- シンプルなデータ構造（別テーブル不要）
- 低カーディナリティ（通常1〜10個のIP）
- パフォーマンス: 高速な配列メンバーシップチェック

**3. JSONBメタデータカラム**
```sql
metadata JSONB -- Japan Profile拡張
```

**正当化理由**:
- **柔軟性**: スキーママイグレーションなしでJapan Profile仕様の進化をサポート
- **パフォーマンス**: PostgreSQL JSONBはバイナリ形式（高速クエリ）
- **標準準拠**: OneRosterは任意のメタデータ拡張を許可
- **インデックス可能**: GINインデックスが効率的なJSONBクエリをサポート

---

## 2. 第2正規形（2NF）

### 定義
1NFであり、すべての非キー属性が主キー全体に完全に関数従属すること（部分関数従属性がないこと）。

### 評価結果: ✅ 準拠

### 分析

すべてのテーブルは単一カラムの主キー（`id` UUID）を使用しており、部分関数従属性の可能性を排除しています。

#### 複合一意制約（主キーではない）

**ENROLLMENTテーブル**:
```sql
UNIQUE (userSourcedId, classSourcedId)
```

**分析**:
- すべての非キーカラムは完全な複合キーに依存
- `role`、`primary`、`beginDate`、`endDate`は`userSourcedId`と`classSourcedId`の両方を必要とする
- 部分関数従属性は存在しない（カラムが`userSourcedId`のみまたは`classSourcedId`のみに依存しない）

**検証**:
- ❌ `role`は`userSourcedId`のみに依存？ いいえ（roleは登録ごとであり、ユーザーごとではない）
- ❌ `role`は`classSourcedId`のみに依存？ いいえ（同じクラスで異なるユーザーは異なるroleを持つ）
- ✅ `role`は`(userSourcedId, classSourcedId)`に依存？ はい（有効）

**結論**: 2NF違反なし。

---

## 3. 第3正規形（3NF）

### 定義
2NFであり、推移的関数従属性が存在しないこと（非キー属性は他の非キー属性に依存してはならない）。

### 評価結果: ✅ 準拠

### 分析

#### 検証済みテーブル

**USERテーブル**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  sourcedId VARCHAR(255),
  givenName VARCHAR(255),
  familyName VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50),
  ...
);
```

**関数従属性分析**:
- `givenName` → `sourcedId` ❌ （依存しない）
- `familyName` → `givenName` ❌ （依存しない）
- `email` → `givenName` ❌ （依存しない）
- `role` → `givenName` ❌ （依存しない）

すべての非キー属性は`id`（主キー）に直接依存し、互いに依存しない。

**ORGテーブル（階層構造）**:
```sql
CREATE TABLE orgs (
  id UUID PRIMARY KEY,
  sourcedId VARCHAR(255),
  name VARCHAR(255),
  type VARCHAR(50),
  parentSourcedId VARCHAR(255),  -- 自己参照外部キー
  ...
);
```

**推移的関数従属性チェック**:
- `type`は`parentSourcedId`に依存？ ❌ いいえ
  - 例: School（type=school）は親District（type=district）を持つことができる
  - 例: Department（type=department）は親School（type=school）を持つことができる
  - `type`は親のtypeから独立

**結論**: 推移的関数従属性なし。

---

## 4. ボイスコッド正規形（BCNF）

### 定義
3NFであり、すべての関数従属性X → Yについて、Xはスーパーキー（候補キー）でなければならない。

### 評価結果: ✅ 準拠

### 分析

#### すべての決定子がスーパーキー

**USERテーブル**:
- 候補キー: `id`（PK）、`sourcedId`（UK）、`identifier`（UK）
- すべての関数従属性:
  - `id` → すべてのカラム ✅ （idはスーパーキー）
  - `sourcedId` → すべてのカラム ✅ （sourcedIdはスーパーキー）
  - `identifier` → すべてのカラム ✅ （identifierはスーパーキー）

**ORGテーブル**:
- 候補キー: `id`（PK）、`sourcedId`（UK）、`identifier`（UK）
- すべての関数従属性はスーパーキーを決定子として持つ ✅

**ENROLLMENTテーブル**:
- 候補キー: `id`（PK）、`(userSourcedId, classSourcedId)`（複合UK）
- すべての関数従属性:
  - `id` → すべてのカラム ✅ （idはスーパーキー）
  - `(userSourcedId, classSourcedId)` → すべてのカラム ✅ （複合キーはスーパーキー）

**結論**: BCNF違反なし。すべての決定子が候補キー。

---

## 5. 非正規化の機会

### パフォーマンスのための戦略的非正規化

スキーマは完全に正規化されている（BCNF準拠）が、特定の非正規化はOneRoster APIワークロードのクエリパフォーマンスを向上させることができます。

---

### 5.1 計算カウントフィールド

**問題**: クラス登録数や組織メンバー数の頻繁なCOUNTクエリ。

**例クエリ**:
```sql
-- クラスの学生数をカウント（頻繁なAPIクエリ）
SELECT COUNT(*) FROM enrollments
WHERE classSourcedId = 'class123'
  AND role = 'primary'
  AND status = 'active';

-- 組織のユーザー数をカウント（頻繁なダッシュボードクエリ）
SELECT COUNT(*) FROM user_org_members
WHERE orgSourcedId = 'org456';
```

**提案される非正規化**:
```sql
-- キャッシュカウントカラムを追加
ALTER TABLE classes ADD COLUMN enrollmentCount INT DEFAULT 0;
ALTER TABLE orgs ADD COLUMN memberCount INT DEFAULT 0;

-- トリガーまたはアプリケーションロジックで更新
CREATE OR REPLACE FUNCTION update_class_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE classes
  SET enrollmentCount = (
    SELECT COUNT(*) FROM enrollments
    WHERE classSourcedId = NEW.classSourcedId
      AND status = 'active'
  )
  WHERE sourcedId = NEW.classSourcedId;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enrollment_count
AFTER INSERT OR UPDATE OR DELETE ON enrollments
FOR EACH ROW EXECUTE FUNCTION update_class_enrollment_count();
```

**トレードオフ**:
| 側面 | メリット | デメリット |
|--------|----------|-----------|
| パフォーマンス | 即座のCOUNTクエリ（集計なし） | 書き込みオーバーヘッド（トリガー実行） |
| 精度 | 結果整合性（トリガーベース） | カウントずれのリスク（定期的な再計算が必要） |
| 複雑性 | シンプルなSELECTクエリ | 複雑なトリガーロジック |

**推奨事項**: ✅ **セーフガード付きで実装**
- CLASSテーブルに`enrollmentCount`を追加
- ORGテーブルに`memberCount`を追加
- 自動更新のためのトリガーを実装
- 夜間カウント再計算のためのcronジョブを追加（ずれ検出）
- アラートでカウント精度を監視

---

### 5.2 レポート用マテリアライズドビュー

**問題**: 複数のJOINを伴う複雑なレポートクエリ（ダッシュボード分析、コンプライアンスレポート）。

**例クエリ**:
```sql
-- 組織階層付き学生名簿レポート
SELECT
  u.sourcedId,
  u.givenName,
  u.familyName,
  u.role,
  o.name AS schoolName,
  parent_org.name AS districtName,
  c.title AS className,
  e.beginDate,
  e.endDate
FROM users u
JOIN enrollments e ON e.userSourcedId = u.sourcedId
JOIN classes c ON c.sourcedId = e.classSourcedId
JOIN orgs o ON o.sourcedId = c.schoolSourcedId
LEFT JOIN orgs parent_org ON parent_org.sourcedId = o.parentSourcedId
WHERE u.status = 'active'
  AND e.status = 'active'
  AND u.role = 'student';
```

**提案されるマテリアライズドビュー**:
```sql
CREATE MATERIALIZED VIEW student_roster_report AS
SELECT
  u.sourcedId AS userSourcedId,
  u.givenName,
  u.familyName,
  u.identifier,
  u.email,
  o.sourcedId AS schoolSourcedId,
  o.name AS schoolName,
  o.identifier AS schoolIdentifier,
  parent_org.sourcedId AS districtSourcedId,
  parent_org.name AS districtName,
  c.sourcedId AS classSourcedId,
  c.title AS className,
  c.classCode,
  e.sourcedId AS enrollmentSourcedId,
  e.beginDate,
  e.endDate,
  e.primary AS isPrimaryEnrollment
FROM users u
JOIN enrollments e ON e.userSourcedId = u.sourcedId
JOIN classes c ON c.sourcedId = e.classSourcedId
JOIN orgs o ON o.sourcedId = c.schoolSourcedId
LEFT JOIN orgs parent_org ON parent_org.sourcedId = o.parentSourcedId
WHERE u.status = 'active'
  AND e.status = 'active'
  AND u.role = 'student';

-- リフレッシュ戦略
CREATE UNIQUE INDEX idx_student_roster_enrollment ON student_roster_report(enrollmentSourcedId);
REFRESH MATERIALIZED VIEW CONCURRENTLY student_roster_report;
```

**リフレッシュ戦略**:
- **オプション1**: 夜間リフレッシュ（午前3時）- シンプル、結果整合性
- **オプション2**: オンデマンドリフレッシュ（CSVインポート後）- インポートジョブ完了でトリガー
- **オプション3**: 増分リフレッシュ（PostgreSQL 13+）- 変更された行のみをリフレッシュ

**トレードオフ**:
| 側面 | メリット | デメリット |
|--------|----------|-----------|
| パフォーマンス | 高速な複雑クエリ（事前計算されたJOIN） | ストレージオーバーヘッド（重複データ） |
| 鮮度 | 古いデータ（リフレッシュ間隔） | リフレッシュスケジュールを管理する必要 |
| 複雑性 | レポート用のシンプルなSELECTクエリ | 複雑なビュー定義とリフレッシュロジック |

**推奨事項**: ✅ **レポートダッシュボード用に実装**
- 一般的なレポートクエリ用のマテリアライズドビューを作成
- 夜間（午前3時）またはCSVインポート後にリフレッシュ
- ビューの鮮度を監視（最終リフレッシュタイムスタンプ）

---

### 5.3 冗長外部キー（ENROLLMENTテーブル）

**問題**: 登録クエリで学校情報が必要な場合、CLASSを経由したJOINが必要。

**現在のスキーマ**:
```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  userSourcedId VARCHAR(255),
  classSourcedId VARCHAR(255),
  schoolSourcedId VARCHAR(255),  -- 既に存在（非正規化）
  ...
);
```

**分析**:
スキーマには**既に**ENROLLMENTテーブルに`schoolSourcedId`が含まれており、これは冗長です（CLASSから導出可能）。

**関数従属性**:
```
classSourcedId → schoolSourcedId （CLASSテーブル経由）
```

**なぜこの非正規化が存在するか**:
1. **OneRoster仕様**: ENROLLMENTエンティティに`school`参照が含まれる
2. **クエリパフォーマンス**: 学校レベルの登録クエリでCLASSテーブルへのJOINを回避
3. **一般的なクエリパターン**: 「学校のすべての登録を検索」（頻繁なAPIクエリ）

**クエリ比較**:

**正規化（冗長schoolSourcedIdなし）**:
```sql
-- CLASSへのJOINが必要
SELECT e.*
FROM enrollments e
JOIN classes c ON c.sourcedId = e.classSourcedId
WHERE c.schoolSourcedId = 'school123';
```

**非正規化（冗長schoolSourcedIdあり）**:
```sql
-- 直接クエリ（JOINなし）
SELECT e.*
FROM enrollments e
WHERE e.schoolSourcedId = 'school123';
```

**トレードオフ**:
| 側面 | メリット | デメリット |
|--------|----------|-----------|
| パフォーマンス | 学校クエリでJOIN不要 | 冗長データストレージ |
| 整合性 | schoolSourcedIdがCLASS.schoolSourcedIdと一致することを保証する必要 | 不整合のリスク |
| 複雑性 | シンプルなクエリ | 冗長性を維持する必要（トリガーまたはアプリケーションロジック） |

**整合性セーフガード**:
```sql
-- 整合性を強制するデータベース制約
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollment_school_consistency
  CHECK (
    schoolSourcedId = (
      SELECT schoolSourcedId FROM classes WHERE sourcedId = classSourcedId
    )
  );

-- または更新用トリガー
CREATE OR REPLACE FUNCTION validate_enrollment_school()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.schoolSourcedId != (SELECT schoolSourcedId FROM classes WHERE sourcedId = NEW.classSourcedId) THEN
    RAISE EXCEPTION 'Enrollment schoolSourcedId does not match class schoolSourcedId';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_enrollment_school
BEFORE INSERT OR UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION validate_enrollment_school();
```

**推奨事項**: ✅ **セーフガード付きで非正規化schoolSourcedIdを維持**
- ENROLLMENTの冗長`schoolSourcedId`を維持（OneRoster準拠 + パフォーマンス）
- 整合性を検証するトリガーを追加
- 外部キー制約を追加: `schoolSourcedId REFERENCES orgs(sourcedId)`

---

### 5.4 JSONBメタデータの柔軟性

**現在のスキーマ**:
```sql
-- すべてのOneRosterエンティティ
metadata JSONB
```

**分析**:
JSONBカラムは厳密な正規化に違反する（ネストされた構造を含む）が、これは**正当化され必要**です。

**正当化理由**:
1. **OneRoster仕様**: 任意のメタデータ拡張を許可
2. **Japan Profile拡張**: `metadata.jp.*`名前空間のカスタムフィールド
3. **スキーマ進化**: データベースマイグレーションなしの新しいJapan Profileフィールド
4. **パフォーマンス**: PostgreSQL JSONBはクエリ最適化（GINインデックス）

**Japan Profileフィールドの例**:
```json
{
  "jp": {
    "kanaGivenName": "タロウ",
    "kanaFamilyName": "ヤマダ",
    "homeClass": "1-A",
    "attendanceNumber": 12
  }
}
```

**インデックス戦略**:
```sql
-- JSONB全体のカラムインデックス（GIN）
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);

-- 特定パスインデックス（頻繁なクエリ用）
CREATE INDEX idx_users_metadata_kana_family
  ON users USING GIN ((metadata->'jp'->>'kanaFamilyName') gin_trgm_ops);
```

**トレードオフ**:
| 側面 | メリット | デメリット |
|--------|----------|-----------|
| 柔軟性 | 新しいJapan Profileフィールドでスキーマ変更不要 | 複雑なクエリ（JSONB演算子） |
| パフォーマンス | GINインデックスが高速クエリをサポート | 通常のカラムより遅い |
| 保守性 | 自己文書化（JSONキーがフィールド名） | データベースレベルの検証なし |

**推奨事項**: ✅ **戦略的インデックスを伴うJSONBメタデータを維持**
- OneRoster準拠と柔軟性のためJSONBを維持
- 頻繁にクエリされるJapan ProfileフィールドにGINインデックスを追加
- アプリケーション層でJSONB構造を検証（JSON Schema検証）

---

## 6. サマリーテーブル

### 正規化準拠

| 正規形 | ステータス | 備考 |
|-------------|--------|-------|
| 1NF | ✅ 準拠 | 例外: `userIds[]`、`ipWhitelist[]`、`metadata`（正当化済み） |
| 2NF | ✅ 準拠 | 部分関数従属性なし |
| 3NF | ✅ 準拠 | 推移的関数従属性なし |
| BCNF | ✅ 準拠 | すべての決定子が候補キー |

### 非正規化推奨事項

| 戦略 | テーブル | ステータス | 優先度 | 実装 |
|----------|-------|--------|----------|----------------|
| 計算カウント | CLASS、ORG | 推奨 | 高 | トリガー + 夜間再計算 |
| マテリアライズドビュー | N/A（レポート） | 推奨 | 中 | 夜間リフレッシュまたはインポート後 |
| 冗長FK | ENROLLMENT | 既存 | N/A | 整合性トリガー追加 |
| JSONBメタデータ | すべてのエンティティ | 既存 | N/A | GINインデックス追加 |

---

## 7. 推奨事項

### 即時アクション

1. **整合性トリガーを追加**:
   - ENROLLMENT.schoolSourcedId検証（CLASS.schoolSourcedIdと一致）
   - 計算カウント更新（CLASS.enrollmentCount、ORG.memberCount）

2. **インデックスを追加**:
   - JSONBメタデータパスのGINインデックス（Japan Profileフィールド）
   - 頻繁なJOINパターン用の複合インデックス

3. **マテリアライズドビューを作成**:
   - `student_roster_report`（組織階層付き学生登録）
   - `teacher_assignment_report`（教師クラス割当）
   - `enrollment_summary_by_school`（学校レベル登録カウント）

### 監視とメンテナンス

1. **カウントずれ検出**:
   - カウントを再計算してずれを検出する日次cronジョブ
   - ずれが1%を超える場合にアラート（トリガー失敗を示す）

2. **マテリアライズドビューの鮮度**:
   - 最終リフレッシュタイムスタンプを監視
   - ビューが古い場合にアラート（24時間超）

3. **JSONBクエリパフォーマンス**:
   - JSONBクエリのスロークエリログを監視
   - 頻繁にアクセスされるパスにインデックスを追加

---

## 8. 結論

RosterHubデータベーススキーマは**完全に正規化されている（BCNF準拠）**、OneRoster仕様準拠のための正当化された例外を伴う:
- `userIds[]`配列（OneRoster要件）
- `ipWhitelist[]`配列（シンプルなデータ構造）
- `metadata` JSONB（Japan Profile拡張）

戦略的な非正規化推奨事項は、データ整合性を犠牲にすることなく**パフォーマンス最適化**に焦点を当てる:
- 計算カウントフィールド（整合性セーフガード付き）
- マテリアライズドビュー（リフレッシュ戦略付き）
- 冗長外部キー（検証トリガー付き）

すべての非正規化は、トリガー、制約、定期的な検証ジョブを通じてデータ整合性を維持します。

---

## 参考資料

- **OneRoster 1.2.2仕様**: [IMS Global OneRoster](https://www.imsglobal.org/oneroster-v11-final-specification)
- **PostgreSQL JSONBドキュメント**: [PostgreSQL JSONB](https://www.postgresql.org/docs/15/datatype-json.html)
- **データベース正規化理論**: Codd, E.F. "Further Normalization of the Data Base Relational Model"
- **システム要件**: `docs/requirements/oneroster-system-requirements.md`
- **ER図**: `design/database/er-diagram-rosterhub-20251114.md`

---

**ドキュメントバージョン**: 1.0
**最終更新**: 2025-11-14
**ステータス**: レビュー準備完了
