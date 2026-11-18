import { UserStats } from '../types';

export interface ProgressionStudent {
  id: string;
  name: string;
  level: 'gcse' | 'a_level' | 'university';
  current_forge_score: number;
  current_rank: string;
  current_rank_index: number;
  titles_earned: string[];
  active_title: string | null;
  path_tiers: {
    archivist: number;
    duelist: number;
    architect: number;
    forgemaster: number;
  };
  milestones_triggered: string[];
}

export interface ProgressionSessionData {
  session_type: 'srs_review' | 'exam_completed' | 'forgecast_listened' | 'upload_completed' | 'forgechat_session';
  timestamp: string;
  duration_minutes: number;
  srs_data: {
    cards_reviewed: number;
    cards_correct: number;
    session_accuracy_percent: number;
    rolling_30day_retention_percent: number;
    total_cards_in_deck: number;
    mature_cards_total: number;
    new_mature_cards_this_session: number;
    average_ease_factor: number;
    weakest_card_topic: string;
  };
  exam_data: {
    exam_completed: boolean;
    exam_score_percent: number;
    exam_grade: string;
    total_exams_completed_lifetime: number;
    rolling_exam_average_percent: number;
    consecutive_exams_above_80: number;
    consecutive_exams_above_90: number;
  };
  consistency_data: {
    current_streak_days: number;
    streak_gaps_this_month: number;
    study_days_this_month: number;
    total_study_days_lifetime: number;
    longest_streak_ever: number;
  };
  upload_data: {
    total_subjects_uploaded: number;
    total_words_audited_lifetime: number;
    new_upload_this_session: boolean;
  };
  embers_data: {
    embers_earned_this_session: number;
    lifetime_embers_earned: number;
    current_embers_balance: number;
  };
}

export interface ProgressionInput {
  action: 'evaluate_session' | 'check_rank' | 'get_weekly_digest' | 'check_milestone' | 'get_store_access' | 'evaluate_path_tier';
  student: ProgressionStudent;
  session_data: ProgressionSessionData;
}

export interface ProgressionOutput {
  action_processed: string;
  student_id: string;
  session_timestamp: string;
  forge_score: {
    previous: number;
    new: number;
    delta: number;
    components: Record<string, { raw_value: number; normalised: number; weight: number; weighted_contribution: number; flag?: string }>;
    weakest_component: string;
    strongest_component: string;
    score_change_reason: string;
  };
  rank: {
    previous_rank: string;
    new_rank: string;
    rank_index: number;
    rank_up: boolean;
    progress_to_next_rank_percent: number;
    points_to_next_rank: number;
    next_rank_name: string | null;
    rank_up_event: any;
  };
  paths: Record<string, any>;
  milestones_fired: any[];
  titles: any;
  store_access: any;
  pyra_injection: any;
  dashboard_display: any;
  ember_awards_this_session: any;
}

const RANKS = [
  { index: 0, id: 'ember', name: 'Ember', threshold: 0, max: 12.9, identity: 'Every forge begins here. The raw material exists but hasn\'t been shaped yet.', tier: 'Common', msg: 'The forge is lit. Welcome to the system.' },
  { index: 1, id: 'kindler', name: 'Kindler', threshold: 13, max: 25.9, identity: 'The spark has caught. Consistent enough engagement that the system recognises a genuine learner.', tier: 'Early Rare', msg: 'You are no longer raw material. The sparks are catching. Keep this rhythm.' },
  { index: 2, id: 'forger', name: 'Forger', threshold: 26, max: 40.9, identity: 'Building something real. Decks have depth. Exam scores show genuine understanding.', tier: 'Full Rare', msg: 'This is where most students plateau and fail. Prove you are not most students.' },
  { index: 3, id: 'architect', name: 'Architect', threshold: 41, max: 58.9, identity: 'Designing the structure of your own knowledge. Mature cards are stacking. Sessions have intent.', tier: 'Epic', msg: 'I see real structure now. You are designing your own intelligence. Let\'s optimize.' },
  { index: 4, id: 'smelter', name: 'Smelter', threshold: 59, max: 74.9, identity: 'The raw material has been refined. Retention is high. Exam scores are strong. The Vault reflects real work.', tier: 'Advanced Epic', msg: 'Your system is running hot. Excellent metrics overall. We push for Sovereign now.' },
  { index: 5, id: 'sovereign', name: 'Sovereign', threshold: 75, max: 88.9, identity: 'Sovereignty over your own knowledge. Study system is genuinely working at a high level.', tier: 'Legendary', msg: 'You own your knowledge base. But perfection is still out there. Let\'s reach Undying.' },
  { index: 6, id: 'undying', name: 'Undying', threshold: 89, max: 100, identity: 'The rarest rank. Less than 1% of Study Forge users reach this. Every metric is exceptional.', tier: 'All Items', msg: 'You\'ve broken the system limits. This is as good as it gets. Now, just maintain it.' }
];

