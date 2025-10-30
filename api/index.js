const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('./supabaseClient');
const { requireAuth, requireAdmin, requireTeamAuth } = require('./authMiddleware');
const crypto = require('crypto');
const multer = require('multer');
const Papa = require('papaparse');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); // CSVファイルをメモリに保存する

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key'; // authMiddleware.js と同じシークレットを使用

const createSlugFrom = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  res.send('Hello from Node.js backend!');
});

// --- Team Management Endpoints ---

// Register a new team
app.post('/api/teams/register', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { name } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: 'チーム名は必須です。' });
  }

  const teamUsername = createSlugFrom(name);
  const generatedPassword = crypto.randomBytes(8).toString('hex'); // 16文字のランダムなパスワード
  const teamEmail = `${teamUsername}@${req.user.id}.teams.local`; // チーム専用の疑似メールアドレス

  try {
    // Supabase Authにユーザーを登録
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: teamEmail,
      password: generatedPassword,
      email_confirm: true,
      app_metadata: { role: 'team', tournament_creator_id: req.user.id },
    });

    if (authError) {
      console.error('[POST /api/teams/register] Supabase Auth user creation error:', authError);
      return res.status(500).json({ error: authError.message });
    }

    const teamAuthUserId = authData.user.id;

    // Check if username already exists in teams table
    const { data: existingTeam, error: fetchError } = await client
      .from('teams')
      .select('id')
      .eq('username', teamUsername)
      .single();

    if (existingTeam) {
      // If team username already exists, delete the auth user created above
      await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
      return res.status(409).json({ error: 'このチーム名は既に使用されています。' });
    }
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('[POST /api/teams/register] Supabase fetch error:', fetchError);
      await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
      return res.status(500).json({ error: fetchError.message });
    }

    const { data, error } = await client
      .from('teams')
      .insert({
        name,
        username: teamUsername,
        created_by: req.user.id, // Link team to the creating admin user
        auth_user_id: teamAuthUserId, // Link team to the Supabase Auth user
      })
      .select('id, name, username, created_at')
      .single();

    if (error) {
      console.error('[POST /api/teams/register] Supabase insert error:', error);
      await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ ...data, generatedPassword });
  } catch (err) {
    console.error('[POST /api/teams/register] Unexpected error:', err);
    res.status(500).json({ error: 'チーム登録に失敗しました。' });
  }
});

// Team login
app.post('/api/teams/login', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ error: 'ユーザー名とパスワードは必須です。' });
  }

  try {
    const { data: team, error } = await supabase
      .from('teams')
      .select('id, name, username, password_hash')
      .eq('username', username)
      .single();

    if (error || !team) {
      console.error('[POST /api/teams/login] Supabase fetch error:', error ?? 'team not found');
      return res.status(401).json({ error: '無効なユーザー名またはパスワードです。' });
    }

    const passwordMatch = await bcrypt.compare(password, team.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: '無効なユーザー名またはパスワードです。' });
    }

    // Generate JWT token for the team
    const token = jwt.sign({ teamId: team.id, username: team.username }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ teamId: team.id, name: team.name, username: team.username, token });
  } catch (err) {
    console.error('[POST /api/teams/login] Unexpected error:', err);
    res.status(500).json({ error: 'チームログインに失敗しました。' });
  }
});

// Get all teams created by the authenticated user
app.get('/api/teams', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  try {
    const { data, error } = await client
      .from('teams')
      .select('id, name, username')
      .eq('created_by', req.user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('[GET /api/teams] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/teams] Unexpected error:', err);
    res.status(500).json({ error: 'チームの取得に失敗しました。' });
  }
});

// Get a specific team by ID (only if created by the authenticated user)
app.get('/api/teams/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  try {
    const { data: team, error } = await client
      .from('teams')
      .select('id, name, username, created_at')
      .eq('id', id)
      .eq('created_by', req.user.id) // Ensure only creator can access
      .single();

    if (error || !team) {
      console.error('[GET /api/teams/:id] Supabase error:', error ?? 'team not found');
      return res.status(404).json({ error: 'チームが見つからないか、アクセス権がありません。' });
    }
    res.json(team);
  } catch (err) {
    console.error('[GET /api/teams/:id] Unexpected error:', err);
    res.status(500).json({ error: 'チームの取得に失敗しました。' });
  }
});

