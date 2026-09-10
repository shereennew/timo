import { useEffect, useState } from 'react'
import './App.css'
import Calendar from './Calendar'
import Planner from './Planner'
import BottomNav from './BottomNav'
import AICompanion from './AICompanion'
import Profile from './Profile'
import { addSampleWeek } from './sampleWeek'

import { dateKey, parseDate, validDate, tasksForDay, migrateTask, conflicts, suggestMove } from './planning'

const categories = [
  { name: 'Academic', detail: 'Classes & assignment', points: 5, color: 'var(--chart-1)', icon: 'A' },
  { name: 'Work', detail: 'Part-time shift', points: 3, color: 'var(--chart-2)', icon: 'W' },
  { name: 'Social', detail: 'Study group catch-up', points: 2, color: 'var(--chart-3)', icon: 'S' },
]

const moods = [
  { label: 'Stressed', points: 5, icon: '☁️' },
  { label: 'Anxious', points: 6, icon: '🙁' },
  { label: 'Okay', points: 8, icon: '😐' },
  { label: 'Good', points: 10, icon: '😊' },
  { label: 'Great', points: 12, icon: '😁' },
]

const backgrounds = {
  warm: { label: 'Warm white', color: '#fffbee' },
  lilac: { label: 'Lilac', color: '#faf7fd' },
  white: { label: 'White', color: '#ffffff' },
}

const themes = {
  purple: { label: 'Purple', color: '#d8c4ef' },
  pink: { label: 'Pink', color: '#f3c4d8' },
  blue: { label: 'Blue', color: '#bdddf5' },
  green: { label: 'Green', color: '#c5e4cd' },
}

/* =========================
   FLOWCHART AI LOGIC EVALUATOR
   ========================= */

