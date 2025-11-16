-- ============================================
-- PostgreSQL DDL - RosterHub（日本語版）
-- OneRoster Japan Profile 1.2.2 統合ハブ
-- ============================================
-- データベース: PostgreSQL 15+
-- 作成日: 2025-11-14
-- 仕様: OneRoster Japan Profile 1.2.2
-- ============================================

-- ============================================
-- データベースとスキーマのセットアップ
-- ============================================

-- データベース作成（スーパーユーザーとして実行）
-- CREATE DATABASE rosterhub
--   WITH ENCODING = 'UTF8'
--   LC_COLLATE = 'ja_JP.UTF-8'
--   LC_CTYPE = 'ja_JP.UTF-8'
--   TEMPLATE = template0;

-- データベースに接続
\c rosterhub;

-- スキーマ作成
CREATE SCHEMA IF NOT EXISTS app;
SET search_path TO app, public;

-- ============================================
-- 拡張機能
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID生成
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- 暗号化関数
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- テキスト検索用

-- ============================================
-- 列挙型（OneRoster仕様）
-- ============================================

CREATE TYPE status_type AS ENUM ('active', 'tobedeleted', 'inactive');  -- ステータスタイプ
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'staff', 'administrator');  -- ユーザーロール
CREATE TYPE org_type AS ENUM ('department', 'school', 'district', 'local', 'state', 'national');  -- 組織タイプ
CREATE TYPE class_type AS ENUM ('homeroom', 'scheduled');  -- クラスタイプ
CREATE TYPE enrollment_role AS ENUM ('primary', 'secondary', 'aide');  -- 登録ロール
CREATE TYPE academic_session_type AS ENUM ('gradingPeriod', 'semester', 'schoolYear', 'term');  -- 学術セッションタイプ
CREATE TYPE sex_type AS ENUM ('male', 'female', 'other', 'unknown');  -- 性別
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ');  -- 監査アクション
CREATE TYPE csv_import_status AS ENUM ('pending', 'processing', 'completed', 'failed');  -- CSVインポートステータス

-- ============================================
-- OneRosterコアテーブル
-- ============================================

-- Usersテーブル（ユーザー）
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,  -- OneRoster一意識別子
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 最終更新日時
  status             status_type DEFAULT 'active' NOT NULL,  -- ステータス

  -- OneRoster必須フィールド
  enabled_user       BOOLEAN NOT NULL,  -- ユーザーアカウント有効フラグ
  username           VARCHAR(255) NOT NULL,  -- ログインユーザー名
  user_ids           VARCHAR(255)[] NOT NULL,  -- 複数の識別子（学生ID、国民ID等）
  given_name         VARCHAR(255) NOT NULL,  -- 名
  family_name        VARCHAR(255) NOT NULL,  -- 姓
  middle_name        VARCHAR(255),  -- ミドルネーム（任意）
  role               user_role NOT NULL,  -- ユーザーロール
  identifier         VARCHAR(255) UNIQUE NOT NULL,  -- 国/地方一意識別子
  email              VARCHAR(255) NOT NULL,  -- メールアドレス
  sms                VARCHAR(50),  -- SMS電話番号（任意）
  phone              VARCHAR(50),  -- 電話番号（任意）

  -- Japan Profile拡張（metadata.jp.*）
  metadata           JSONB,  -- Japan Profile拡張データ

  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')  -- メール形式チェック
);

COMMENT ON TABLE users IS 'Userエンティティ（学生、教師、職員、管理者） - OneRoster Section 4.3';
COMMENT ON COLUMN users.sourced_id IS 'OneRoster一意識別子';
COMMENT ON COLUMN users.date_last_modified IS '最終更新タイムスタンプ（Delta API用にインデックス付き）';
COMMENT ON COLUMN users.user_ids IS '複数の識別子（学生ID、国民ID等）';
COMMENT ON COLUMN users.metadata IS 'Japan Profile拡張（metadata.jp.kanaGivenName、metadata.jp.kanaFamilyName、metadata.jp.homeClass）';

