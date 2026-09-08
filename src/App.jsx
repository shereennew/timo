import { useEffect, useState } from 'react'
import './App.css'
import Calendar from './Calendar'
import { dateKey, parseDate, validDate, tasksForDay, suggestMove } from './planning'

// Demo points represent effort, not hours or a medical assessment.
// Capacity is an estimate for planning.
const categories = [
  { name: 'Academic', detail: 'Classes & assignment', points: 5, color: 'var(--chart-1)', icon: 'A' },
  { name: 'Work', detail: 'Part-time shift', points: 3, color: 'var(--chart-2)', icon: 'W' },
  { name: 'Social', detail: 'Study group catch-up', points: 2, color: 'var(--chart-3)', icon: 'S' },
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

function App() {
  const [page, setPage] = useState('dashboard')
  function navigate(nextPage) {
    setPage(nextPage)
    window.scrollTo(0, 0)
  }
  const today = dateKey(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [usualCapacity, setUsualCapacity] = useState(() => {
    try { return Number(localStorage.getItem('timo-usual-capacity')) || 8 } catch { return 8 }
  })
  const dailyCapacity = [5,8,12].includes(usualCapacity) ? usualCapacity : 8
  function changeCapacity(value) {
    setUsualCapacity(Number(value))
    try { localStorage.setItem('timo-usual-capacity', value) } catch { /* Optional preference. */ }
  }
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('timo-tasks') || '[]')
      const existing = Array.isArray(saved) ? saved.filter(t => t && typeof t.id === 'string' && typeof t.name === 'string' && t.name.trim() && categories.some(c => c.name === t.category) && [1, 2, 3].includes(t.points)).map(task => ({ ...task, date: validDate(task.date) ? task.date : today })) : []
      if (localStorage.getItem('timo-examples-v1') === 'added') return existing
      const tomorrowDate = parseDate(today)
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)
      const tomorrow = dateKey(tomorrowDate)
      const examples = [
        { id: 'example-v1-1', name: 'Read chapter 3', category: 'Academic', points: 2, date: today },
        { id: 'example-v1-2', name: 'Finish assignment draft', category: 'Academic', points: 3, date: today },
        { id: 'example-v1-3', name: 'Afternoon cafe shift', category: 'Work', points: 3, date: today },
        { id: 'example-v1-4', name: 'Catch up with a friend', category: 'Social', points: 1, date: today },
        { id: 'example-v1-5', name: 'Review lecture notes', category: 'Academic', points: 2, date: tomorrow },
        { id: 'example-v1-6', name: 'Study group catch-up', category: 'Social', points: 2, date: tomorrow },
      ]
      return [...existing, ...examples.filter(example => !existing.some(task => task.id === example.id))]
    } catch { return [] }
  })
  // Save dates assigned to tasks from the earlier undated prototype.
  useEffect(() => {
    try { localStorage.setItem('timo-tasks', JSON.stringify(tasks)); if (tasks.some(task => task.id.startsWith('example-v1-'))) localStorage.setItem('timo-examples-v1', 'added') } catch { /* Edits report save failures. */ }
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
    saveTasks(tasks.map(item => item.id === task.id ? { ...item, date: tradeDate } : item))
    setMessage(`${task.name} moved to ${parseDate(tradeDate).toLocaleDateString('en', { dateStyle: 'medium' })}.`)
    setTradingTask(null)
  }
  const [taskName, setTaskName] = useState('')
  const [category, setCategory] = useState('Academic')
  const [effort, setEffort] = useState('1')
  const [message, setMessage] = useState('')
  const [storageError, setStorageError] = useState(false)
  function saveTasks(nextTasks) {
    setTasks(nextTasks)
    try { localStorage.setItem('timo-tasks', JSON.stringify(nextTasks)); setStorageError(false) }
    catch { setStorageError(true) }
  }
  function addTask(event) {
    event.preventDefault()
    const name = taskName.trim()
    if (!name) { setMessage('Please enter a task name.'); return }
    saveTasks([...tasks, { id: crypto.randomUUID(), name, category, date: selectedDate, points: Number(effort) }])
    setTaskName('')
    setMessage(`${name} added.`)
    navigate('dashboard')
  }
  const loads = categories.map(category => {
    const matching = dayTasks.filter(task => task.category === category.name)
    return { ...category, points: matching.reduce((sum, task) => sum + task.points, 0), detail: `${matching.length} ${matching.length === 1 ? 'task' : 'tasks'} planned` }
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
    try { localStorage.setItem('timo-theme', theme) } catch { /* Optional storage. */ }
  }, [theme])
  // Remember this browser's background choice, with warm white as the default.
  const [background, setBackground] = useState(() => {
    try {
      const saved = localStorage.getItem('timo-background')
      return Object.hasOwn(backgrounds, saved) ? saved : 'warm'
    } catch {
      return 'warm'
    }
  })
  useEffect(() => {
    document.documentElement.style.backgroundColor = backgrounds[background].color
    try {
      localStorage.setItem('timo-background', background)
    } catch {
      // The setting still works when browser storage is unavailable.
    }
  }, [background])
  // Changing state tells React to show or hide the suggestion panel.
  const [showSuggestions, setShowSuggestions] = useState(false)
  const totalLoad = loads.reduce((total, load) => total + load.points, 0)
  const overload = Math.max(0, totalLoad - dailyCapacity)
  const suggestion = suggestMove(tasks, selectedDate, dailyCapacity, today)
  function acceptSuggestion() {
    if (!suggestion) return
    saveTasks(tasks.map(task => task.id === suggestion.task.id ? { ...task, date: suggestion.destination } : task))
    setMessage(`${suggestion.task.name} moved to ${parseDate(suggestion.destination).toLocaleDateString('en', { dateStyle: 'medium' })}.`)
    setShowSuggestions(false)
    setTradingTask(null)
  }
  // Each category gets a slice; unused capacity stays pale.
  const chartTotal = Math.max(totalLoad, dailyCapacity, 1)
  const donutSlices = loads.map((load, index) => {
    const start = loads.slice(0, index).reduce((sum, item) => sum + item.points, 0)
    return `${load.color} ${start / chartTotal * 100}% ${(start + load.points) / chartTotal * 100}%`
  })
  const donutBackground = `conic-gradient(${donutSlices.join(', ')}, var(--border) ${totalLoad / chartTotal * 100}% 100%)`
  const date = parseDate(selectedDate).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <main className="dashboard" data-theme={theme}>
      <header className="topbar">
        <span className="brand"><span className="brand-mark" aria-hidden="true">t.</span><span className="brand-text">timö<span className="brand-meaning">tiny moments</span></span></span>
        <span className="demo-label">Your day</span>
      </header>

      {page !== 'dashboard' && <button className="back-button" onClick={() => navigate('dashboard')}>← Back to your day</button>}
      {page === 'calendar' && <>
        <div className="intro"><h1>Pick a day</h1><p>Tap a date to see its load and tasks.</p></div>
      <Calendar selectedDate={selectedDate} today={today} tasks={tasks} onSelect={day => { setSelectedDate(day); setMessage(''); setShowSuggestions(false); navigate('dashboard') }} />
      </>}
      {page === 'add-task' && <section className="task-section">
        <h1>Add a little task</h1>
        <p>Planning for {date}</p>
        <form className="task-form" onSubmit={addTask}>
          <label htmlFor="task-name">Task name</label>
          <input id="task-name" value={taskName} onChange={event => setTaskName(event.target.value)} placeholder="e.g. Read chapter 3" required maxLength={100} />
          <div className="task-fields">
            <label>Category<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item.name}>{item.name}</option>)}</select></label>
            <label>Effort<select value={effort} onChange={event => setEffort(event.target.value)}>
              <option value="1">Light · 1 point</option><option value="2">Medium · 2 points</option><option value="3">Heavy · 3 points</option>
            </select></label>
          </div>
          <button className="primary-button" type="submit">+ Add task</button>
        </form>
        <p className="helper" role="status">{message}</p>
      </section>}
      {page === 'dashboard' && <>
      <div className="intro">
        <p className="eyebrow">{date}</p>
        <h1>A little room to breathe.</h1>
        <p>Make a little space for the day ahead.</p>
      </div>

      <nav className="page-actions" aria-label="Plan your day">
        <button onClick={() => navigate('calendar')}>Calendar</button>
        <button onClick={() => { setMessage(''); navigate('add-task') }}>+ Add task</button>
      </nav>
      <section className="capacity-card" aria-labelledby="capacity-title">
        <div className="card-heading"><h2 id="capacity-title">Planned load</h2><span className="capacity-label">{overload > 0 ? 'Over capacity' : 'Within capacity'}</span></div>
        <label className="capacity-setting">Estimated capacity
          <select value={dailyCapacity} onChange={event => changeCapacity(event.target.value)}><option value="5">5 points</option><option value="8">8 points</option><option value="12">12 points</option></select>
        </label>
        <p className="helper">Your usual estimate for all days. How you feel on the day may change.</p>
        <div className="capacity-donut" style={{ background: donutBackground }} role="img" aria-label={`${totalLoad} points planned against ${dailyCapacity} points of capacity. ${loads.map(load => `${load.name}: ${load.points} points`).join('. ')}. ${overload > 0 ? `${overload} points over capacity` : `${dailyCapacity - totalLoad} points available`}.`}>
          <div className="donut-center" aria-hidden="true">
            <div className="capacity-number">{totalLoad}<span> / {dailyCapacity}</span></div>
            <p className="capacity-caption">points planned</p>
          </div>
        </div>
        <div className="donut-legend" aria-hidden="true">{loads.map(load => <span key={load.name}><i style={{ background: load.color }} />{load.name}</span>)}</div>
        <p className="capacity-note">{overload > 0 ? `${overload} points over your limit. A small adjustment can help.` : 'There’s room in your day to pause.'}</p>
      </section>


      <p className="selected-day" aria-live="polite">{selectedDate === today ? 'Today' : date} · {dayTasks.length} tasks</p>

      <section className="load-section" aria-labelledby="load-title">
        <div className="section-heading"><h2 id="load-title">Your load</h2><span>{totalLoad} pts planned</span></div>
        <div className="load-list">
          {loads.map(load => (
            <div className="load-row" key={load.name}>
              <span className="category-icon" style={{ color: 'var(--accent-dark)', background: load.color }} aria-hidden="true">{load.icon}</span>
              <div className="load-info"><h3>{load.name}</h3><p>{load.detail}</p></div>
              <strong>{load.points}<span> pts</span></strong>
            </div>
          ))}
          <div className="load-row recovery-row">
            <span className="category-icon" aria-hidden="true">R</span>
            <div className="load-info"><h3>Recovery</h3><p>A walk, a meal, a moment offline</p></div>
            <span className="recovery-time">30 min</span>
          </div>
        </div>
        <p className="helper">Recovery is time to recharge; it doesn’t add load points.</p>
      </section>

      <section className="task-section" aria-labelledby="tasks-title">
        <h2 id="tasks-title">Tasks for {selectedDate === today ? "today" : date}</h2>

        <p className="helper" role="status">{message}</p>
        {storageError && <p role="alert">Your browser could not save these tasks. They may be lost when you refresh.</p>}
        {dayTasks.length === 0 ? <p className="helper">A fresh start. Use + Add task to plan this day.</p> : <ul className="task-list">
          {dayTasks.map(task => <li key={task.id}>
            <div><strong>{task.name}</strong><p>{task.category} · {task.points} {task.points === 1 ? 'point' : 'points'}</p></div>
            <button type="button" className="remove-task" onClick={() => startTrade(task)} aria-label={`Trade task: ${task.name}`}>Trade task</button>
            <button type="button" className="remove-task" aria-label={`Remove ${task.name}`} onClick={() => { saveTasks(tasks.filter(item => item.id !== task.id)); setMessage(`${task.name} removed.`) }}>Remove</button>
            {tradingTask === task.id && <form className="trade-form" onSubmit={event => tradeTask(event, task)}>
              <label htmlFor={`trade-${task.id}`}>Move to another day</label>
              <input id={`trade-${task.id}`} type="date" required value={tradeDate} onChange={event => setTradeDate(event.target.value)} />
              {validDate(tradeDate) && <p className="helper">Destination load: {tasksForDay(tasks, tradeDate).reduce((sum, item) => sum + item.points, 0) + (tradeDate === task.date ? 0 : task.points)} / {dailyCapacity} points after moving.</p>}
              <div className="page-actions">
                <button type="button" onClick={() => setTradingTask(null)}>Cancel</button>
                <button type="submit" disabled={!validDate(tradeDate) || tradeDate === task.date}>Move task</button>
              </div>
            </form>}
          </li>)}
        </ul>}
      </section>

      {overload > 0 && <section className="warning" aria-labelledby="warning-title">
        <span className="warning-icon" aria-hidden="true">!</span>
        <div><h2 id="warning-title">This day looks a little heavy</h2><p>Your plans exceed the estimated capacity by {overload} points. Consider leaving some room in this day.</p></div>
      </section>}

      <button className="primary-button" aria-expanded={showSuggestions} aria-controls="suggestions" onClick={() => setShowSuggestions(!showSuggestions)}>
        {showSuggestions ? 'Hide suggestions' : 'Lighten My Load'}<span aria-hidden="true">{showSuggestions ? '−' : '↗'}</span>
      </button>
      <section id="suggestions" className="suggestions" hidden={!showSuggestions}>
        <h2>A little breathing room</h2>
        {suggestion ? <>
          <p>Could <strong>{suggestion.task.name}</strong> wait until <strong>{parseDate(suggestion.destination).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</strong>?</p>
          <div className="move-preview">
            <p>This day: <strong>{suggestion.sourceBefore} → {suggestion.sourceAfter} pts</strong></p>
            <p>New day: <strong>{suggestion.destinationBefore} → {suggestion.destinationAfter} pts</strong></p>
          </div>
          <p>{suggestion.remaining === 0 ? 'This brings both days within your estimated capacity.' : `This frees up ${suggestion.task.points} points, leaving ${suggestion.remaining} points above your estimate on this day.`}</p>
          <p className="helper">Chosen from the next 7 days to ease this day without overloading another. Check that the task can wait: deadlines and fixed commitments are not recorded yet.</p>
          <div className="page-actions">
            <button type="button" onClick={() => setShowSuggestions(false)}>Keep my plan</button>
            <button type="button" onClick={acceptSuggestion}>Yes, move task</button>
          </div>
        </> : <p>{selectedDate < today ? 'This is a past day. Choose today or a future date to adjust your plan.' : overload === 0 ? 'Your plan is within your estimated capacity. Keep some room for breaks.' : 'No task fits within the estimated capacity of the next 7 days. Try splitting a larger task or use Trade task to choose a later date.'}</p>}
      </section>
      </>}
      <details className="appearance-settings">
        <summary>Appearance</summary>
        <fieldset>
          <legend>Theme colour</legend>
          <div className="background-options">
            {Object.entries(themes).map(([value, option]) => (
              <label key={value} className="background-option">
                <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => setTheme(value)} />
                <span className="background-swatch" style={{ background: option.color }} aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Background colour</legend>
          <div className="background-options">
            {Object.entries(backgrounds).map(([value, option]) => (
              <label key={value} className="background-option">
                <input type="radio" name="background" value={value} checked={background === value} onChange={() => setBackground(value)} />
                <span className="background-swatch" style={{ background: option.color }} aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </details>
      <footer>Tasks stay in this browser · Load points are a planning aid.</footer>
    </main>
  )
}

export default App














