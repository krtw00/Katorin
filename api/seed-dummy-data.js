/**
 * ダミーデータ作成スクリプト
 *
 * このスクリプトは以下のテストデータを作成します：
 * - 1つの大会（tournament）
 * - 複数のチーム（teams）
 * - 各チームに紐づく複数の参加者（participants）
 * - ランダムな数の対戦（matches）
 *
 * 実行方法: node api/seed-dummy-data.js
 */

const { supabaseAdmin } = require('./supabaseClient');

// ランダムな整数を生成
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ランダムな日付を生成（過去30日以内）
const randomDate = () => {
  const now = new Date();
  const daysAgo = randomInt(0, 30);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD形式
};

// ランダムなスコアを生成
const randomScore = () => randomInt(0, 2).toString();

// チーム名のサンプル
const teamNames = [
  'レッドドラゴンズ',
  'ブルーフェニックス',
  'グリーンタイガース',
  'ゴールデンイーグルス',
  'シルバーウルフズ',
  'ブラックパンサーズ',
  'ホワイトファルコンズ',
  'パープルバイパーズ',
  'オレンジライオンズ',
  'サファイアドルフィンズ'
];

// 参加者名のサンプル
const participantFirstNames = ['太郎', '次郎', '三郎', '四郎', '花子', '春子', '夏子', '秋子', '冬子', '一郎'];
const participantLastNames = ['山田', '佐藤', '鈴木', '田中', '渡辺', '伊藤', '中村', '小林', '加藤', '吉田'];

// デッキ名のサンプル
const deckNames = [
  'アグロデッキ',
  'コントロールデッキ',
  'ミッドレンジデッキ',
  'コンボデッキ',
  'ランプデッキ',
  'ビートダウンデッキ',
  'パーミッションデッキ',
  'テンポデッキ'
];

/**
 * メイン処理
 */