-- Orgsテーブル（組織）
CREATE TABLE orgs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,  -- OneRoster一意識別子
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 最終更新日時
  status             status_type DEFAULT 'active' NOT NULL,  -- ステータス

  -- OneRoster必須フィールド
  name               VARCHAR(255) NOT NULL,  -- 組織名
  type               org_type NOT NULL,  -- 組織タイプ
  identifier         VARCHAR(255) UNIQUE NOT NULL,  -- 国/地方一意識別子

  -- 階層構造
  parent_sourced_id  VARCHAR(255),  -- 親組織sourcedId

  -- Japan Profile拡張
  metadata           JSONB,  -- Japan Profile拡張データ

  CONSTRAINT fk_orgs_parent FOREIGN KEY (parent_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT
);

COMMENT ON TABLE orgs IS 'Orgエンティティ（学校、地区、部門） - OneRoster Section 4.4';
COMMENT ON COLUMN orgs.parent_sourced_id IS '親組織（階層サポート）';
COMMENT ON COLUMN orgs.metadata IS 'Japan Profile拡張（metadata.jp.localCode、metadata.jp.prefectureCode）';

-- User-Orgメンバーシップテーブル（多対多）
CREATE TABLE user_orgs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  user_sourced_id    VARCHAR(255) NOT NULL,  -- ユーザーsourcedId
  org_sourced_id     VARCHAR(255) NOT NULL,  -- 組織sourcedId

  CONSTRAINT fk_user_orgs_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_orgs_org FOREIGN KEY (org_sourced_id) REFERENCES orgs(sourced_id) ON DELETE CASCADE,
  CONSTRAINT unique_user_org UNIQUE (user_sourced_id, org_sourced_id)  -- 一意制約
);

COMMENT ON TABLE user_orgs IS 'User-Orgメンバーシップジャンクションテーブル';

