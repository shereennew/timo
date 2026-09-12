import { useEffect, useState } from 'react'
import './App.css'
import Calendar from './Calendar'
import BottomNav from './BottomNav'
import AICompanion from './AICompanion'
import Profile from './Profile'
import Planner from './Planner'
import { dateKey, parseDate, validDate, tasksForDay } from './planning'
import { analyzeFileWithAI, suggestAIAdjustment, getDailyInsight } from './aiAgent'
//import { getToken, onMessage } from 'firebase/messaging';
//import { messaging } from './firebase';

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

const healthData = {
  steps: 6240,
  sleepHours: 7.2,
  exerciseMinutes: 42,
}

function App() {
  const [page, setPage] = useState('planner')

  function navigate(nextPage, editing = false) {
    if (nextPage === 'add-task') {
      setMessage('')
      if (!editing) {
        setEditingId(null); setTaskName(''); setCategory('Academic'); setEffort('1')
        setStartTime('09:00'); setEndTime('10:00'); setDeadline(''); setFixed(false)
      }
    }
    setPage(nextPage)
    window.scrollTo(0, 0)
  }

  const today = dateKey(new Date())

  const [selectedDate, setSelectedDate] = useState(today)
  const [dailyMoods, setDailyMoods] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('timo-daily-moods') || '{}'); return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {} } catch { return {} }
  })
  const selectedMood = moods.some(m => m.label === dailyMoods[selectedDate]) ? dailyMoods[selectedDate] : 'Okay'
  function setSelectedMood(value) {
    setDailyMoods(previous => ({ ...previous, [selectedDate]: value }))
  }


  useEffect(() => {
    try { localStorage.setItem('timo-daily-moods', JSON.stringify(dailyMoods)) } catch { /* Keep the current session usable. */ }
  }, [dailyMoods])
  const [skippedTaskIds, setSkippedTaskIds] = useState([])
  const [companionInitialMessage, setCompanionInitialMessage] = useState('')
  const [companionMessages, setCompanionMessages] = useState([
    { role: 'assistant', content: "Hey there! 🌿 I'm Timo. What are we working on today? Feel free to drop a question, paste some text, or just tell me what's on your mind!" }
  ])

  // Request notification permissions and listen for foreground FCM messages
  /*useEffect(() => {
    async function requestNotificationPermission() {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          const token = await getToken(messaging, { 
            vapidKey: 'YOUR_PUBLIC_VAPID_KEY_FROM_FIREBASE' 
          });
          console.log('FCM Token:', token);
        } else {
          console.log('Unable to get permission to notify.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    }

    requestNotificationPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      alert(`Reminder: ${payload.notification?.title || 'Notification'} - ${payload.notification?.body || ''}`);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [])*/

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fileName = params.get('file')

    if (fileName) {
      setCompanionMessages(prev => [
        ...prev,
        { role: 'user', content: `Can you help me review this file: ${fileName}?` },
        { 
          role: 'assistant', 
          content: `✨ I've received "${fileName}" from your student portal! Here is a recommended breakdown:\n\n• Read & review ${fileName} (2 pts)\n• Draft key notes & summary (2 pts)\n• Practice review questions (1 pt)\n\nWould you like me to add these to your schedule? Just let me know!` 
        }
      ])

      navigate('companion')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const dayTasks = tasksForDay(tasks, selectedDate)

  // Energy calculations
  const plannedPoints = dayTasks.reduce((sum, t) => sum + Number(t.points), 0)
  const completedPoints = dayTasks
    .filter(t => t.done)
    .reduce((sum, t) => sum + Number(t.points), 0)

  const remainingEnergy = Math.max(0, dailyCapacity - plannedPoints + completedPoints)
  const fillPercentage = Math.min(100, (remainingEnergy / dailyCapacity) * 100)
  const isOverloaded = plannedPoints > dailyCapacity
  const barColor = isOverloaded ? '#e53e3e' : fillPercentage < 25 ? '#dd6b20' : '#28a745'

  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false)
  const [fileBreakdownItems, setFileBreakdownItems] = useState([])
  const [fileDeadline, setFileDeadline] = useState('')

  async function handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    setIsAnalyzingFile(true)
    setMessage(`Scanning and analyzing ${file.name} with Gemini...`)

    try {
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

      const parsedData = await analyzeFileWithAI(filePart, category, selectedDate)

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

    if (!validDate(selectedDate) || (deadline && deadline < selectedDate)) {
      setMessage('Choose a planned date on or before the deadline.')
      return
    }
    const changes = { name, category, date: selectedDate, points: Number(effort), startTime, endTime, deadline, fixed }
    saveTasks(editingId
      ? tasks.map(task => task.id === editingId ? { ...task, ...changes } : task)
      : [...tasks, { id: crypto.randomUUID(), ...changes, done: false }])
    const wasEditing = Boolean(editingId)
    setEditingId(null)

    setTaskName('')
    setStartTime('09:00')
    setEndTime('10:00')
    setDeadline('')
    setFixed(false)
    setMessage(`${name} ${wasEditing ? 'updated' : 'added'}.`)

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
    try { const saved = localStorage.getItem('timo-theme'); return Object.hasOwn(themes, saved) ? saved : 'purple' } catch { return 'purple' }
  })
  useEffect(() => {
    try { localStorage.setItem('timo-theme', theme) } catch { /* Keep the current session usable. */ }
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

  const handleBatchTasksCreated = (tasksList) => {
    const formattedNewTasks = tasksList.map(taskArgs => ({
      id: crypto.randomUUID(),
      name: taskArgs.name,
      category: taskArgs.category || 'Academic',
      date: taskArgs.date || today,
      points: Number(taskArgs.points) || 2,
      startTime: taskArgs.startTime || '10:00',
      endTime: taskArgs.endTime || '11:00',
      fixed: false,
      done: false
    }))

    saveTasks([...tasks, ...formattedNewTasks])
  }

  function handleAddRelaxBreak(suggestion) {
    if (!suggestion) return;

    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');
    const startTime = `${currentH}:${currentM}`;

    const [startH, startM] = startTime.split(':').map(Number);
    const durationMins = suggestion.relaxDurationMinutes || 15;

    const totalStartMins = startH * 60 + startM;
    const totalEndMins = totalStartMins + durationMins;
    const endH = String(Math.floor(totalEndMins / 60) % 24).padStart(2, '0');
    const endM = String(totalEndMins % 60).padStart(2, '0');
    const endTime = `${endH}:${endM}`;

    const newRelaxTask = {
      id: crypto.randomUUID(),
      name: `🌿 ${suggestion.relaxTitle}`,
      category: 'Social',
      points: 1,
      date: selectedDate,
      startTime: startTime,
      endTime: endTime,
      done: false,
      fixed: false
    };

    const formatTime = (mins) => {
      const h = String(Math.floor(mins / 60) % 24).padStart(2, '0');
      const m = String(mins % 60).padStart(2, '0');
      return `${h}:${m}`;
    };

    const updatedTasks = [];

    tasks.forEach(t => {
      if (t.date === selectedDate && t.startTime && t.endTime) {
        const [tStartH, tStartM] = t.startTime.split(':').map(Number);
        const [tEndH, tEndM] = t.endTime.split(':').map(Number);
        const tStartMins = tStartH * 60 + tStartM;
        const tEndMins = tEndH * 60 + tEndM;

        // Check if the break splits right through this task (e.g. 14:00-17:00 and break starts at 14:13)
        if (tStartMins < totalStartMins && tEndMins > totalStartMins) {
          // Part 1: Before the break
          updatedTasks.push({
            ...t,
            endTime: startTime,
            points: Math.max(1, Math.round(t.points / 2))
          });

          // Part 2: After the break (pushed back by durationMins)
          const newPart2Start = totalEndMins;
          const newPart2End = tEndMins + durationMins;
          updatedTasks.push({
            ...t,
            id: crypto.randomUUID(),
            name: `${t.name} (Part 2)`,
            startTime: formatTime(newPart2Start),
            endTime: formatTime(newPart2End),
            points: Math.max(1, Math.floor(t.points / 2))
          });
        } else if (tStartMins >= totalStartMins) {
          // Task starts at or after break: shift forward completely
          updatedTasks.push({
            ...t,
            startTime: formatTime(tStartMins + durationMins),
            endTime: formatTime(tEndMins + durationMins)
          });
        } else {
          // Task is completely before the break: leave untouched
          updatedTasks.push(t);
        }
      } else {
        updatedTasks.push(t);
      }
    });

    saveTasks([...updatedTasks, newRelaxTask]);
    setShowSuggestions(false);
    setMessage(`Added break and split overlapping tasks cleanly.`);
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
        const text = await getDailyInsight(selectedMood, dayTasks, dailyCapacity)
        setAiRecommendation(text || "Your schedule looks quite packed today. Want to shuffle a few things around so you don't burn out?")
        setShowFlowchartWarning(true)
      } else {
        setShowFlowchartWarning(false)
      }
    }

    fetchAiInsight()
  }, [selectedDate, dailyCapacity, selectedMood, tasks.length])

  function saveTasks(nextTasks) {
    setTasks(nextTasks)

    try {
      localStorage.setItem('timo-tasks', JSON.stringify(nextTasks))
    } catch {
      // Storage fallback handled silently
    }
  }

  const [selectedHealthMetric, setSelectedHealthMetric] = useState(null)
  const [dashboardSlide, setDashboardSlide] = useState(0)

  const totalTasksCount = dayTasks.length
  const completedTasksCount = dayTasks.filter(t => t.done).length
  const completionPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0
  const completionDonutBackground = `conic-gradient(var(--accent-dark) 0% ${completionPercentage}%, var(--border) ${completionPercentage}% 100%)`

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
              setAiSuggestion(null)
              setSkippedTaskIds([])
              navigate('planner')
            }}
          />
        </>
      )}

      {page === 'companion' && (
        <AICompanion
          initialMessage={companionInitialMessage}
          messages={companionMessages}
          setMessages={setCompanionMessages}
          tasks={tasks}
          selectedDate={selectedDate}
          dailyCapacity={dailyCapacity}
          onBatchTasksCreated={handleBatchTasksCreated}
          onTaskCreated={(newTaskData) => {
            const newTask = {
              id: crypto.randomUUID(),
              name: newTaskData.name,
              category: newTaskData.category || 'Academic',
              points: Number(newTaskData.points) || 2,
              date: newTaskData.date || today,
              startTime: newTaskData.startTime || '09:00',
              endTime: newTaskData.endTime || '10:00',
              fixed: false,
              done: false
            }
            saveTasks([...tasks, newTask])
          }}
          onTaskDeleted={(taskId) => saveTasks(tasks.filter(t => t.id !== taskId))}
          onTaskUpdated={(updatedTask) =>
            saveTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t))
          }
        />
      )}
      
      {page === 'profile' && <Profile theme={theme} setTheme={setTheme} background={background} setBackground={setBackground} />}

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

            <label>Planned date<input type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></label>
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
          navigate={navigate}
          onDate={day => {
            setSelectedDate(day);
            setMessage('');
            setShowSuggestions(false);
            setAiSuggestion(null);
            setSkippedTaskIds([]);
          }}
          onEdit={(task) => {
            setSelectedDate(task.date)
            setEditingId(task.id)
            setTaskName(task.name)
            setCategory(task.category)
            setEffort(String(task.points))
            setStartTime(task.startTime || '')
            setEndTime(task.endTime || '')
            setDeadline(task.deadline || '')
            setFixed(Boolean(task.fixed))
            setMessage('')
            navigate('add-task', true)
          }}
          onRemove={(task) => {
            saveTasks(tasks.filter(item => item.id !== task.id))
            setMessage(`${task.name} removed.`)
          }}
          onAdd={() => {
            setEditingId(null); setTaskName(''); setCategory('Academic'); setEffort('1')
            setStartTime('09:00'); setEndTime('10:00'); setDeadline(''); setFixed(false)
            navigate('add-task')
          }}
          onAddRelaxBreak={handleAddRelaxBreak}
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
          remainingEnergy={remainingEnergy}
          fillPercentage={fillPercentage}
          barColor={barColor}
          isOverloaded={isOverloaded}
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
            <div className="dashboard-carousel" id="dashboard-carousel">
              <section className="dashboard-slide">
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

                <div
                  className="load-section"
                  style={{
                    marginTop: '1.5rem',
                    borderTop: '1px solid var(--border, #e2d9ed)',
                    paddingTop: '1rem'
                  }}
                  aria-labelledby="load-title"
                >
                  <div
                    className="section-heading"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <h3
                      id="load-title"
                      style={{ fontSize: '1rem', margin: 0 }}
                    >
                      Category Breakdown
                    </h3>

                    <span
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--muted, #666)'
                      }}
                    >
                      {totalLoad} pts planned
                    </span>
                  </div>

                  <div
                    className="load-list"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    {loads.map(load => (
                      <div
                        className="load-row"
                        key={load.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: 'rgba(255,255,255,0.5)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px'
                        }}
                      >
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

                        <div
                          className="load-info"
                          style={{ flex: 1 }}
                        >
                          <h4 style={{ margin: 0, fontSize: '0.9rem' }}>
                            {load.name}
                          </h4>

                          <p
                            style={{
                              margin: 0,
                              fontSize: '0.75rem',
                              color: '#666'
                            }}
                          >
                            {load.detail}
                          </p>
                        </div>

                        <strong style={{ fontSize: '0.9rem' }}>
                          {load.points}
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 'normal'
                            }}
                          >
                            {' '}pts
                          </span>
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="dashboard-slide health-slide">
                <div
                  className="health-card"
                  aria-labelledby="health-title"
                >
                  <div className="health-heading">
                    <div>
                      <h2 id="health-title">Health Today</h2>
                      <p>Simulated health data for prototype</p>
                    </div>

                    <div className="health-icon">💚</div>
                  </div>

                  <div className="health-metrics">
                    <button
                      type="button"
                      className={`health-metric ${selectedHealthMetric === 'steps' ? 'selected' : ''}`}
                      onClick={() => setSelectedHealthMetric('steps')}
                    >
                      <div className="health-metric-icon">🚶</div>
                      <strong>{healthData.steps.toLocaleString()}</strong>
                      <span>Steps</span>
                    </button>

                    <button
                      type="button"
                      className={`health-metric ${selectedHealthMetric === 'sleep' ? 'selected' : ''}`}
                      onClick={() => setSelectedHealthMetric('sleep')}
                    >
                      <div className="health-metric-icon">😴</div>
                      <strong>{healthData.sleepHours} hrs</strong>
                      <span>Sleep</span>
                    </button>

                    <button
                      type="button"
                      className={`health-metric ${selectedHealthMetric === 'exercise' ? 'selected' : ''}`}
                      onClick={() => setSelectedHealthMetric('exercise')}
                    >
                      <div className="health-metric-icon">🏃</div>
                      <strong>{healthData.exerciseMinutes} min</strong>
                      <span>Exercise</span>
                    </button>
                  </div>

                  {selectedHealthMetric && (
                    <div className='health-detail'>
                      {selectedHealthMetric === 'steps' && (
                        <>
                          <div className='health-detail-heading'>
                            <span>🚶</span>
                            <h3>Steps</h3>
                          </div>

                          <div className='health-detail-main'>
                            <strong>{healthData.steps.toLocaleString()}</strong>
                            <span>today</span>
                          </div>

                          <div className='health-detail-row'>
                            <span>Daily Goal</span>
                            <strong>8000</strong>
                          </div>

                          <div className='health-detail-row'>
                            <span>Progress</span>
                            <strong>{Math.round((healthData.steps / 8000) * 100)}%</strong>
                          </div>
                        </>
                      )}

                      {selectedHealthMetric === 'sleep' && (
                        <>
                          <div className='health-detail-heading'>
                            <span>😴</span>
                            <h3>Sleep</h3>
                          </div>

                          <div className='health-detail-main'>
                            <strong>{healthData.sleepHours} hours</strong>
                            <span>last night's sleep</span>
                          </div>

                          <div className='health-detail-row'>
                            <span>Sleep Goal</span>
                            <strong>8 hours</strong>
                          </div>
                        </>
                      )}

                      {selectedHealthMetric === 'exercise' && (
                        <>
                          <div className="health-detail-heading">
                            <span>🏃</span>
                            <h3>Exercise</h3>
                          </div>

                          <div className="health-detail-main">
                            <strong>{healthData.exerciseMinutes} minutes</strong>
                            <span>today</span>
                          </div>

                          <div className="health-detail-row">
                            <span>Walking</span>
                            <strong>25 min</strong>
                          </div>

                          <div className="health-detail-row">
                            <span>Other activity</span>
                            <strong>17 min</strong>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="health-sync-button"
                    onClick={() => alert('Health data synced successfully!')}
                  >
                    <span>🔄</span>
                    Sync Health Data
                  </button>
                </div>
              </section>
            </div>

            <div className='carousel-controls'>

              <button
                type="button"
                className='carousel-arrow'
                onClick={() => {
                  const nextSlide = Math.max(0, dashboardSlide - 1)
                  setDashboardSlide(nextSlide)

                  document.getElementById('dashboard-carousel')?.scrollTo({
                    left: nextSlide * document.getElementById('dashboard-carousel').clientWidth,
                    behavior: 'smooth',
                  })
                }}
                aria-label='Previous card'
                disabled={dashboardSlide === 0}
              >
                ‹
              </button>

              <div className='carousel-dots' aria-label='Dashboard cards'>
                <button
                  type="button"
                  className={`carousel-dot ${dashboardSlide === 0 ? 'active' : ''}`}
                  onClick={() => {
                    setDashboardSlide(0)
                    document.getElementById('dashboard-carousel')?.scrollTo({
                      left: 0,
                      behavior: 'smooth',
                    })
                  }}
                  aria-label="Today's Progress"
                />

                <button
                  type="button"
                  className={`carousel-dot ${dashboardSlide === 1 ? 'active' : ''}`}
                  onClick={() => {
                    const carousel = document.getElementById('dashboard-carousel')

                    setDashboardSlide(1)

                    carousel?.scrollTo({
                      left: carousel.clientWidth,
                      behavior: 'smooth',
                    })
                  }}
                  aria-label="Health Today"
                />
              </div>

              <button
                type="button"
                className="carousel-arrow"
                onClick={() => {
                  const carousel = document.getElementById('dashboard-carousel')
                  const nextSlide = Math.min(1, dashboardSlide + 1)

                  setDashboardSlide(nextSlide)

                  carousel?.scrollTo({
                    left: nextSlide * carousel.clientWidth,
                    behavior: 'smooth',
                  })
                }}
                aria-label="Next card"
                disabled={dashboardSlide === 1}
              >
                ›
              </button>
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