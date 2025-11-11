const fs = require('fs');
const path = require('path');

/**
 * translations.csvを全タグ対応形式にリセットするスクリプト
 *
 * 使い方:
 * node scripts/reset-translations.js
 */

const CSV_PATH = path.join(__dirname, '../src/locales/translations.csv');

// コードベースから抽出された全ての翻訳キー（408個）
const ALL_KEYS = [
  'admin.create.cancel',
  'admin.create.displayNameLabel',
  'admin.create.emailLabel',
  'admin.create.errorFailed',
  'admin.create.errorInvalidResponse',
  'admin.create.passwordLabel',
  'admin.create.submit',
  'admin.create.submitting',
  'admin.create.subtitle',
  'admin.create.title',
  'analytics.title',
  'app.changeTournament',
  'app.logout',
  'app.matchManagement',
  'app.selectedTournament',
  'app.teamParticipantManagement',
  'app.title',
  'auth.login.adminCreateButton',
  'auth.login.adminCreateSection',
  'auth.login.adminTab',
  'auth.login.emailLabel',
  'auth.login.forgotPassword',
  'auth.login.loginFailed',
  'auth.login.passwordHelperText',
  'auth.login.passwordLabel',
  'auth.login.submitButton',
  'auth.login.submitting',
  'auth.login.subtitle',
  'auth.login.teamFieldsRequired',
  'auth.login.teamInfo',
  'auth.login.teamNameLabel',
  'auth.login.teamTab',
  'auth.login.title',
  'auth.passwordReset.backToLogin',
  'auth.passwordReset.emailLabel',
  'auth.passwordReset.failed',
  'auth.passwordReset.newPasswordHelperText',
  'auth.passwordReset.newPasswordLabel',
  'auth.passwordReset.sendResetLink',
  'auth.passwordReset.submitButton',
  'auth.passwordReset.submitting',
  'auth.passwordReset.success',
  'auth.passwordReset.successEmailSent',
  'auth.passwordReset.title',
  'auth.passwordReset.unexpectedError',
  'common.back',
  'common.cancel',
  'common.close',
  'common.copy',
  'common.create',
  'common.creating',
  'common.hide',
  'common.refresh',
  'common.save',
  'common.show',
  'common.total',
  'common.update',
  'common.updating',
  'common.useAuthError',
  'duel.deck',
  'duel.player',
  'duel.vs',
  'duelInput.action',
  'duelInput.add',
  'duelInput.addRecord',
  'duelInput.cancel',
  'duelInput.date',
  'duelInput.deck',
  'duelInput.delete',
  'duelInput.deleteConfirmation',
  'duelInput.deleteConfirmationMessage',
  'duelInput.editRecord',
  'duelInput.matchRecordList',
  'duelInput.noRecords',
  'duelInput.noTournamentOrRound',
  'duelInput.player',
  'duelInput.score',
  'duelInput.team',
  'duelInput.update',
  'language.english',
  'language.japanese',
  'matchCreateDialog.awayTeam',
  'matchCreateDialog.createFailed',
  'matchCreateDialog.createMatch',
  'matchCreateDialog.createMatchDescription',
  'matchCreateDialog.editMatch',
  'matchCreateDialog.editMatchDescription',
  'matchCreateDialog.fetchTeamsError',
  'matchCreateDialog.homeTeam',
  'matchCreateDialog.matchDate',
  'matchCreateDialog.noTeamsRegistered',
  'matchCreateDialog.roundNotSelected',
  'matchCreateDialog.selectTeam',
  'matchCreateDialog.updateFailed',
  'matchList.actions',
  'matchList.cancel',
  'matchList.clear',
  'matchList.date',
  'matchList.dateFrom',
  'matchList.dateTo',
  'matchList.delete',
  'matchList.deleteConfirm',
  'matchList.deleteFailed',
  'matchList.deleteTitle',
  'matchList.deleting',
  'matchList.filter',
  'matchList.filters',
  'matchList.loadFailed',
  'matchList.loadParticipantsFailed',
  'matchList.loadPermissionFailed',
  'matchList.noMatches',
  'matchList.opponentPlayer',
  'matchList.opponentTeam',
  'matchList.player',
  'matchList.reload',
  'matchList.result',
  'matchList.resultDraw',
  'matchList.resultLose',
  'matchList.resultPending',
  'matchList.resultWin',
  'matchList.retry',
  'matchList.score',
  'matchList.searchPlayer',
  'matchList.status',
  'matchList.statusDraft',
  'matchList.statusFinalized',
  'matchList.summary',
  'matchList.title',
  'matchList.unknownPlayer',
  'matchList.unknownTeam',
  'matchManager.awaitingResult',
  'matchManager.cancel',
  'matchManager.closeRoundFailed',
  'matchManager.closeThisRound',
  'matchManager.closed',
  'matchManager.create',
  'matchManager.createFirstRound',
  'matchManager.createFirstRoundPrompt',
  'matchManager.createMatch',
  'matchManager.createMatchPrompt',
  'matchManager.createNewRound',
  'matchManager.createRound',
  'matchManager.createRoundFailed',
  'matchManager.creating',
  'matchManager.delete',
  'matchManager.deleteMatch',
  'matchManager.deleteMatchConfirmation',
  'matchManager.deleteMatchFailed',
  'matchManager.deleteMatchTitle',
  'matchManager.deleting',
  'matchManager.description',
  'matchManager.editMatch',
  'matchManager.fetchMatchesFailed',
  'matchManager.fetchRoundsFailed',
  'matchManager.fetchTeamsError',
  'matchManager.inProgress',
  'matchManager.inputPermissionDescription',
  'matchManager.inputPermissionTitle',
  'matchManager.loadingRounds',
  'matchManager.matchAdded',
  'matchManager.matchCardList',
  'matchManager.matchCardListDescription',
  'matchManager.matchDeleted',
  'matchManager.matchUpdated',
  'matchManager.noMatchesYet',
  'matchManager.noRoundsYet',
  'matchManager.permissionAdmin',
  'matchManager.permissionNone',
  'matchManager.reload',
  'matchManager.reopenRoundFailed',
  'matchManager.reopenThisRound',
  'matchManager.roundClosedCanReopen',
  'matchManager.roundClosedCannotReopen',
  'matchManager.roundNameLabel',
  'matchManager.roundNameOptional',
  'matchManager.roundNamePlaceholder',
  'matchManager.save',
  'matchManager.saving',
  'matchManager.serverError',
  'matchManager.setInputPermission',
  'matchManager.teamCancel',
  'matchManager.teamCurrentUserFailed',
  'matchManager.teamDateLabel',
  'matchManager.teamDelete',
  'matchManager.teamDeleteConfirm',
  'matchManager.teamDeleteFailed',
  'matchManager.teamDeleteTitle',
  'matchManager.teamDeleting',
  'matchManager.teamEditTitle',
  'matchManager.teamLoadError',
  'matchManager.teamNoMatchesToday',
  'matchManager.teamNotSet',
  'matchManager.teamOpenMatches',
  'matchManager.teamOpponentPlayerLabel',
  'matchManager.teamOpponentScoreLabel',
  'matchManager.teamOpponentTeamLabel',
  'matchManager.teamOutcomeDraw',
  'matchManager.teamOutcomeLose',
  'matchManager.teamOutcomePending',
  'matchManager.teamOutcomeWin',
  'matchManager.teamParticipantsFailed',
  'matchManager.teamPlayerLabel',
  'matchManager.teamReadOnlyNotice',
  'matchManager.teamReload',
  'matchManager.teamSave',
  'matchManager.teamSaving',
  'matchManager.teamSelfScoreLabel',
  'matchManager.teamStatsTitle',
  'matchManager.teamTimezoneLabel',
  'matchManager.teamTitle',
  'matchManager.teamUnknownPlayer',
  'matchManager.teamUnknownTeam',
  'matchManager.teamUpdateFailed',
  'matchManager.title',
  'matchManager.toResultEntry',
  'matchManager.updatePermissionFailed',
  'participantManagement.addParticipant',
  'participantManagement.canEdit',
  'participantManagement.cannotEdit',
  'participantManagement.confirmDelete',
  'participantManagement.deleteError',
  'participantManagement.editParticipant',
  'participantManagement.fetchError',
  'participantManagement.fetchTeamError',
  'participantManagement.fetchTeamsForMoveError',
  'participantManagement.grantEditPermission',
  'participantManagement.moveToTeam',
  'participantManagement.nameRequired',
  'participantManagement.noParticipants',
  'participantManagement.participantName',
  'participantManagement.saveError',
  'participantManagement.teamIdMissing',
  'participantManagement.title',
  'resultEntry.actions',
  'resultEntry.add',
  'resultEntry.addRound',
  'resultEntry.addRoundTitle',
  'resultEntry.autoSaved',
  'resultEntry.autoSaving',
  'resultEntry.awayTeam',
  'resultEntry.backToMatchList',
  'resultEntry.cancel',
  'resultEntry.deck',
  'resultEntry.delete',
  'resultEntry.deleteRoundConfirm',
  'resultEntry.deleteRoundTitle',
  'resultEntry.description',
  'resultEntry.draw',
  'resultEntry.edit',
  'resultEntry.editRoundTitle',
  'resultEntry.fetchError',
  'resultEntry.finalizeResult',
  'resultEntry.finalized',
  'resultEntry.finalizing',
  'resultEntry.homeTeam',
  'resultEntry.matchDetails',
  'resultEntry.matchScore',
  'resultEntry.noMatchSelected',
  'resultEntry.noRoundsMessage',
  'resultEntry.notRegistered',
  'resultEntry.pending',
  'resultEntry.player',
  'resultEntry.resultConfirmed',
  'resultEntry.resultUnconfirmed',
  'resultEntry.roundList',
  'resultEntry.roundListDescription',
  'resultEntry.roundModalDescription',
  'resultEntry.save',
  'resultEntry.saveFailed',
  'resultEntry.score',
  'resultEntry.selectMatchDescription',
  'resultEntry.selectMatchPrompt',
  'resultEntry.team',
  'resultEntry.teamNotSet',
  'resultEntry.title',
  'resultEntry.unfinalizeResult',
  'resultEntry.unfinalizing',
  'resultEntry.unsavedChanges',
  'resultEntry.win',
  'teamDashboard.actions',
  'teamDashboard.addMember',
  'teamDashboard.canEdit',
  'teamDashboard.cancel',
  'teamDashboard.cannotEdit',
  'teamDashboard.close',
  'teamDashboard.completedApplyFilters',
  'teamDashboard.completedDateColumn',
  'teamDashboard.completedDateFrom',
  'teamDashboard.completedDateTo',
  'teamDashboard.completedDescription',
  'teamDashboard.completedDetailFailed',
  'teamDashboard.completedDetailTitle',
  'teamDashboard.completedEmpty',
  'teamDashboard.completedLoadFailed',
  'teamDashboard.completedMatchColumn',
  'teamDashboard.completedMatchupLabel',
  'teamDashboard.completedResetFilters',
  'teamDashboard.completedSearch',
  'teamDashboard.completedSectionDescription',
  'teamDashboard.completedSectionTitle',
  'teamDashboard.completedTab',
  'teamDashboard.completedTitle',
  'teamDashboard.completedTournament',
  'teamDashboard.delete',
  'teamDashboard.deleteMatchBody',
  'teamDashboard.deleteMatchFailed',
  'teamDashboard.deleteMatchTitle',
  'teamDashboard.deleteMember',
  'teamDashboard.deleteParticipantFailed',
  'teamDashboard.deleting',
  'teamDashboard.editMember',
  'teamDashboard.loadMatchesFailed',
  'teamDashboard.loadParticipantsFailed',
  'teamDashboard.loadPermissionFailed',
  'teamDashboard.loadTeamFailed',
  'teamDashboard.matchesTab',
  'teamDashboard.memberDialogHelper',
  'teamDashboard.memberNameLabel',
  'teamDashboard.memberNameRequired',
  'teamDashboard.memberPermissionLabel',
  'teamDashboard.memberUpdatedAt',
  'teamDashboard.membersDescription',
  'teamDashboard.membersTab',
  'teamDashboard.membersTitle',
  'teamDashboard.myMatchesDescription',
  'teamDashboard.myMatchesTitle',
  'teamDashboard.noCompletedMatches',
  'teamDashboard.noDate',
  'teamDashboard.noMembers',
  'teamDashboard.noPendingMatches',
  'teamDashboard.pendingSectionDescription',
  'teamDashboard.pendingSectionTitle',
  'teamDashboard.refresh',
  'teamDashboard.reportScore',
  'teamDashboard.retry',
  'teamDashboard.save',
  'teamDashboard.saveParticipantFailed',
  'teamDashboard.saving',
  'teamDashboard.signOut',
  'teamDashboard.subtitleGeneric',
  'teamDashboard.summaryLabel',
  'teamDashboard.title',
  'teamDashboard.unknownTeam',
  'teamDashboard.viewDetails',
  'teamLoginForm.tournamentCodeLabel',
  'teamManagement.allFieldsRequired',
  'teamManagement.confirmDelete',
  'teamManagement.copySuccess',
  'teamManagement.createTeam',
  'teamManagement.deleteError',
  'teamManagement.downloadTemplate',
  'teamManagement.editTeam',
  'teamManagement.exportError',
  'teamManagement.exportTeams',
  'teamManagement.fetchError',
  'teamManagement.generatedPassword',
  'teamManagement.importError',
  'teamManagement.importTeams',
  'teamManagement.leaveBlankForNoChange',
  'teamManagement.noTeams',
  'teamManagement.password',
  'teamManagement.samplePlayerSuzuki',
  'teamManagement.samplePlayerTanaka',
  'teamManagement.sampleTeamA',
  'teamManagement.saveError',
  'teamManagement.teamName',
  'teamManagement.teamNameRequired',
  'teamManagement.title',
  'teamManagement.tournamentSlugRequired',
  'teamManagement.username',
  'teamResultEntry.backToList',
  'teamResultEntry.cancel',
  'teamResultEntry.draft',
  'teamResultEntry.finalize',
  'teamResultEntry.finalized',
  'teamResultEntry.loading',
  'teamResultEntry.opponentScore',
  'teamResultEntry.save',
  'teamResultEntry.selfScore',
  'teamResultEntry.title',
  'teamResultEntry.viewOnly',
  'tournament.create.cancel',
  'tournament.create.descriptionLabel',
  'tournament.create.errorFailed',
  'tournament.create.errorInvalidResponse',
  'tournament.create.errorNameRequired',
  'tournament.create.errorSlugInvalid',
  'tournament.create.nameLabel',
  'tournament.create.slugHelperText',
  'tournament.create.slugLabel',
  'tournament.create.slugPlaceholder',
  'tournament.create.submit',
  'tournament.create.submitting',
  'tournament.create.subtitle',
  'tournament.create.title',
  'tournament.selection.backButton',
  'tournament.selection.createButton',
  'tournament.selection.createdAt',
  'tournament.selection.errorFailed',
  'tournament.selection.errorInvalidResponse',
  'tournament.selection.loading',
  'tournament.selection.logoutButton',
  'tournament.selection.noTournaments',
  'tournament.selection.refreshButton',
  'tournament.selection.selectButton',
  'tournament.selection.subtitle',
  'tournament.selection.title',
];

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