-- User-Agentリレーションシップテーブル（多対多、例: 親子関係）
CREATE TABLE user_agents (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  user_sourced_id    VARCHAR(255) NOT NULL,  -- ユーザーsourcedId
  agent_sourced_id   VARCHAR(255) NOT NULL,  -- エージェントsourcedId

  CONSTRAINT fk_user_agents_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_agents_agent FOREIGN KEY (agent_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE,
  CONSTRAINT unique_user_agent UNIQUE (user_sourced_id, agent_sourced_id)  -- 一意制約
);

COMMENT ON TABLE user_agents IS 'User-Agentリレーションシップ（例: 親子関係）';

-- Coursesテーブル（コース）
CREATE TABLE courses (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,  -- OneRoster一意識別子
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 最終更新日時
  status             status_type DEFAULT 'active' NOT NULL,  -- ステータス

  -- OneRoster必須フィールド
  title              VARCHAR(255) NOT NULL,  -- コースタイトル
  course_code        VARCHAR(255) NOT NULL,  -- コース識別コード
  school_year        VARCHAR(50),  -- 学年度（任意）

  -- リレーションシップ
  school_sourced_id  VARCHAR(255) NOT NULL,  -- 学校sourcedId

  -- Japan Profile拡張
  metadata           JSONB,  -- Japan Profile拡張データ

  CONSTRAINT fk_courses_school FOREIGN KEY (school_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT
);

COMMENT ON TABLE courses IS 'Courseエンティティ（コースカタログ定義） - OneRoster Section 4.6';
COMMENT ON COLUMN courses.metadata IS 'Japan Profile拡張（metadata.jp.subject、metadata.jp.credits）';

-- Classesテーブル（クラス）
CREATE TABLE classes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,  -- OneRoster一意識別子
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 最終更新日時
  status             status_type DEFAULT 'active' NOT NULL,  -- ステータス

  -- OneRoster必須フィールド
  title              VARCHAR(255) NOT NULL,  -- クラスタイトル
  class_code         VARCHAR(255) NOT NULL,  -- クラス識別コード
  class_type         class_type NOT NULL,  -- クラスタイプ
  location           VARCHAR(255),  -- 物理的な場所（任意）

  -- リレーションシップ
  course_sourced_id  VARCHAR(255) NOT NULL,  -- コースsourcedId
  school_sourced_id  VARCHAR(255) NOT NULL,  -- 学校sourcedId

  -- Japan Profile拡張
  metadata           JSONB,  -- Japan Profile拡張データ

  CONSTRAINT fk_classes_course FOREIGN KEY (course_sourced_id) REFERENCES courses(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT fk_classes_school FOREIGN KEY (school_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT
);

COMMENT ON TABLE classes IS 'Classエンティティ（特定学期/時限のコースインスタンス） - OneRoster Section 4.5';
COMMENT ON COLUMN classes.metadata IS 'Japan Profile拡張（metadata.jp.classGrade、metadata.jp.curriculum）';

-- Enrollmentsテーブル（登録）
CREATE TABLE enrollments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,  -- OneRoster一意識別子
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 最終更新日時
  status             status_type DEFAULT 'active' NOT NULL,  -- ステータス

  -- OneRoster必須フィールド
  role               enrollment_role NOT NULL,  -- 登録ロール
  "primary"          BOOLEAN NOT NULL,  -- 主登録フラグ
  begin_date         TIMESTAMPTZ,  -- 登録開始日（任意）
  end_date           TIMESTAMPTZ,  -- 登録終了日（任意）

  -- リレーションシップ
  user_sourced_id    VARCHAR(255) NOT NULL,  -- ユーザーsourcedId
  class_sourced_id   VARCHAR(255) NOT NULL,  -- クラスsourcedId

  -- 非正規化学校参照（パフォーマンス最適化）
  school_sourced_id  VARCHAR(255) NOT NULL,  -- 学校sourcedId

  -- Japan Profile拡張
  metadata           JSONB,  -- Japan Profile拡張データ

  CONSTRAINT fk_enrollments_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_class FOREIGN KEY (class_sourced_id) REFERENCES classes(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_school FOREIGN KEY (school_sourced_id) REFERENCES orgs(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT unique_user_class UNIQUE (user_sourced_id, class_sourced_id),  -- 一意制約
  CONSTRAINT enrollments_dates_check CHECK (end_date IS NULL OR end_date >= begin_date)  -- 日付チェック
);

COMMENT ON TABLE enrollments IS 'Enrollmentエンティティ（ユーザー・クラスリレーションシップ） - OneRoster Section 4.7';
COMMENT ON COLUMN enrollments.school_sourced_id IS 'パフォーマンスのため非正規化された学校参照（classesへのJOIN回避）';
COMMENT ON COLUMN enrollments.metadata IS 'Japan Profile拡張（metadata.jp.attendanceNumber、metadata.jp.role）';

-- Academic Sessionsテーブル（学術セッション）
CREATE TABLE academic_sessions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,  -- OneRoster一意識別子
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 最終更新日時
  status             status_type DEFAULT 'active' NOT NULL,  -- ステータス

  -- OneRoster必須フィールド
  title              VARCHAR(255) NOT NULL,  -- セッションタイトル
  type               academic_session_type NOT NULL,  -- セッションタイプ
  start_date         TIMESTAMPTZ NOT NULL,  -- セッション開始日
  end_date           TIMESTAMPTZ NOT NULL,  -- セッション終了日
  school_year        VARCHAR(50) NOT NULL,  -- 学年度

  -- 階層構造
  parent_sourced_id  VARCHAR(255),  -- 親セッションsourcedId

  -- Japan Profile拡張
  metadata           JSONB,  -- Japan Profile拡張データ

  CONSTRAINT fk_academic_sessions_parent FOREIGN KEY (parent_sourced_id) REFERENCES academic_sessions(sourced_id) ON DELETE RESTRICT,
  CONSTRAINT academic_sessions_dates_check CHECK (end_date > start_date)  -- 日付チェック
);

COMMENT ON TABLE academic_sessions IS 'AcademicSessionエンティティ（学期、セメスター、学年度） - OneRoster Section 4.8';
COMMENT ON COLUMN academic_sessions.parent_sourced_id IS '親セッション（階層サポート: schoolYear → semester → gradingPeriod）';
COMMENT ON COLUMN academic_sessions.metadata IS 'Japan Profile拡張（metadata.jp.termName）';

-- Class-AcademicSessionリレーションシップテーブル（多対多）
CREATE TABLE class_academic_sessions (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  class_sourced_id             VARCHAR(255) NOT NULL,  -- クラスsourcedId
  academic_session_sourced_id  VARCHAR(255) NOT NULL,  -- 学術セッションsourcedId

  CONSTRAINT fk_class_academic_sessions_class FOREIGN KEY (class_sourced_id) REFERENCES classes(sourced_id) ON DELETE CASCADE,
  CONSTRAINT fk_class_academic_sessions_session FOREIGN KEY (academic_session_sourced_id) REFERENCES academic_sessions(sourced_id) ON DELETE CASCADE,
  CONSTRAINT unique_class_session UNIQUE (class_sourced_id, academic_session_sourced_id)  -- 一意制約
);

COMMENT ON TABLE class_academic_sessions IS 'Class-AcademicSessionジャンクションテーブル';

-- Demographicsテーブル（人口統計）
CREATE TABLE demographics (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  sourced_id         VARCHAR(255) UNIQUE NOT NULL,  -- OneRoster一意識別子
  date_created       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  date_last_modified TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 最終更新日時
  status             status_type DEFAULT 'active' NOT NULL,  -- ステータス

  -- OneRosterオプションフィールド
  birth_date         TIMESTAMPTZ,  -- 生年月日（任意）
  sex                sex_type,  -- 性別（任意）

  -- リレーションシップ（Userと1対1）
  user_sourced_id    VARCHAR(255) UNIQUE NOT NULL,  -- ユーザーsourcedId

  -- Japan Profile拡張
  metadata           JSONB,  -- Japan Profile拡張データ

  CONSTRAINT fk_demographics_user FOREIGN KEY (user_sourced_id) REFERENCES users(sourced_id) ON DELETE CASCADE
);

COMMENT ON TABLE demographics IS 'Demographicエンティティ（ユーザー人口統計情報） - OneRoster Section 4.9（Japan Profile拡張）';
COMMENT ON COLUMN demographics.metadata IS 'Japan Profile拡張（metadata.jp.nationality、metadata.jp.residentStatus）';

-- ============================================
-- システムテーブル（OneRoster外）
-- ============================================

-- API Keysテーブル（APIキー）
CREATE TABLE api_keys (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  key                VARCHAR(255) UNIQUE NOT NULL,  -- APIキー（表示用）
  hashed_key         VARCHAR(255) NOT NULL,  -- ハッシュ化されたAPIキー
  name               VARCHAR(255) NOT NULL,  -- APIキー名
  organization_id    VARCHAR(255) NOT NULL,  -- 組織識別子
  ip_whitelist       VARCHAR(50)[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],  -- 許可IPアドレス
  rate_limit         INT NOT NULL DEFAULT 1000,  -- 1時間あたりリクエスト制限
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,  -- キー有効フラグ
  expires_at         TIMESTAMPTZ,  -- 有効期限（任意）
  created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- 作成日時
  last_used_at       TIMESTAMPTZ  -- 最終使用日時（任意）
);

COMMENT ON TABLE api_keys IS 'APIキーエンティティ（API認証と認可）';
COMMENT ON COLUMN api_keys.hashed_key IS 'bcryptハッシュ化されたAPIキー（安全な保存用）';
COMMENT ON COLUMN api_keys.ip_whitelist IS '許可IPアドレス（追加セキュリティ層）';
COMMENT ON COLUMN api_keys.rate_limit IS '1時間あたりリクエスト制限（デフォルト: 1000）';

-- Audit Logsテーブル（監査ログ）
CREATE TABLE audit_logs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  timestamp          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- ログタイムスタンプ
  action             audit_action NOT NULL,  -- アクション
  entity_type        VARCHAR(50) NOT NULL,  -- エンティティタイプ
  entity_sourced_id  VARCHAR(255) NOT NULL,  -- エンティティsourcedId
  user_id            VARCHAR(255),  -- アクション実行ユーザー（任意）
  api_key_id         UUID,  -- APIキーID（任意）
  ip_address         VARCHAR(50) NOT NULL,  -- リクエストIPアドレス
  request_method     VARCHAR(10) NOT NULL,  -- HTTPメソッド
  request_path       VARCHAR(500) NOT NULL,  -- リクエストURLパス
  request_body       JSONB,  -- リクエストペイロード（任意）
  response_status    INT NOT NULL,  -- HTTPステータスコード
  changes            JSONB,  -- 変更前後の値（任意）

  CONSTRAINT fk_audit_logs_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

COMMENT ON TABLE audit_logs IS '監査ログエンティティ（データアクセス・変更追跡）';
COMMENT ON COLUMN audit_logs.changes IS 'UPDATE操作の変更前後の値（JSONB）';

-- CSV Import Jobsテーブル（CSVインポートジョブ）
CREATE TABLE csv_import_jobs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- 内部プライマリーキー
  status             csv_import_status DEFAULT 'pending' NOT NULL,  -- ジョブステータス
  file_name          VARCHAR(255) NOT NULL,  -- アップロードファイル名
  file_size          INT NOT NULL,  -- ファイルサイズ（バイト）
  total_records      INT,  -- 総レコード数（任意）
  processed_records  INT DEFAULT 0 NOT NULL,  -- 処理済みレコード数
  success_records    INT DEFAULT 0 NOT NULL,  -- 正常インポート数
  failed_records     INT DEFAULT 0 NOT NULL,  -- 失敗レコード数
  errors             JSONB,  -- エラー詳細（任意）
  started_at         TIMESTAMPTZ,  -- ジョブ開始日時（任意）
  completed_at       TIMESTAMPTZ,  -- ジョブ完了日時（任意）
  created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,  -- ジョブ作成日時
  created_by         VARCHAR(255) NOT NULL  -- ジョブ開始ユーザー
);

COMMENT ON TABLE csv_import_jobs IS 'CSVインポートジョブエンティティ（バックグラウンドジョブ追跡）';
COMMENT ON COLUMN csv_import_jobs.errors IS 'デバッグ用エラー詳細（JSONB）';

-- ============================================
-- インデックス
-- ============================================

-- Usersインデックス
CREATE INDEX idx_users_date_last_modified ON users(date_last_modified);  -- Delta API用
CREATE INDEX idx_users_status ON users(status);  -- ステータスフィルタ用
CREATE INDEX idx_users_role ON users(role);  -- ロールベースクエリ用
CREATE INDEX idx_users_email ON users(email);  -- メール検索用
CREATE INDEX idx_users_identifier ON users(identifier);  -- 識別子検索用
CREATE INDEX idx_users_metadata_kana_family ON users USING GIN ((metadata->'jp'->>'kanaFamilyName') gin_trgm_ops);  -- カナ姓検索用

-- User-Orgインデックス
CREATE INDEX idx_user_orgs_user ON user_orgs(user_sourced_id);  -- ユーザーベースクエリ用
CREATE INDEX idx_user_orgs_org ON user_orgs(org_sourced_id);  -- 組織ベースクエリ用

-- User-Agentインデックス
CREATE INDEX idx_user_agents_user ON user_agents(user_sourced_id);  -- ユーザーベースクエリ用
CREATE INDEX idx_user_agents_agent ON user_agents(agent_sourced_id);  -- エージェントベースクエリ用

-- Orgsインデックス
CREATE INDEX idx_orgs_date_last_modified ON orgs(date_last_modified);  -- Delta API用
CREATE INDEX idx_orgs_status ON orgs(status);  -- ステータスフィルタ用
CREATE INDEX idx_orgs_type ON orgs(type);  -- タイプフィルタ用
CREATE INDEX idx_orgs_parent ON orgs(parent_sourced_id);  -- 階層トラバーサル用
CREATE INDEX idx_orgs_metadata_prefecture ON orgs USING GIN ((metadata->'jp'->>'prefectureCode'));  -- 都道府県コード検索用

-- Coursesインデックス
CREATE INDEX idx_courses_date_last_modified ON courses(date_last_modified);  -- Delta API用
CREATE INDEX idx_courses_status ON courses(status);  -- ステータスフィルタ用
CREATE INDEX idx_courses_school ON courses(school_sourced_id);  -- 学校ベースクエリ用
CREATE INDEX idx_courses_code ON courses(course_code);  -- コードベース検索用

-- Classesインデックス
CREATE INDEX idx_classes_date_last_modified ON classes(date_last_modified);  -- Delta API用
CREATE INDEX idx_classes_status ON classes(status);  -- ステータスフィルタ用
CREATE INDEX idx_classes_course ON classes(course_sourced_id);  -- コースベースクエリ用
CREATE INDEX idx_classes_school ON classes(school_sourced_id);  -- 学校ベースクエリ用
CREATE INDEX idx_classes_type ON classes(class_type);  -- タイプフィルタ用
CREATE INDEX idx_classes_school_course ON classes(school_sourced_id, course_sourced_id);  -- 複合インデックス

-- Enrollmentsインデックス（最も重要、最大のテーブル）
CREATE INDEX idx_enrollments_date_last_modified ON enrollments(date_last_modified);  -- Delta API用（重要）
CREATE INDEX idx_enrollments_status ON enrollments(status);  -- ステータスフィルタ用
CREATE INDEX idx_enrollments_user ON enrollments(user_sourced_id);  -- ユーザーベースクエリ用
CREATE INDEX idx_enrollments_class ON enrollments(class_sourced_id);  -- クラス名簿クエリ用
CREATE INDEX idx_enrollments_school ON enrollments(school_sourced_id);  -- 学校ベースクエリ用
CREATE INDEX idx_enrollments_role ON enrollments(role);  -- ロールフィルタ用

-- Academic Sessionsインデックス
CREATE INDEX idx_academic_sessions_date_last_modified ON academic_sessions(date_last_modified);  -- Delta API用
CREATE INDEX idx_academic_sessions_status ON academic_sessions(status);  -- ステータスフィルタ用
CREATE INDEX idx_academic_sessions_type ON academic_sessions(type);  -- タイプフィルタ用
CREATE INDEX idx_academic_sessions_parent ON academic_sessions(parent_sourced_id);  -- 階層トラバーサル用
CREATE INDEX idx_academic_sessions_dates ON academic_sessions(start_date, end_date);  -- 日付範囲クエリ用
CREATE INDEX idx_academic_sessions_school_year ON academic_sessions(school_year);  -- 学年度フィルタ用

-- Class-AcademicSessionインデックス
CREATE INDEX idx_class_academic_sessions_class ON class_academic_sessions(class_sourced_id);  -- クラスベースクエリ用
CREATE INDEX idx_class_academic_sessions_session ON class_academic_sessions(academic_session_sourced_id);  -- セッションベースクエリ用

-- Demographicsインデックス
CREATE INDEX idx_demographics_date_last_modified ON demographics(date_last_modified);  -- Delta API用
CREATE INDEX idx_demographics_status ON demographics(status);  -- ステータスフィルタ用

-- API Keysインデックス
CREATE INDEX idx_api_keys_key ON api_keys(key);  -- キー検索用
CREATE INDEX idx_api_keys_organization ON api_keys(organization_id);  -- 組織ベースクエリ用
CREATE INDEX idx_api_keys_active ON api_keys(is_active);  -- アクティブキーフィルタ用

-- Audit Logsインデックス
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);  -- 時間ベースクエリ用
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_sourced_id);  -- エンティティベース監査証跡用
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);  -- ユーザーアクティビティ追跡用
CREATE INDEX idx_audit_logs_action ON audit_logs(action);  -- アクションフィルタ用
CREATE INDEX idx_audit_logs_api_key ON audit_logs(api_key_id);  -- APIキー使用追跡用

