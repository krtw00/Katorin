# テストガイドライン

## 1. はじめに
このドキュメントは、Katorinプロジェクトにおけるテスト戦略とベストプラクティスを定めます。高品質なコードベースを維持し、バグを早期に発見することを目的とします。

## 2. テスト方針

### 2.1. テストピラミッド
```
        ┌──────────┐
        │   E2E    │  少ない
        ├──────────┤
        │ 結合テスト │  中程度
        ├──────────┤
        │ 単体テスト │  多い
        └──────────┘
```

- **単体テスト (Unit Test)**: 70%
- **結合テスト (Integration Test)**: 25%
- **E2Eテスト (End-to-End Test)**: 5%

### 2.2. テスト目標
- **カバレッジ**: 全体で70%以上
- **重要機能**: 90%以上 (認証、決済、データ操作など)
- **すべてのテストが高速**: 全テスト実行時間 < 30秒

## 3. テストフレームワーク

### 3.1. 使用ツール
- **テストランナー**: Jest (Create React App標準)
- **Reactコンポーネントテスト**: React Testing Library
- **モック**: Jest (jest.fn(), jest.mock())
- **E2Eテスト**: Playwright または Cypress (検討中)

### 3.2. 設定ファイル
- Create React Appではデフォルトで設定済み
- `setupTests.ts`: テスト環境のセットアップ
- カスタマイズが必要な場合は `package.json` の `jest` セクション、または `jest.config.js` を作成

## 4. 単体テスト (Unit Test)

### 4.1. 対象
- コンポーネントのロジック
- カスタムHooks
- ユーティリティ関数
- ビジネスロジック

### 4.2. テストファイルの配置
- テスト対象ファイルと同じディレクトリに配置
- ファイル名: `<対象ファイル名>.test.tsx` または `<対象ファイル名>.spec.tsx`
- 例: `LoginForm.tsx` → `LoginForm.test.tsx`

### 4.3. 命名規則
- テストスイート: `describe('コンポーネント名/関数名', () => {})`
- テストケース: `it('should do something', () => {})` または `test('does something', () => {})`

### 4.4. コンポーネントテストの例
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('should render email and password inputs', () => {
    render(<LoginForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should call onSubmit when form is submitted', () => {
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});
```

### 4.5. カスタムHooksテストの例
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
  });

  it('should login user', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.user).not.toBeNull();
  });
});
```

### 4.6. ユーティリティ関数テストの例
```typescript
import { formatDate, calculateScore } from './utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-10-30');
    expect(formatDate(date)).toBe('2025年10月30日');
  });
});

describe('calculateScore', () => {
  it('should calculate total score', () => {
    const scores = [10, 20, 30];
    expect(calculateScore(scores)).toBe(60);
  });
});
```

## 5. 結合テスト (Integration Test)

### 5.1. 対象
- コンポーネント間の連携
- API呼び出しを含むフロー
- 複数のHooksの組み合わせ

### 5.2. Supabaseのモック
```typescript
// Supabaseクライアントのモック
jest.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signIn: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));
```

### 5.3. API呼び出しを含むテスト
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { supabase } from './lib/supabaseClient';
import TournamentList from './TournamentList';

describe('TournamentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and display tournaments', async () => {
    const mockTournaments = [
      { id: 1, name: 'Tournament 1' },
      { id: 2, name: 'Tournament 2' }
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: mockTournaments, error: null })
    } as any);

    render(<TournamentList />);

    await waitFor(() => {
      expect(screen.getByText('Tournament 1')).toBeInTheDocument();
      expect(screen.getByText('Tournament 2')).toBeInTheDocument();
    });
  });
});
```

## 6. E2Eテスト (End-to-End Test)

### 6.1. 対象
- ユーザーシナリオ全体
- クリティカルパス
- 主要な業務フロー

### 6.2. テストシナリオ例
- ユーザー登録 → ログイン → トーナメント作成 → 試合結果入力 → ログアウト
- 管理者ログイン → チーム管理 → 参加者追加 → ログアウト

### 6.3. Playwrightの例 (将来)
```typescript
import { test, expect } from '@playwright/test';

