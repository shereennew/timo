import { useState, useRef } from 'react'
import { GoogleGenAI } from '@google/genai';

export default function AICompanion() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey there! 🌿 I'm Timo. What are we working on today? Feel free to drop a question, paste some text, or just tell me what's on your mind!" }
  ])
  const [input, setInput] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef(null)

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

    let displayContent = userMessage
    if (currentFile) {
      displayContent = userMessage ? `${userMessage} [Attached: ${currentFile.name}]` : `[Attached: ${currentFile.name}]`
    }

    const updatedMessages = [...messages, { role: 'user', content: displayContent }]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
      
      let contents = [
        `You are Timo, a warm, empathetic, and encouraging AI study companion. Keep your responses direct, helpful, and concise. Never ask more than ONE question at a time, and only ask a question if it is strictly necessary to proceed. Focus on giving direct help, solutions, or breakdowns immediately based on whatever files or text the user provides, rather than grilling them with multiple questions.`
      ]

      // Include previous conversation history for context so Timo remembers what was uploaded
      for (const msg of updatedMessages) {
        if (msg.role === 'user') {
          contents.push(`User: ${msg.content}`)
        } else {
          contents.push(`Timo: ${msg.content}`)
        }
      }

      if (currentFile) {
        const filePart = await fileToGenerativePart(currentFile)
        contents.push(filePart)
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: contents
      })

      const reply = response.text || "I'm here for you! What should we tackle next?"
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "My connection wobbled for a second. Let's take a deep breath and try that again!" }])
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
              lineHeight: 1.4
            }}>
              {msg.content}
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
              <button type="button" onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)' }}>✕</button>
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