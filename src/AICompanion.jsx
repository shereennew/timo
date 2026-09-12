import { useState, useRef } from 'react'
import { sendAgentMessage } from './aiAgent'
import { extractText, resizeImage } from './extractText'

// ---------- Helpers ----------

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

const taskTypeIcon = {
  setup: '🔧',
  comprehension: '📖',
  drafting: '✍️',
  verification: '✅',
  submission: '📤',
  research: '🔍',
}

const difficultyStyle = {
  easy:   { bg: '#e1f1e6', color: '#356348' },
  medium: { bg: '#fff0cc', color: '#765714' },
  hard:   { bg: '#fce0e5', color: '#84334c' },
}

// ---------- Component ----------

export default function AICompanion(props) {
  const messages = props.messages || [
    { role: 'assistant', content: props.initialMessage || "Hey there! 🌿 I'm Timo. What are we working on today? Feel free to drop a question, paste some text, or just tell me what's on your mind!" }
  ]
  const setMessages = props.setMessages || (() => { })

  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingConfirmationId, setPendingConfirmationId] = useState(null)
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) setSelectedFile(file)
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

  function handleAddPlannerOption(option, plannerMeta) {
    if (!props.onTaskCreated) return

    const baseDate = props.selectedDate || new Date().toISOString().split('T')[0]

    option.tasks.forEach(t => {
      props.onTaskCreated({
        name: t.title,
        category: 'Academic',
        points: t.points || 1,
        date: baseDate,
        startTime: '09:00',
        endTime: '10:00',
      })
    })

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `Done! Added ${option.tasks.length} task${option.tasks.length !== 1 ? 's' : ''} to your Planner using "${option.label}". 🌿`
      }
    ])
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if ((!input.trim() && !selectedFile) || isLoading) return

    const userMessage = input.trim()
    const currentFile = selectedFile

    setInput('')
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    const lowerInput = userMessage.toLowerCase()

    if (lowerInput.includes('remove') || lowerInput.includes('delete')) {
      const allTasks = props.tasks || []
      const targetTask = allTasks.find(t => lowerInput.includes(t.name.toLowerCase()))

      const newHistoryWithUser = [...messages, { role: 'user', content: userMessage }]
      setMessages(newHistoryWithUser)

      if (!targetTask) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: "I couldn't find a task matching that name in your schedule. Check your planner to make sure it's spelled correctly!" }
        ])
        return
      }

      if (Number(targetTask.points) === 3 && pendingConfirmationId !== targetTask.id) {
        setPendingConfirmationId(targetTask.id)
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `"${targetTask.name}" is a heavy 3-point task. Are you sure you want me to remove it? (Reply 'yes' to confirm)` }
        ])
        return
      }

      if (props.onTaskDeleted) props.onTaskDeleted(targetTask.id)
      setPendingConfirmationId(null)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `I've removed "${targetTask.name}" from your schedule! 🌿` }
      ])
      return
    }

    if (pendingConfirmationId && (lowerInput === 'yes' || lowerInput === 'yeah' || lowerInput === 'sure' || lowerInput === 'confirm')) {
      const allTasks = props.tasks || []
      const targetTask = allTasks.find(t => t.id === pendingConfirmationId)

      const newHistoryWithUser = [...messages, { role: 'user', content: userMessage }]
      setMessages(newHistoryWithUser)

      if (targetTask && props.onTaskDeleted) {
        props.onTaskDeleted(targetTask.id)
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Alright, I've gone ahead and removed "${targetTask.name}".` }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: "It looks like that task was already removed or changed." }
        ])
      }
      setPendingConfirmationId(null)
      return
    }

    if (lowerInput.includes('move') || lowerInput.includes('reschedule')) {
      const allTasks = props.tasks || []
      const targetTask = allTasks.find(t => lowerInput.includes(t.name.toLowerCase()))

      const newHistoryWithUser = [...messages, { role: 'user', content: userMessage }]
      setMessages(newHistoryWithUser)

      if (!targetTask) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: "I couldn't find a task matching that name to move. Check your spelling!" }
        ])
        return
      }

      const targetDateObj = new Date(props.selectedDate || Date.now())
      if (lowerInput.includes('tomorrow')) {
        targetDateObj.setDate(targetDateObj.getDate() + 1)
      }
      const newDateKey = targetDateObj.toISOString().split('T')[0]

      const updatedTask = {
        ...targetTask,
        date: newDateKey
      }

      if (props.onTaskUpdated) props.onTaskUpdated(updatedTask)

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `I've moved "${targetTask.name}" to ${newDateKey}! 🌿` }
      ])
      return
    }

    let targetDate = props.selectedDate || new Date().toISOString().split('T')[0]
    const lowerUserMsg = userMessage.toLowerCase()

    if (lowerUserMsg.includes('tomorrow')) {
      const tomorrowObj = new Date(props.selectedDate || Date.now())
      tomorrowObj.setDate(tomorrowObj.getDate() + 1)
      targetDate = tomorrowObj.toISOString().split('T')[0]
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
        fileName: currentFile ? currentFile.name : null
      }
    ])
    setIsLoading(true)

    try {
      let fileContext = null

      if (currentFile) {
        if (currentFile.type.startsWith('image/')) {
          const filePart = await fileToGenerativePart(currentFile)
          fileContext = {
            kind: 'image',
            fileName: currentFile.name,
            filePart
          }
        } else {
          const text = await extractText(currentFile)

          if ((!text || text.trim().length < 20) && currentFile.type === 'application/pdf') {
            const filePart = await fileToGenerativePart(currentFile)
            fileContext = {
              kind: 'image',
              fileName: currentFile.name,
              filePart
            }
          } else {
            fileContext = {
              kind: 'text',
              fileName: currentFile.name,
              text: text || ''
            }
          }
        }
      }

      const agentResponse = await sendAgentMessage(updatedMessages, fileContext)

      if (agentResponse.functionCalls && agentResponse.functionCalls.length > 0) {
        const call = agentResponse.functionCalls[0]
        if (call.name === 'create_task') {
          const args = call.args
          if (props.onTaskCreated) props.onTaskCreated(args)
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `I've added "${args.name}" to your schedule for ${args.date} from ${args.startTime} to ${args.endTime}! 🌿` }
          ])
        }
      } else {
        const { text, planner } = parsePlannerBlock(agentResponse.text || '')
        const reply = text || "I'm here for you! What should we tackle next?"
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: reply, planner }
        ])
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `I couldn't read that file. ${error.message}` }
      ])
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
              {msg.fileName && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: 'rgba(255, 255, 255, 0.6)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  marginBottom: '0.4rem',
                  fontWeight: 600,
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <span>📎</span> {msg.fileName}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
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
                          textTransform: 'capitalize'
                        }}>
                          {msg.planner.difficulty}
                        </span>
                      )
                    })()}
                    {msg.planner.totalEffort && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        · {msg.planner.totalEffort} total
                      </span>
                    )}
                  </div>

                  {msg.planner.plannerOptions?.map(option => (
                    <div
                      key={option.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.6rem',
                        marginBottom: '0.5rem',
                        background: '#fff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
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

                      <button
                        type="button"
                        onClick={() => handleAddPlannerOption(option, msg.planner)}
                        style={{
                          marginTop: '0.5rem',
                          width: '100%',
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
              Timo is reading your file...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
          {selectedFile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(216, 196, 239, 0.2)', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--accent-dark)' }}>
              <span>📎 {selectedFile.name}</span>
              <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)' }}>✕</button>
            </div>
          )}

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.4rem', width: '100%', alignItems: 'center' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.pptx,.txt,.csv,.md,image/*"
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
              placeholder="Ask Timo or upload file..."
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