// Update a team (only if created by the authenticated user)
app.put('/api/teams/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const { name, username, password } = req.body ?? {};

  try {
    // First, get the team to find its auth_user_id
    const { data: team, error: fetchError } = await client
      .from('teams')
      .select('id, username, auth_user_id, created_by')
      .eq('id', id)
      .eq('created_by', req.user.id) // Ensure only creator can access
      .single();

    if (fetchError || !team) {
      console.error('[PUT /api/teams/:id] Supabase fetch error:', fetchError ?? 'team not found or not authorized');
      return res.status(404).json({ error: 'チームが見つからないか、更新する権限がありません。' });
    }

    const teamUpdatePayload = {};
    if (name) teamUpdatePayload.name = name.trim();
    if (username) teamUpdatePayload.username = username.trim();

    const authUpdatePayload = {};
    if (password) authUpdatePayload.password = password;
    if (username && username.trim() !== team.username) {
      // Construct the new pseudo-email
      const creatorId = team.created_by.split('-')[0]; // Use a part of the creator's UUID for the domain
      authUpdatePayload.email = `${username.trim()}@${creatorId}.teams.local`;
    }

    // Update Supabase Auth user if needed
    if (Object.keys(authUpdatePayload).length > 0 && team.auth_user_id) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        team.auth_user_id,
        authUpdatePayload
      );
      if (authUpdateError) {
        console.error('[PUT /api/teams/:id] Supabase Auth user update error:', authUpdateError);
        return res.status(500).json({ error: authUpdateError.message });
      }
    }

    // Update the teams table if needed
    if (Object.keys(teamUpdatePayload).length > 0) {
      const { data, error } = await client
        .from('teams')
        .update(teamUpdatePayload)
        .eq('id', id)
        .select('id, name, username, created_at')
        .single();

      if (error) {
        console.error('[PUT /api/teams/:id] Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    }

    // If only auth was updated, return a success message or the updated team info
    const { data: updatedTeam } = await client
      .from('teams')
      .select('id, name, username, created_at')
      .eq('id', id)
      .single();

    res.json(updatedTeam);
  } catch (err) {
    console.error('[PUT /api/teams/:id] Unexpected error:', err);
    res.status(500).json({ error: 'チームの更新に失敗しました。' });
  }
});

// Delete a team (only if created by the authenticated user)
app.delete('/api/teams/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  try {
    // First, get the team to find its auth_user_id
    const { data: team, error: fetchError } = await client
      .from('teams')
      .select('id, auth_user_id, created_by')
      .eq('id', id)
      .eq('created_by', req.user.id) // Ensure only creator can delete
      .single();

    if (fetchError || !team) {
      console.error('[DELETE /api/teams/:id] Supabase fetch error:', fetchError ?? 'team not found or not authorized');
      return res.status(404).json({ error: 'チームが見つからないか、削除する権限がありません。' });
    }

    // Delete the Supabase Auth user
    if (team.auth_user_id) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(team.auth_user_id);
      if (authDeleteError) {
        console.error('[DELETE /api/teams/:id] Supabase Auth user deletion error:', authDeleteError);
        // Auth user deletion failed, but we might still want to delete the team record
        // Depending on desired behavior, this could be a hard error or just a warning
      }
    }

    // Then, delete the team record from the teams table
    const { error } = await client
      .from('teams')
      .delete()
      .eq('id', id)
      .eq('created_by', req.user.id); // Double check authorization

    if (error) {
      console.error('[DELETE /api/teams/:id] Supabase error:', error);
      return res.status(404).json({ error: 'チームが見つからないか、削除する権限がありません。' });
    }
    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error('[DELETE /api/teams/:id] Unexpected error:', err);
    res.status(500).json({ error: 'チームの削除に失敗しました。' });
  }
});

