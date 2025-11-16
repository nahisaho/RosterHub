# OneRoster Japan Profile v1.2 分析ドキュメント

## ドキュメント管理情報

| 項目 | 内容 |
|------|------|
| **ドキュメント名** | OneRoster Japan Profile v1.2 分析 |
| **バージョン** | 1.0.0 |
| **作成日** | 2025-11-14 |
| **最終更新日** | 2025-11-14 |
| **作成者** | RosterHub Development Team |
| **ステータス** | Draft |

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [OneRoster Japan Profileとは](#2-oneroster-japan-profileとは)
3. [策定組織と標準化プロセス](#3-策定組織と標準化プロセス)
4. [Japan Profileの適用範囲](#4-japan-profileの適用範囲)
5. [Japan Profileの主要な拡張と変更点](#5-japan-profileの主要な拡張と変更点)
6. [CSV形式の仕様](#6-csv形式の仕様)
7. [日本固有のデータモデル](#7-日本固有のデータモデル)
8. [実装事例](#8-実装事例)
9. [国際標準との整合性](#9-国際標準との整合性)
10. [制約事項と考慮事項](#10-制約事項と考慮事項)
11. [参考資料](#11-参考資料)

---

## 1. エグゼクティブサマリー

### 1.1 概要

**OneRoster Japan Profile v1.2**は、国際標準OneRoster v1.2をベースに、日本の初等中等教育機関特有の要件を満たすために策定された国内プロファイル仕様です。

### 1.2 主要な目的

- **校務支援システムと学習eポータル間の名簿情報連携の標準化**
- **日本の教育現場特有の概念（学年・組・出席番号など）の表現**
- **年度更新作業の自動化による教育現場の負担軽減**
- **国際標準との互換性維持**

### 1.3 策定組織

- **策定主体**: 日本IMS協会（現：1EdTech Japan）OneRoster国内適用検討部会
- **協力団体**: ICT CONNECT 21（学習eポータル標準モデル策定）

### 1.4 バージョン履歴

| バージョン | 公開日 | 基盤となるOneRoster仕様 | ステータス |
|-----------|--------|------------------------|-----------|
| v1.2 第1版 | 2021年頃 | OneRoster v1.2 | 暫定版 |
| v1.2 第2版 | 2022年12月4日 | OneRoster v1.2 Final | 国内暫定版 |
| v1.2.1 | 2024年1月 | OneRoster v1.2 Final | 国内暫定版（更新） |
| v1.2.2 (Candidate Final) | 進行中 | OneRoster v1.2 Final | 国際標準化候補 |

**注記**: 調査時点（2025年1月）では、v1.2.1が最新の公開バージョンであり、v1.2.2は国際標準化に向けた候補版として開発が進められている可能性があります。

### 1.5 主要な差異（Base Specification vs Japan Profile）

| カテゴリ | Base OneRoster v1.2 | Japan Profile v1.2 |
|---------|---------------------|-------------------|
| **時間割表現** | Periods（時限）のみ | 曜日 × 時限（拡張） |
| **学年表現** | Grade（数値または文字列） | 日本式学年（小1〜高3） |
| **クラス表現** | Class（コース単位） | 学年・組（homeroom概念） |
| **出席番号** | 標準では未定義 | metadata拡張で対応 |
| **名前表記** | givenName, familyName | 姓名順、フリガナ対応 |
| **年度概念** | Academic Session | 日本の学年度（4月〜3月） |

---

## 2. OneRoster Japan Profileとは

### 2.1 定義

OneRoster Japan Profileは、国際標準OneRoster仕様を日本の初等中等教育機関における名簿情報交換に適用するための**基本ルール集（プロファイル）**です。

### 2.2 策定背景

#### 課題認識

1. **手作業による名簿更新の負担**
   - 年度更新時の学習システムへの名簿データ手入力
   - 複数の学習eポータル・学習ツールへの重複入力
   - 転入・転出等による名簿変更の反映遅延

2. **システム間連携の標準不在**
   - 校務支援システムと学習系システムのデータ形式の不統一
   - ベンダー独自形式による囲い込み
   - データ移行コストの増大

3. **日本固有の教育概念の表現困難**
   - 国際標準では日本の「学年・組」概念が直接表現できない
   - 時間割における「曜日」の概念が不足
   - 出席番号など日本特有の識別子の扱いが未定義

### 2.3 解決アプローチ

Japan Profileは以下のアプローチで問題を解決します：

1. **国際標準の活用**: OneRoster v1.2をベースとし、国際的な相互運用性を維持
2. **拡張による日本対応**: metadataフィールドを活用した日本固有項目の追加
3. **CSV形式の採用**: 既存システムからの移行が容易なCSV Binding仕様を推奨
4. **段階的な標準化**: 国内暫定版 → 国際標準化（1EdTech Consortium承認）へのロードマップ

---

## 3. 策定組織と標準化プロセス

### 3.1 日本IMS協会（1EdTech Japan）

#### 組織概要

- **正式名称**: 一般社団法人 日本IMS協会（IMS Japan）
- **現在の名称**: 1EdTech Japan Society
- **親組織**: 1EdTech Consortium（旧IMS Global Learning Consortium）
- **設立目的**: IMS標準の日本国内普及と、日本の教育現場に適した仕様の策定

#### OneRoster国内適用検討部会

- **役割**: OneRoster Japan Profileの策定・維持・更新
- **活動内容**:
  - 日本の教育現場ニーズの調査・分析
  - OneRoster仕様の日本適用に関する技術検討
  - 実装ガイドライン・ドキュメントの作成
  - 国際標準化に向けた1EdTech Consortiumとの連携

### 3.2 ICT CONNECT 21

#### 組織概要

- **正式名称**: 一般社団法人 ICT CONNECT 21
- **役割**: 教育の情報化に関する総合的な推進
- **主要活動**: GIGA スクール構想の支援、学習eポータル標準モデルの策定

#### 学習eポータル標準モデルとの関係

ICT CONNECT 21が策定する「**学習eポータル標準モデル**」では、名簿情報連携の基盤技術としてOneRoster v1.2とJapan Profileを採用しています。

**最新版**:
- Ver. 5.00: 2025年3月18日公開（初等中等教育におけるシステム間連携のための相互運用標準モデル）
- Ver. 4.00: 2024年3月29日公開
- Ver. 3.00: 2023年3月29日公開

### 3.3 標準化プロセス

```
[Phase 1] 国内ニーズ調査
          ↓
[Phase 2] 国内暫定版策定（Japan Profile v1.2）
          ↓
[Phase 3] 国内実装・検証（校務支援システム、学習eポータル等）
          ↓
[Phase 4] 国際標準化提案（1EdTech Consortiumへ）
          ↓
[Phase 5] Candidate Final版公開（Japan Profile v1.2.1/v1.2.2）
          ↓
[Phase 6] 正式な1EdTech Profileとして承認（目標）
```

**現在の位置**: Phase 5 〜 Phase 6移行期（2025年1月時点）

---

## 4. Japan Profileの適用範囲

### 4.1 対象システム

#### プロバイダ側（データ提供側）

- **校務支援システム**
  - 統合型校務支援システム（例: C4th by EDUCOM）
  - 学籍管理システム
  - 出席管理システム

- **SIS（Student Information System）**
  - 大学・高等教育機関の学務システム
  - 専門学校等の学生管理システム

#### コンシューマ側（データ受領側）

- **学習eポータル**
  - MEXCBT（文部科学省CBTシステム）連携ポータル
  - L-Gate（内田洋行）
  - その他学習eポータル製品

- **学習支援システム**
  - AI型教材（例: Qubena by COMPASS）
  - LMS（Learning Management System）
  - デジタル教材プラットフォーム
  - learningBOX等のeラーニングシステム

### 4.2 対象教育段階

- **初等教育**: 小学校（1年〜6年）
- **中等教育**: 中学校（1年〜3年）、高等学校（1年〜3年）
- **高等教育**: 大学・短期大学・高等専門学校（参考実装あり）

### 4.3 対象データ

#### 必須データセット

1. **Organizations（組織）**: 学校、学年、クラス等の組織階層
2. **AcademicSessions（学期）**: 学年度、学期、ターム
3. **Users（ユーザー）**: 児童・生徒・学生、教職員
4. **Classes（授業・クラス）**: 授業コマ、ホームルームクラス
5. **Enrollments（在籍）**: ユーザーとクラスの関連付け

#### オプションデータセット

6. **Courses（コース）**: カリキュラム、コース定義
7. **Demographics（人口統計）**: 学生の属性情報（拡張）
8. **Resources（リソース）**: 教材、学習リソース（OneRoster v1.2拡張）

---

## 5. Japan Profileの主要な拡張と変更点

### 5.1 時間割表現の拡張

#### 課題

OneRoster Base仕様では、**periods（時限）**の概念はあるが、**曜日（day of week）**の概念が存在しません。日本の教育現場では「月曜1限」「火曜3限」のように**曜日×時限**で授業を管理します。

#### 解決策

**Classes（授業）データに曜日情報を拡張属性として追加**

```csv
# classes.csv (Japan Profile拡張例)
sourcedId,title,classCode,classType,periods,metadata.jp.dayOfWeek,metadata.jp.period
cls001,数学A,MATH-A-101,scheduled,"P1,P2",月,1
cls002,数学A,MATH-A-101,scheduled,"P3",火,3
```

**拡張フィールド**:
- `metadata.jp.dayOfWeek`: 曜日（月/火/水/木/金/土/日）
- `metadata.jp.period`: 時限（1, 2, 3, ...）

**代替方法**:
- `classCode`に曜日・時限情報を埋め込む（例: `MATH-A-MON-1`）
- `periods`フィールドに曜日情報を含めた独自値を設定（例: `MON-P1`）

### 5.2 学年・組・出席番号の表現

#### 日本の教育現場における識別子

| 項目 | 説明 | 例 |
|------|------|-----|
| **学年** | 学校における学年（小1〜高3） | 小学3年、中学2年、高校1年 |
| **組** | 同学年内のクラス分け | 1組、2組、A組、B組 |
| **出席番号** | クラス内の生徒番号 | 1番、2番、... 40番 |

#### OneRoster Base仕様での表現限界

- **grade（学年）**: 存在するが、日本式の表現（小1〜高3）と国際標準（K-12）の対応が不明瞭
- **組**: 直接表現するフィールドが存在しない
- **出席番号**: 標準フィールドとして定義されていない

#### Japan Profileでの解決策

**users.csv拡張例**:

```csv
sourcedId,givenName,familyName,username,grade,metadata.jp.grade,metadata.jp.classRoom,metadata.jp.attendanceNumber,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
user001,太郎,山田,yamada.t,3,小3,1組,5,タロウ,ヤマダ
user002,花子,佐藤,sato.h,8,中2,A組,12,ハナコ,サトウ
```

**拡張フィールド定義**:
- `metadata.jp.grade`: 日本式学年表記（小1〜小6、中1〜中3、高1〜高3）
- `metadata.jp.classRoom`: 組（1組、2組、A組など）
- `metadata.jp.attendanceNumber`: 出席番号（整数）
- `metadata.jp.kanaGivenName`: 名のフリガナ（カタカナ）
- `metadata.jp.kanaFamilyName`: 姓のフリガナ（カタカナ）

### 5.3 ホームルームクラスの表現

#### 概念の違い

| OneRoster Base | Japan Profile |
|----------------|---------------|
| **Class** = 授業コマ単位（Subject-based） | **Class** = 授業 + ホームルームクラス（Homeroom-based） |
| 生徒は複数のClassに所属（教科ごと） | 生徒は1つのホームルームに所属 + 複数の授業 |

#### 解決策

**classType属性の活用**

```csv
# classes.csv
sourcedId,title,classCode,classType,periods
cls-hr-301,3年1組,HR-3-1,homeroom,
cls-math-301,数学A（3年1組）,MATH-3-1,scheduled,P1-P2
```

- `classType = "homeroom"`: ホームルームクラス（担任制）
- `classType = "scheduled"`: 授業コマ（教科別）

### 5.4 学年度（Academic Year）の定義

#### 日本の学年度

- **開始**: 4月1日
- **終了**: 翌年3月31日
- **学期制**:
  - 3学期制（1学期: 4月〜7月、2学期: 9月〜12月、3学期: 1月〜3月）
  - 2学期制（前期: 4月〜9月、後期: 10月〜3月）

#### academicSessions.csv 例

```csv
sourcedId,title,type,startDate,endDate,parentSourcedId,schoolYear
ay-2024,令和6年度,schoolYear,2024-04-01,2025-03-31,,2024
term-2024-1,1学期,term,2024-04-01,2024-07-20,ay-2024,2024
term-2024-2,2学期,term,2024-09-01,2024-12-25,ay-2024,2024
term-2024-3,3学期,term,2025-01-08,2025-03-31,ay-2024,2024
```

**ポイント**:
- `schoolYear = 2024`: 2024年度（令和6年度）を表す
- `type = "schoolYear"`: 年度全体
- `type = "term"`: 学期

### 5.5 名前表記の日本対応

#### 課題

OneRoster Base仕様では、欧米式（Given Name + Family Name）の名前順序を前提としています。

#### Japan Profileでの推奨

```csv
# users.csv
sourcedId,givenName,familyName,username,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
user001,太郎,山田,yamada.t,タロウ,ヤマダ
```

**表示順序**:
- **日本語表示**: `familyName + givenName`（山田太郎）
- **英語表示**: `givenName + familyName`（Taro Yamada）

**フリガナ**:
- `metadata.jp.kanaGivenName`: 名のカタカナ
- `metadata.jp.kanaFamilyName`: 姓のカタカナ

---

## 6. CSV形式の仕様

### 6.1 Japan Profile推奨形式

Japan Profileでは、**OneRoster CSV Binding 1.2**を推奨データ交換形式として採用しています。

### 6.2 必須CSVファイル

| ファイル名 | 内容 | 依存関係 |
|-----------|------|---------|
| `manifest.csv` | CSVファイル一覧と処理設定 | なし |
| `orgs.csv` | 組織情報（学校、学年、学級） | `orgs.csv`（親組織） |
| `academicSessions.csv` | 学年度、学期、ターム | `academicSessions.csv`（親セッション） |
| `users.csv` | 児童・生徒・教職員情報 | `orgs.csv` |
| `classes.csv` | 授業、ホームルームクラス | `orgs.csv`, `academicSessions.csv`, `courses.csv` |
| `enrollments.csv` | クラスへの所属情報 | `users.csv`, `classes.csv` |

### 6.3 オプションCSVファイル

| ファイル名 | 内容 | 利用シーン |
|-----------|------|----------|
| `courses.csv` | コース定義 | カリキュラム管理 |
| `demographics.csv` | 人口統計情報 | 詳細な生徒属性管理 |
| `userProfiles.csv` | ユーザープロファイル | 拡張ユーザー情報 |
| `resources.csv` | 学習リソース | デジタル教材管理 |

### 6.4 manifest.csv 仕様

#### 目的

CSVファイル一覧と処理方法を定義します。

#### フォーマット

```csv
propertyName,value
manifest.version,1.0
oneroster.version,1.2
file.academicSessions,bulk
file.classes,bulk
file.courses,bulk
file.demographics,absent
file.enrollments,bulk
file.orgs,bulk
file.resources,absent
file.users,bulk
```

#### propertyName定義

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| `manifest.version` | `1.0` | マニフェストファイルのバージョン |
| `oneroster.version` | `1.2` | OneRoster仕様バージョン |
| `file.{filename}` | `bulk` / `delta` / `absent` | ファイルの処理モード |

**処理モード**:
- `bulk`: 全データを含む完全なファイル
- `delta`: 差分データのみ（前回エクスポートからの変更分）
- `absent`: ファイルが含まれない

### 6.5 共通フィールド定義

#### すべてのCSVファイルに共通するフィールド

| フィールド名 | 型 | 必須 | 説明 |
|-------------|-----|------|------|
| `sourcedId` | GUID | ○ | レコードの一意識別子（UUID推奨） |
| `status` | Enum | ○ | `active` / `tobedeleted` |
| `dateLastModified` | DateTime | ○ | 最終更新日時（ISO 8601形式） |

#### metadata拡張フィールドの命名規則

```
metadata.{namespace}.{fieldName}
```

**例**:
- `metadata.jp.grade`: Japan Profile固有の学年フィールド
- `metadata.jp.classRoom`: Japan Profile固有の組フィールド
- `metadata.custom.fieldX`: ベンダー独自フィールド

### 6.6 users.csv（Japan Profile拡張版）

#### 標準フィールド + Japan Profile拡張

| フィールド名 | 型 | 必須 | 説明 | Japan Profile拡張 |
|-------------|-----|------|------|------------------|
| `sourcedId` | GUID | ○ | ユーザーID | - |
| `status` | Enum | ○ | `active` / `tobedeleted` | - |
| `dateLastModified` | DateTime | ○ | 最終更新日時 | - |
| `enabledUser` | Boolean | ○ | アカウント有効フラグ | - |
| `username` | String | ○ | ログインID | - |
| `userIds` | String | | 外部識別子（JSON配列） | - |
| `givenName` | String | ○ | 名 | - |
| `familyName` | String | ○ | 姓 | - |
| `middleName` | String | | ミドルネーム | - |
| `role` | Enum | ○ | `student` / `teacher` / `administrator` | - |
| `identifier` | String | | 識別子 | - |
| `email` | String | | メールアドレス | - |
| `sms` | String | | 携帯電話番号 | - |
| `phone` | String | | 電話番号 | - |
| `agentSourcedIds` | List | | 保護者・代理人のsourcedId | - |
| `grades` | List | ○ | 学年リスト | - |
| `password` | String | | パスワード（非推奨） | - |
| `metadata.jp.grade` | String | | 日本式学年表記 | ○ |
| `metadata.jp.classRoom` | String | | 組 | ○ |
| `metadata.jp.attendanceNumber` | Integer | | 出席番号 | ○ |
| `metadata.jp.kanaGivenName` | String | | 名のフリガナ | ○ |
| `metadata.jp.kanaFamilyName` | String | | 姓のフリガナ | ○ |

#### サンプルCSV

```csv
sourcedId,status,dateLastModified,enabledUser,username,givenName,familyName,role,email,grades,metadata.jp.grade,metadata.jp.classRoom,metadata.jp.attendanceNumber,metadata.jp.kanaGivenName,metadata.jp.kanaFamilyName
usr-001,active,2024-04-01T00:00:00Z,TRUE,yamada.t,太郎,山田,student,yamada.t@example.jp,"03",小3,1組,5,タロウ,ヤマダ
usr-002,active,2024-04-01T00:00:00Z,TRUE,tanaka.s,進,田中,teacher,tanaka.s@example.jp,,,,,,
```

### 6.7 classes.csv（Japan Profile拡張版）

#### 標準フィールド + Japan Profile拡張

| フィールド名 | 型 | 必須 | 説明 | Japan Profile拡張 |
|-------------|-----|------|------|------------------|
| `sourcedId` | GUID | ○ | クラスID | - |
| `status` | Enum | ○ | `active` / `tobedeleted` | - |
| `dateLastModified` | DateTime | ○ | 最終更新日時 | - |
| `title` | String | ○ | クラス名称 | - |
| `classCode` | String | | クラスコード | - |
| `classType` | Enum | ○ | `homeroom` / `scheduled` | ○（homeroom追加） |
| `location` | String | | 教室・場所 | - |
| `grades` | List | ○ | 対象学年 | - |
| `subjects` | List | | 教科コード | - |
| `courseSourcedId` | GUID | | コースID | - |
| `schoolSourcedId` | GUID | ○ | 学校ID | - |
| `termSourcedIds` | List | ○ | 学期IDリスト | - |
| `periods` | List | | 時限リスト | - |
| `metadata.jp.dayOfWeek` | String | | 曜日 | ○ |
| `metadata.jp.period` | Integer | | 時限番号 | ○ |

#### サンプルCSV

```csv
sourcedId,status,dateLastModified,title,classCode,classType,grades,schoolSourcedId,termSourcedIds,periods,metadata.jp.dayOfWeek,metadata.jp.period
cls-hr-301,active,2024-04-01T00:00:00Z,3年1組,HR-3-1,homeroom,"03",org-school-001,"term-2024-1",,,,
cls-math-301,active,2024-04-01T00:00:00Z,数学A（3年1組）,MATH-3-1,scheduled,"03",org-school-001,"term-2024-1","P1,P2",月,1
```

### 6.8 enrollments.csv

#### フィールド定義

| フィールド名 | 型 | 必須 | 説明 |
|-------------|-----|------|------|
| `sourcedId` | GUID | ○ | 在籍レコードID |
| `status` | Enum | ○ | `active` / `tobedeleted` |
| `dateLastModified` | DateTime | ○ | 最終更新日時 |
| `classSourcedId` | GUID | ○ | クラスID（classes.csvのsourcedId） |
| `schoolSourcedId` | GUID | ○ | 学校ID |
| `userSourcedId` | GUID | ○ | ユーザーID（users.csvのsourcedId） |
| `role` | Enum | ○ | `student` / `teacher` / `aide` |
| `primary` | Boolean | | 主担当フラグ（教員の場合） |
| `beginDate` | Date | | 開始日 |
| `endDate` | Date | | 終了日 |

#### サンプルCSV

```csv
sourcedId,status,dateLastModified,classSourcedId,schoolSourcedId,userSourcedId,role,primary,beginDate,endDate
enr-001,active,2024-04-01T00:00:00Z,cls-hr-301,org-school-001,usr-001,student,,2024-04-01,2025-03-31
enr-002,active,2024-04-01T00:00:00Z,cls-math-301,org-school-001,usr-001,student,,2024-04-01,2025-03-31
enr-003,active,2024-04-01T00:00:00Z,cls-math-301,org-school-001,usr-002,teacher,TRUE,2024-04-01,2025-03-31
```

---

## 7. 日本固有のデータモデル

### 7.1 学校組織階層の表現

#### 日本の教育機関組織構造

```
学校法人・自治体（LEA: Local Education Authority）
  └─ 学校（School）
      ├─ 学年（Grade Level）
      │   └─ 学級・組（Class/Homeroom）
      │       └─ 生徒（Student）
      └─ 学科・コース（Department/Course - 高校）
```

#### orgs.csv での表現

```csv
sourcedId,status,dateLastModified,name,type,identifier,parentSourcedId
org-lea-001,active,2024-04-01T00:00:00Z,○○市教育委員会,district,,
org-school-001,active,2024-04-01T00:00:00Z,○○市立△△小学校,school,SCHOOL-001,org-lea-001
org-grade-3,active,2024-04-01T00:00:00Z,3学年,department,,org-school-001
org-class-301,active,2024-04-01T00:00:00Z,3年1組,class,,org-grade-3
```

### 7.2 学年・学級・出席番号の統合管理

#### 関係性

```
User（生徒）
  ├─ grades: ["03"] ← OneRoster標準フィールド
  ├─ metadata.jp.grade: "小3" ← Japan Profile拡張
  └─ Enrollment → Class (homeroom) → metadata.jp.classRoom: "1組"
      └─ metadata.jp.attendanceNumber: 5
```

#### 実装例

**users.csv**:
```csv
sourcedId,givenName,familyName,username,grades,metadata.jp.grade,metadata.jp.attendanceNumber
usr-001,太郎,山田,yamada.t,"03",小3,5
```

**classes.csv**:
```csv
sourcedId,title,classCode,classType,metadata.jp.classRoom
cls-hr-301,3年1組,HR-3-1,homeroom,1組
```

**enrollments.csv**:
```csv
sourcedId,classSourcedId,userSourcedId,role
enr-001,cls-hr-301,usr-001,student
```

### 7.3 時間割の表現

#### 日本の時間割構造

```
週間時間割
  ├─ 月曜
  │   ├─ 1限（8:40-9:30）: 国語
  │   ├─ 2限（9:40-10:30）: 算数
  │   └─ ...
  ├─ 火曜
  └─ ...
```

#### OneRoster + Japan Profileでの表現

**academicSessions.csv（時限定義）**:

```csv
sourcedId,title,type,startDate,endDate,parentSourcedId
period-1,1限,period,08:40:00,09:30:00,ay-2024
period-2,2限,period,09:40:00,10:30:00,ay-2024
```

**classes.csv（曜日×時限）**:

```csv
sourcedId,title,classType,periods,metadata.jp.dayOfWeek,metadata.jp.period
cls-jp-mon-1,国語（月1限）,scheduled,period-1,月,1
cls-math-tue-2,算数（火2限）,scheduled,period-2,火,2
```

---

## 8. 実装事例

### 8.1 校務支援システム

#### C4th（株式会社EDUCOM）

- **対応状況**: OneRoster対応の名簿出力機能を強化（2023年発表）
- **機能**:
  - CSV形式でのOneRoster Japan Profile準拠エクスポート
  - 学習eポータルへの自動連携対応
  - 年度更新時の差分出力対応

#### 実装内容

- users.csv、classes.csv、enrollments.csv等の生成
- Japan Profile拡張フィールド（学年・組・出席番号）の出力
- manifest.csvによる処理モード指定（bulk/delta）

### 8.2 学習eポータル

#### L-Gate（内田洋行）

- **対応状況**: 文部科学省MEXCBT接続学習eポータル
- **機能**:
  - OneRoster CSV / Japan Profileによる名簿インポート
  - 一斉配信機能（全国学力・学習状況調査対応）
  - 日本初の名簿連携機能（2022年発表）

### 8.3 AI型教材・学習支援システム

#### Qubena（株式会社COMPASS）

- **対応状況**: OneRoster対応（2022年度内対応発表）
- **機能**:
  - 校務支援システムからダウンロードしたCSVファイルのアップロード
  - 年度更新情報の自動反映
  - 転入・転出等の名簿変更の自動同期

#### learningBOX

- **対応状況**: OneRoster CSV / Japan Profile対応
- **機能**:
  - CSVファイルのドラッグ&ドロップインポート
  - enrollments.csvによるクラス割り当て自動処理
  - 差分更新対応

### 8.4 高等教育機関での実装

#### 大分大学（事例）

- **実装内容**: OneRoster規格に基づいた学務情報システムと学習支援システムの情報共有
- **技術資料**: 「OneRoster 規格に基づいた学務情報システムと学習支援システムの情報共有」（大学ICT推進協議会 2018年論文）
- **課題と対応**:
  - 日本の時間割表現（曜日×時限）のカスタマイズ
  - CSV形式での実装（API実装のコスト回避）

---

## 9. 国際標準との整合性

### 9.1 1EdTech Consortium承認プロセス

#### 現在の位置

- **国内暫定版**: Japan Profile v1.2 / v1.2.1（2022年〜2024年）
- **国際標準化**: Candidate Final版として1EdTech Consortiumへ提出予定
- **目標**: 正式な**OneRoster Profile**として承認

#### 類似事例

- **Norway Profile**: ノルウェーでも同様にK-12教育システム向けOneRoster Profilingが進行中
- **国際協力**: 日本とノルウェーの事例を元に、OneRoster 1.2の国際化・ローカライゼーション機能が改善されている

### 9.2 OneRoster v1.2での拡張可能性

#### Enumerated Vocabulariesの拡張

OneRoster 1.2では、多くの列挙型（Enum）語彙を拡張可能な設計になっています。

**拡張可能なEnum例**:
- `classType`: `homeroom`を追加可能
- `sessionType`: 日本の学期制に対応した値を追加可能
- `role`: 日本特有の役職を追加可能

#### metadata拡張の推奨

1EdTech仕様では、**metadata列による拡張**を正式にサポートしています。

**命名規則**:
```
metadata.{vendorPrefix}.{fieldName}
```

**Japan Profileの推奨プレフィックス**:
- `jp`: Japan Profile標準拡張
- `mext`: 文部科学省関連拡張（将来的な可能性）

### 9.3 OneRoster v1.3以降への影響

Japan ProfileおよびNorway Profileでの実装経験は、OneRoster v1.3（将来バージョン）の仕様策定にフィードバックされる予定です。

**期待される改善**:
- 曜日（day of week）概念の標準化
- homeroom classTypeの正式採用
- ローカライゼーション対応フィールドの標準化

---

## 10. 制約事項と考慮事項

### 10.1 技術的制約

#### CSV形式の限界

- **階層データの表現困難**: 複雑な組織階層やネストされた関係の表現が冗長
- **データ整合性の保証不足**: 外部キー制約等のDB機能がCSVには存在しない
- **文字コード問題**: UTF-8 BOM付きCSVでの対応が必要（Excelとの互換性）

#### OneRoster API v1.2との関係

- **CSV Binding**: 簡易実装向け（バッチ処理）
- **REST API Binding**: リアルタイム同期向け（Japan Profileは現時点でCSV中心）

### 10.2 実装上の考慮事項

#### metadata拡張フィールドの互換性

- **ベンダー独自拡張との衝突**: 各ベンダーが独自に`metadata.*`を拡張している場合、Japan Profile標準との調整が必要
- **バージョン管理**: Japan Profileのバージョンアップ時の後方互換性維持

#### 既存システムとの統合

- **レガシー校務支援システム**: OneRoster出力機能がない場合、変換ツールの開発が必要
- **データマッピングの複雑さ**: 既存DBスキーマからOneRoster形式への変換ロジック

### 10.3 運用上の考慮事項

#### 個人情報保護

- **GDPR/個人情報保護法対応**: 名簿データに含まれる個人情報の取り扱い
- **データ暗号化**: CSV転送時の暗号化（HTTPS、SFTP等）
- **アクセス制御**: 名簿データへのアクセス権限管理

#### 年度更新処理

- **タイミング**: 4月1日前後の年度切り替え時の処理順序
- **差分更新**: `status = "tobedeleted"`による削除処理の実装
- **データ保持期間**: 卒業生データの保存期間とアーカイブ方針

### 10.4 Japan Profile仕様の未確定事項

#### v1.2.2の正式リリース待ち

調査時点（2025年1月）では、**Japan Profile v1.2.2の詳細仕様が公式には未公開**です。

**不明点**:
- v1.2.1からv1.2.2での変更内容の詳細
- 1EdTech Consortium Candidate Final版の承認状況
- 正式なProfile仕様書のリリース時期

#### ドキュメント入手の制約

- **公式仕様書**: 「OneRosterCSV項目定義書_JapanProfile_v.1.2.1版」は1EdTech Japanのウェブサイトからダウンロード可能だが、本調査では直接入手できず
- **実装ガイド**: 詳細な実装ガイドラインの有無が不明

---

## 11. 参考資料

### 11.1 公式ドキュメント

#### 1EdTech Japan（日本IMS協会）

- **OneRoster Japan Profile（国内暫定版）公開ページ**
  - URL: https://www.1edtechjapan.org/post/oneroster-japan-profile
  - 内容: Japan Profile v1.2 第2版の概要と公開情報

- **OneRoster Japan Profile v1.2.1（更新版）**
  - URL: https://www.1edtechjapan.org/en/orjpp-121
  - 公開日: 2024年1月
  - 内容: v1.2.1更新版の公開情報

- **OneRoster説明資料**
  - URL: https://www.1edtechjapan.org/en/news/categories/one-roster-explanation-1
  - 内容: OneRoster概要説明、Japan Profileの位置づけ

#### 1EdTech Consortium（IMS Global）

- **OneRoster Version 1.2 Final Release**
  - URL: https://www.imsglobal.org/spec/oneroster/v1p2
  - 内容: OneRoster v1.2ベース仕様

- **OneRoster CSV Binding 1.2.1**
  - URL: https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv
  - 内容: CSV形式の詳細仕様

- **OneRoster Implementation and Best Practices Guide**
  - URL: https://www.imsglobal.org/spec/oneroster/v1p2/impl
  - 内容: 実装ベストプラクティス

#### ICT CONNECT 21

- **学習eポータル標準モデル Ver. 5.00**
  - URL: https://ictconnect21.jp/ict/wp-content/uploads/2025/03/PSE_interoperability_standard_V5p00.pdf
  - 公開日: 2025年3月18日
  - 内容: 初等中等教育におけるシステム間連携のための相互運用標準モデル

- **学習eポータル標準モデル Ver. 4.00**
  - URL: https://ictconnect21.jp/ict/wp-content/uploads/2024/03/learning_eportal_standard_V4p00.pdf
  - 公開日: 2024年3月29日

- **学習eポータル標準モデル Ver. 3.00**
  - URL: https://ictconnect21.jp/ict/wp-content/uploads/2023/03/learning_eportal_standard_V3p00.pdf
  - 公開日: 2023年3月29日

### 11.2 実装事例・技術資料

#### 学術論文

- **「OneRoster 規格に基づいた学務情報システムと学習支援システムの情報共有」**
  - 著者: 吉崎 弘一, 中島 順美, 吉田 和幸（大分大学 情報基盤センター）
  - 発表: 大学ICT推進協議会 2018年年次大会
  - URL: https://axies.jp/_files/report/publications/papers/papers2018/MB2-6.pdf

#### プレスリリース・製品情報

- **Qubena OneRoster対応発表**
  - 発表元: 株式会社COMPASS
  - 発表日: 2022年8月29日
  - URL: https://qubena.com/blog/pr-20220829/
  - 内容: 校務支援システムとの名簿連携対応

- **EDUCOM C4th OneRoster対応強化**
  - 発表元: 株式会社EDUCOM
  - URL: https://prtimes.jp/main/html/rd/p/000000055.000002574.html
  - 内容: 統合型校務支援システムのOneRoster名簿出力機能強化

- **内田洋行 L-Gate 機能拡充**
  - 発表元: 内田洋行
  - 発表日: 2022年9月15日
  - URL: https://www.uchida.co.jp/company/news/press/220915.html
  - 内容: 日本初の名簿連携機能実装

#### 技術解説資料

- **「IMS OneRosterのデータモデル」**
  - 著者: Minako Kubo（久保美奈子）
  - 公開: SlideShare
  - URL: https://www.slideshare.net/MinakoKubo1/ims-oneroster
  - 内容: OneRosterデータモデルの解説資料

- **learningBOX OneRoster対応ドキュメント**
  - URL: https://support.learningbox.online/en/how-to-use/one-roster/
  - 内容: OneRoster CSV / Japan Profile対応の実装ガイド

### 11.3 Microsoft関連ドキュメント

- **OneRoster プロバイダーの概要 - School Data Sync**
  - URL: https://learn.microsoft.com/ja-jp/schooldatasync/oneroster-provider-overview
  - 内容: Microsoft School Data SyncにおけるOneRoster連携

### 11.4 追加調査が必要な資料

以下の資料は存在が確認されていますが、詳細な内容が未確認です：

- **「OneRosterCSV項目定義書_JapanProfile_v.1.2_第2版_20221204.pdf」**
  - 提供元: 1EdTech Japan
  - 内容: Japan Profile v1.2のCSVフィールド定義書（PDF版）

- **「OneRosterCSV項目定義書_JapanProfile_v.1.2.1版」**
  - 提供元: 1EdTech Japan
  - 内容: Japan Profile v1.2.1のCSVフィールド定義書（PDFおよびExcel版）

**入手方法**: 1EdTech Japanの公式ウェブサイト（https://www.1edtechjapan.org）から会員向けにダウンロード可能と思われます。

---

## 12. まとめと次のステップ

### 12.1 調査結果サマリー

本調査により、**OneRoster Japan Profile v1.2**の以下の側面が明らかになりました：

1. **策定背景**: 日本の教育現場における校務支援システムと学習eポータル間の名簿連携標準化
2. **主要拡張**: 曜日×時限、学年・組・出席番号、フリガナ、ホームルームクラス概念
3. **実装形式**: CSV Binding 1.2を推奨、metadata拡張による日本固有項目の追加
4. **実装事例**: 校務支援システム（C4th）、学習eポータル（L-Gate）、AI教材（Qubena）等で採用
5. **標準化プロセス**: 国内暫定版から1EdTech Consortium承認に向けたCandidate Final版へ移行中

### 12.2 未解決の調査事項

- **Japan Profile v1.2.2の詳細仕様**: v1.2.1からの変更内容、Candidate Final版の正式仕様
- **公式仕様書の入手**: 「OneRosterCSV項目定義書_JapanProfile」の詳細内容
- **REST API対応**: Japan ProfileのREST API Binding仕様の有無
- **認証・セキュリティ**: OAuth対応、データ転送時のセキュリティ要件

### 12.3 RosterHub開発への示唆

#### 必須実装事項

1. **OneRoster v1.2 Base仕様の完全サポート**
2. **Japan Profile拡張フィールドのサポート**
   - `metadata.jp.*`フィールドの定義とDB設計
   - 曜日×時限の時間割表現
   - 学年・組・出席番号の管理
3. **CSV Import/Export機能**
   - manifest.csvを含むCSVバンドルの処理
   - bulk/delta処理モードのサポート

#### 推奨実装事項

1. **REST API v1.2対応**（将来的な互換性確保）
2. **metadata拡張の柔軟性**（ベンダー独自拡張への対応）
3. **差分同期機能**（dateLastModified活用）
4. **年度更新処理の自動化**（4月1日の学年度切り替え）

### 12.4 次フェーズの作業

#### Phase 1.3: Gap Analysis（ギャップ分析）

**作業内容**:
- OneRoster v1.2 Base仕様 vs Japan Profile v1.2の詳細比較
- 実装すべき拡張フィールドの完全リスト作成
- データベーススキーマ設計への影響分析

**成果物**: `docs/research/gap-analysis.md`

#### Phase 2: Requirements Definition（要件定義）

**作業内容**:
- @requirements-analyst による EARS形式の要件定義
- 機能要件・非機能要件の策定
- ユーザーストーリーの作成

**成果物**:
- `docs/requirements/srs/oneroster-japan-profile-srs.md`
- `docs/requirements/functional/oneroster-japan-profile-functional.md`
- `docs/requirements/user-stories/oneroster-japan-profile-stories.md`

---

**ドキュメント終了**

*このドキュメントは、公開情報に基づく調査結果をまとめたものです。正式な仕様の詳細は、1EdTech Japan公式ドキュメントを参照してください。*
