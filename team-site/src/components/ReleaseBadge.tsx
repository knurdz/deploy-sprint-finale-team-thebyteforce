import { GitBranch } from 'lucide-react';

const team = import.meta.env.VITE_TEAM_NAME || 'The Byte Force';
const commit = import.meta.env.VITE_COMMIT_SHA || '';

export function ReleaseBadge() {
  return (
    <div className="releaseBadge">
      <GitBranch size={18} />
      <div>
        <strong>{team}</strong>
        <span>{commit ? `Release ${commit.slice(0, 7)}` : 'Local build'}</span>
      </div>
    </div>
  );
}