// Export teams and participants to CSV
app.get('/api/teams/export', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }

  try {
    const { data: teams, error: teamsError } = await client
      .from('teams')
      .select('id, name, username, created_by')
      .eq('created_by', req.user.id);

    if (teamsError) {
      console.error('[GET /api/teams/export] Supabase teams fetch error:', teamsError);
      return res.status(500).json({ error: teamsError.message });
    }

    const { data: participants, error: participantsError } = await client
      .from('participants')
      .select('id, name, can_edit, team_id')
      .in('team_id', teams.map((t) => t.id));

    if (participantsError) {
      console.error('[GET /api/teams/export] Supabase participants fetch error:', participantsError);
      return res.status(500).json({ error: participantsError.message });
    }

    const csvData = [];
    csvData.push(['team_name', 'team_username', 'participant_name', 'can_edit']);

    teams.forEach((team) => {
      const teamParticipants = participants.filter((p) => p.team_id === team.id);
      if (teamParticipants.length === 0) {
        csvData.push([team.name, team.username, '', '']);
      } else {
        teamParticipants.forEach((participant) => {
          csvData.push([team.name, team.username, participant.name, participant.can_edit ? 'yes' : 'no']);
        });
      }
    });

    const csv = Papa.unparse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="teams_and_participants.csv"');
    res.status(200).send(csv);
  } catch (err) {
    console.error('[GET /api/teams/export] Unexpected error:', err);
    res.status(500).json({ error: 'チームと参加者のエクスポートに失敗しました。' });
  }
});

// Import teams and participants from CSV
app.post('/api/teams/import', requireAuth, upload.single('file'), async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'CSVファイルをアップロードしてください。' });
  }

  const csvFile = req.file.buffer.toString('utf8');

  try {
    const parsed = Papa.parse(csvFile, { header: true, skipEmptyLines: true });
    const rows = parsed.data;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'CSVファイルにデータがありません。' });
    }

    const importedTeams = new Map(); // Map<team_name, team_id>
    let teamsCreatedCount = 0;
    let participantsCreatedCount = 0;

    // Use a transaction for atomicity
    await client.rpc('start_transaction'); // Assuming you have a start_transaction RPC function

    for (const row of rows) {
      const teamName = row.team_name?.trim();
      const participantName = row.participant_name?.trim();
      const canEdit = row.can_edit?.trim()?.toLowerCase() === 'yes';

      if (!teamName) {
        await client.rpc('rollback_transaction');
        return res.status(400).json({ error: 'チーム名は必須です。' });
      }

      let teamId = importedTeams.get(teamName);
      let teamUsername;

      if (!teamId) {
        // Check if team already exists in DB
        const { data: existingTeam, error: fetchTeamError } = await client
          .from('teams')
          .select('id, username')
          .eq('name', teamName)
          .eq('created_by', req.user.id)
          .single();

        if (existingTeam) {
          teamId = existingTeam.id;
          teamUsername = existingTeam.username;
          importedTeams.set(teamName, teamId);
        } else {
          // Create new team
          teamUsername = createSlugFrom(teamName);
          const generatedPassword = crypto.randomBytes(8).toString('hex');
          const teamEmail = `${teamUsername}@${req.user.id}.teams.local`;

          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: teamEmail,
            password: generatedPassword,
            email_confirm: true,
            app_metadata: { role: 'team', tournament_creator_id: req.user.id },
          });

          if (authError) {
            console.error('[POST /api/teams/import] Supabase Auth user creation error:', authError);
            await client.rpc('rollback_transaction');
            return res.status(500).json({ error: authError.message });
          }

          const teamAuthUserId = authData.user.id;

          const { data: newTeam, error: insertTeamError } = await client
            .from('teams')
            .insert({
              name: teamName,
              username: teamUsername,
              created_by: req.user.id,
              auth_user_id: teamAuthUserId,
            })
            .select('id')
            .single();

          if (insertTeamError) {
            console.error('[POST /api/teams/import] Supabase team insert error:', insertTeamError);
            await supabaseAdmin.auth.admin.deleteUser(teamAuthUserId);
            await client.rpc('rollback_transaction');
            return res.status(500).json({ error: insertTeamError.message });
          }
          teamId = newTeam.id;
          importedTeams.set(teamName, teamId);
          teamsCreatedCount++;
        }
      }

      if (participantName && teamId) {
        // Check if participant already exists for this team
        const { data: existingParticipant, error: fetchParticipantError } = await client
          .from('participants')
          .select('id')
          .eq('name', participantName)
          .eq('team_id', teamId)
          .single();

        if (!existingParticipant) {
          const { error: insertParticipantError } = await client
            .from('participants')
            .insert({
              team_id: teamId,
              name: participantName,
              can_edit: canEdit,
              created_by: req.user.id,
            });

          if (insertParticipantError) {
            console.error('[POST /api/teams/import] Supabase participant insert error:', insertParticipantError);
            await client.rpc('rollback_transaction');
            return res.status(500).json({ error: insertParticipantError.message });
          }
          participantsCreatedCount++;
        }
      }
    }

    await client.rpc('commit_transaction');
    res.status(200).json({ message: `${teamsCreatedCount} チームと ${participantsCreatedCount} 参加者をインポートしました。`, teamsCreatedCount, participantsCreatedCount });
  } catch (err) {
    console.error('[POST /api/teams/import] Unexpected error:', err);
    await client.rpc('rollback_transaction'); // Ensure rollback on unexpected errors
    res.status(500).json({ error: 'チームと参加者のインポートに失敗しました。' });
  }
});

