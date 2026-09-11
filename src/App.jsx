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

async function suggestAIAdjustment(tasks, selectedDate, dailyCapacity, today, skippedTaskIds = []) {
  if (selectedDate < today) return null

  const currentTasks = tasksForDay(tasks, selectedDate)
  const totalLoad = currentTasks.reduce((sum, task) => sum + Number(task.points), 0)

  if (totalLoad <= dailyCapacity) return null

  const eligibleTasks = currentTasks.filter(t => !skippedTaskIds.includes(t.id))
  if (eligibleTasks.length === 0) return null

  const upcomingContext = []
  for (let i = 1; i <= 7; i++) {
    const d = parseDate(selectedDate)
    d.setDate(d.getDate() + i)
    const dKey = dateKey(d)
    const dTasks = tasksForDay(tasks, dKey)
    const dLoad = dTasks.reduce((sum, task) => sum + Number(task.points), 0)
    upcomingContext.push({ date: dKey, load: dLoad, capacity: dailyCapacity })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })

    const prompt = `You are Timo, an empathetic AI productivity companion. 
    The user is overloaded on ${selectedDate}. 
    Available tasks to choose from on this day: ${JSON.stringify(eligibleTasks)}
    Total load: ${totalLoad} points. Daily capacity limit: ${dailyCapacity} points.
    Upcoming available days load profile over next 7 days: ${JSON.stringify(upcomingContext)}

    Choose ONE flexible task from the available tasks list to move to one of the upcoming days where it won't cause an overload.
    Return ONLY a valid JSON object with:
    - "taskId": string (the id of the task to move)
    - "destinationDate": string (YYYY-MM-DD format of the target day)
    - "reason": string (a short friendly sentence explaining why this helps)`

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [prompt],
    })

    const rawText = response.text.trim()
    const jsonString = rawText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '')
    const result = JSON.parse(jsonString)

    const candidate = currentTasks.find(t => t.id === result.taskId)
    if (!candidate) return null

    const destination = result.destinationDate
    const destinationTasks = tasksForDay(tasks, destination)
    const destinationBefore = destinationTasks.reduce((sum, task) => sum + Number(task.points), 0)
    const destinationAfter = destinationBefore + Number(candidate.points)

    const remainingTasks = currentTasks.filter(task => task.id !== candidate.id)
    const sourceAfter = remainingTasks.reduce((sum, task) => sum + Number(task.points), 0)

    return {
      task: candidate,
      destination,
      sourceBefore: totalLoad,
      sourceAfter,
      destinationBefore,
      destinationAfter,
      remaining: Math.max(0, sourceAfter - dailyCapacity),
      aiReason: result.reason
    }
  } catch (error) {
    console.error("Gemini suggestion error, falling back:", error)
    return null
  }
}

