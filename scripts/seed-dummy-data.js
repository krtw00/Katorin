/**
 * ダミーデータ作成スクリプト
 *
 * このスクリプトは以下のテストデータを作成します：
 * - 1つの大会（tournament）
 * - 複数のチーム（teams）
 * - 各チームに紐づく複数の参加者（participants）
 * - ランダムな数の対戦（matches）
 *
 * 実行方法: node scripts/seed-dummy-data.js
 */

const crypto = require('crypto');
const { supabaseAdmin, supabase, createSupabaseClientForToken } = require('../api/config/supabaseClient');

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = () => {
  const now = new Date();
  const daysAgo = randomInt(0, 30);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
};
const randomScore = () => randomInt(0, 2).toString();

const organizerEmail = process.env.SEED_ORGANIZER_EMAIL || 'seed-admin@katorin.local';
const organizerPassword = process.env.SEED_ORGANIZER_PASSWORD || 'SeedAdmin123!';
const organizerName = process.env.SEED_ORGANIZER_NAME || 'Katorin 運営';

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

const participantFirstNames = ['太郎', '次郎', '三郎', '四郎', '花子', '春子', '夏子', '秋子', '冬子', '一郎'];
const participantLastNames = ['山田', '佐藤', '鈴木', '田中', '渡辺', '伊藤', '中村', '小林', '加藤', '吉田'];

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

const createSlugFrom = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function findAuthUserByEmail(email) {
  let page = 1;
  const normalizedEmail = email.toLowerCase();
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100, page });
    if (error) {
      throw new Error(`Auth user list failed: ${error.message}`);
    }
    const user = data?.users?.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) {
      return user;
    }
    if (!data?.nextPage) {
      return null;
    }
    page = data.nextPage;
  }
}

async function ensureOrganizerUser() {
  const existingUser = await findAuthUserByEmail(organizerEmail);
  if (existingUser) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: organizerPassword,
      email_confirm: true,
      user_metadata: { name: organizerName },
    });
    if (error) {
      throw new Error(`運営アカウントの更新に失敗: ${error.message}`);
    }
    return { user: existingUser, wasNew: false };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: organizerEmail,
    password: organizerPassword,
    email_confirm: true,
    user_metadata: { name: organizerName },
    app_metadata: { role: 'admin', seeded: true },
  });

  if (error) {
    throw new Error(`運営アカウントの作成に失敗: ${error.message}`);
  }

  return { user: data.user, wasNew: true };
}