// --- Participant Management Endpoints (Admin) ---

// Get participants for a team as the creator (admin view)
app.get('/api/admin/teams/:teamId/participants', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { teamId } = req.params;

  try {
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('[GET /api/admin/teams/:teamId/participants] Supabase team fetch error:', teamError ?? 'team not found');
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を閲覧する権限がありません。' });
    }

    const { data, error } = await client
      .from('participants')
      .select('id, name, can_edit, created_at')
      .eq('team_id', teamId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[GET /api/admin/teams/:teamId/participants] Supabase participants fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/admin/teams/:teamId/participants] Unexpected error:', err);
    return res.status(500).json({ error: '参加者の取得に失敗しました。' });
  }
});

// Add a participant to a team as the creator
app.post('/api/admin/teams/:teamId/participants', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { teamId } = req.params;
  const { name, can_edit } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: '参加者名は必須です。' });
  }

  try {
    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('[POST /api/admin/teams/:teamId/participants] Supabase team fetch error:', teamError ?? 'team not found');
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を追加する権限がありません。' });
    }

    const { data, error } = await client
      .from('participants')
      .insert({
        team_id: teamId,
        name,
        can_edit: Boolean(can_edit),
        created_by: req.user.id,
      })
      .select('id, name, can_edit, created_at')
      .single();

    if (error || !data) {
      console.error('[POST /api/admin/teams/:teamId/participants] Supabase insert error:', error ?? 'insert returned no data');
      return res.status(500).json({ error: error?.message ?? '参加者の追加に失敗しました。' });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('[POST /api/admin/teams/:teamId/participants] Unexpected error:', err);
    return res.status(500).json({ error: '参加者の追加に失敗しました。' });
  }
});

// Update a participant as the team creator
app.put('/api/admin/participants/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const { name, can_edit, team_id: newTeamId } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: '参加者名は必須です。' });
  }

  try {
    const { data: participant, error: participantError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (participantError || !participant) {
      console.error('[PUT /api/admin/participants/:id] Supabase participant fetch error:', participantError ?? 'participant not found');
      return res.status(404).json({ error: '参加者が見つかりません。' });
    }

    const targetTeamId = newTeamId ?? participant.team_id;

    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', targetTeamId)
      .single();

    if (teamError || !team) {
      console.error('[PUT /api/admin/participants/:id] Supabase team fetch error:', teamError ?? 'team not found');
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を更新する権限がありません。' });
    }

    const updatePayload = {
      name,
      can_edit: Boolean(can_edit),
      team_id: targetTeamId,
    };

    const { data, error } = await client
      .from('participants')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, can_edit, team_id, created_at')
      .single();

    if (error || !data) {
      console.error('[PUT /api/admin/participants/:id] Supabase update error:', error ?? 'participant not found');
      return res.status(500).json({ error: error?.message ?? '参加者の更新に失敗しました。' });
    }

    return res.json(data);
  } catch (err) {
    console.error('[PUT /api/admin/participants/:id] Unexpected error:', err);
    return res.status(500).json({ error: '参加者の更新に失敗しました。' });
  }
});

