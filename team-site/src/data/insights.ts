export type Insight = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

/**
 * T15 - content for the insights panel, gated behind FEATURE_SHOW_INSIGHTS.
 *
 * Kept in its own module so the panel can be reviewed and tested as data rather
 * than as markup buried in a component.
 */
export const insights: Insight[] = [
  {
    id: 'release-cadence',
    label: 'Release cadence',
    value: 'Every merge to main',
    detail: 'CI builds once and the organizer deployer publishes that same artifact.',
  },
  {
    id: 'rollback-window',
    label: 'Rollback window',
    value: 'Any prior release',
    detail: 'Known-good releases can be republished on demand without touching git history.',
  },
  {
    id: 'review-coverage',
    label: 'Review coverage',
    value: '100% of merges',
    detail: 'Every pull request is approved by a teammate other than its author before merge.',
  },
];