export class ProgressionEngine {
  public static evaluateSession(input: ProgressionInput): ProgressionOutput {
    // 1. Calculate Forge Score Normalisations
    const srsRaw = input.session_data.srs_data.rolling_30day_retention_percent;
    let srsNorm = 0;
    if (srsRaw < 40) srsNorm = 0;
    else if (srsRaw <= 60) srsNorm = ((srsRaw - 40) / 20) * 30;
    else if (srsRaw <= 80) srsNorm = 30 + ((srsRaw - 60) / 20) * 40;
    else if (srsRaw <= 95) srsNorm = 70 + ((srsRaw - 80) / 15) * 25;
    else srsNorm = Math.min(100, 95 + ((srsRaw - 95) / 5) * 5);

    const examRaw = input.session_data.exam_data.rolling_exam_average_percent;
    const examsCompleted = input.session_data.exam_data.total_exams_completed_lifetime;
    let examNorm = 0;
    let examFlag = undefined;
    if (examsCompleted === 0) {
      examNorm = 0;
      examFlag = 'no_exams_completed';
    } else {
      if (examRaw < 50) examNorm = 0;
      else if (examRaw <= 70) examNorm = ((examRaw - 50) / 20) * 35;
      else if (examRaw <= 85) examNorm = 35 + ((examRaw - 70) / 15) * 35;
      else if (examRaw <= 95) examNorm = 70 + ((examRaw - 85) / 10) * 25;
      else examNorm = Math.min(100, 95 + ((examRaw - 95) / 5) * 5);
    }

    const { current_streak_days, streak_gaps_this_month, study_days_this_month } = input.session_data.consistency_data;
    let streakComp = 0;
    if (current_streak_days <= 6) streakComp = (current_streak_days / 6) * 40;
    else if (current_streak_days <= 13) streakComp = 40 + ((current_streak_days - 7) / 7) * 20;
    else if (current_streak_days <= 29) streakComp = 60 + ((current_streak_days - 14) / 16) * 20;
    else if (current_streak_days <= 49) streakComp = 80 + ((current_streak_days - 30) / 20) * 15;
    else streakComp = Math.min(100, 95 + ((current_streak_days - 50) / 50) * 5);

    let regComp = 10;
    if (streak_gaps_this_month === 0 && study_days_this_month >= 20) regComp = 100;
    else if (streak_gaps_this_month <= 1 && study_days_this_month >= 15) regComp = 80;
    else if (streak_gaps_this_month <= 3 && study_days_this_month >= 10) regComp = 60;
    else if (streak_gaps_this_month <= 6 || study_days_this_month < 10) regComp = 40;
    
    const consNorm = streakComp * 0.6 + regComp * 0.4;

    const matureRaw = input.session_data.srs_data.mature_cards_total;
    let matureNorm = 0;
    if (matureRaw <= 9) matureNorm = (matureRaw / 10) * 10;
    else if (matureRaw <= 49) matureNorm = 10 + ((matureRaw - 10) / 40) * 25;
    else if (matureRaw <= 199) matureNorm = 35 + ((matureRaw - 50) / 150) * 30;
    else if (matureRaw <= 499) matureNorm = 65 + ((matureRaw - 200) / 300) * 25;
    else if (matureRaw <= 999) matureNorm = 90 + ((matureRaw - 500) / 500) * 8;
    else matureNorm = Math.min(100, 98 + ((matureRaw - 1000) / 500) * 2);

    const embersRaw = input.session_data.embers_data.lifetime_embers_earned;
    let embersNorm = 0;
    if (embersRaw <= 499) embersNorm = (embersRaw / 500) * 20;
    else if (embersRaw <= 4999) embersNorm = 20 + ((embersRaw - 500) / 4500) * 30;
    else if (embersRaw <= 19999) embersNorm = 50 + ((embersRaw - 5000) / 15000) * 30;
    else if (embersRaw <= 49999) embersNorm = 80 + ((embersRaw - 20000) / 30000) * 15;
    else embersNorm = Math.min(100, 95 + ((embersRaw - 50000) / 50000) * 5);

    // Compute final Score
    const newForgeScoreRaw = (srsNorm * 0.3) + (examNorm * 0.25) + (consNorm * 0.2) + (matureNorm * 0.15) + (embersNorm * 0.1);
    const newScore = Math.max(0, Math.min(100, Math.round(newForgeScoreRaw * 10) / 10));
    const previousScore = input.student.current_forge_score || 0;
    const scoreDelta = Math.round((newScore - previousScore) * 10) / 10;

    const components = {
      srs_retention: { raw_value: srsRaw, normalised: srsNorm, weight: 0.3, weighted_contribution: srsNorm * 0.3 },
      exam_performance: { raw_value: examRaw, normalised: examNorm, weight: 0.25, weighted_contribution: examNorm * 0.25, flag: examFlag },
      streak_consistency: { raw_value: current_streak_days, normalised: consNorm, weight: 0.2, weighted_contribution: consNorm * 0.2 },
      mature_cards: { raw_value: matureRaw, normalised: matureNorm, weight: 0.15, weighted_contribution: matureNorm * 0.15 },
      lifetime_embers: { raw_value: embersRaw, normalised: embersNorm, weight: 0.1, weighted_contribution: embersNorm * 0.1 }
    };
    
    // Find strongest and weakest
    let strongestComp = '', weakestComp = '';
    let maxNorm = -1, minNorm = 101;
    for (const [key, val] of Object.entries(components)) {
      if (val.normalised > maxNorm) { maxNorm = val.normalised; strongestComp = key; }
      if (val.normalised < minNorm) { minNorm = val.normalised; weakestComp = key; }
    }

    // Determine Ranks
    const currRankObj = [...RANKS].reverse().find(r => newScore >= r.threshold) || RANKS[0];
    const prevRank = input.student.current_rank || 'ember';
    const rankUp = (currRankObj.index > (RANKS.find(r => r.id === prevRank)?.index ?? -1));

    const progressToNextRank = currRankObj.index < 6 
      ? Math.round(((newScore - currRankObj.threshold) / (currRankObj.max - currRankObj.threshold)) * 100) 
      : 100;
    
    const nextRankObj = currRankObj.index < 6 ? RANKS[currRankObj.index + 1] : null;

    // Evaluated Path Tiers
    let newArchivistTier = 0;
    if (input.session_data.upload_data.total_subjects_uploaded >= 30) newArchivistTier = 5;
    else if (input.session_data.upload_data.total_subjects_uploaded >= 20 && input.session_data.upload_data.total_words_audited_lifetime >= 50000) newArchivistTier = 4;
    else if (input.session_data.upload_data.total_subjects_uploaded >= 10) newArchivistTier = 3;
    else if (input.session_data.upload_data.total_subjects_uploaded >= 5) newArchivistTier = 2;
    else if (input.session_data.upload_data.total_subjects_uploaded >= 2) newArchivistTier = 1;

    let newDuelistTier = 0;
    if (input.session_data.exam_data.consecutive_exams_above_90 >= 5) newDuelistTier = 5;
    else if (input.session_data.exam_data.total_exams_completed_lifetime >= 20 && input.session_data.exam_data.rolling_exam_average_percent >= 80) newDuelistTier = 4;
    else if (input.session_data.exam_data.consecutive_exams_above_80 >= 3) newDuelistTier = 3;
    else if (input.session_data.exam_data.total_exams_completed_lifetime >= 5 && input.session_data.exam_data.rolling_exam_average_percent >= 70) newDuelistTier = 2;
    else if (input.session_data.exam_data.total_exams_completed_lifetime >= 3) newDuelistTier = 1;

    let newArchitectTier = 0;
    const matureCards = input.session_data.srs_data.mature_cards_total;
    const retPct = input.session_data.srs_data.rolling_30day_retention_percent;
    if (matureCards >= 1000 && retPct >= 85) newArchitectTier = 5;
    else if (matureCards >= 500) newArchitectTier = 4;
    else if (matureCards >= 200 && retPct >= 75) newArchitectTier = 3;
    else if (matureCards >= 50 && retPct >= 75) newArchitectTier = 2;
    else if (matureCards >= 50) newArchitectTier = 1;

    let newForgemasterTier = 0;
    const streak = input.session_data.consistency_data.current_streak_days;
    if (streak >= 100) newForgemasterTier = 5;
    else if (streak >= 50) newForgemasterTier = 4;
    else if (streak >= 30) newForgemasterTier = 3;
    else if (streak >= 14) newForgemasterTier = 2;
    else if (streak >= 7) newForgemasterTier = 1;

    const paths = {
      archivist: { previous_tier: input.student.path_tiers.archivist || 0, new_tier: newArchivistTier, advanced: newArchivistTier > (input.student.path_tiers.archivist || 0) },
      duelist: { previous_tier: input.student.path_tiers.duelist || 0, new_tier: newDuelistTier, advanced: newDuelistTier > (input.student.path_tiers.duelist || 0) },
      architect: { previous_tier: input.student.path_tiers.architect || 0, new_tier: newArchitectTier, advanced: newArchitectTier > (input.student.path_tiers.architect || 0) },
      forgemaster: { previous_tier: input.student.path_tiers.forgemaster || 0, new_tier: newForgemasterTier, advanced: newForgemasterTier > (input.student.path_tiers.forgemaster || 0) }
    };

    // Milestones definition & evaluation
    let triggered = [...(input.student.milestones_triggered || [])];
    const milestonesFired: any[] = [];
    const newTitles: string[] = [];

    const awardMilestone = (id: string, def: any) => {
      if (!triggered.includes(id)) {
        milestonesFired.push({ milestone_id: id, ...def });
        triggered.push(id);
        if (def.title_unlocked) newTitles.push(def.title_unlocked);
      }
    };

    // Evaluate Milestone Conditions
    if (rankUp) {
      if (currRankObj.id === 'kindler') awardMilestone('rank_kindler', { milestone_name: 'Rank: Kindler', event_type: 'rank_up', display_message: 'Rank accomplished. You are no longer just exploring. You are building.', reward_description: 'Abyssal Station Theme', title_unlocked: null, embers_awarded: 0 });
      if (currRankObj.id === 'forger') awardMilestone('rank_forger', { milestone_name: 'Rank: Forger', event_type: 'rank_up', display_message: 'Forger rank achieved. Most quit before this. Keep going.', reward_description: 'Knowledge Graph & Ghost Protocol unlocked', title_unlocked: null, embers_awarded: 0 });
      if (currRankObj.id === 'architect') awardMilestone('rank_architect', { milestone_name: 'Rank: Architect', event_type: 'rank_up', display_message: 'Architect rating. You design your intelligence now.', reward_description: 'Study Groups & Epic tier unlocked', title_unlocked: null, embers_awarded: 0 });
      if (currRankObj.id === 'smelter') awardMilestone('rank_smelter', { milestone_name: 'Rank: Smelter', event_type: 'rank_up', display_message: 'Smelter. Heat and pressure. The refinement is pure.', reward_description: 'Leaderboard & Archivist Skin', title_unlocked: null, embers_awarded: 0 });
      if (currRankObj.id === 'sovereign') awardMilestone('rank_sovereign', { milestone_name: 'Rank: Sovereign', event_type: 'rank_up', display_message: 'Sovereign. Elite echelon attained.', reward_description: 'Legendary Store & Forge Wraith', title_unlocked: null, embers_awarded: 0 });
      if (currRankObj.id === 'undying') awardMilestone('rank_undying', { milestone_name: 'Rank: Undying', event_type: 'rank_up', display_message: 'Undying. The forge is permanent. The pinnacle.', reward_description: 'Title: The Undying & 1.15x Ember Mutliplier', title_unlocked: 'The Undying', embers_awarded: 0 });
    }

    if (streak >= 100) awardMilestone('streak_100', { milestone_name: 'The Unbroken', event_type: 'title_unlock', display_message: 'Earned by never letting the forge go cold for 100 days.', title_unlocked: 'The Unbroken', embers_awarded: 0 });
    if (matureCards >= 1000 && retPct >= 85) awardMilestone('undying_architect', { milestone_name: 'The Undying Architect', event_type: 'title_unlock', display_message: 'Earned by achieving a depth of SRS mastery that defies attrition.', title_unlocked: 'The Undying Architect', embers_awarded: 0 });
    
    if (input.session_data.upload_data.total_subjects_uploaded >= 30) awardMilestone('subjects_30', { milestone_name: 'The Omniscient', event_type: 'title_unlock', title_unlocked: 'The Omniscient', display_message: 'Earned by auditing thirty distinct academic domains.', embers_awarded: 0 });
    if (input.session_data.exam_data.consecutive_exams_above_90 >= 5) awardMilestone('exam_average_90', { milestone_name: 'The Perfect Score', event_type: 'title_unlock', title_unlocked: 'The Perfect Score', display_message: 'Earned by five consecutive near-perfect exam performances.', embers_awarded: 0 });
    if (matureCards >= 200 && retPct >= 75) awardMilestone('mature_200', { milestone_name: 'The Deep Forge', event_type: 'title_unlock', title_unlocked: 'The Deep Forge', display_message: 'Earned by building depth that most students never reach.', embers_awarded: 0 });
    if (input.session_data.exam_data.rolling_exam_average_percent >= 90 && input.session_data.exam_data.total_exams_completed_lifetime >= 5) awardMilestone('the_sovereign_exam', { milestone_name: 'The Sovereign (Exam)', event_type: 'title_unlock', title_unlocked: 'The Sovereign', display_message: 'Earned by achieving sovereign-level exam performance.', embers_awarded: 0 });

    if (streak >= 30) awardMilestone('streak_30', { milestone_name: '30 Day Streak', event_type: 'title_unlock', title_unlocked: 'The Consistent', display_message: 'Earned by keeping the forge burning for thirty consecutive days.', embers_awarded: 500 });
    if (streak >= 50) awardMilestone('streak_50', { milestone_name: '50 Day Streak', event_type: 'skin_unlock', title_unlocked: null, display_message: 'Title early access "The Undying (Pending)" + Forge Wraith skin preview.', embers_awarded: 0 });
    // First blood
    if (input.session_data.exam_data.exam_score_percent >= 80 && input.session_data.exam_data.total_exams_completed_lifetime >= 1) {
      awardMilestone('first_blood', { milestone_name: 'First Blood', event_type: 'title_unlock', title_unlocked: 'First Blood', embers_awarded: 100, display_message: 'First exam scored 80% or above.' });
    }
    // Polymath
    if (input.session_data.upload_data.total_subjects_uploaded >= 5) awardMilestone('subjects_5', { milestone_name: '5 Subjects Uploaded', event_type: 'title_unlock', title_unlocked: 'The Polymath', display_message: 'Earned by building genuine breadth across five academic domains.', embers_awarded: 0 });
    // Examiner
    if (input.session_data.exam_data.total_exams_completed_lifetime >= 10) awardMilestone('exams_10', { milestone_name: '10 Exams', event_type: 'title_unlock', title_unlocked: 'The Examiner', display_message: 'Earned by facing the Forge Exam ten times.', embers_awarded: 0 });
    // Architect
    if (matureCards >= 50) awardMilestone('mature_50', { milestone_name: '50 Mature Cards', event_type: 'title_unlock', title_unlocked: 'The Architect', display_message: 'Earned by building a deck deep enough to call architecture.', embers_awarded: 0 });

    // Patient
    if (matureCards >= 1) awardMilestone('first_mature', { milestone_name: 'First Mature Card', event_type: 'title_unlock', title_unlocked: 'The Patient', display_message: 'Earned by forming the first truly long-term memory in the Vault.', embers_awarded: 0 });

    if (streak >= 7) awardMilestone('streak_7', { milestone_name: '7 Day Streak', event_type: 'item_award', embers_awarded: 0, title_unlocked: null, display_message: 'Seven days. The habit is forming.'});
    if (streak >= 14) awardMilestone('streak_14', { milestone_name: '14 Day Streak', event_type: 'permanent_bonus', embers_awarded: 0, title_unlocked: null, display_message: 'Fourteen days. Consistency is a weapon.'});
    if (input.session_data.upload_data.new_upload_this_session) awardMilestone('first_upload', { milestone_name: 'First Upload', event_type: 'ember_drop', embers_awarded: 50, title_unlocked: null, display_message: 'The Vault has accepted its first material.'});
    if (input.session_data.exam_data.total_exams_completed_lifetime === 1) awardMilestone('first_exam', { milestone_name: 'First Exam', event_type: 'ember_drop', embers_awarded: 75, title_unlocked: null, display_message: 'First exam faced. The Forge remembers.'});

    let totalMilestoneEmbers = milestonesFired.reduce((sum, ev) => sum + (ev.embers_awarded || 0), 0);

    return {
      action_processed: input.action,
      student_id: input.student.id,
      session_timestamp: input.session_data.timestamp,
      forge_score: {
        previous: previousScore,
        new: newScore,
        delta: scoreDelta,
        components,
        weakest_component: weakestComp,
        strongest_component: strongestComp,
        score_change_reason: `Forge Score updated to ${newScore} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta}). Strongest area: ${strongestComp}. Weakest: ${weakestComp}.`
      },
      rank: {
        previous_rank: prevRank,
        new_rank: currRankObj.id,
        rank_index: currRankObj.index,
        rank_up: rankUp,
        progress_to_next_rank_percent: progressToNextRank,
        points_to_next_rank: nextRankObj ? Math.round((nextRankObj.threshold - newScore)*10)/10 : 0,
        next_rank_name: nextRankObj ? nextRankObj.name : null,
        rank_up_event: rankUp ? {
          rank_name: currRankObj.name,
          rank_identity: currRankObj.identity,
          store_tier_opened: currRankObj.tier,
          pyra_rank_up_message: currRankObj.msg,
          unlocked_features: []
        } : null
      },
      paths,
      milestones_fired: milestonesFired,
      titles: {
        newly_unlocked: newTitles,
        all_earned: [...(input.student.titles_earned || []), ...newTitles],
        recommended_display: newTitles.length > 0 ? newTitles[newTitles.length - 1] : null
      },
      store_access: {
        current_tier: currRankObj.tier,
        newly_unlocked_items: [],
        newly_unlocked_themes: [],
        newly_unlocked_skins: []
      },
      pyra_injection: {
        forge_score_summary: `Your Forge Score is ${newScore}. Your ${strongestComp} is your strongest area, while ${weakestComp} is what's holding you back.`,
        progression_nudge: `Focus on improving your ${weakestComp} in the upcoming sessions.`,
        rank_context: `Student is ${currRankObj.name} rank. ${currRankObj.msg}`,
        path_context: `Archivist Tier ${newArchivistTier}, Duelist Tier ${newDuelistTier}, Architect Tier ${newArchitectTier}, Forgemaster Tier ${newForgemasterTier}.`
      },
      dashboard_display: {
        rank_widget: {
          rank_name: currRankObj.name,
          rank_icon_key: currRankObj.id,
          forge_score: newScore,
          progress_bar_percent: progressToNextRank,
          next_rank: nextRankObj ? nextRankObj.name : null,
          score_delta_this_session: scoreDelta,
          delta_direction: scoreDelta > 0 ? 'up' : scoreDelta < 0 ? 'down' : 'unchanged',
          weakest_metric_callout: `Focus on ${weakestComp.replace('_', ' ')} to improve.`
        },
        path_bars: [
          { path_name: 'Archivist', tier: newArchivistTier, progress_within_tier_percent: 50, next_tier_label: 'Read more' }
        ],
        weekly_digest: {
          score_change_this_week: scoreDelta,
          biggest_gain_component: strongestComp,
          biggest_gap_component: weakestComp,
          sessions_this_week: Math.max(1, input.session_data.consistency_data.study_days_this_month),
          digest_message: "Here is your weekly academic review."
        }
      },
      ember_awards_this_session: {
        milestone_embers: totalMilestoneEmbers,
        total_awarded: totalMilestoneEmbers + input.session_data.embers_data.embers_earned_this_session,
        new_balance: input.session_data.embers_data.current_embers_balance + totalMilestoneEmbers + input.session_data.embers_data.embers_earned_this_session
      }
    };
  }
}
