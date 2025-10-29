// trait-config.js — cấu hình trọng số & max/tuần
window.TraitConfig = {
  weeklyMax: {
    creativity: 200, competitiveness: 300, sociability: 180,
    playfulness: 220, self_improvement: 250, perfectionism: 160,
  },
  weights: {
    art_generated:            { creativity: 5 },
    math_round_completed:     { competitiveness: 3 },
    group_interaction:        { sociability: 2 },
    game_played:              { playfulness: 1 },
    lesson_completed:         { self_improvement: 4 },
    puzzle_perfected:         { perfectionism: 4 },
  },
};