// Delete a participant as the team creator
app.delete('/api/admin/participants/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;

  try {
    const { data: participant, error: participantError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (participantError || !participant) {
      console.error('[DELETE /api/admin/participants/:id] Supabase participant fetch error:', participantError ?? 'participant not found');
      return res.status(404).json({ error: '参加者が見つかりません。' });
    }

    const { data: team, error: teamError } = await client
      .from('teams')
      .select('id, created_by')
      .eq('id', participant.team_id)
      .single();

    if (teamError || !team) {
      console.error('[DELETE /api/admin/participants/:id] Supabase team fetch error:', teamError ?? 'team not found');
      return res.status(404).json({ error: 'チームが見つかりません。' });
    }

    if (team.created_by !== req.user.id) {
      return res.status(403).json({ error: 'このチームの参加者を削除する権限がありません。' });
    }

    const { error } = await client.from('participants').delete().eq('id', id);

    if (error) {
      console.error('[DELETE /api/admin/participants/:id] Supabase delete error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('[DELETE /api/admin/participants/:id] Unexpected error:', err);
    return res.status(500).json({ error: '参加者の削除に失敗しました。' });
  }
});

// --- Participant Management Endpoints (Team) ---

// Add a participant to a team (requires team auth)
app.post('/api/teams/:teamId/participants', requireTeamAuth, async (req, res) => {
  const client = req.supabase; // Using the client from requireAuth, but teamId is from requireTeamAuth
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { teamId } = req.params;
  const { name, can_edit } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ error: '参加者名は必須です。' });
  }

  // Ensure the authenticated team is the one being modified
  if (req.team.id !== teamId) {
    return res.status(403).json({ error: 'このチームの参加者を追加する権限がありません。' });
  }

  try {
    const { data, error } = await client
      .from('participants')
      .insert({
        team_id: teamId,
        name,
        can_edit: can_edit ?? false,
        created_by: req.team.created_by, // Link participant to the team's creator user
      })
      .select('id, name, can_edit, created_at')
      .single();

    if (error) {
      console.error('[POST /api/teams/:teamId/participants] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('[POST /api/teams/:teamId/participants] Unexpected error:', err);
    res.status(500).json({ error: '参加者の追加に失敗しました。' });
  }
});

// Get participants for a specific team (requires team auth)
app.get('/api/teams/:teamId/participants', requireTeamAuth, async (req, res) => {
  const client = req.supabase; // Using the client from requireAuth, but teamId is from requireTeamAuth
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { teamId } = req.params;

  // Ensure the authenticated team is the one being queried
  if (req.team.id !== teamId) {
    return res.status(403).json({ error: 'このチームの参加者を取得する権限がありません。' });
  }

  try {
    const { data, error } = await client
      .from('participants')
      .select('id, name, can_edit, created_at')
      .eq('team_id', teamId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[GET /api/teams/:teamId/participants] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/teams/:teamId/participants] Unexpected error:', err);
    res.status(500).json({ error: '参加者の取得に失敗しました。' });
  }
});

// Update a participant (requires team auth)
app.put('/api/participants/:id', requireTeamAuth, async (req, res) => {
  const client = req.supabase; // Using the client from requireAuth, but teamId is from requireTeamAuth
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  const { name, can_edit, team_id: newTeamId } = req.body ?? {}; // newTeamId for moving participant

  try {
    // First, get the participant to check ownership
    const { data: participant, error: fetchError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (fetchError || !participant) {
      console.error('[PUT /api/participants/:id] Supabase fetch error:', fetchError ?? 'participant not found');
      return res.status(404).json({ error: '参加者が見つからないか、アクセス権がありません。' });
    }

    // Ensure the authenticated team owns this participant
    if (req.team.id !== participant.team_id) {
      return res.status(403).json({ error: 'この参加者を更新する権限がありません。' });
    }

    const updatePayload = {};
    if (name) updatePayload.name = name;
    if (typeof can_edit === 'boolean') updatePayload.can_edit = can_edit;
    if (newTeamId) {
      // Check if the new team exists and is owned by the same user who created the current team
      const { data: newTeam, error: newTeamError } = await client
        .from('teams')
        .select('id, created_by')
        .eq('id', newTeamId)
        .eq('created_by', req.team.created_by) // Ensure same creator user
        .single();

      if (newTeamError || !newTeam) {
        return res.status(400).json({ error: '移動先のチームが見つからないか、アクセス権がありません。' });
      }
      updatePayload.team_id = newTeamId;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: '更新するデータがありません。' });
    }

    const { data, error } = await client
      .from('participants')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, can_edit, team_id, created_at')
      .single();

    if (error || !data) {
      console.error('[PUT /api/participants/:id] Supabase error:', error ?? 'participant not found or not authorized');
      return res.status(404).json({ error: '参加者が見つからないか、更新する権限がありません。' });
    }
    res.json(data);
  } catch (err) {
    console.error('[PUT /api/participants/:id] Unexpected error:', err);
    res.status(500).json({ error: '参加者の更新に失敗しました。' });
  }
});