-- CSV Import Jobsインデックス
CREATE INDEX idx_csv_import_jobs_status ON csv_import_jobs(status);  -- ステータスベースクエリ用
CREATE INDEX idx_csv_import_jobs_created_at ON csv_import_jobs(created_at);  -- 時間ベースクエリ用
CREATE INDEX idx_csv_import_jobs_created_by ON csv_import_jobs(created_by);  -- ユーザーベースクエリ用

-- ============================================
-- トリガーと関数
-- ============================================

-- date_last_modifiedを自動更新
CREATE OR REPLACE FUNCTION update_date_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_last_modified = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- すべてのOneRosterエンティティにトリガーを適用
CREATE TRIGGER trigger_update_users_date_last_modified
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_orgs_date_last_modified
  BEFORE UPDATE ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_courses_date_last_modified
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_classes_date_last_modified
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_enrollments_date_last_modified
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_academic_sessions_date_last_modified
  BEFORE UPDATE ON academic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

CREATE TRIGGER trigger_update_demographics_date_last_modified
  BEFORE UPDATE ON demographics
  FOR EACH ROW
  EXECUTE FUNCTION update_date_last_modified();

-- Enrollmentの学校整合性を検証（非正規化FK）
CREATE OR REPLACE FUNCTION validate_enrollment_school()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_sourced_id != (SELECT school_sourced_id FROM classes WHERE sourced_id = NEW.class_sourced_id) THEN
    RAISE EXCEPTION 'Enrollment school_sourced_idがclass school_sourced_idと一致しません';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_enrollment_school
  BEFORE INSERT OR UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION validate_enrollment_school();