test('user can login and create tournament', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // ログイン
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // トーナメント作成
  await expect(page).toHaveURL('/dashboard');
  await page.click('text=Create Tournament');
  await page.fill('input[name="name"]', 'New Tournament');
  await page.click('button:has-text("Save")');

  // 確認
  await expect(page.locator('text=New Tournament')).toBeVisible();
});
```

## 7. テストのベストプラクティス

### 7.1. テストの独立性
- 各テストは独立して実行可能にします。
- テスト間で状態を共有しません。
- `beforeEach` でセットアップ、`afterEach` でクリーンアップします。

### 7.2. わかりやすいテストケース名
- 何をテストしているか明確にします。
- `should` を使って期待する動作を記述します。
- 例: `should display error message when email is invalid`

### 7.3. AAA パターン
- **Arrange**: テストデータの準備
- **Act**: テスト対象の実行
- **Assert**: 結果の検証

```typescript
it('should calculate total price', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }];

  // Act
  const total = calculateTotalPrice(items);

  // Assert
  expect(total).toBe(300);
});
```

### 7.4. モックの使用
- 外部依存はモック化します (API、データベース、外部サービス)。
- モックは最小限にし、実際の動作に近づけます。
- モックの戻り値は明示的に設定します。

### 7.5. テストデータ
- テストデータは意味のある値を使用します。
- ハードコーディングを避け、ファクトリ関数を使用します。
- 例: `createMockUser()`, `createMockTournament()`

### 7.6. 非同期処理
- `async/await` を使用します。
- `waitFor` で非同期更新を待機します。
- タイムアウトを適切に設定します。

### 7.7. スナップショットテスト
- UIの構造変更を検知するために使用します。
- 過度に使用せず、重要なコンポーネントのみに適用します。
- スナップショット更新時は、変更内容を確認します。

```typescript
it('should match snapshot', () => {
  const { container } = render(<Header title="Test" />);
  expect(container).toMatchSnapshot();
});
```

## 8. テストカバレッジ

### 8.1. カバレッジの確認
```bash
npm test -- --coverage
```

### 8.2. カバレッジレポート
- `coverage/` ディレクトリに出力されます。
- `coverage/lcov-report/index.html` をブラウザで開いて確認します。

### 8.3. カバレッジ目標
- **ステートメントカバレッジ**: 70%以上
- **ブランチカバレッジ**: 60%以上
- **関数カバレッジ**: 70%以上
- **ラインカバレッジ**: 70%以上

### 8.4. カバレッジ除外
- テストファイル自体
- 設定ファイル
- 型定義ファイル
- サードパーティライブラリ

## 9. テスト実行

### 9.1. ローカル実行
```bash
# すべてのテストを実行
npm test

# 監視モード (変更時に自動実行)
npm test -- --watch

# 特定のファイルをテスト
npm test -- LoginForm.test.tsx

# カバレッジ付きで実行
npm test -- --coverage

# カバレッジ付き＆監視モードなし（CI用）
npm test -- --coverage --watchAll=false
```

### 9.2. CI/CD環境での実行
- GitHub Actionsで自動実行
- プルリクエスト作成時に全テスト実行
- カバレッジレポートをアーティファクトとして保存

## 10. テストメンテナンス

### 10.1. テストの更新
- コード変更時は、関連するテストも更新します。
- 失敗したテストは放置せず、速やかに修正します。
- 不要になったテストは削除します。

### 10.2. テストのリファクタリング
- 重複したテストコードは共通化します。
- テストユーティリティ関数を作成します。
- テストデータのファクトリを活用します。

### 10.3. フレイキーテスト対策
- テストの順序に依存しないようにします。
- タイミングに依存する処理は `waitFor` を使用します。
- ランダム性を排除します (固定のシード値を使用)。

## 11. テストの優先順位

### 11.1. 高優先度
- 認証・認可機能
- データの作成・更新・削除
- 決済処理 (将来)
- セキュリティ関連機能

### 11.2. 中優先度
- フォームバリデーション
- ナビゲーション
- データ表示
- フィルタリング・ソート

### 11.3. 低優先度
- UI の細かい調整
- アニメーション
- スタイリング

## 12. トラブルシューティング

### 12.1. よくあるエラー
- **テストがタイムアウト**: 非同期処理の待機不足 → `waitFor` を使用
- **モックが効かない**: モックの設定位置が不適切 → `beforeEach` で設定
- **DOM要素が見つからない**: レンダリング完了前にアサーション → `waitFor` を使用

### 12.2. デバッグ方法
- `screen.debug()`: 現在のDOM構造を出力
- `screen.logTestingPlaygroundURL()`: Testing Playground URLを出力
- `console.log()`: テスト実行中の値を確認

## 13. 参考リソース

- [Jest 公式ドキュメント](https://jestjs.io/)
- [React Testing Library 公式ドキュメント](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