function App() {
  const [page, setPage] = useState('planner')

  function navigate(nextPage) {
    setPage(nextPage)
    window.scrollTo(0, 0)
  }

  const today = dateKey(new Date())

  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedMood, setSelectedMood] = useState('Good')
  const [skippedTaskIds, setSkippedTaskIds] = useState([])
  const [companionInitialMessage, setCompanionInitialMessage] = useState('')

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

  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false)
  const [fileBreakdownItems, setFileBreakdownItems] = useState([])
  const [fileDeadline, setFileDeadline] = useState('')

  async function handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    setIsAnalyzingFile(true)
    setMessage(`Scanning and analyzing ${file.name} with Gemini...`)

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })

      const filePart = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({
            inlineData: {
              data: reader.result.split(',')[1],
              mimeType: file.type || (file.name.endsWith('.txt') ? 'text/plain' : 'application/pdf')
            }
          })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const prompt = `Analyze this uploaded assignment document, syllabus, image, or notes sheet. Extract any stated submission deadline or due date (format strictly as YYYY-MM-DD if found, otherwise return empty string ""), and break the content down into 2 to 4 manageable micro-tasks. 
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

      setFileBreakdownItems(formattedItems)
      setFileDeadline(extractedDeadline)
      setMessage(`File analyzed by Gemini! Deadline found: ${extractedDeadline || 'None specified'}`)
    } catch (error) {
      console.error(error)
      setFileBreakdownItems([
        { id: 'sub-1', name: `Review & outline ${file.name}`, category: category, points: 2, selected: true },
        { id: 'sub-2', name: `Complete core work for ${file.name}`, category: category, points: 3, selected: true },
        { id: 'sub-3', name: `Final review and submit`, category: category, points: 1, selected: true }
      ])
      setFileDeadline(selectedDate)
      setMessage('Analyzed with fallback template. Review tasks below.')
    } finally {
      setIsAnalyzingFile(false)
    }
  }

  function toggleFileItem(id) {
    setFileBreakdownItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item))
  }

  function addFileBreakdownTasks() {
    const selectedItems = fileBreakdownItems.filter(item => item.selected)
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
        deadline: fileDeadline || selectedDate,
        fixed: false,
        done: false
      }
    })

    saveTasks([...tasks, ...newTasks])
    setFileBreakdownItems([])
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
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  const totalLoad = loads.reduce(
    (total, load) => total + load.points,
    0
  )

  const overload = Math.max(0, totalLoad - dailyCapacity)

  function acceptSuggestion() {
    if (!aiSuggestion) return

    saveTasks(
      tasks.map(task =>
        task.id === aiSuggestion.task.id
          ? { ...task, date: aiSuggestion.destination }
          : task
      )
    )

    setMessage(
      `${aiSuggestion.task.name} moved to ${parseDate(
        aiSuggestion.destination
      ).toLocaleDateString('en', { dateStyle: 'medium' })}.`
    )

    setShowSuggestions(false)
  }

  async function handleSkipSuggestion() {
    if (!aiSuggestion) return
    const nextSkipped = [...skippedTaskIds, aiSuggestion.task.id]
    setSkippedTaskIds(nextSkipped)

    setLoadingSuggestion(true)
    const res = await suggestAIAdjustment(tasks, selectedDate, dailyCapacity, today, nextSkipped)
    setAiSuggestion(res)
    setLoadingSuggestion(false)
  }

  const date = parseDate(selectedDate).toLocaleDateString('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const [message, setMessage] = useState('')

  const [aiRecommendation, setAiRecommendation] = useState(null)
  const [showFlowchartWarning, setShowFlowchartWarning] = useState(false)

  useEffect(() => {
    async function fetchAiInsight() {
      const currentLoad = dayTasks.reduce((sum, task) => sum + Number(task.points), 0)
      const currentOverload = Math.max(0, currentLoad - dailyCapacity)

      if (currentOverload > 0) {
        try {
          const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
          const prompt = `You are Timo, an empathetic AI productivity companion. 
