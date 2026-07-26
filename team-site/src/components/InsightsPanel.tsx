import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { insights } from '../data/insights';

type FeatureFlags = {
  showInsights?: boolean;
};

type FeatureFlagPayload = {
  flags?: FeatureFlags;
};

/**
 * T15 - Runtime Feature Flag
 *
 * The flag is resolved at page load from /config/feature-flags.json, which CI generated
 * from the FEATURE_SHOW_INSIGHTS environment value. It is deliberately not read
 * from import.meta.env: a VITE_* variable would be inlined into the bundle at
 * build time, which makes it a build-time constant rather than a runtime flag.
 *
 * Because the value is fetched, this component ships in every build with both
 * branches present, and the flag decides which one runs.
 *
 * Default is off. An unset flag, a failed request, a non-200 response and a
 * malformed body all leave the panel hidden - a feature flag that fails open
 * would expose unreleased work exactly when something is already wrong.
 */
export function InsightsPanel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    fetch('/config/feature-flags.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        return res.json() as Promise<FeatureFlagPayload>;
      })
      .then((data) => {
        if (active) {
          setEnabled(data.flags?.showInsights === true);
        }
      })
      .catch(() => {
        if (active) {
          setEnabled(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <section className="panel insightsPanel" aria-labelledby="insightsHeading">
      <div className="panelHeader">
        <h2 id="insightsHeading">
          <Lightbulb size={18} aria-hidden="true" /> Delivery insights
        </h2>
        <span className="insightsFlag">FEATURE_SHOW_INSIGHTS</span>
      </div>

      <div className="insightsGrid">
        {insights.map((insight) => (
          <article key={insight.id} className="insightCard">
            <span className="insightLabel">{insight.label}</span>
            <strong className="insightValue">{insight.value}</strong>
            <p className="insightDetail">{insight.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
