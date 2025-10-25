export interface DuelForm {
  title: string;
  subtitle: string;
  stage: string;
  date: string;
  leftTeamName: string;
  rightTeamName: string;
  leftRosterText: string;
  rightRosterText: string;
  matchesText: string;
  scoreLabel: string;
  winLabel: string;
  loseLabel: string;
}

export const duelDefault: DuelForm = {
  title: 'DUEL',
  subtitle: '',
  stage: '',
  date: '2025-03-16',
  leftTeamName: 'Raid Reign',
  rightTeamName: 'B&E',
  leftRosterText: [
    'しいたけ,ゆき。',
    'ゆき。,プレイヤー',
    'フリーダム,エアーマン鈴木',
    'エアーマン鈴木,プレイヤー',
    'あぴぉ,sub.サラダバー',
    'sub.サラダバー,プレイヤー',
  ].join('\n'),
  rightRosterText: [
    '紫暁天琴,夢小僧',
    '夢小僧,プレイヤー',
    '郡臣太美,隠蔽所住',
    '隠蔽所住,プレイヤー',
    '梁孝宏,sub.理想之郎',
    'sub.理想之郎,プレイヤー',
  ].join('\n'),
  matchesText: [
    'しいたけ,Labrynth,1 - 0,FS tenpai,紫暁天琴',
    'しいたけ,Labrynth,1 - 0,branded,sub.理想之郎',
    'しいたけ,Labrynth,1 - 0,branded,sub.理想之郎',
    'しいたけ,Labrynth,0 - 1,FS tearlaments,夢小僧',
    'エアーマン鈴木,Dracoslayer,1 - 0,FS tearlaments,夢小僧',
    'エアーマン鈴木,Dracoslayer,0 - 1,millennium SE,梁孝宏',
    'フリーダム,FS Race,1 - 0,millennium SE,梁孝宏',
    ',,,,',
    ',,,,',
    ',,,,',
  ].join('\n'),
  scoreLabel: 'W - L',
  winLabel: 'WIN',
  loseLabel: 'LOSE',
};
