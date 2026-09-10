import { useEffect, useState } from 'react'
import './App.css'
import Calendar from './Calendar'
import BottomNav from './BottomNav'
import AICompanion from './AICompanion'
import Profile from './Profile'
import Planner from './Planner'
import { GoogleGenAI } from '@google/genai';

import { dateKey, parseDate, validDate, tasksForDay } from './planning'

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

function evaluateUserStatus(userState) {
  const { energyLevel, upcomingTasks } = userState

  if (energyLevel === 'Stressed') {
    return {
      recommendation: "You're feeling stressed today. Let's take things slow—how about scheduling a longer break?",
      action: 'check_schedule',
      tasks: upcomingTasks,
    }
  }

  if (energyLevel === 'Anxious') {
    return {
      recommendation: "Anxiety can feel really overwhelming. Would you like to lighten your load or take a mindful pause?",
      action: 'check_schedule',
      tasks: upcomingTasks,
    }
  }

  if (energyLevel === 'Okay') {
    return {
      recommendation: "You're cruising at an okay pace. A short break or some light activity might feel nice soon!",
      action: 'check_schedule',
      tasks: upcomingTasks,
    }
  }

  if (energyLevel === 'Good' || energyLevel === 'Great') {
    return {
      recommendation: "You're radiating good energy today! Keep up the great balance.",
      action: 'continue',
      tasks: upcomingTasks,
    }
  }

  return {
    recommendation: "Keeping an eye on your energy—you're doing great!",
    action: 'continue',
    tasks: upcomingTasks,
  }
}

function processScheduleCheck(tasks) {
  const hasTooManyTasks = tasks && tasks.length > 3

  if (hasTooManyTasks) {
    return {
      suggestion: "Your schedule looks quite packed today. Want to shuffle a few things around so you don't burn out?",
      nextStep: "Monitor user's status & energy",
    }
  }

  return {
    suggestion: "Your schedule is looking balanced and manageable.",
    nextStep: "Monitor user's status & energy",
  }
}

function suggestAIAdjustment(tasks, selectedDate, dailyCapacity, today) {
  if (selectedDate < today) return null

  const currentTasks = tasksForDay(tasks, selectedDate)
  const totalLoad = currentTasks.reduce((sum, task) => sum + Number(task.points), 0)

  if (totalLoad <= dailyCapacity) return null

  const flexibleTasks = currentTasks.filter(task => Number(task.points) < 3)
  if (flexibleTasks.length === 0) return null

  const candidate = [...flexibleTasks].sort(
    (a, b) => Number(a.points) - Number(b.points)
  )[0]

  const remainingTasks = currentTasks.filter(task => task.id !== candidate.id)
  const sourceAfter = remainingTasks.reduce(
    (sum, task) => sum + Number(task.points),
    0
  )

  for (let i = 1; i <= 7; i++) {
    const destinationDate = parseDate(selectedDate)
    destinationDate.setDate(destinationDate.getDate() + i)

    const destination = dateKey(destinationDate)
    const destinationTasks = tasksForDay(tasks, destination)
    const destinationBefore = destinationTasks.reduce(
      (sum, task) => sum + Number(task.points),
      0
    )
    const destinationAfter = destinationBefore + Number(candidate.points)

    if (destinationAfter <= dailyCapacity) {
      return {
        task: candidate,
        destination,
        sourceBefore: totalLoad,
        sourceAfter,
        destinationBefore,
        destinationAfter,
        remaining: Math.max(0, sourceAfter - dailyCapacity),
      }
    }
  }

  return null
}

