const fs = require('fs');
const path = require('path');

/**
 * 空白の翻訳キーに適切な翻訳を追加するスクリプト
 */

const CSV_PATH = path.join(__dirname, '../src/locales/translations.csv');

// 新規キーの翻訳マップ
const MISSING_TRANSLATIONS = {
  'common.copy': { ja: 'コピー', en: 'Copy' },
  'common.hide': { ja: '非表示', en: 'Hide' },
  'common.show': { ja: '表示', en: 'Show' },
  'matchManager.fetchTeamsError': { ja: 'チーム一覧の取得に失敗しました', en: 'Failed to fetch teams' },
  'resultEntry.actions': { ja: '操作', en: 'Actions' },
  'resultEntry.add': { ja: '追加', en: 'Add' },
  'resultEntry.addRound': { ja: 'ラウンドを追加', en: 'Add Round' },
  'resultEntry.addRoundTitle': { ja: 'ラウンドを追加', en: 'Add Round' },
  'resultEntry.autoSaved': { ja: '自動保存しました', en: 'Auto-saved' },
  'resultEntry.autoSaving': { ja: '自動保存中...', en: 'Auto-saving...' },
  'resultEntry.awayTeam': { ja: '相手チーム', en: 'Away Team' },
  'resultEntry.backToMatchList': { ja: '対戦一覧へ戻る', en: 'Back to Match List' },
  'resultEntry.cancel': { ja: 'キャンセル', en: 'Cancel' },
  'resultEntry.deck': { ja: 'デッキ', en: 'Deck' },
  'resultEntry.delete': { ja: '削除', en: 'Delete' },
  'resultEntry.deleteRoundConfirm': { ja: 'このラウンドを削除しますか？', en: 'Are you sure you want to delete this round?' },
  'resultEntry.deleteRoundTitle': { ja: 'ラウンドを削除', en: 'Delete Round' },
  'resultEntry.description': { ja: '対戦結果の詳細を入力できます', en: 'Enter detailed match results' },
  'resultEntry.edit': { ja: '編集', en: 'Edit' },
  'resultEntry.editRoundTitle': { ja: 'ラウンドを編集', en: 'Edit Round' },
  'resultEntry.finalizeResult': { ja: '結果を確定', en: 'Finalize Result' },
  'resultEntry.finalized': { ja: '確定済み', en: 'Finalized' },
  'resultEntry.finalizing': { ja: '確定中...', en: 'Finalizing...' },
  'resultEntry.homeTeam': { ja: 'ホームチーム', en: 'Home Team' },
  'resultEntry.matchDetails': { ja: '対戦詳細', en: 'Match Details' },
  'resultEntry.noMatchSelected': { ja: '対戦が選択されていません', en: 'No match selected' },
  'resultEntry.noRoundsMessage': { ja: 'まだラウンドがありません', en: 'No rounds yet' },
  'resultEntry.player': { ja: '選手', en: 'Player' },
  'resultEntry.roundListDescription': { ja: 'ラウンドを選択して結果を入力してください', en: 'Select a round to enter results' },
  'resultEntry.roundModalDescription': { ja: 'ラウンドの情報を入力してください', en: 'Enter round information' },
  'resultEntry.save': { ja: '保存', en: 'Save' },
  'resultEntry.score': { ja: 'スコア', en: 'Score' },
  'resultEntry.selectMatchDescription': { ja: '結果を入力する対戦を選択してください', en: 'Select a match to enter results' },
  'resultEntry.selectMatchPrompt': { ja: '対戦を選択', en: 'Select Match' },
  'resultEntry.team': { ja: 'チーム', en: 'Team' },
  'resultEntry.title': { ja: '結果入力', en: 'Result Entry' },
  'resultEntry.unfinalizeResult': { ja: '確定を解除', en: 'Unfinalize Result' },
  'resultEntry.unfinalizing': { ja: '解除中...', en: 'Unfinalizing...' },
  'resultEntry.unsavedChanges': { ja: '未保存の変更があります', en: 'You have unsaved changes' },
  'teamDashboard.historyButton': { ja: '履歴を見る', en: 'View History' },
  'teamDashboard.historySectionDescription': { ja: '過去の試合結果を確認できます', en: 'View past match results' },
  'teamDashboard.historySectionTitle': { ja: '試合履歴', en: 'Match History' },
  'teamDashboard.loadDashboardFailed': { ja: 'ダッシュボード情報の取得に失敗しました', en: 'Failed to load dashboard information' },
  'teamDashboard.loadPermissionFailed': { ja: '権限情報の取得に失敗しました', en: 'Failed to load permission information' },
  'teamDashboard.manageParticipantsButton': { ja: '参加者を管理', en: 'Manage Participants' },
  'teamDashboard.matchManagementAdminButton': { ja: '対戦を管理', en: 'Manage Matches' },
  'teamDashboard.matchManagementAdminDescription': { ja: '試合結果を記録・編集できます', en: 'Record and edit match results' },
  'teamDashboard.matchManagementAdminTitle': { ja: '対戦管理', en: 'Match Management' },
  'teamDashboard.matchManagementViewerButton': { ja: '対戦を見る', en: 'View Matches' },
  'teamDashboard.matchManagementViewerDescription': { ja: '試合結果を確認できます', en: 'View match results' },
  'teamDashboard.matchManagementViewerTitle': { ja: '対戦閲覧', en: 'Match Viewer' },
  'teamDashboard.participantsCountLabel': { ja: '参加者数', en: 'Participants' },
  'teamDashboard.todayMatchesLabel': { ja: '本日の試合', en: "Today's Matches" },
  'teamDashboard.todayRecordEmpty': { ja: '本日の試合はまだありません', en: 'No matches today yet' },
  'teamDashboard.todayRecordValue': { ja: '{{wins}}勝 {{losses}}敗', en: '{{wins}}W {{losses}}L' },
  'teamDashboard.todaySummaryTitle': { ja: '本日のサマリー', en: "Today's Summary" },
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function main() {
  try {
    console.log('CSVファイルを読み込んでいます...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n');

    const updatedLines = [];
    let updatedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        updatedLines.push('');
        continue;
      }

      if (i === 0) {
        // ヘッダー行
        updatedLines.push(line);
        continue;
      }

      const values = parseCSVLine(line);
      if (values.length < 3) {
        updatedLines.push(line);
        continue;
      }

      const key = values[0];
      let ja = values[1];
      let en = values[2];

      // 翻訳が空白の場合、マップから取得
      if ((!ja || !en) && MISSING_TRANSLATIONS[key]) {
        ja = MISSING_TRANSLATIONS[key].ja;
        en = MISSING_TRANSLATIONS[key].en;
        updatedLines.push(`${key},${ja},${en}`);
        updatedCount++;
        console.log(`✓ 翻訳を追加: ${key}`);
      } else {
        updatedLines.push(line);
      }
    }

    const newContent = updatedLines.join('\n');
    fs.writeFileSync(CSV_PATH, newContent, 'utf-8');

    console.log(`\n✅ ${updatedCount} 件の翻訳を追加しました！`);
    console.log(`保存先: ${CSV_PATH}`);
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