// Delete a participant (requires team auth)
app.delete('/api/participants/:id', requireTeamAuth, async (req, res) => {
  const client = req.supabase; // Using the client from requireAuth, but teamId is from requireTeamAuth
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { id } = req.params;
  try {
    // First, get the participant to check ownership
    const { data: participant, error: fetchError } = await client
      .from('participants')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (fetchError || !participant) {
      console.error('[DELETE /api/participants/:id] Supabase fetch error:', fetchError ?? 'participant not found');
      return res.status(404).json({ error: '参加者が見つからないか、アクセス権がありません。' });
    }

    // Ensure the authenticated team owns this participant
    if (req.team.id !== participant.team_id) {
      return res.status(403).json({ error: 'この参加者を削除する権限がありません。' });
    }

    const { error } = await client
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE /api/participants/:id] Supabase error:', error);
      return res.status(404).json({ error: '参加者が見つからないか、削除する権限がありません。' });
    }
    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error('[DELETE /api/participants/:id] Unexpected error:', err);
    res.status(500).json({ error: '参加者の削除に失敗しました。' });
  }
});

// Get all matches for a tournament (optionally filtered by round)
app.get('/api/matches', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId } = req.query;
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId を指定してください。' });
  }
  let query = client
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('date', { ascending: false });
  if (roundId) {
    query = query.eq('round_id', roundId);
  }
  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/matches] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Get match by id
app.get('/api/matches/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { data, error } = await client
    .from('matches')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) {
    console.error('[GET /api/matches/:id] Supabase error:', error);
    return res.status(404).json({ error: error.message });
  }
  res.json(data);
});

