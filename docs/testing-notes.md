# テストに関する注意事項

## 現在の状況

### テストフレームワーク
- **使用中**: Jest (react-scripts 5.0.1に含まれる)
- **テストライブラリ**: React Testing Library

### 既知の問題

#### 1. react-router-dom v7との互換性問題

**問題**: react-router-dom v7はESMモジュールのみをサポートしており、Jestのデフォルト設定ではモジュール解決に失敗します。

**現在の対処法**:
- `src/App.test.tsx`を一時的に無効化 (`App.test.tsx.skip`にリネーム)
- CI/CDワークフローでは`--passWithNoTests`フラグを使用

**今後の対応**:
1. **オプション1**: react-router-dom v6にダウングレード
   ```bash
   npm install react-router-dom@^6.20.0
   ```

2. **オプション2**: Jestの設定を更新してESMモジュールをサポート
   - `package.json`に`jest.transformIgnorePatterns`を追加（既に追加済みだが、まだ解決していない）
   - より詳細な設定が必要

3. **オプション3**: Vitestへの移行
   - ESMモジュールのネイティブサポート
   - より高速なテスト実行
   - ただし、大規模な移行作業が必要

### テストの実行

#### ローカル環境
```bash
# テストを実行
npm test --prefix frontend

# カバレッジ付きで実行
npm test -- --coverage --watchAll=false --prefix frontend

# 特定のファイルをテスト
npm test -- App.test.tsx --prefix frontend
```

#### CI/CD環境
GitHub Actionsで自動的に実行されます:
- `ci.yml`: PRとプッシュ時にテストを実行
- `pr-checks.yml`: PRでカバレッジレポートを生成
- `deploy.yml`: デプロイ前にテストを実行

### 依存関係

以下のパッケージがテスト実行に必要です:

```json
{
  "devDependencies": {
    "eslint": "^8.57.1",
    "eslint-config-react-app": "^7.0.1"
  },
  "dependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^13.5.0",
    "@types/jest": "^27.5.2",
    "@types/papaparse": "^5.5.0",
    "papaparse": "^5.5.3"
  }
}
```

## テスト作成のベストプラクティス

### 1. コンポーネントのテスト

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Supabaseのモック

```typescript
jest.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() =>
        Promise.resolve({ data: null, error: null })
      ),
    })),
  },
}));
```

### 3. react-i18nextのモック

```typescript
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'ja',
    },
  }),
}));
```

## トラブルシューティング

### テストが見つからない

**エラー**: `No tests found`

**解決策**:
- テストファイルが`.test.tsx`または`.spec.tsx`で終わっているか確認
- `src/`ディレクトリ内にテストファイルがあるか確認
- `--passWithNoTests`フラグを使用（CI/CD用）

### モジュールが見つからない

**エラー**: `Cannot find module 'react-router-dom'`

**解決策**:
1. 依存関係を再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Jestの設定を確認
   - `package.json`の`jest.transformIgnorePatterns`を確認

3. モジュールをモック
   ```typescript
   jest.mock('react-router-dom', () => ({
     // モック実装
   }));
   ```

### カバレッジレポートが生成されない

**解決策**:
```bash
# coverageディレクトリを削除
rm -rf coverage

# カバレッジ付きでテストを実行
npm test -- --coverage --watchAll=false
```

## 今後の改善計画

### 短期（1-2ヶ月）
- [ ] react-router-dom v7との互換性問題を解決
- [ ] 主要コンポーネントの単体テストを追加（カバレッジ30%目標）
- [ ] テストユーティリティ関数の作成

### 中期（3-6ヶ月）
- [ ] 結合テストの追加（カバレッジ50%目標）
- [ ] E2Eテストの導入（Playwright）
- [ ] テストカバレッジ70%達成

### 長期（6ヶ月以降）
- [ ] Vitestへの移行を検討
- [ ] ビジュアルリグレッションテストの導入
- [ ] パフォーマンステストの追加

## 参考リソース

- [Jest 公式ドキュメント](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Supabase テストガイド](https://supabase.com/docs/guides/getting-started/testing)
