export type DeadlineCard = {
  id: string;
  label: string;
  due: string;
  action: string;
};

/**
 * T09 - Conflict Merge With Both Outcomes
 *
 * `task-assets/conflict-merge` rewrote the first card in place, turning the
 * repo setup checkpoint into the merge conflict lab. Both are real deadlines
 * that the dashboard is meant to show, so the resolution keeps both entries
 * rather than accepting either side of the rewrite. Cards stay in chronological
 * order, which is the order the board renders them in.
 */
export const deadlineCards: DeadlineCard[] = [
  {
    id: 'repo-setup-checkpoint',
    label: 'Repo setup checkpoint',
    due: 'Friday 20:00',
    action: 'Verify your assigned repository, remotes, and all challenge branches before feature work.',
  },
  {
    id: 'merge-conflict-lab',
    label: 'Merge conflict lab',
    due: 'Saturday 10:00',
    action: 'Resolve the deadline clash while preserving both dashboard changes.',
  },
  {
    id: 'review',
    label: 'Review rotation',
    due: 'Saturday 12:00',
    action: 'Assign a teammate to review the next feature pull request.',
  },
  {
    id: 'release',
    label: 'Release rehearsal',
    due: 'Sunday 16:00',
    action: 'Check the workflow status before completing your submission.',
  },
];