-- ============================================
-- ビュー
-- ============================================

-- アクティブユーザービュー（削除されていない）
CREATE VIEW active_users AS
SELECT
  id,
  sourced_id,
  date_created,
  date_last_modified,
  enabled_user,
  username,
  given_name,
  family_name,
  role,
  identifier,
  email,
  metadata
FROM users
WHERE status = 'active';

COMMENT ON VIEW active_users IS 'アクティブユーザー（status = active）';

-- マテリアライズドビュー: 組織階層付き学生名簿レポート
CREATE MATERIALIZED VIEW student_roster_report AS
SELECT
  u.sourced_id AS user_sourced_id,
  u.given_name,
  u.family_name,
  u.identifier,
  u.email,
  o.sourced_id AS school_sourced_id,
  o.name AS school_name,
  o.identifier AS school_identifier,
  parent_org.sourced_id AS district_sourced_id,
  parent_org.name AS district_name,
  c.sourced_id AS class_sourced_id,
  c.title AS class_name,
  c.class_code,
  e.sourced_id AS enrollment_sourced_id,
  e.begin_date,
  e.end_date,
  e."primary" AS is_primary_enrollment
FROM users u
JOIN enrollments e ON e.user_sourced_id = u.sourced_id
JOIN classes c ON c.sourced_id = e.class_sourced_id
JOIN orgs o ON o.sourced_id = c.school_sourced_id
LEFT JOIN orgs parent_org ON parent_org.sourced_id = o.parent_sourced_id
WHERE u.status = 'active'
  AND e.status = 'active'
  AND u.role = 'student';