async function seedDummyData() {
  if (!supabaseAdmin) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY が設定されていません。');
    console.error('   .env ファイルに SUPABASE_SERVICE_ROLE_KEY を追加してください。');
    process.exit(1);
  }

  console.log('🌱 ダミーデータの作成を開始します...\n');

  try {
    // 1. 大会を作成
    console.log('📋 大会を作成中...');
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from('tournaments')
      .insert({
        name: 'テスト大会 2025',
        slug: `test-tournament-${Date.now()}`,
        description: 'これはテスト用のダミー大会です。'
      })
      .select()
      .single();

    if (tournamentError) {
      throw new Error(`大会の作成に失敗: ${tournamentError.message}`);
    }

    console.log(`✅ 大会を作成しました: ${tournament.name} (ID: ${tournament.id})\n`);

    // 2. チームを作成
    const numTeams = randomInt(5, 8);
    console.log(`👥 ${numTeams}個のチームを作成中...`);

    const teams = [];
    const usedTeamNames = [];

    for (let i = 0; i < numTeams; i++) {
      // 重複しないチーム名を選択
      let teamName;
      do {
        teamName = teamNames[randomInt(0, teamNames.length - 1)];
      } while (usedTeamNames.includes(teamName));
      usedTeamNames.push(teamName);

      const { data: team, error: teamError } = await supabaseAdmin
        .from('teams')
        .insert({
          name: teamName,
          username: `team${i + 1}_${Date.now()}`,
          password_hash: 'dummy_hash_' + randomInt(10000, 99999) // ダミーのハッシュ
        })
        .select()
        .single();

      if (teamError) {
        console.error(`⚠️  チーム ${i + 1} の作成に失敗: ${teamError.message}`);
        continue;
      }

      teams.push(team);
      console.log(`  ✓ ${team.name} (ID: ${team.id})`);
    }

    console.log(`✅ ${teams.length}個のチームを作成しました\n`);

    // 3. 各チームに参加者を作成
    console.log('🧑‍🤝‍🧑 各チームに参加者を作成中...');

    const allParticipants = [];

    for (const team of teams) {
      const numParticipants = randomInt(3, 5);

      for (let i = 0; i < numParticipants; i++) {
        const firstName = participantFirstNames[randomInt(0, participantFirstNames.length - 1)];
        const lastName = participantLastNames[randomInt(0, participantLastNames.length - 1)];
        const participantName = `${lastName} ${firstName}`;

        const { data: participant, error: participantError } = await supabaseAdmin
          .from('participants')
          .insert({
            team_id: team.id,
            name: participantName,
            can_edit: i === 0 // 最初の参加者のみ編集権限を付与
          })
          .select()
          .single();

        if (participantError) {
          console.error(`⚠️  参加者の作成に失敗 (${team.name}): ${participantError.message}`);
          continue;
        }

        allParticipants.push({ ...participant, team });
      }

      console.log(`  ✓ ${team.name}: ${numParticipants}人の参加者を作成`);
    }

    console.log(`✅ 合計 ${allParticipants.length}人の参加者を作成しました\n`);

    // 4. 対戦を作成
    const numMatches = randomInt(15, 30);
    console.log(`⚔️  ${numMatches}個の対戦を作成中...`);

    let createdMatches = 0;

    for (let i = 0; i < numMatches; i++) {
      // ランダムに2つの異なるチームを選択
      const team1 = teams[randomInt(0, teams.length - 1)];
      let team2;
      do {
        team2 = teams[randomInt(0, teams.length - 1)];
      } while (team2.id === team1.id);

      // 各チームからランダムに参加者を選択
      const team1Participants = allParticipants.filter(p => p.team_id === team1.id);
      const team2Participants = allParticipants.filter(p => p.team_id === team2.id);

      if (team1Participants.length === 0 || team2Participants.length === 0) {
        continue;
      }

      const player1 = team1Participants[randomInt(0, team1Participants.length - 1)];
      const player2 = team2Participants[randomInt(0, team2Participants.length - 1)];

      // ランダムにデッキを選択
      const deck1 = deckNames[randomInt(0, deckNames.length - 1)];
      const deck2 = deckNames[randomInt(0, deckNames.length - 1)];

      // スコアを生成
      const score1 = randomScore();
      const score2 = randomScore();

      const { data: match, error: matchError } = await supabaseAdmin
        .from('matches')
        .insert({
          tournament_id: tournament.id,
          team_id: team1.id,
          team: team1.name,
          player: player1.name,
          deck: deck1,
          selfScore: score1,
          opponentScore: score2,
          opponentTeam: team2.name,
          opponentPlayer: player2.name,
          opponentDeck: deck2,
          date: randomDate(),
          result_status: randomInt(0, 10) > 2 ? 'finalized' : 'draft' // 80%をfinalized
        })
        .select()
        .single();

      if (matchError) {
        console.error(`⚠️  対戦 ${i + 1} の作成に失敗: ${matchError.message}`);
        continue;
      }

      createdMatches++;
    }

    console.log(`✅ ${createdMatches}個の対戦を作成しました\n`);

    // 5. 作成結果のサマリーを表示
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ダミーデータの作成が完了しました！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 大会: ${tournament.name}`);
    console.log(`   ID: ${tournament.id}`);
    console.log(`   Slug: ${tournament.slug}`);
    console.log('');
    console.log(`👥 チーム数: ${teams.length}`);
    console.log(`🧑‍🤝‍🧑 参加者数: ${allParticipants.length}`);
    console.log(`⚔️  対戦数: ${createdMatches}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 作成されたチーム一覧:');
    teams.forEach((team, index) => {
      const teamParticipants = allParticipants.filter(p => p.team_id === team.id);
      console.log(`  ${index + 1}. ${team.name} (${teamParticipants.length}人)`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  seedDummyData()
    .then(() => {
      console.log('✅ スクリプトが正常に終了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ スクリプトの実行中にエラーが発生しました:', error);
      process.exit(1);
    });
}

module.exports = { seedDummyData };
