import type { Adherence } from "@/lib/domain/schedule";
import { formatCalendarDate, trendLabel } from "@/lib/presentation";

/** Seven-day adherence: a headline percentage, the counts and a bar per day. */
export function WeekTrend({ week }: { week: Adherence }) {
  return (
    <section className="card" aria-labelledby="adherence">
      <h2 id="adherence">The last 7 days</h2>
      <p className="stat">{week.percent === null ? "–" : `${week.percent}%`}</p>
      <p className="muted">
        {week.taken} taken · {week.missed} missed · {week.skipped} skipped
      </p>
      <div className="trend" role="img" aria-label={trendLabel(week.daily)}>
        {week.daily.map((d) => (
          <div className="trend-col" key={d.date}>
            <div
              className={`trend-bar${d.percent === null ? " empty" : d.percent < 80 ? " low" : ""}`}
              // Data-driven: each bar's height is its day's percentage (at least 6% so it stays visible).
              style={{ height: `${Math.max(d.percent ?? 0, 6)}%` }}
            />
            <span className="trend-day" aria-hidden="true">
              {formatCalendarDate(d.date, { weekday: "narrow" })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