The user's mood is "${selectedMood}" and they are overloaded today with ${currentLoad} points against a capacity of ${dailyCapacity} points. Their tasks are: ${JSON.stringify(dayTasks.map(t => t.name))}.
Give a short, warm, comforting insight (1-2 sentences max) and explicitly recommend a quick, refreshing break activity (such as stepping out for a walk, grabbing a warm coffee, doing a 5-minute breathing exercise, or listening to a favorite song) to help them reset. Make it a fresh perspective.`

          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: [prompt],
          })

          const text = response.text.trim()
          setAiRecommendation(text)
          setShowFlowchartWarning(true)
        } catch (error) {
          console.error("Gemini insight error:", error)
          setAiRecommendation("Your schedule looks quite packed today. Want to shuffle a few things around so you don't burn out?")
          setShowFlowchartWarning(true)
        }
      } else {
        setShowFlowchartWarning(false)
      }
    }

    fetchAiInsight()
  }, [selectedDate, dailyCapacity])

  function saveTasks(nextTasks) {
    setTasks(nextTasks)

    try {
      localStorage.setItem('timo-tasks', JSON.stringify(nextTasks))
    } catch {
      // Storage fallback handled silently
    }
  }

  const totalTasksCount = dayTasks.length
  const completedTasksCount = dayTasks.filter(t => t.done).length
  const completionPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0
  const completionDonutBackground = `conic-gradient(var(--accent-dark) 0% ${completionPercentage}%, var(--border) ${completionPercentage}% 100%)`

  return (
    <main
      className="dashboard"
      data-theme="purple"
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
              setAiSuggestion(null)
              setSkippedTaskIds([])
              navigate('planner')
            }}
          />
        </>
      )}

      {page === 'companion' && <AICompanion initialMessage={companionInitialMessage} />}

      {page === 'profile' && <Profile />}

      {page === 'add-task' && (
        <section className="task-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{editingId ? "Edit task" : "Add a little task"}</h1>
            <button type="button" className="back-button" onClick={() => navigate("planner")}>Cancel</button>
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
                  <span>✨</span> Upload any document, syllabus, photo, or notes
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted, #666)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  Upload PDFs, images (screenshots), Word docs, or text files to auto-extract deadlines and break them into micro-tasks.
                </p>

                <label style={{ display: 'inline-block', background: 'var(--accent, #d8c4ef)', color: 'var(--accent-dark, #5a3e7a)', padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  {isAnalyzingFile ? 'Analyzing file...' : 'Upload File or Image'}
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx,image/*,.csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={isAnalyzingFile}
                  />
                </label>

                {fileBreakdownItems.length > 0 && (
                  <div style={{ marginTop: '1rem', background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>Review Breakdown & Target Deadline:</h4>

                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                      Target Deadline:
                      <input
                        type="date"
                        min={selectedDate}
                        value={fileDeadline}
                        onChange={e => setFileDeadline(e.target.value)}
                        style={{ display: 'block', marginTop: '0.2rem', padding: '0.4rem', width: '100%', borderRadius: '6px', border: '1px solid var(--border)' }}
                      />
                    </label>

                    {fileBreakdownItems.map(item => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={item.selected} onChange={() => toggleFileItem(item.id)} />
                        <span>{item.name} <strong>({item.points} pts)</strong></span>
                      </label>
                    ))}

                    <button type="button" className="primary-button" style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.85rem', padding: '0.5rem' }} onClick={addFileBreakdownTasks}>
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

      {page === 'planner' && (
        <Planner
          date={selectedDate}
          today={today}
          tasks={tasks}
          navigate={navigate} // ✅ Add this line here
          onDate={day => {
            setSelectedDate(day);
            setMessage('');
            setShowSuggestions(false);
            setAiSuggestion(null);
            setSkippedTaskIds([]);
          }}
          onEdit={(task) => {
            setSelectedDate(task.date)
            navigate('add-task')
          }}
          onRemove={(task) => {
            saveTasks(tasks.filter(item => item.id !== task.id))
            setMessage(`${task.name} removed.`)
          }}
          onAdd={() => navigate('add-task')}
          onToggle={(task) => {
            saveTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
            setMessage(task.done ? 'Marked unfinished.' : 'Task completed.');
          }}
          showSuggestions={showSuggestions}
          setShowSuggestions={async (val) => {
            setShowSuggestions(val)
            if (val && !aiSuggestion) {
              setLoadingSuggestion(true)
              const res = await suggestAIAdjustment(tasks, selectedDate, dailyCapacity, today, skippedTaskIds)
              setAiSuggestion(res)
              setLoadingSuggestion(false)
            }
          }}
          suggestion={aiSuggestion}
          acceptSuggestion={acceptSuggestion}
          onSkipSuggestion={handleSkipSuggestion}
          overload={overload}
          loadingSuggestion={loadingSuggestion}
          currentPoints={totalLoad}
          maxCapacity={dailyCapacity}
          selectedMood={selectedMood}
          setSelectedMood={setSelectedMood}
          moods={moods}
          aiRecommendation={aiRecommendation}
          showFlowchartWarning={showFlowchartWarning}
          onOpenCompanion={() => {
            setCompanionInitialMessage("Hey Timo, I saw your insight about my workload today. Can we talk more about it?")
            navigate('companion')
          }}
        />
      )}

      {page === 'dashboard' && (
        <>
          <div className="intro">
            <p className="eyebrow">Daily Summary • {date}</p>
            <h1>Your daily snapshot.</h1>
            <p>Review your energy and progress below.</p>
          </div>

          <section
            className="capacity-card"
            aria-labelledby="capacity-title"
          >
            <div className="card-heading">
              <h2 id="capacity-title">Today's Progress</h2>

              <span
                className="capacity-label"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-dark)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: '1px solid var(--accent-dark)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  letterSpacing: '-0.2px',
                }}
              >
                {completedTasksCount} of {totalTasksCount} completed
              </span>
            </div>

            <div
              className="capacity-donut"
              style={{ background: completionDonutBackground }}
              role="img"
              aria-label={`${completedTasksCount} tasks done out of ${totalTasksCount} total tasks today.`}
            >
              <div className="donut-center" aria-hidden="true">
                <div className="capacity-number">
                  {completedTasksCount}
                  <span> / {totalTasksCount}</span>
                </div>

                <p className="capacity-caption">
                  tasks done
                </p>
              </div>
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
        </>
      )}

      <BottomNav page={page} navigate={navigate} />
    </main>
  )
}

export default App