CREATE UNIQUE INDEX idx_student_roster_enrollment ON student_roster_report(enrollment_sourced_id);

COMMENT ON MATERIALIZED VIEW student_roster_report IS '組織階層付き事前計算された学生名簿（夜間リフレッシュ）';

-- ============================================
-- 権限付与（本番環境に合わせて調整）
-- ============================================

-- 例: アプリケーションユーザーを作成して権限を付与
-- CREATE USER app_user WITH PASSWORD 'secure_password_change_in_production';
-- GRANT USAGE ON SCHEMA app TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO app_user;

-- ============================================
-- サンプルデータ（開発/テスト用）
-- ============================================

-- サンプルデータを挿入する場合はコメントを外す

-- INSERT INTO orgs (sourced_id, name, type, identifier, status) VALUES
-- ('org-district-001', '東京都教育委員会', 'district', 'DISTRICT-TOKYO', 'active'),
-- ('org-school-001', '新宿高等学校', 'school', 'SCHOOL-SHINJUKU-001', 'active');

-- UPDATE orgs SET parent_sourced_id = 'org-district-001' WHERE sourced_id = 'org-school-001';

-- INSERT INTO users (sourced_id, enabled_user, username, user_ids, given_name, family_name, role, identifier, email, status, metadata) VALUES
-- ('user-student-001', TRUE, 'tanaka.taro', ARRAY['STU001', 'NAT12345'], '太郎', '田中', 'student', 'STUDENT-001', 'tanaka.taro@example.com', 'active', '{"jp": {"kanaGivenName": "タロウ", "kanaFamilyName": "タナカ", "homeClass": "1-A"}}'),
-- ('user-teacher-001', TRUE, 'suzuki.hanako', ARRAY['TCH001'], '花子', '鈴木', 'teacher', 'TEACHER-001', 'suzuki.hanako@example.com', 'active', '{"jp": {"kanaGivenName": "ハナコ", "kanaFamilyName": "スズキ"}}');

-- ============================================
-- メンテナンスクエリ
-- ============================================

-- マテリアライズドビューをリフレッシュ（午前3時に夜間実行）
-- REFRESH MATERIALIZED VIEW CONCURRENTLY student_roster_report;

-- 登録カウントを再計算（ずれ検出）
-- UPDATE classes SET enrollment_count = (
--   SELECT COUNT(*) FROM enrollments WHERE class_sourced_id = classes.sourced_id AND status = 'active'
-- );

-- VACUUMと分析（週次メンテナンス）
-- VACUUM ANALYZE users;
-- VACUUM ANALYZE enrollments;
-- VACUUM ANALYZE classes;
-- VACUUM ANALYZE audit_logs;

-- ============================================
-- DDLの終わり
-- ============================================
