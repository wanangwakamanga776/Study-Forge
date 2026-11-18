import { EmberEarningsResponse, EmberSessionData, EmberStudentData } from '../types';

export const emberService = {
  calculateEarnings(
    student: EmberStudentData,
    session: EmberSessionData
  ): EmberEarningsResponse {
    let baseAmount = 0;
    const bonuses: { reason: string; amount: number }[] = [];
    let earnMessage = '';

    if (session.session_type === 'srs_review') {
      baseAmount = 10;
      
      const accuracy = session.accuracy_percent || 0;
      if (accuracy >= 100) {
        bonuses.push({ reason: 'Perfect session (100%)', amount: 20 });
      } else if (accuracy >= 90) {
        bonuses.push({ reason: 'Accuracy above 90%', amount: 15 });
      } else if (accuracy >= 80) {
        bonuses.push({ reason: 'Accuracy above 80%', amount: 10 });
      } else if (accuracy >= 70) {
        bonuses.push({ reason: 'Accuracy above 70%', amount: 5 });
      }

      if (session.personal_best_broken) {
        bonuses.push({ reason: 'Personal best broken', amount: 10 });
      }

      if (session.new_mature_cards && session.new_mature_cards > 0) {
        bonuses.push({ 
          reason: `${session.new_mature_cards} card(s) moved to Mastery`, 
          amount: session.new_mature_cards * 3 
        });
      }

      if (session.accuracy_improvement_vs_last_session && session.accuracy_improvement_vs_last_session > 10) {
        bonuses.push({ reason: 'Significant accuracy improvement', amount: 8 });
      }

      earnMessage = `Solid session — ${accuracy}% accuracy earned you ${baseAmount + bonuses.reduce((acc, b) => acc + b.amount, 0)} Embers. That ${student.subject_focus || 'study'} streak is paying off.`;
    } 
    else if (session.session_type === 'exam_completed') {
      baseAmount = 15;
      const score = session.exam_score_percent || 0;
      if (score >= 90) {
        bonuses.push({ reason: 'Outstanding exam score (90%+)', amount: 35 });
      } else if (score >= 80) {
        bonuses.push({ reason: 'Strong exam score (80%+)', amount: 20 });
      }
      earnMessage = `Exam protocols finalized. Your ${score}% score demonstrated strong mastery.`;
    } 
    else if (session.session_type === 'forgecast_listened') {
      baseAmount = 8;
      earnMessage = `Audio immersion complete. Knowledge Units integrated into long-term memory.`;
    } 
    else if (session.session_type === 'upload_completed') {
      baseAmount = 12;
      earnMessage = `Neural audit finished. Your knowledge base has been vectorized.`;
    }
    else if (session.session_type === 'forgechat_session') {
      baseAmount = 5;
      earnMessage = `Knowledge exchange complete. Interactive review session recorded.`;
    }

    // Streak Bonus (added if streak continued)
    let streakBonusApplied = false;
    if (session.streak_continued) {
      const streak = student.streak_days;
      let streakAmount = 0;
      if (streak >= 30) streakAmount = 35;
      else if (streak >= 14) streakAmount = 20;
      else if (streak >= 1) streakAmount = 12; // Adjusted from rules slightly for 7-13 logic if needed, but following prompt
      else if (streak >= 3) streakAmount = 5;

      // More precise following rules:
      // Streak 3-6: +5
      // Streak 7-13: +12
      // Streak 14-29: +20
      // Streak 30+: +35
      if (streak >= 30) streakAmount = 35;
      else if (streak >= 14) streakAmount = 20;
      else if (streak >= 7) streakAmount = 12;
      else if (streak >= 3) streakAmount = 5;
      else streakAmount = 0;

      if (streakAmount > 0) {
        bonuses.push({ reason: `${streak}-day study streak`, amount: streakAmount });
        streakBonusApplied = true;
      }
    }

    const totalEarned = baseAmount + bonuses.reduce((acc, b) => acc + b.amount, 0);
    const newBalance = student.current_embers + totalEarned;

    // Milestone logic (simplified placeholder)
    let milestoneUnlocked = undefined;
    if (student.lifetime_embers_earned < 500 && (student.lifetime_embers_earned + totalEarned) >= 500) {
      milestoneUnlocked = 'The Apprentice';
    }

    const nextMilestone = 1000;
    const remaining = nextMilestone - (student.lifetime_embers_earned + totalEarned);
    const nextMilestonePreview = remaining > 0 
      ? `${remaining} more Embers until you become a 'Forge Veteran'`
      : "You've reached the top tier of the Forge. New milestones coming soon.";

    return {
      embers_earned: {
        base_amount: baseAmount,
        bonuses,
        total_earned: totalEarned,
        new_balance: newBalance
      },
      earn_message: earnMessage,
      milestone_unlocked: milestoneUnlocked,
      streak_bonus_applied: streakBonusApplied,
      next_milestone_preview: nextMilestonePreview
    };
  }
};