function App() {
  const [page, setPage] = useState('planner')

  function navigate(nextPage) {
    setPage(nextPage)
    window.scrollTo(0, 0)
  }

  const today = dateKey(new Date())

  const [selectedDate, setSelectedDate] = useState(today)
  const [moodHistory,setMoodHistory]=useState(()=>{try {const v=JSON.parse(localStorage.getItem('timo-moods')||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}})
  const selectedMood=moodHistory[selectedDate] || 'Okay'
  const capacityForDay=day=>moods.find(m=>m.label===moodHistory[day])?.points || 8
  function setSelectedMood(value){const next={...moodHistory,[today]:value};setMoodHistory(next);try{localStorage.setItem('timo-moods',JSON.stringify(next))}catch{setStorageError(true)}}

  const dailyCapacity =
    moods.find(m => m.label === selectedMood)?.points || 8

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('timo-tasks') || '[]')

      const existing = Array.isArray(saved)
        ? saved
          .filter(
            task =>
              task &&
              typeof task.id === 'string' &&
              typeof task.name === 'string' &&
              task.name.trim() &&
              (categories.some(c => c.name === task.category) || task.category === 'Recovery') &&
              [0, 1, 2, 3].includes(Number(task.points))
          )
          .map(task => migrateTask(task,today))
        : []

      return localStorage.getItem('timo-sample-week-v2') === 'added' ? existing : addSampleWeek(existing,today)
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('timo-tasks', JSON.stringify(tasks))
      if(tasks.some(t=>t.id.startsWith('sample-week-v2-'))) localStorage.setItem('timo-sample-week-v2','added')

      if (tasks.some(task => task.id.startsWith('example-v1-'))) {
        localStorage.setItem('timo-examples-v1', 'added')
      }
    } catch {
      /* Edits report save failures. */
    }
  }, [tasks])

  const dayTasks = tasksForDay(tasks, selectedDate)

  const [tradingTask, setTradingTask] = useState(null)
  const [tradeDate, setTradeDate] = useState('')

  function startTrade(task) {
    const nextDay = parseDate(task.date)
    nextDay.setDate(nextDay.getDate() + 1)

    setTradeDate(dateKey(nextDay))
    setTradingTask(task.id)
  }

  function tradeTask(event, task) {
    event.preventDefault()

    if (!validDate(tradeDate) || tradeDate === task.date) return
    if(task.fixed||task.done||(task.deadline&&tradeDate>task.deadline)||conflicts(tasks,{...task,date:tradeDate}).length){setMessage('Cannot move this task: fixed, completed, past deadline, or overlapping another plan.');return}

    saveTasks(
      tasks.map(item =>
        item.id === task.id
          ? { ...item, date: tradeDate }
          : item
      )
    )

    setMessage(
      `${task.name} moved to ${parseDate(tradeDate).toLocaleDateString(
        'en',
        { dateStyle: 'medium' }
      )}.`
    )

    setTradingTask(null)
  }

  const [editingId,setEditingId]=useState(null)
  const [deadline,setDeadline]=useState('')
  const [fixed,setFixed]=useState(false)
  const [undoSnapshot,setUndoSnapshot]=useState(null)
  useEffect(()=>{if(!undoSnapshot)return;const timer=setTimeout(()=>setUndoSnapshot(null),8000);return()=>clearTimeout(timer)},[undoSnapshot])
  function beginEdit(task){setEditingId(task.id);setTaskName(task.name);setCategory(task.category);setEffort(String(task.points));setPriority(task.priority||'medium');setStartTime(task.startTime||'');setEndTime(task.endTime||'');setDeadline(task.deadline||'');setFixed(!!task.fixed);setMessage('');navigate('add-task')}
  function beginAdd(){setEditingId(null);setTaskName('');setCategory('Academic');setEffort('1');setPriority('medium');setStartTime('09:00');setEndTime('10:00');setDeadline('');setFixed(false);setMessage('');navigate('add-task')}
  function undoChange(){if(!undoSnapshot)return;saveTasks(undoSnapshot);setUndoSnapshot(null);setTradingTask(null);setMessage('Last task change undone.')}
  const [taskName, setTaskName] = useState('')
  const [category, setCategory] = useState('Academic')
  const [effort, setEffort] = useState('1')
  const [priority,setPriority]=useState('medium')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  function addTask(event) {
    event.preventDefault()

    const name = taskName.trim()

    if (!name) {
      setMessage('Please enter a task name.')
      return
    }

    if ((startTime || endTime) && (!startTime || !endTime || startTime >= endTime)) {
      setMessage('End time must be after start time.')
      return
    }

    if(conflicts(tasks,{id:editingId,date:selectedDate,startTime,endTime}).length){setMessage('This time overlaps another task. Please choose another time.');return}
    if(deadline&&(!validDate(deadline)||selectedDate>deadline)){setMessage('Choose a deadline on or after the planned date.');return}
    const previous=tasks.find(t=>t.id===editingId)
    const updated={...previous,id:editingId||crypto.randomUUID(),name,category,date:selectedDate,points:category==='Recovery'?0:Number(effort),startTime,endTime,deadline,fixed,priority}
    saveTasks(editingId?tasks.map(t=>t.id===editingId?updated:t):[...tasks,updated])

    setTaskName('')
    setStartTime('09:00')
    setEndTime('10:00')
    setMessage(`${name} ${editingId ? "updated" : "added"}.`)

    navigate('planner')
  }

  const loads = categories.map(cat => {
    const matching = dayTasks.filter(
      task => task.category === cat.name
    )

    return {
      ...cat,
      points: matching.reduce(
        (sum, task) => sum + Number(task.points),
        0
      ),
      detail: `${matching.length} ${matching.length === 1 ? 'task' : 'tasks'} planned`,
    }
  })

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('timo-theme')
      return Object.hasOwn(themes, saved) ? saved : 'purple'
    } catch {
      return 'purple'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('timo-theme', theme)
    } catch {
      /* Optional storage. */
    }
  }, [theme])

  const [background, setBackground] = useState(() => {
    try {
      const saved = localStorage.getItem('timo-background')
      return Object.hasOwn(backgrounds, saved) ? saved : 'warm'
    } catch {
      return 'warm'
    }
  })

  useEffect(() => {
    document.documentElement.style.backgroundColor =
      backgrounds[background].color

    try {
      localStorage.setItem('timo-background', background)
    } catch {
      /* The setting still works when browser storage is unavailable. */
    }
  }, [background])

  const [showSuggestions, setShowSuggestions] = useState(false)

  const totalLoad = loads.reduce(
    (total, load) => total + load.points,
    0
  )

  const overload = Math.max(0, totalLoad - dailyCapacity)

  const suggestion = suggestMove(
    tasks,
    selectedDate,
    dailyCapacity,
    today,
    capacityForDay
  )

  function acceptSuggestion() {
    if (!suggestion) return

    saveTasks(
      tasks.map(task =>
        task.id === suggestion.task.id
          ? { ...task, date: suggestion.destination }
          : task
      )
    )

    setMessage(
      `${suggestion.task.name} moved to ${parseDate(
        suggestion.destination
      ).toLocaleDateString('en', { dateStyle: 'medium' })}.`
    )

    setShowSuggestions(false)
    setTradingTask(null)
  }

  const chartTotal = Math.max(totalLoad, dailyCapacity, 1)

  const donutSlices = loads.map((load, index) => {
    const start = loads
      .slice(0, index)
      .reduce((sum, item) => sum + item.points, 0)

    return `${load.color} ${(start / chartTotal) * 100
      }% ${((start + load.points) / chartTotal) * 100}%`
  })

  const donutBackground = `conic-gradient(${donutSlices.join(
    ', '
  )}, var(--border) ${(totalLoad / chartTotal) * 100}% 100%)`

  const date = parseDate(selectedDate).toLocaleDateString('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const [message, setMessage] = useState('')
  const [storageError, setStorageError] = useState(false)

  const showFlowchartWarning=overload>0
  const aiRecommendation=overload>0 ? 'Your planned load exceeds this day’s capacity. Review a flexible task or leave room for a break.' : ''

  function saveTasks(nextTasks) {
    setUndoSnapshot(tasks)
    setTasks(nextTasks)

    try {
      localStorage.setItem('timo-tasks', JSON.stringify(nextTasks))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  return (
    <main
      className="dashboard"
      data-theme={theme}
      style={{ paddingBottom: '6rem' }}
    >
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            t.
          </span>
          <span className="brand-text">
            timö
            <span className="brand-meaning">tiny moments</span>
          </span>
        </span>
        <span
          className="demo-label"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: 'var(--accent)',
            color: 'var(--accent-dark)',
            border: 'none',
            fontWeight: 600
          }}
        >
          ✨ Planning assistant
        </span>
      </header>

      {page === 'calendar' && (
        <>
          <div className="intro">
            <h1>Pick a day</h1>
            <p>Tap a date to open its daily planner.</p>
          </div>

          <Calendar
            selectedDate={selectedDate}
            today={today}
            tasks={tasks}
            onSelect={day => {
              setSelectedDate(day)
              setMessage('')
              setShowSuggestions(false)
              navigate('planner')
            }}
          />
        </>
      )}

      {page === 'planner' && <Planner date={selectedDate} today={today} tasks={dayTasks} onDate={day=>{setSelectedDate(day);setMessage('');setShowSuggestions(false)}} onEdit={beginEdit} onAdd={beginAdd} onToggle={task=>{saveTasks(tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t));setMessage(task.done?'Marked unfinished.':'Task completed.')}} />}
      {page === 'companion' && <AICompanion />}

      {page === 'profile' && <Profile theme={theme} setTheme={setTheme} background={background} setBackground={setBackground} />}

      {page === 'add-task' && (
        <section className="task-section">
          <h1>{editingId ? "Edit task" : "Add a little task"}</h1><button type="button" className="back-button" onClick={()=>navigate("planner")}>Cancel</button>
          <p>Planning for {date}</p>

          <form className="task-form" onSubmit={addTask}>
            <label htmlFor="task-name">
              Task name
              <input
                id="task-name"
                value={taskName}
                onChange={event => setTaskName(event.target.value)}
                placeholder="e.g. Read chapter 3"
                required
                maxLength={100}
              />
            </label>

            <div className="task-fields">
              <label>
                Category
                <select
                  value={category}
                  onChange={event => setCategory(event.target.value)}
                >
                  {categories.map(item => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Effort
                <select
                  value={effort}
                  onChange={event => setEffort(event.target.value)}
                >
                  <option value="1">Light · 1 point</option>
                  <option value="2">Medium · 2 points</option>
                  <option value="3">Heavy · 3 points</option>
                </select>
              </label>
            </div>

            <div className="task-fields">
              <label>
                Start time
                <input
                  type="time"
                  value={startTime}
                  onChange={event => setStartTime(event.target.value)}
                  
                />
              </label>

              <label>
                End time
                <input
                  type="time"
                  value={endTime}
                  onChange={event => setEndTime(event.target.value)}
                  
                />
              </label>
            </div>

<label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
<p className="helper">Priority is importance; effort is how much energy the task takes.</p>
<label>Deadline (optional)<input type="date" min={selectedDate} value={deadline} onChange={e=>setDeadline(e.target.value)} /></label>
<label className="fixed-toggle"><input type="checkbox" checked={fixed} onChange={e=>setFixed(e.target.checked)} /> Fixed commitment — keep this task on its planned day</label>
            <button className="primary-button" type="submit">
              {editingId ? "Save changes" : "+ Add task"}
            </button>
          </form>

          <p className="helper" role="status">
            {message}
          </p>
        </section>
      )}

      {page === 'dashboard' && (
        <>
          <div className="intro">
            <p className="eyebrow">{date}</p>
            <h1>A little room to breathe.</h1>
            <p>Make a little space for the day ahead.</p>
          </div>

          {showFlowchartWarning && (
            <section
              className="warning"
              aria-labelledby="flowchart-warning-title"
              style={{
                background: 'var(--accent-light, #f4effa)',
                border: '1px solid var(--accent, #d8c4ef)',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                marginBottom: '1.5rem'
              }}
            >
              <span
                className="warning-icon"
                aria-hidden="true"
                style={{
                  background: 'var(--accent, #d8c4ef)',
                  color: 'var(--accent-dark, #5a3e7a)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  fontWeight: 'bold'
                }}
              >
                💬
              </span>
              <div>
                <h2 id="flowchart-warning-title" style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--ink)' }}>
                  Timo's Insight
                </h2>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted, #555)', lineHeight: 1.4 }}>
                  {aiRecommendation}
                </p>
              </div>
            </section>
          )}

          <section
            className="capacity-card"
            aria-labelledby="capacity-title"
          >
            <div className="card-heading">
              <h2 id="capacity-title">Planned load</h2>

              <span
                className="capacity-label"
                style={{
                  background:
                    overload > 0 ? '#fde8e8' : 'var(--accent)',
                  color:
                    overload > 0 ? '#c53030' : 'var(--accent-dark)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: `1px solid ${overload > 0
                    ? '#fbc5c5'
                    : 'var(--accent-dark)'
                    }`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  letterSpacing: '-0.2px',
                }}
              >
                {overload > 0
                  ? '⚠️ Over capacity'
                  : '💚 Within capacity'}
              </span>
            </div>

            <div
              className="mood-feedback-container"
              style={{
                margin: '1rem 0',
                textAlign: 'left',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                }}
              >
                {selectedDate === today ? 'How are you feeling today?' : 'Capacity estimate for this day'}
              </label>

              <div
                className="mood-options"
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'space-between',
                }}
              >
                {moods.map(m => (
                  <button
                    type="button"
                    key={m.label}
                    disabled={selectedDate !== today}
                    onClick={() => setSelectedMood(m.label)}
                    style={{
                      background:
                        selectedMood === m.label
                          ? 'var(--accent, #d8c4ef)'
                          : 'transparent',
                      border:
                        '1px solid var(--border, #ccc)',
                      borderRadius: '12px',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>
                      {m.icon}
                    </span>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        marginTop: '0.25rem',
                      }}
                    >
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted, #666)',
                  textAlign: 'center',
                  marginTop: '0.5rem',
                  marginBottom: '0.8rem'
                }}
              >
                {selectedDate === today ? "Your check-in is saved for today only." : "Uses your saved check-in, or an 8-point estimate. Check in when the day arrives."}
              </p>
            </div>

            <div
              className="capacity-donut"
              style={{ background: donutBackground }}
              role="img"
              aria-label={`${totalLoad} points planned against ${dailyCapacity} points of capacity.`}
            >
              <div className="donut-center" aria-hidden="true">
                <div className="capacity-number">
                  {totalLoad}
                  <span> / {dailyCapacity}</span>
                </div>

                <p className="capacity-caption">
                  points planned
                </p>
              </div>
            </div>

            <div className="donut-legend" aria-hidden="true">
              {loads.map(load => (
                <span
                  key={load.name}
                  style={{
                    color: 'var(--ink)',
                    fontWeight: 500,
                  }}
                >
                  <i
                    style={{
                      background: load.color,
                      border: '1px solid rgba(0,0,0,0.15)',
                    }}
                  />
                  {load.name}
                </span>
              ))}
            </div>

            <div className="load-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border, #e2d9ed)', paddingTop: '1rem' }} aria-labelledby="load-title">
              <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 id="load-title" style={{ fontSize: '1rem', margin: 0 }}>Category Breakdown</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted, #666)' }}>{totalLoad} pts planned</span>
              </div>

              <div className="load-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexWrap: 'wrap' }}>
                {loads.map(load => (
                  <div className="load-row" key={load.name} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.5)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <span
                      className="category-icon"
                      style={{
                        color: 'var(--accent-dark)',
                        background: load.color,
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        marginRight: '0.75rem',
                        fontWeight: 'bold',
                        fontSize: '0.8rem'
                      }}
                      aria-hidden="true"
                    >
                      {load.icon}
                    </span>

                    <div className="load-info" style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{load.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>{load.detail}</p>
                    </div>

                    <strong style={{ fontSize: '0.9rem' }}>
                      {load.points}
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}> pts</span>
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <nav
            className="page-actions"
            aria-label="Plan your day"
            style={{ margin: '1.5rem 0' }}
          >
            <button
              onClick={beginAdd}
              style={{ width: '100%' }}
            >
              + Add task
            </button>
          </nav>

          <p className="selected-day" aria-live="polite">
            {selectedDate === today ? 'Today' : date} ·{' '}
            {dayTasks.filter(t=>t.done).length} of {dayTasks.length} done · Completed effort remains in your load
          </p>

          <section
            className="task-section"
            aria-labelledby="tasks-title"
          >
            <h2 id="tasks-title">
              Daily planner ·{' '}
              {selectedDate === today ? 'today' : date}
            </h2>

            <p className="helper" role="status">
              {message}
            </p>

            {storageError && (
              <p role="alert">
                Your browser could not save these tasks. They
                may be lost when you refresh.
              </p>
            )}

            {dayTasks.length === 0 ? (
              <p className="helper">
                A fresh start. Use + Add task to plan this
                day.
              </p>
            ) : (
              <ul className="task-list">
                {[...dayTasks].sort((a,b)=>(a.startTime||'99:99').localeCompare(b.startTime||'99:99') || ({high:0,medium:1,low:2}[a.priority||'medium'] - {high:0,medium:1,low:2}[b.priority||'medium'])).map(task => {
                  const points = Number(task.points);
                  const isHeavy = points === 3;
                  const isMedium = points === 2;

                  const effortLabel = isHeavy ? 'Heavy' : isMedium ? 'Medium' : 'Light';
                  const badgeBg = isHeavy ? '#fed7d7' : isMedium ? '#feebc8' : 'var(--accent-light, #edf2f7)';
                  const badgeColor = isHeavy ? '#9b2c2c' : isMedium ? '#975a16' : 'inherit';

                  return (
                    <li key={task.id} style={{
                      borderLeft: isHeavy ? '4px solid #e53e3e' : '4px solid transparent',
                      paddingLeft: '1.25rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label className="completion-toggle"><input type="checkbox" checked={!!task.done} onChange={()=>{saveTasks(tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t));setMessage(task.done?'Marked unfinished.':'Task completed.')}} /><strong style={{textDecoration:task.done?'line-through':'none'}}>{task.name}</strong></label>
                          <span className={`priority-badge priority-${task.priority||"medium"}`}>{task.priority||"medium"} priority</span>
                          <span className="effort-badge" style={{ background: badgeBg, color: badgeColor }}>
                            {effortLabel}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
                          🕒 {task.startTime ? `${task.startTime} – ${task.endTime || '?'}` : 'Unscheduled'} · {task.category} · {points} {points === 1 ? 'point' : 'points'}
                        </p>
                      </div>

{task.deadline && <p className="helper">Due {task.deadline}{!task.done&&task.deadline<today?' · Overdue':''}</p>}
{task.fixed && <p className="helper">Fixed commitment</p>}
<button type="button" className="remove-task" onClick={()=>beginEdit(task)}>Edit</button>
                      <button type="button" className="remove-task" disabled={task.fixed || task.done} onClick={() => startTrade(task)} aria-label={`Reschedule ${task.name}`}>Reschedule</button>
                      <button type="button" className="remove-task" aria-label={`Remove ${task.name}`} onClick={() => { saveTasks(tasks.filter(item => item.id !== task.id)); setMessage(`${task.name} removed.`); }}>Remove</button>

                      {tradingTask === task.id && (
                        <form
                          className="trade-form"
                          onSubmit={event =>
                            tradeTask(event, task)
                          }
                        >
                          <label
                            htmlFor={`trade-${task.id}`}
                          >
                            Move to another day
                          </label>

                          <input
                            id={`trade-${task.id}`}
                            type="date"
                            required
                            value={tradeDate}
                            onChange={event =>
                              setTradeDate(event.target.value)
                            }
                          />

                          {validDate(tradeDate) && (
                            <p className="helper">
                              Destination load:{' '}
                              {tasksForDay(
                                tasks,
                                tradeDate
                              ).reduce(
                                (sum, item) =>
                                  sum + Number(item.points),
                                0
                              ) +
                                (tradeDate === task.date
                                  ? 0
                                  : Number(task.points))}{' '}
                              / {capacityForDay(tradeDate)} points after
                              moving.
                            </p>
                          )}

                          <div className="page-actions">
                            <button
                              type="button"
                              onClick={() =>
                                setTradingTask(null)
                              }
                            >
                              Cancel
                            </button>

                            <button
                              type="submit"
                              disabled={
                                !validDate(tradeDate) ||
                                tradeDate === task.date
                              }
                            >
                              Move task
                            </button>
                          </div>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <button
            className="primary-button"
            aria-expanded={showSuggestions}
            aria-controls="suggestions"
            onClick={() =>
              setShowSuggestions(!showSuggestions)
            }
          >
            {showSuggestions
              ? 'Hide suggestions'
              : 'Lighten My Load'}

            <span aria-hidden="true">
              {showSuggestions ? '−' : '↗'}
            </span>
          </button>

          <section
            id="suggestions"
            className="suggestions"
            hidden={!showSuggestions}
          >
            <h2>A little breathing room</h2>

            {suggestion ? (
              <>
                <p>
                  Timo suggests moving{' '}
                  <strong>
                    {suggestion.task.name}
                  </strong>{' '}
                  ({suggestion.task.startTime}–
                  {suggestion.task.endTime}) to{' '}
                  <strong>
                    {parseDate(
                      suggestion.destination
                    ).toLocaleDateString('en', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                  .
                </p>

                <div className="move-preview">
                  <p>
                    This day:{' '}
                    <strong>
                      {suggestion.sourceBefore} →{' '}
                      {suggestion.sourceAfter} pts
                    </strong>
                  </p>

                  <p>
                    New day:{' '}
                    <strong>
                      {suggestion.destinationBefore} →{' '}
                      {suggestion.destinationAfter} pts
                    </strong>
                  </p>
                </div>

                <p>
                  {suggestion.remaining === 0
                    ? 'This brings both days within your estimated capacity.'
                    : `This frees up ${suggestion.task.points} points, leaving ${suggestion.remaining} points above your estimate on this day.`}
                </p>

                <div className="page-actions">
                  <button
                    type="button"
                    onClick={() =>
                      setShowSuggestions(false)
                    }
                  >
                    Keep my plan
                  </button>

                  <button
                    type="button"
                    onClick={acceptSuggestion}
                  >
                    Yes, move task
                  </button>
                </div>
              </>
            ) : (
              <p>
                {selectedDate < today
                  ? 'This is a past day. Choose today or a future date to adjust your plan.'
                  : overload === 0
                    ? 'Your plan is within your estimated capacity. Keep some room for breaks.'
                    : 'Timo could not find a task that can be moved within the next 7 days.'}
              </p>
            )}
          </section>
        </>
      )}

{undoSnapshot&&<div className="task-undo" role="status"><span>Task changed</span><button onClick={undoChange}>Undo</button><button aria-label="Dismiss undo" onClick={()=>setUndoSnapshot(null)}>×</button></div>}
      <BottomNav page={page} navigate={navigate} />
    </main>
  )
}

export default App
