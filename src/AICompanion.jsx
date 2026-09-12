import { useState, useRef } from 'react'
import { sendAgentMessage } from './aiAgent'

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

  // Example inside AICompanion.jsx handleFileUpload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      const filePart = {
        inlineData: {
          data: base64Data,
          mimeType: file.type || 'application/pdf'
        }
      };

      const userMessage = {
        role: 'user',
        content: userMessageText || '[Attached File]',
        fileName: currentFile ? currentFile.name : null
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Pass filePart AND file.name here:
      const response = await sendAgentMessage(updatedMessages, filePart, file.name);

      if (response.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
      }
    };
    reader.readAsDataURL(file);
  };

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }


  function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve({
          inlineData: {
            data: reader.result.split(',')[1],
            mimeType: file.type
          }
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if ((!input.trim() && !selectedFile) || isLoading) return

    const userMessage = input.trim()
    const currentFile = selectedFile

    setInput('')
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    // --- CHECK FOR DELETION & HEAVY TASK CONFIRMATION ---
    const lowerInput = userMessage.toLowerCase()
    if (lowerInput.includes('remove') || lowerInput.includes('delete')) {
      const allTasks = props.tasks || []
      const targetTask = allTasks.find(t => lowerInput.includes(t.name.toLowerCase()))

      // Append user message to chat history first
      const newHistoryWithUser = [...messages, { role: 'user', content: userMessage }]
      setMessages(newHistoryWithUser)

      if (!targetTask) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: "I couldn't find a task matching that name in your schedule. Check your planner to make sure it's spelled correctly!" }
        ])
        return
      }

      // Check if it's a heavy task (3 points) and we are not already waiting for confirmation of this task
      if (Number(targetTask.points) === 3 && pendingConfirmationId !== targetTask.id) {
        setPendingConfirmationId(targetTask.id)
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `"${targetTask.name}" is a heavy 3-point task. Are you sure you want me to remove it? (Reply 'yes' to confirm)` }
        ])
        return
      }

      // If it's light/medium or user confirmed the heavy task, delete it
      if (props.onTaskDeleted) {
        props.onTaskDeleted(targetTask.id)
      }
      setPendingConfirmationId(null)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `I've removed "${targetTask.name}" from your schedule! 🌿` }
      ])
      return
    }

    // --- CHECK IF USER IS CONFIRMING A PENDING HEAVY TASK DELETION ---
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
    // ----------------------------------------------------

    // --- CHECK FOR RESCHEDULING / MOVING TASKS ---
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

      // Simple logic: if they mention "tomorrow", shift the date by 1 day, or default to selectedDate
      const targetDateObj = new Date(props.selectedDate || Date.now())
      if (lowerInput.includes('tomorrow')) {
        targetDateObj.setDate(targetDateObj.getDate() + 1)
      }
      const newDateKey = targetDateObj.toISOString().split('T')[0]

      const updatedTask = {
        ...targetTask,
        date: newDateKey
      }

      if (props.onTaskUpdated) {
        props.onTaskUpdated(updatedTask)
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `I've moved "${targetTask.name}" to ${newDateKey}! 🌿` }
      ])
      return
    }

    // Filter tasks for the selected date or current date
    const targetDate = props.selectedDate || new Date().toISOString().split('T')[0]
    const dayTasks = (props.tasks || []).filter(t => t.date === targetDate)
    const scheduleContext = dayTasks.length > 0
      ? `[Current Schedule for ${targetDate}: ${dayTasks.map(t => `${t.name} (${t.startTime}-${t.endTime}, ${t.points}pts)`).join(', ')}]`
      : `[Current Schedule for ${targetDate}: No tasks planned yet.]`

    // Append context quietly or include it in the message flow
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
      let filePart = null
      if (currentFile) {
        filePart = await fileToGenerativePart(currentFile)
      }

      const agentResponse = await sendAgentMessage(updatedMessages, filePart, currentFile?.name)

      if (agentResponse.functionCalls && agentResponse.functionCalls.length > 0) {
        const call = agentResponse.functionCalls[0]
        if (call.name === 'create_task') {
          const args = call.args

          if (props.onTaskCreated) {
            props.onTaskCreated(args)
          }

          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `I've added "${args.name}" to your schedule for ${args.date} from ${args.startTime} to ${args.endTime}! 🌿` }
          ])
        }
      } else {
        const reply = agentResponse.text || "I'm here for you! What should we tackle next?"
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "My connection wobbled for a second. Let's try that again!" }])
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
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
              Timo is thinking...
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