function loadExistingTranslations() {
  const translations = new Map();

  try {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // ヘッダー行をスキップして、各行を処理
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= 3) {
        const key = values[0];
        const ja = values[1];
        const en = values[2];
        translations.set(key, { ja, en });
      }
    }

    console.log(`既存のCSVから ${translations.size} 件の翻訳を読み込みました。`);
  } catch (error) {
    console.log('既存のCSVファイルが見つからないか、読み込みに失敗しました。新規作成します。');
  }

  return translations;
}

function generateNewCSV() {
  const existingTranslations = loadExistingTranslations();
  const lines = ['key,ja,en'];

  let preservedCount = 0;
  let newCount = 0;

  ALL_KEYS.forEach(key => {
    const existing = existingTranslations.get(key);

    if (existing) {
      // 既存の翻訳を保持
      lines.push(`${key},${existing.ja},${existing.en}`);
      preservedCount++;
    } else {
      // 新しいキーは空白で追加（後で翻訳を追加できるように）
      lines.push(`${key},,`);
      newCount++;
    }
  });

  const csvContent = lines.join('\n');
  fs.writeFileSync(CSV_PATH, csvContent, 'utf-8');

  console.log(`\n✅ translations.csvを更新しました！`);
  console.log(`   - 総キー数: ${ALL_KEYS.length}`);
  console.log(`   - 既存翻訳を保持: ${preservedCount}`);
  console.log(`   - 新規キー: ${newCount}`);
  console.log(`\n保存先: ${CSV_PATH}`);
}

function main() {
  console.log('='.repeat(60));
  console.log('translations.csv リセットスクリプト');
  console.log('='.repeat(60));
  console.log();

  generateNewCSV();

  console.log();
  console.log('次のステップ:');
  console.log('1. 新規キーの翻訳を追加');
  console.log('2. `node scripts/csv-to-json.js` を実行してJSONファイルを生成');
  console.log();
}

main();
