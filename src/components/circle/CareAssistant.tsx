import type { Insight } from "@/lib/domain/assistant";

/** The Care Assistant's guidance for today. Renders nothing when there is none. */
export function CareAssistant({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="card" aria-labelledby="assistant">
      <h2 id="assistant">Care Assistant</h2>
      <ul className="insights">
        {insights.map((i) => (
          <li key={i.message} className={`insight ${i.level}`}>
            <span className="dot" aria-hidden="true" />
            <span>
              <span className="sr-only">{i.level}: </span>
              {i.message}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
