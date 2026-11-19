import { newCardSchedule, scheduleReview, previewIntervals, isDue, type RatingLabel } from '../src/lib/fsrs-adapter';

const now = new Date('2026-11-19T10:00:00Z');
let s = await newCardSchedule(now);
console.log('new', JSON.stringify(s));
const preview = await previewIntervals(s, now);
console.log('preview', preview);
const ratings: RatingLabel[] = ['gotit', 'gotit', 'forgot', 'tough', 'easy'];
for (const rating of ratings) {
  const out = await scheduleReview(s, rating, new Date(now.getTime() + 864e5));
  s = out.schedule;
  console.log(rating, '-> due', s.due, 'state', s.state, 'reps', s.reps, 'lapses', s.lapses);
}
if (!isDue({ ...s, due: '2020-01-01T00:00:00Z' }, now)) throw new Error('isDue broken');
console.log('fsrs adapter OK');
