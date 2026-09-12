import { useState, useRef } from 'react'
import { sendAgentMessage } from './aiAgent'
import { extractText, resizeImage } from './extractText'
import { summarizeSchedule } from './planning'

// ---------- Helpers ----------

const MAX_FILES = 10

function isTaskReasonable(task) {
  if (!task.title || task.title.length < 8) return false
  if (!task.points || ![1, 2, 3].includes(task.points)) return false

  const lower = task.title.toLowerCase()
  const badPatterns = [
    /^(read|look at|check)\b/i,
    /^exercise \d+$/i,
    /\b\d+\s*(min|minutes)\b.*\b(only|just)\b/i,
  ]
  if (badPatterns.some(p => p.test(lower))) return false

  return true
}

function sanitizePlannerOptions(planner) {
  if (!planner?.plannerOptions) return planner

  planner.plannerOptions = planner.plannerOptions
    .map(opt => ({
      ...opt,
      tasks: (opt.tasks || []).filter(isTaskReasonable)
    }))
    .filter(opt => opt.tasks.length > 0)

  return planner
}

function parsePlannerBlock(rawText) {
  if (!rawText) return { text: '', planner: null }

  const fence = /```json\s*([\s\S]*?)\s*```/i
  const match = rawText.match(fence)
  if (!match) return { text: rawText, planner: null }

  try {
    let planner = JSON.parse(match[1])
    planner = sanitizePlannerOptions(planner)
    if (!planner.plannerOptions?.length) return { text: rawText, planner: null }

    const text = rawText.replace(match[0], '').trim()
    return { text, planner }
  } catch {
    return { text: rawText, planner: null }
  }
}

function timeToMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60) % 24).padStart(2, '0')
  const m = String(mins % 60).padStart(2, '0')
  return `${h}:${m}`
}

function findFreeSlot(tasks, date, durationMin = 60, startMin = 9 * 60, endMin = 21 * 60) {
  const dayTasks = tasks
    .filter(t => t.date === date && t.startTime && t.endTime)
    .map(t => ({
      start: timeToMinutes(t.startTime),
      end: timeToMinutes(t.endTime),
    }))
    .filter(t => t.start !== null && t.end !== null)
    .sort((a, b) => a.start - b.start)

  let cursor = startMin
  for (const slot of dayTasks) {
    if (slot.start - cursor >= durationMin) {
      return { start: cursor, end: cursor + durationMin }
    }
    cursor = Math.max(cursor, slot.end)
  }
  if (endMin - cursor >= durationMin) {
    return { start: cursor, end: cursor + durationMin }
  }
  return null
}

function pointsToMinutes(points) {
  const p = Number(points) || 1
  if (p <= 1) return 30
  if (p === 2) return 60
  return 120
}

const taskTypeIcon = {
  setup: '🔧',
  comprehension: '📖',
  drafting: '✍️',
  verification: '✅',
  submission: '📤',
  research: '🔍',
}

const difficultyStyle = {
  light:  { bg: '#e1f1e6', color: '#356348', label: 'Light'  },
  medium: { bg: '#fff0cc', color: '#765714', label: 'Medium' },
  heavy:  { bg: '#fce0e5', color: '#84334c', label: 'Heavy'  },
}

const scheduleNoteStyle = {
  fits:     { bg: '#e1f1e6', color: '#356348', icon: '✅' },
  tight:    { bg: '#fff0cc', color: '#765714', icon: '⏳' },
  conflict: { bg: '#fce0e5', color: '#84334c', icon: '⚠️' },
}

// ---------- Component ----------