// Create a new match
app.post('/api/matches', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId, ...rest } = req.body ?? {};
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId を指定してください。' });
  }
  if (!roundId) {
    return res.status(400).json({ error: 'roundId を指定してください。' });
  }
  const { data, error } = await client
    .from('matches')
    .insert({
      ...rest,
      tournament_id: tournamentId,
      round_id: roundId,
    })
    .select()
    .single();
  if (error) {
    console.error('[POST /api/matches] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Update a match
app.put('/api/matches/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId, ...rest } = req.body ?? {};
  const updatePayload = {
    ...rest,
  };
  if (roundId) {
    updatePayload.round_id = roundId;
  }
  if (tournamentId) {
    updatePayload.tournament_id = tournamentId;
  }
  const { data, error } = await client
    .from('matches')
    .update(updatePayload)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    console.error('[PUT /api/matches/:id] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Delete a match
app.delete('/api/matches/:id', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { data, error } = await client
    .from('matches')
    .delete()
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    console.error('[DELETE /api/matches/:id] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// List tournaments (public)
app.get('/api/tournaments', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { data, error } = await client
    .from('tournaments')
    .select('id, name, slug, description, created_at')
    .eq('created_by', req.user.id)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[GET /api/tournaments] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Create a new tournament (admin only)
app.post('/api/tournaments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, slug, description } = req.body ?? {};
    const normalizedName = (name ?? '').toString().trim();
    if (!normalizedName) {
      return res.status(400).json({ error: '大会名を入力してください。' });
    }

    const baseSlug = slug ? slug.toString() : normalizedName;
    const normalizedSlug = createSlugFrom(baseSlug);
    if (!normalizedSlug) {
      return res
        .status(400)
        .json({ error: 'スラッグは半角英数字とハイフンのみ使用できます。' });
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      return res
        .status(400)
        .json({ error: 'スラッグは半角英数字とハイフンのみ使用できます。' });
    }

    const client = req.supabase;
    if (!client) {
      return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
    }
    const { data, error } = await client
      .from('tournaments')
      .insert({
        name: normalizedName,
        slug: normalizedSlug,
        description: description ? description.toString().trim() || null : null,
        created_by: req.user.id,
      })
      .select('id, name, slug, description, created_at')
      .single();
    if (error) {
      console.error('[POST /api/tournaments] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('[POST /api/tournaments] Unexpected error:', err);
    res.status(500).json({ error: '大会の作成に失敗しました。' });
  }
});

// List rounds for a tournament
app.get('/api/tournaments/:tournamentId/rounds', requireAuth, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId } = req.params;
  const { data, error } = await client
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: true });
  if (error) {
    console.error('[GET /api/tournaments/:id/rounds] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? []);
});

// Create a new round (admin only)
app.post('/api/tournaments/:tournamentId/rounds', requireAuth, requireAdmin, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId } = req.params;
  const title = req.body?.title ? req.body.title.toString().trim() : null;

  const { data: latestRounds, error: latestError } = await client
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: false })
    .limit(1);
  if (latestError) {
    console.error('[POST /api/tournaments/:id/rounds] fetch latest error:', latestError);
    return res.status(500).json({ error: latestError.message });
  }

  const latestRound = latestRounds?.[0];
  if (latestRound && latestRound.status !== 'closed') {
    return res.status(400).json({ error: '前のラウンドを締めてから次のラウンドを作成してください。' });
  }

  const nextNumber = latestRound ? latestRound.number + 1 : 1;
  const { data, error } = await client
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      number: nextNumber,
      title: title && title.length > 0 ? title : null,
      status: 'open',
    })
    .select('*')
    .single();
  if (error) {
    console.error('[POST /api/tournaments/:id/rounds] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Close a round (admin only)
app.post('/api/tournaments/:tournamentId/rounds/:roundId/close', requireAuth, requireAdmin, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId } = req.params;
  const { data: round, error: fetchError } = await client
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .eq('tournament_id', tournamentId)
    .single();
  if (fetchError) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/close] fetch error:', fetchError);
    return res.status(404).json({ error: '指定されたラウンドが見つかりません。' });
  }
  if (round.status === 'closed') {
    return res.status(400).json({ error: 'このラウンドは既に締め切られています。' });
  }
  const { data, error } = await client
    .from('rounds')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', roundId)
    .eq('tournament_id', tournamentId)
    .select('*')
    .single();
  if (error) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/close] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Reopen a round (admin only, only latest closed round)
