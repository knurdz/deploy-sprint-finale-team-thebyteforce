export type ReleaseReadinessItem = {
  label: string;
  status: 'ready' | 'watch' | 'blocked';
};

export const releaseReadinessItems: ReleaseReadinessItem[] = [
  { label: 'Artifact traceability', status: 'ready' },
  { label: 'Rollback rehearsal', status: 'watch' },
  { label: 'Secret review', status: 'ready' },
];

// T13 feature-bundle evidence. markerRemoved is true because the planted review
// marker from the provided bundle was removed during integration.
export const releaseReadinessTask = {
  task: 'T13',
  source: 'provided-feature-bundle',
  markerRemoved: true,
};