function App() {
  const [page, setPage] = useState('dashboard')

  function navigate(nextPage) {
    setPage(nextPage)
    window.scrollTo(0, 0)
  }

  const today = dateKey(new Date())

  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedMood, setSelectedMood] = useState('Good')

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
              categories.some(c => c.name === task.category) &&
              [1, 2, 3].includes(Number(task.points))
          )
          .map(task => ({
            ...task,
            points: Number(task.points),
            date: validDate(task.date) ? task.date : today,
            startTime: task.startTime || '09:00',
            endTime: task.endTime || '10:00',
          }))
        : []

      if (localStorage.getItem('timo-examples-v1') === 'added') {
        return existing
      }

      const tomorrowDate = parseDate(today)
      tomorrowDate.setDate(tomorrowDate.getDate() + 1)
      const tomorrow = dateKey(tomorrowDate)

      const examples = [
        {
          id: 'example-v1-1',
          name: 'Read chapter 3',
          category: 'Academic',
          points: 2,
          startTime: '09:00',
          endTime: '10:00',
          date: today,
        },
        {
          id: 'example-v1-2',
          name: 'Finish assignment draft',
          category: 'Academic',
          points: 3,
          startTime: '10:00',
          endTime: '12:00',
          date: today,
        },
        {
          id: 'example-v1-3',
          name: 'Afternoon cafe shift',
          category: 'Work',
          points: 3,
          startTime: '14:00',
          endTime: '17:00',
          date: today,
        },
        {
          id: 'example-v1-4',
          name: 'Catch up with a friend',
          category: 'Social',
          points: 1,
          startTime: '18:00',
          endTime: '19:00',
          date: today,
        },
        {
          id: 'example-v1-5',
          name: 'Review lecture notes',
          category: 'Academic',
          points: 2,
          startTime: '09:00',
          endTime: '10:00',
          date: tomorrow,
        },
        {
          id: 'example-v1-6',
          name: 'Study group catch-up',
          category: 'Social',
          points: 2,
          startTime: '15:00',
          endTime: '17:00',
          date: tomorrow,
        },
      ]

      return [
        ...existing,
        ...examples.filter(
          example => !existing.some(task => task.id === example.id)
        ),
      ]
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('timo-tasks', JSON.stringify(tasks))

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

  //-----BREAK DOWN CONTENT-------
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false)
  const [pdfBreakdownItems, setPdfBreakdownItems] = useState([])
  const [pdfDeadline, setPdfDeadline] = useState('')

  async function handlePdfUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    setIsAnalyzingPdf(true)
    setMessage(`Scanning and analyzing ${file.name} with Gemini...`)

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })

      // Convert file to base64 inline data for Gemini
      const filePart = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({
            inlineData: {
              data: reader.result.split(',')[1],
              mimeType: file.type || 'application/pdf'
            }
          })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const prompt = `Analyze this assignment or syllabus document. Extract any stated submission deadline or due date (format it strictly as YYYY-MM-DD if found, otherwise return empty string ""), and break the assignment down into 2 to 4 manageable micro-tasks. 
      Return ONLY a valid JSON object with fields: "deadline" (string) and "tasks" (array of objects with "name" (string) and "points" (number: 1, 2, or 3)).`

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [filePart, prompt],
      })

      const rawText = response.text.trim()
      const jsonString = rawText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '')
      const parsedData = JSON.parse(jsonString)

      const breakdown = parsedData.tasks || []
      const extractedDeadline = parsedData.deadline ? parsedData.deadline : selectedDate

      const formattedItems = breakdown.map((item, index) => ({
        id: `sub-${index + 1}`,
        name: item.name,
        category: category,
        points: Number(item.points) || 2,
        selected: true
      }))

      setPdfBreakdownItems(formattedItems)
      setPdfDeadline(extractedDeadline)
      setMessage(`PDF analyzed by Gemini! Deadline found: ${extractedDeadline}`)
    } catch (error) {
      console.error(error)
      setPdfBreakdownItems([
        { id: 'sub-1', name: `Research & outline for ${file.name}`, category: category, points: 2, selected: true },
        { id: 'sub-2', name: `Draft core sections of ${file.name}`, category: category, points: 3, selected: true },
        { id: 'sub-3', name: `Review and finalize ${file.name}`, category: category, points: 1, selected: true }
      ])
      setPdfDeadline(selectedDate)
      setMessage('Analyzed with fallback template. Review tasks below.')
    } finally {
      setIsAnalyzingPdf(false)
    }
  }

  function togglePdfItem(id) {
    setPdfBreakdownItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item))
  }

  function addPdfBreakdownTasks() {
    const selectedItems = pdfBreakdownItems.filter(item => item.selected)
    if (selectedItems.length === 0) {
      setMessage('Please select at least one task to add.')
      return
    }

    const startDateObj = parseDate(selectedDate)

    const newTasks = selectedItems.map((item, index) => {
      const targetDateObj = new Date(startDateObj)
      targetDateObj.setDate(targetDateObj.getDate() + index)
      const targetDateKey = dateKey(targetDateObj)

      const hours = 9 + (index * 2) % 8
      const formattedStart = `${String(hours).padStart(2, '0')}:00`
      const formattedEnd = `${String(hours + 1).padStart(2, '0')}:00`

      return {
        id: crypto.randomUUID(),
        name: item.name,
        category: category,
        date: targetDateKey,
        points: item.points,
        startTime: formattedStart,
        endTime: formattedEnd,
        deadline: pdfDeadline || selectedDate,
        fixed: false,
        done: false
      }
    })

    saveTasks([...tasks, ...newTasks])
    setPdfBreakdownItems([])
    setMessage(`Smart-scheduled ${newTasks.length} micro-tasks across consecutive days!`)
    navigate('dashboard')
  }

  const [taskName, setTaskName] = useState('')
  const [category, setCategory] = useState('Academic')
  const [effort, setEffort] = useState('1')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [deadline, setDeadline] = useState('')
  const [fixed, setFixed] = useState(false)
  const [editingId, setEditingId] = useState(null)

  function addTask(event) {
    event.preventDefault()

    const name = taskName.trim()

    if (!name) {
      setMessage('Please enter a task name.')
      return
    }

    if (startTime >= endTime) {
      setMessage('End time must be after start time.')
      return
    }

    saveTasks([
      ...tasks,
      {
        id: crypto.randomUUID(),
        name,
        category,
        date: selectedDate,
        points: Number(effort),
        startTime,
        endTime,
        deadline,
        fixed,
      },
    ])

    setTaskName('')
    setStartTime('09:00')
    setEndTime('10:00')
    setDeadline('')
    setFixed(false)
    setMessage(`${name} added.`)

    navigate('dashboard')
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

  const suggestion = suggestAIAdjustment(
    tasks,
    selectedDate,
    dailyCapacity,
    today
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

  const [aiRecommendation, setAiRecommendation] = useState(null)
  const [showFlowchartWarning, setShowFlowchartWarning] = useState(false)

  useEffect(() => {
    const totalLoad = dayTasks.reduce((sum, task) => sum + Number(task.points), 0)
    const overload = Math.max(0, totalLoad - dailyCapacity)

    if (overload > 0) {
      const userState = {
        mentalFatigue: dayTasks.length > 3 || selectedMood === 'Stressed' || selectedMood === 'Anxious',
        energyLevel: selectedMood,
        upcomingTasks: dayTasks,
      }

      const evaluation = evaluateUserStatus(userState)
      const scheduleCheck = processScheduleCheck(userState.upcomingTasks)

      if (evaluation.recommendation) {
        setAiRecommendation(evaluation.recommendation)
        setShowFlowchartWarning(true)
      } else if (scheduleCheck.suggestion) {
        setAiRecommendation(scheduleCheck.suggestion)
        setShowFlowchartWarning(true)
      } else {
        setShowFlowchartWarning(false)
      }
    } else {
      setShowFlowchartWarning(false)
    }
  }, [selectedMood, dayTasks, dailyCapacity])

  function saveTasks(nextTasks) {
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
          ✨ AI Assistant
        </span>
      </header>

      {page === 'calendar' && (
        <>
          <div className="intro">
            <h1>Pick a day</h1>
            <p>Tap a date to see its load and tasks.</p>
          </div>

          <Calendar
            selectedDate={selectedDate}
            today={today}
            tasks={tasks}
            onSelect={day => {
              setSelectedDate(day)
              setMessage('')
              setShowSuggestions(false)
              navigate('dashboard')
            }}
          />
        </>
      )}

      {page === 'companion' && <AICompanion />}

      {page === 'profile' && <Profile />}

      {page === 'add-task' && (
        <section className="task-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{editingId ? "Edit task" : "Add a little task"}</h1>
            <button type="button" className="back-button" onClick={() => navigate("dashboard")}>Cancel</button>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>Planning for {date}</p>

          {!editingId && (
            <div style={{ 
              padding: '1rem 0', 
              marginBottom: '0.5rem', 
              borderBottom: '1px solid var(--border, #e2d9ed)' 
            }}>
              <div style={{ 
                border: '1.5px dashed var(--accent, #d8c4ef)', 
                padding: '1rem', 
                borderRadius: '12px',
                background: 'rgba(216, 196, 239, 0.08)'
              }}>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>✨</span> Got a heavy assignment PDF or syllabus?
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted, #666)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  Upload it here to preview, set your deadline, and break it into pieces across days.
                </p>

                <label style={{ display: 'inline-block', background: 'var(--accent, #d8c4ef)', color: 'var(--accent-dark, #5a3e7a)', padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  {isAnalyzingPdf ? 'Reading PDF...' : '📄 Upload Assignment PDF'}
                  <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handlePdfUpload} style={{ display: 'none' }} disabled={isAnalyzingPdf} />
                </label>

                {pdfBreakdownItems.length > 0 && (
                  <div style={{ marginTop: '1rem', background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>Review Breakdown & Target Deadline:</h4>
                    
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                      Target Deadline:
                      <input 
                        type="date" 
                        min={selectedDate}
                        value={pdfDeadline} 
                        onChange={e => setPdfDeadline(e.target.value)} 
                        style={{ display: 'block', marginTop: '0.2rem', padding: '0.4rem', width: '100%', borderRadius: '6px', border: '1px solid var(--border)' }} 
                      />
                    </label>

                    {pdfBreakdownItems.map(item => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={item.selected} onChange={() => togglePdfItem(item.id)} />
                        <span>{item.name} <strong>({item.points} pts)</strong></span>
                      </label>
                    ))}
                    
                    <button type="button" className="primary-button" style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.85rem', padding: '0.5rem' }} onClick={addPdfBreakdownTasks}>
                      ✨ Smart-Schedule Tasks Across Days
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <form className="task-form" onSubmit={addTask} style={{ marginTop: '1rem' }}>
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
            
            <label>
              Deadline (optional)
              <input type="date" min={selectedDate} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </label>

            <label className="fixed-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: '0.5rem 0 1rem 0' }}>
              <input type="checkbox" checked={fixed} onChange={e => setFixed(e.target.checked)} /> 
              Fixed commitment — keep this task on its planned day
            </label>

            <button className="primary-button" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              {editingId ? "Save changes" : "+ Add task"}
            </button>
          </form>

          <p className="helper" role="status">
            {message}
          </p>
        </section>
      )}

      {page === 'planner' && <Planner date={selectedDate} today={today} tasks={dayTasks} onDate={day => { setSelectedDate(day); setMessage(''); setShowSuggestions(false) }} onEdit={(task) => {/* handle edit if needed */}} onAdd={() => navigate('add-task')} onToggle={(task) => { saveTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t)); setMessage(task.done ? 'Marked unfinished.' : 'Task completed.') }} />}

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
                How are you feeling today?
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
                Your energy sets your daily capacity: Stressed (5 pts) to Great (12 pts).
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

              <div className="load-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
              onClick={() => {
                setMessage('')
                navigate('add-task')
              }}
              style={{ width: '100%' }}
            >
              + Add task
            </button>
          </nav>

          <p className="selected-day" aria-live="polite">
            {selectedDate === today ? 'Today' : date} ·{' '}
            {dayTasks.length} tasks
          </p>

          <section
            className="task-section"
            aria-labelledby="tasks-title"
          >
            <h2 id="tasks-title">
              Tasks for{' '}
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
                {dayTasks.map(task => {
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
                          <strong>{task.name}</strong>
                          <span className="effort-badge" style={{ background: badgeBg, color: badgeColor }}>
                            {effortLabel}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' }}>
                          🕒 {task.startTime} – {task.endTime} · {task.category} · {points} {points === 1 ? 'point' : 'points'}
                        </p>
                      </div>

                      <button type="button" className="remove-task" onClick={() => startTrade(task)} aria-label={`Reschedule ${task.name}`}>Reschedule</button>
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
                              / {dailyCapacity} points after
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

      <BottomNav page={page} navigate={navigate} />
    </main>
  )
}

export default App