app.post('/api/tournaments/:tournamentId/rounds/:roundId/reopen', requireAuth, requireAdmin, async (req, res) => {
  const client = req.supabase;
  if (!client) {
    return res.status(500).json({ error: '認証済みクライアントの初期化に失敗しました。' });
  }
  const { tournamentId, roundId } = req.params;

  const { data: rounds, error: fetchError } = await client
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: false })
    .limit(2);
  if (fetchError) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/reopen] fetch error:', fetchError);
    return res.status(500).json({ error: fetchError.message });
  }
  const targetRound = rounds?.find((round) => round.id === roundId);
  if (!targetRound) {
    return res.status(404).json({ error: '指定されたラウンドが見つかりません。' });
  }
  if (targetRound.status !== 'closed') {
    return res.status(400).json({ error: 'このラウンドは締め切られていません。' });
  }
  const latestRound = rounds?.[0];
  if (!latestRound || latestRound.id !== targetRound.id) {
    return res.status(400).json({ error: '新しいラウンドが追加済みのため、再開できません。' });
  }

  const { data, error } = await client
    .from('rounds')
    .update({
      status: 'open',
      closed_at: null,
    })
    .eq('id', roundId)
    .eq('tournament_id', tournamentId)
    .select('*')
    .single();
  if (error) {
    console.error('[POST /api/tournaments/:id/rounds/:roundId/reopen] Supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Request password reset email
app.post('/api/password-reset', async (req, res) => {
  const { email } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'メールアドレスを入力してください。' });
  }

  try {
    // Supabaseの認証機能を使ってパスワードリセットメールを送信
    const redirectUrl = process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3000/password-reset';
    console.log('[POST /api/password-reset] Using redirect URL:', redirectUrl);
    console.log('[POST /api/password-reset] Environment check - NODE_ENV:', process.env.NODE_ENV);

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('[POST /api/password-reset] Supabase resetPasswordForEmail error:', error);

      // レート制限エラーの場合は具体的なメッセージを返す
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
        return res.status(429).json({
          error: 'パスワードリセットメールの送信回数が上限に達しました。しばらく時間をおいてから再度お試しください。'
        });
      }

      // その他のエラーは汎用的なメッセージを返す（セキュリティのため）
      return res.status(500).json({ error: 'パスワードリセットメールの送信に失敗しました。' });
    }

    res.status(200).json({
      message: 'パスワードリセットのリンクを生成しました。',
    });
  } catch (err) {
    console.error('[POST /api/password-reset] Unexpected error:', err);
    res.status(500).json({ error: 'パスワードリセット処理中に予期せぬエラーが発生しました。' });
  }
});

// Create an admin user (admin only, requires service role key)
app.post('/api/admin/users', async (req, res) => {
  if (!supabaseAdmin) {
    return res
      .status(500)
      .json({ error: 'SERVICE ROLE KEY が設定されていないため管理者ユーザーを作成できません。' });
  }

  const adminSignupToken = process.env.ADMIN_SIGNUP_TOKEN;

  const { email, password, displayName, token } = req.body ?? {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password.trim() : '';

  if (adminSignupToken && (typeof token !== 'string' || token.trim() !== adminSignupToken)) {
    return res.status(403).json({ error: '無効な登録コードです。' });
  }

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'メールアドレスを入力してください。' });
  }
  if (!normalizedPassword || normalizedPassword.length < 6) {
    return res.status(400).json({ error: 'パスワードは6文字以上で入力してください。' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: displayName ? { displayName } : undefined,
      app_metadata: { role: 'admin' },
    });
    if (error) {
      console.error('[POST /api/admin/users] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    if (!data?.user) {
      return res.status(500).json({ error: 'ユーザーの作成に失敗しました。' });
    }
    res.status(201).json({
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
    });
  } catch (err) {
    console.error('[POST /api/admin/users] Unexpected error:', err);
    res.status(500).json({ error: '管理者ユーザーの作成に失敗しました。' });
  }
});

// Reset user password (admin only)
app.post('/api/admin/users/:userId/reset-password', requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res
      .status(500)
      .json({ error: 'SERVICE ROLE KEY が設定されていないためパスワードをリセットできません。' });
  }

  const { userId } = req.params;
  const { newPassword } = req.body ?? {};
  const normalizedPassword = typeof newPassword === 'string' ? newPassword.trim() : '';

  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDを指定してください。' });
  }

  if (!normalizedPassword || normalizedPassword.length < 6) {
    return res.status(400).json({ error: 'パスワードは6文字以上で入力してください。' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: normalizedPassword,
    });

    if (error) {
      console.error('[POST /api/admin/users/:userId/reset-password] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data?.user) {
      return res.status(500).json({ error: 'パスワードのリセットに失敗しました。' });
    }

    res.status(200).json({
      message: 'パスワードをリセットしました。',
      userId: data.user.id,
      email: data.user.email,
    });
  } catch (err) {
    console.error('[POST /api/admin/users/:userId/reset-password] Unexpected error:', err);
    res.status(500).json({ error: 'パスワードのリセットに失敗しました。' });
  }
});

// Export the app for Vercel
module.exports = app;
