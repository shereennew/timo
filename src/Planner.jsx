import { dateKey, parseDate, conflicts, tasksForDay } from './planning'
import { timelineFor } from './timeline'

export default function Planner({
  date,
  today,
  tasks,
  onDate,
  onEdit,
  onRemove,
  onToggle,
  onAdd,
  showSuggestions,
  setShowSuggestions,
  suggestion,
  acceptSuggestion,
  onSkipSuggestion,
  overload,
  loadingSuggestion,
  currentPoints,
  maxCapacity,
  selectedMood,
  setSelectedMood,
  moods,
  aiRecommendation,
  showFlowchartWarning,
  onOpenCompanion
}) {
  const currentDayTasks = tasksForDay(tasks, date)
  const { rows, unscheduled } = timelineFor(currentDayTasks)

  function step(offset) {
    const d = parseDate(date)
    d.setDate(d.getDate() + offset)
    onDate(dateKey(d))
  }

  function card(task) {
    const points = Number(task.points) || 2
    let weightLabel = 'Medium'
    let weightClass = 'priority-medium'

    if (points >= 3) {
      weightLabel = 'Heavy'
      weightClass = 'priority-high'
    } else if (points <= 1) {
      weightLabel = 'Light'
      weightClass = 'priority-low'
    }

    return (
      <article className="planner-card" key={task.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
          <label className="completion-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={!!task.done} onChange={() => onToggle(task)} />
            <strong style={{ textDecoration: task.done ? 'line-through' : 'none', fontSize: '1rem' }}>
              {task.name}
            </strong>
          </label>
          <span className={`priority-badge ${weightClass}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
            {weightLabel}
          </span>
        </div>

        <p className="planner-time" style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          🕒 {task.startTime && task.endTime ? `${task.startTime} – ${task.endTime}` : 'Choose time'} · {task.category || 'General'} · {points} {points === 1 ? 'point' : 'points'}
        </p>

        {task.deadline && <p className="helper" style={{ fontSize: '0.8rem', margin: '0.2rem 0' }}>Due {task.deadline}</p>}
        {conflicts(tasks, task).length > 0 && <p className="helper" style={{ fontSize: '0.8rem', color: '#e53e3e' }}>Overlapping plans — check times.</p>}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
          <button className="remove-task" onClick={() => onEdit(task)} style={{ background: 'rgba(216, 196, 239, 0.3)', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Reschedule</button>
          <button className="remove-task" onClick={() => onRemove(task)} style={{ background: 'rgba(216, 196, 239, 0.3)', border: 'none', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Remove</button>
        </div>

      </article>
    )
  }

  return (
    <section className="daily-planner">

      <div className="intro">
        <h1>A little room to breathe.</h1>
        <p>Make a little space for the day ahead.</p>
      </div>

      <div className="mood-feedback-container planner-mood-container" style={{ textAlign: 'left', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 20px' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          How are you feeling today?
        </label>

        <div className="mood-options" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          {moods.map(m => (
            <button
              type="button"
              key={m.label}
              onClick={() => setSelectedMood(m.label)}
              style={{
                background: selectedMood === m.label ? 'var(--accent, #d8c4ef)' : 'transparent',
                border: '1px solid var(--border, #ccc)',
                borderRadius: '12px',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
              <span style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>{m.label}</span>
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted, #666)', textAlign: 'center', marginTop: '0.4rem', marginBottom: 0 }}>
          Sets capacity: Stressed (5 pts) to Great (12 pts).
        </p>
      </div>

      <div className="energy-capacity-widget">
        <div className="energy-capacity-header">
          <span>Daily Energy Load</span>
          <span style={{ color: overload > 0 ? '#c53030' : 'inherit', fontWeight: overload > 0 ? 700 : 500 }}>
            {currentPoints} / {maxCapacity} pts {overload > 0 && '⚠️'}
          </span>
        </div>
        <div className="energy-progress-track">
          <div
            className="energy-progress-fill"
            style={{
              width: `${Math.min(100, (currentPoints / maxCapacity) * 100)}%`,
              background: overload > 0 ? '#e53e3e' : 'var(--accent-dark)'
            }}
          ></div>
        </div>

        {showFlowchartWarning && (
          <div className="planner-insight-inline" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span className="planner-insight-icon-small" aria-hidden="true">
                💬
              </span>
              <div>
                <h2 className="planner-insight-title-small">
                  Timo's Insight
                </h2>
                <p className="planner-insight-text-small">
                  {aiRecommendation}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCompanion}
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-dark)',
                border: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                width: '100%'
              }}
            >
              Timo's here if you want to chat more ↗
            </button>
          </div>
        )}
      </div>

      <section className="planner-date-controls" aria-label="Change planner date">
        <div className="section-heading">
          <h2 aria-live="polite" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            Tasks for {parseDate(date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>

          <button onClick={() => onDate(today)} className="inline-today-btn">Back to today</button>
        </div>
      </section>

      <div className="planner-navigation">
        <button onClick={() => step(-1)} aria-label="Previous day" >‹</button>
        <label>
          Choose date
          <input type="date" required value={date} onChange={e => { if (e.target.value) onDate(e.target.value) }} />
        </label>
        <button onClick={() => step(1)} aria-label="Next day">›</button>
      </div>

      <div className="planner-timeline">
        {rows.length ? rows.map(row => row.kind === 'gap' ? (
          <div className="planner-gap" key={`gap-${row.start}`}>
            <strong>{row.start}–{row.end}</strong>
            <span>Free time</span>
          </div>
        ) : card(row.task)) : (
          <p>No timed plans yet.</p>
        )}
      </div>

      {
        unscheduled.length > 0 && (
          <section>
            <h2>Unscheduled</h2>
            <p className="helper">These tasks have no complete time slot yet.</p>
            {unscheduled.map(card)}
          </section>
        )
      }

      <button
        className="primary-button"
        aria-expanded={showSuggestions}
        aria-controls="suggestions"
        onClick={() => setShowSuggestions(!showSuggestions)}
      >
        {showSuggestions ? 'Hide suggestions' : 'Lighten My Load'}
        <span aria-hidden="true">{showSuggestions ? '−' : '↗'}</span>
      </button>

      <section id="suggestions" className="suggestions" hidden={!showSuggestions}>
        <h2>A little breathing room</h2>

        {loadingSuggestion ? (
          <p>✨ Timo is thinking of the best way to lighten your load...</p>
        ) : suggestion ? (
          <>
            <p>
              Timo suggests moving{' '}
              <strong>{suggestion.task.name}</strong> ({suggestion.task.startTime}–{suggestion.task.endTime}) to{' '}
              <strong>
                {parseDate(suggestion.destination).toLocaleDateString('en', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </strong>.
            </p>

            {suggestion.aiReason && (
              <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--muted)' }}>
                "{suggestion.aiReason}"
              </p>
            )}

            <div className="move-preview">
              <p>
                This day: <strong>{suggestion.sourceBefore} → {suggestion.sourceAfter} pts</strong>
              </p>
              <p>
                New day: <strong>{suggestion.destinationBefore} → {suggestion.destinationAfter} pts</strong>
              </p>
            </div>

            <p>
              {suggestion.remaining === 0
                ? 'This brings both days within your estimated capacity.'
                : `This frees up ${suggestion.task.points} points, leaving ${suggestion.remaining} points above your estimate on this day.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.2rem' }}>
              <button
                type="button"
                onClick={onSkipSuggestion}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  alignSelf: 'flex-start', // Pushes it to the left side
                  padding: '0'
                }}
              >
                Skip task instead
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSuggestions(false)}
                  style={{
                    flex: 1,
                    background: 'var(--accent-dark)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Keep my plan
                </button>
                <button
                  type="button"
                  onClick={() => acceptSuggestion(suggestion)}
                  style={{
                    flex: 1,
                    background: 'var(--accent)',
                    color: 'var(--accent-dark)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Yes, move task ↗
                </button>
              </div>
            </div>
          </>
        ) : (
          <p>
            {date < today
              ? 'This is a past day. Choose today or a future date to adjust your plan.'
              : overload === 0
                ? 'Your plan is within your estimated capacity. Keep some room for breaks.'
                : 'Timo could not find a task that can be moved within the next 7 days.'}
          </p>
        )}

      </section>

      <div className="page-actions" style={{ marginTop: '1rem' }}>
        <button onClick={onAdd} className="primary-button"><span>+</span> Add task</button>
      </div>

    </section>
  )
}