async function createOrganizerClient(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`運営アカウントでのサインインに失敗しました: ${error?.message || 'unknown error'}`);
  }
  return createSupabaseClientForToken(data.session.access_token);
}

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
    const { user: organizer, wasNew } = await ensureOrganizerUser();
    const organizerClient = await createOrganizerClient(organizerEmail, organizerPassword);
    console.log(`👤 運営アカウント: ${organizer.email || organizer.id} (ID: ${organizer.id})`);
    console.log(`   ${wasNew ? '新規作成しました' : '再利用／パスワードをリセット'}（パスワード: ${organizerPassword}）`);

    console.log('\n📋 大会を作成中...');
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from('tournaments')
      .insert({
        name: 'テスト大会 2025',
        slug: `seed-tournament-${Date.now()}`,
        description: 'これはテスト用のダミー大会です。',
        created_by: organizer.id,
      })
      .select()
      .single();

    if (tournamentError) {
      throw new Error(`大会の作成に失敗: ${tournamentError.message}`);
    }

    console.log(`✅ 大会を作成しました: ${tournament.name} (ID: ${tournament.id})\n`);

    console.log('👥 チームと認証アカウントを作成中...');
    const numTeams = randomInt(5, 8);
    const teams = [];
    const teamCredentials = [];
    const usedTeamNames = new Set();

    for (let i = 0; i < numTeams; i++) {
      let teamName;
      do {
        teamName = teamNames[randomInt(0, teamNames.length - 1)];
      } while (usedTeamNames.has(teamName));
      usedTeamNames.add(teamName);

      const baseUsername = createSlugFrom(teamName) || `team-${i + 1}`;
      const username = `${baseUsername}-${Date.now().toString().slice(-4)}-${i}`;
      const teamEmail = `${username}@${tournament.slug}.players.local`;
      const teamPassword = crypto.randomBytes(8).toString('hex');

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: teamEmail,
        password: teamPassword,
        email_confirm: true,
        app_metadata: {
          role: 'team',
          tournament_id: tournament.id,
          tournament_slug: tournament.slug,
          seeded: true,
        },
      });

      if (authError) {
        console.error(`⚠️  チーム ${teamName} の Auth ユーザー作成に失敗: ${authError.message}`);
        continue;
      }

      const { data: insertedTeam, error: teamInsertError } = await supabaseAdmin
        .from('teams')
        .insert({
          name: teamName,
          username,
          created_by: organizer.id,
          auth_user_id: authData.user.id,
          tournament_id: tournament.id,
        })
        .select()
        .single();

      if (teamInsertError) {
        console.error(`⚠️  チーム ${teamName} のデータベース挿入に失敗: ${teamInsertError.message}`);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        continue;
      }

      teams.push(insertedTeam);
      teamCredentials.push({
        name: insertedTeam.name,
        username: insertedTeam.username,
        email: teamEmail,
        password: teamPassword,
      });
      console.log(`  ✓ ${insertedTeam.name} (ID: ${insertedTeam.id})`);
    }

    console.log(`✅ ${teams.length}個のチームを登録しました（${numTeams}件中）\n`);

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
            can_edit: i === 0,
            created_by: organizer.id,
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

    console.log('🌀 ラウンドを作成中...');
    const baseRounds = [
      { number: 1, title: '予選ラウンド A' },
      { number: 2, title: '予選ラウンド B' },
      { number: 3, title: '決勝ラウンド' },
    ];

    const roundTemplates = baseRounds.map((round, index) => {
      const isLatest = index === baseRounds.length - 1;
      return {
        ...round,
        status: isLatest ? 'open' : 'closed',
        closed_at: isLatest ? null : new Date().toISOString(),
      };
    });

    const { data: rounds, error: roundsError } = await supabaseAdmin
      .from('rounds')
      .insert(
        roundTemplates.map((round) => ({
          tournament_id: tournament.id,
          number: round.number,
          title: round.title,
          status: round.status,
          closed_at: round.closed_at ?? null,
        })),
      )
      .select();

    if (roundsError) {
      throw new Error(`ラウンドの作成に失敗: ${roundsError.message}`);
    }

    console.log(`✅ ${rounds.length}件のラウンドを追加しました\n`);

    if (teams.length < 2) {
      console.log('⚠️ 対戦データを作成するにはチームが2つ以上必要ですが、現在登録済みのチームは少ないためスキップします。');
      console.log('✅ ダミーデータの作成は完了しました（対戦は未作成）。');
      return;
    }

    const numMatches = randomInt(15, 30);
    console.log(`⚔️  ${numMatches}個の対戦を作成中...`);

    let createdMatches = 0;

    for (let i = 0; i < numMatches; i++) {
      const team1 = teams[randomInt(0, teams.length - 1)];
      let team2;
      do {
        team2 = teams[randomInt(0, teams.length - 1)];
      } while (team2.id === team1.id);

      const team1Participants = allParticipants.filter((p) => p.team_id === team1.id);
      const team2Participants = allParticipants.filter((p) => p.team_id === team2.id);

      if (team1Participants.length === 0 || team2Participants.length === 0) {
        continue;
      }

      const player1 = team1Participants[randomInt(0, team1Participants.length - 1)];
      const player2 = team2Participants[randomInt(0, team2Participants.length - 1)];
      const deck1 = deckNames[randomInt(0, deckNames.length - 1)];
      const deck2 = deckNames[randomInt(0, deckNames.length - 1)];
      const score1 = randomScore();
      const score2 = randomScore();

      const targetRound = rounds[i % rounds.length] ?? rounds[0];

      const { error: matchError } = await organizerClient
        .from('matches')
        .insert({
          tournament_id: tournament.id,
          round_id: targetRound?.id ?? null,
          team_id: team1.id,
          team: team1.id,
          player: player1.name,
          deck: deck1,
          selfScore: score1,
          opponentScore: score2,
          opponentTeam: team2.id,
          opponentPlayer: player2.name,
          opponentDeck: deck2,
          date: randomDate(),
          result_status: randomInt(0, 10) > 2 ? 'finalized' : 'draft',
        });

      if (matchError) {
        console.error(`⚠️  対戦 ${i + 1} の作成に失敗: ${matchError.message}`);
        continue;
      }

      createdMatches++;
    }

    console.log(`✅ ${createdMatches}個の対戦を作成しました\n`);

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

    console.log('📝 作成されたチーム一覧（ログイン情報）:');
    teamCredentials.forEach((credential, index) => {
      console.log(
        `  ${index + 1}. ${credential.name} | username: ${credential.username} | email: ${credential.email} | password: ${credential.password}`
      );
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