export default function AICompanion(props) {
  const messages = props.messages || [
    { role: 'assistant', content: props.initialMessage || "Hey there! 🌿 I'm Timo. What are we working on today? Feel free to drop a question, paste some text, or just tell me what's on your mind!" }
  ]
  const setMessages = props.setMessages || (() => { })

  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingConfirmationId, setPendingConfirmationId] = useState(null)
  const [customPlanFor, setCustomPlanFor] = useState(null)
  const [chosenTaskIds, setChosenTaskIds] = useState({})
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setSelectedFiles(prev => [...prev, ...files].slice(0, MAX_FILES))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFileAt(index) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function fileToGenerativePart(file) {
    const blob = file.type.startsWith('image/')
      ? await resizeImage(file)
      : file

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve({
          inlineData: {
            data: reader.result.split(',')[1],
            mimeType: blob.type || file.type
          }
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  function addTasksToPlanner(taskList) {
    if (!props.onTaskCreated || taskList.length === 0) return

    const allTasks = [...(props.tasks || [])]

    taskList.forEach(t => {
      const points = t.points || 1
      const durationMin = pointsToMinutes(points)
      let dateToUse = t.date
      let slot = findFreeSlot(allTasks, dateToUse, durationMin)

      if (!slot) {
        const next = new Date(dateToUse)
        for (let i = 1; i <= 14 && !slot; i++) {
          next.setDate(next.getDate() + 1)
          const key = next.toISOString().split('T')[0]
          slot = findFreeSlot(allTasks, key, durationMin)
          if (slot) dateToUse = key
        }
      }

      if (!slot) slot = { start: 9 * 60, end: 9 * 60 + durationMin }

      const newTask = {
        name: t.title,
        category: 'Academic',
        points,
        date: dateToUse,
        startTime: minutesToTime(slot.start),
        endTime: minutesToTime(slot.end),
      }
      allTasks.push({ ...newTask, id: 'temp-' + Math.random() })
      props.onTaskCreated(newTask)
    })
  }

  function handleAddPlannerOption(option) {
    const baseDate = props.selectedDate || new Date().toISOString().split('T')[0]
    const list = option.tasks.map(t => ({ ...t, date: baseDate }))
    addTasksToPlanner(list)

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Done! Added ${option.tasks.length} task${option.tasks.length !== 1 ? 's' : ''} to your Planner using "${option.label}". 🌿`
      }
    ])
  }

  function handleAddChosenTasks(chosenTasks) {
    addTasksToPlanner(chosenTasks)
    setCustomPlanFor(null)
    setChosenTaskIds({})

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Done! Added ${chosenTasks.length} task${chosenTasks.length !== 1 ? 's' : ''} to your Planner. 🌿`
      }
    ])
  }

  function handleApplySuggestedMove(move) {
    if (!props.tasks || !props.onTaskUpdated) return
    const target = props.tasks.find(t => t.name === move.taskName)
    if (!target) return
    props.onTaskUpdated({ ...target, date: move.toDate })
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Moved "${move.taskName}" from ${move.fromDate} to ${move.toDate}. 🌿`
      }
    ])
  }

  function toggleChosenTask(taskId) {
    setChosenTaskIds(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return

    const userMessage = input.trim()
    const currentFiles = selectedFiles

    setInput('')
    setSelectedFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''

    const lowerInput = userMessage.toLowerCase()

    if (lowerInput.includes('remove') || lowerInput.includes('delete')) {
      const allTasks = props.tasks || []
      const targetTask = allTasks.find(t => lowerInput.includes(t.name.toLowerCase()))

      setMessages([...messages, { role: 'user', content: userMessage }])

      if (!targetTask) {
        setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't find a task matching that name in your schedule. Check your planner to make sure it's spelled correctly!" }])
        return
      }

      if (Number(targetTask.points) === 3 && pendingConfirmationId !== targetTask.id) {
        setPendingConfirmationId(targetTask.id)
        setMessages(prev => [...prev, { role: 'assistant', content: `"${targetTask.name}" is a heavy 3-point task. Are you sure you want me to remove it? (Reply 'yes' to confirm)` }])
        return
      }

      if (props.onTaskDeleted) props.onTaskDeleted(targetTask.id)
      setPendingConfirmationId(null)
      setMessages(prev => [...prev, { role: 'assistant', content: `I've removed "${targetTask.name}" from your schedule! 🌿` }])
      return
    }

    if (pendingConfirmationId && (lowerInput === 'yes' || lowerInput === 'yeah' || lowerInput === 'sure' || lowerInput === 'confirm')) {
      const allTasks = props.tasks || []
      const targetTask = allTasks.find(t => t.id === pendingConfirmationId)
      setMessages([...messages, { role: 'user', content: userMessage }])
      if (targetTask && props.onTaskDeleted) {
        props.onTaskDeleted(targetTask.id)
        setMessages(prev => [...prev, { role: 'assistant', content: `Alright, I've gone ahead and removed "${targetTask.name}".` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "It looks like that task was already removed or changed." }])
      }
      setPendingConfirmationId(null)
      return
    }

    if (lowerInput.includes('move') || lowerInput.includes('reschedule')) {
      const allTasks = props.tasks || []
      const targetTask = allTasks.find(t => lowerInput.includes(t.name.toLowerCase()))
      setMessages([...messages, { role: 'user', content: userMessage }])
      if (!targetTask) {
        setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't find a task matching that name to move. Check your spelling!" }])
        return
      }
      const targetDateObj = new Date(props.selectedDate || Date.now())
      if (lowerInput.includes('tomorrow')) targetDateObj.setDate(targetDateObj.getDate() + 1)
      const newDateKey = targetDateObj.toISOString().split('T')[0]
      const updatedTask = { ...targetTask, date: newDateKey }
      if (props.onTaskUpdated) props.onTaskUpdated(updatedTask)
      setMessages(prev => [...prev, { role: 'assistant', content: `I've moved "${targetTask.name}" to ${newDateKey}! 🌿` }])
      return
    }

    let targetDate = props.selectedDate || new Date().toISOString().split('T')[0]
    const lowerUserMsg = userMessage.toLowerCase()
    if (lowerUserMsg.includes('tomorrow')) {
      const t = new Date(props.selectedDate || Date.now())
      t.setDate(t.getDate() + 1)
      targetDate = t.toISOString().split('T')[0]
    } else if (lowerUserMsg.includes('today')) {
      targetDate = props.selectedDate || new Date().toISOString().split('T')[0]
    }

    const dayTasks = (props.tasks || []).filter(t => t.date === targetDate)
    const scheduleContext = dayTasks.length > 0
      ? `[Current Schedule for ${targetDate}: ${dayTasks.map(t => `${t.name} (${t.startTime}-${t.endTime}, ${t.points}pts)`).join(', ')}]`
      : `[Current Schedule for ${targetDate}: No tasks planned yet.]`

    const updatedMessages = [
      ...messages,
      { role: 'user', content: `${userMessage} ${scheduleContext}` }
    ]
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: userMessage || '[Attached File]',
        fileNames: currentFiles.length > 0 ? currentFiles.map(f => f.name) : null
      }
    ])
    setIsLoading(true)

    try {
      let fileContext = null
      const today = props.selectedDate || new Date().toISOString().split('T')[0]

      if (currentFiles.length > 0) {
        const files = currentFiles.slice(0, MAX_FILES)
        const textParts = []
        const imageParts = []

        for (const f of files) {
          if (f.type.startsWith('image/')) {
            const part = await fileToGenerativePart(f)
            imageParts.push({ file: f, part })
          } else {
            try {
              const text = await extractText(f)
              if (text && text.trim().length >= 20) {
                textParts.push({ file: f, text })
              } else if (f.type === 'application/pdf') {
                const part = await fileToGenerativePart(f)
                imageParts.push({ file: f, part })
              } else {
                textParts.push({ file: f, text: text || '' })
              }
            } catch (err) {
              console.error('extractText failed for', f.name, err)
              textParts.push({ file: f, text: '' })
            }
          }
        }

        fileContext = {
          kind: 'multi',
          files: [
            ...textParts.map(({ file, text }) => ({ kind: 'text', fileName: file.name, text })),
            ...imageParts.map(({ file, part }) => ({ kind: 'image', fileName: file.name, filePart: part })),
          ],
          scheduleSummary: summarizeSchedule(props.tasks || [], today, 14, props.dailyCapacity || 8),
          today,
        }
      }

      const agentResponse = await sendAgentMessage(updatedMessages, fileContext)

      if (agentResponse.functionCalls && agentResponse.functionCalls.length > 0) {
        const call = agentResponse.functionCalls[0]
        if (call.name === 'create_task') {
          const args = call.args
          if (props.onTaskCreated) props.onTaskCreated(args)
          setMessages(prev => [...prev, { role: 'assistant', content: `I've added "${args.name}" to your schedule for ${args.date} from ${args.startTime} to ${args.endTime}! 🌿` }])
        }
      } else {
        const { text, planner } = parsePlannerBlock(agentResponse.text || '')
        const reply = text || "I'm here for you! What should we tackle next?"
        setMessages(prev => [...prev, { role: 'assistant', content: reply, planner }])
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: `I couldn't read that file. ${error.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="ai-companion">
      <section className="task-section" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 13rem)', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>AI Companion</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Chat with Timo about your workload, stress, or plans.</p>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          paddingRight: '0.25rem',
          marginBottom: '1rem'
        }}>
          {messages.map((msg, index) => (
            <div key={index} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? 'var(--accent, #d8c4ef)' : 'rgba(255, 255, 255, 0.8)',
              color: msg.role === 'user' ? 'var(--accent-dark, #5a3e7a)' : 'var(--ink, #222)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              maxWidth: '85%',
              fontSize: '0.9rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap'
            }}>
              {msg.fileNames && msg.fileNames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
                  {msg.fileNames.map((name, i) => (
                    <div key={i} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'rgba(255, 255, 255, 0.6)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <span>📎</span> {name}
                    </div>
                  ))}
                </div>
              )}
              <div>{msg.content}</div>

              {msg.planner && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  background: '#fffefa'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>📋 Add to Planner</strong>
                    {msg.planner.difficulty && (() => {
                      const s = difficultyStyle[msg.planner.difficulty] || difficultyStyle.medium
                      return (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '6px',
                          background: s.bg,
                          color: s.color,
                          fontWeight: 700,
                        }}>
                          {s.label}
                        </span>
                      )
                    })()}
                    {msg.planner.totalEffort && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        · {msg.planner.totalEffort}
                      </span>
                    )}
                    {msg.planner.taskCount != null && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        · {msg.planner.taskCount} tasks
                      </span>
                    )}
                    {msg.planner.deadline && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        · Due {msg.planner.deadline}
                        {msg.planner.daysUntilDeadline != null && ` (${msg.planner.daysUntilDeadline}d)`}
                      </span>
                    )}
                  </div>

                  {msg.planner.scheduleNote && (() => {
                    const s = scheduleNoteStyle[msg.planner.scheduleNote.type] || scheduleNoteStyle.tight
                    return (
                      <div style={{
                        marginBottom: '0.6rem',
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        background: s.bg,
                        color: s.color,
                        border: '1px solid ' + s.color + '33',
                        fontSize: '0.8rem',
                        lineHeight: 1.4,
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                          {s.icon} {msg.planner.scheduleNote.type === 'conflict' ? 'Schedule conflict' :
                                      msg.planner.scheduleNote.type === 'tight' ? 'Tight timeline' :
                                      'Fits your schedule'}
                        </div>
                        <div>{msg.planner.scheduleNote.message}</div>

                        {msg.planner.scheduleNote.suggestedMoves?.length > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            {msg.planner.scheduleNote.suggestedMoves.map((m, i) => (
                              <div key={i} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginTop: '0.3rem',
                                padding: '0.4rem 0.5rem',
                                background: 'rgba(255,255,255,0.6)',
                                borderRadius: '6px',
                              }}>
                                <span style={{ fontSize: '0.75rem' }}>
                                  Move <strong>{m.taskName}</strong>: {m.fromDate} → {m.toDate}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleApplySuggestedMove(m)}
                                  style={{
                                    background: s.color,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.25rem 0.55rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                  }}
                                >
                                  Apply
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {msg.planner.plannerOptions?.map(option => {
                    const isRecommended = option.id === msg.planner.recommendedId
                    return (
                      <div
                        key={option.id}
                        style={{
                          border: isRecommended ? '2px solid var(--accent-dark)' : '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.6rem',
                          marginBottom: '0.5rem',
                          background: '#fff',
                          position: 'relative',
                        }}
                      >
                        {isRecommended && (
                          <span style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '8px',
                            background: 'var(--accent-dark)',
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '6px',
                          }}>
                            Recommended
                          </span>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', marginTop: isRecommended ? '0.4rem' : 0 }}>
                          <strong style={{ fontSize: '0.8rem' }}>{option.label}</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                            {option.tasks.length} task{option.tasks.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.8rem' }}>
                          {option.tasks.map((t, i) => (
                            <li key={i} style={{ marginBottom: '0.2rem' }}>
                              {taskTypeIcon[t.type] || '•'} {t.title}{' '}
                              <span style={{ color: 'var(--muted)' }}>
                                ({t.effort}, {t.points} pt{t.points !== 1 ? 's' : ''})
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleAddPlannerOption(option)}
                            style={{
                              flex: 1,
                              padding: '0.4rem 0.7rem',
                              border: 'none',
                              borderRadius: '8px',
                              background: 'var(--accent)',
                              color: 'var(--accent-dark)',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            Use this option
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomPlanFor(option)
                              const init = {}
                              option.tasks.forEach((_, i) => { init[i] = true })
                              setChosenTaskIds(init)
                            }}
                            style={{
                              padding: '0.4rem 0.7rem',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              background: '#fff',
                              color: 'var(--ink)',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            Customize
                          </button>
                        </div>

                        {customPlanFor?.id === option.id && (
                          <div style={{
                            marginTop: '0.6rem',
                            padding: '0.6rem',
                            background: 'var(--soft)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                          }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                              Pick tasks to schedule:
                            </div>
                            {option.tasks.map((t, i) => (
                              <label key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.78rem',
                                marginBottom: '0.3rem',
                                cursor: 'pointer',
                              }}>
                                <input
                                  type="checkbox"
                                  checked={!!chosenTaskIds[i]}
                                  onChange={() => toggleChosenTask(i)}
                                />
                                <span>{t.title} <span style={{ color: 'var(--muted)' }}>({t.points} pt)</span></span>
                              </label>
                            ))}
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const chosen = option.tasks
                                    .filter((_, i) => chosenTaskIds[i])
                                    .map(t => ({
                                      ...t,
                                      date: props.selectedDate || new Date().toISOString().split('T')[0],
                                    }))
                                  handleAddChosenTasks(chosen)
                                }}
                                style={{
                                  flex: 1,
                                  padding: '0.4rem',
                                  border: 'none',
                                  borderRadius: '8px',
                                  background: 'var(--accent-dark)',
                                  color: '#fff',
                                  fontWeight: 600,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Add selected
                              </button>
                              <button
                                type="button"
                                onClick={() => { setCustomPlanFor(null); setChosenTaskIds({}) }}
                                style={{
                                  padding: '0.4rem 0.7rem',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  background: '#fff',
                                  color: 'var(--ink)',
                                  fontWeight: 600,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
              Timo is reading your file{selectedFiles.length > 1 ? 's' : ''}...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {selectedFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(216, 196, 239, 0.2)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--accent-dark)'
                }}>
                  <span>📎 {f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFileAt(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.4rem', width: '100%', alignItems: 'center' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.pptx,.txt,.csv,.md,image/*"
              multiple
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload file or image"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                fontSize: '1rem'
              }}
            >
              +
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} attached` : "Ask Timo or upload files..."}
              style={{ flex: 1, minWidth: 0, padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
            />
            <button type="submit" style={{ padding: '0.65rem 1rem', width: 'auto', flexShrink: 0, minHeight: 'auto', borderRadius: '8px', background: 'var(--accent)', color: 'var(--accent-dark)', border: 'none', fontWeight: 600, cursor: 'pointer' }} disabled={isLoading}>
              ➤
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}