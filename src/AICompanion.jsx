
import { useState } from 'react'
import './App.css'

function AICompanion() {
  const [message, setMessage] = useState('')

  const [conversation, setConversation] = useState([
    {
      sender: 'ai',
      text: "Hi! I'm Timo 🌿 How are you feeling today?"
    },
    {
      sender: 'user',
      text: "I'm feeling quite stressed. I have a lot of assignments."
    },
    {
      sender: 'ai',
      text: "That sounds like a lot to carry. 💜 Let's take it one step at a time."
    },
    {
      sender: 'ai',
      text: "I noticed you have 8 points of work planned today, which is close to your current capacity."
    },
    {
      sender: 'ai',
      text: "You could move 'Review lecture notes' to tomorrow and take a 30-minute recovery break today. 🌱"
    },
    {
      sender: 'user',
      text: "Okay, that sounds better."
    },
    {
      sender: 'ai',
      text: "Great! Remember, being productive doesn't mean filling every minute of your day. You deserve some breathing room too. ☁️"
    }
  ])

  function sendMessage(event) {
    event.preventDefault()

    const text = message.trim()
    if (!text) return

    setConversation(prev => [
      ...prev,
      {
        sender: 'user',
        text
      }
    ])

    setMessage('')

    // Hardcoded demo responses
    setTimeout(() => {
      let response =
        "I'm here with you. 🌿 Let's work through it together."

      const lowerText = text.toLowerCase()

      if (
        lowerText.includes('stress') ||
        lowerText.includes('stressed')
      ) {
        response =
          "It sounds like you're carrying quite a lot right now. 💜 Try focusing on just one small task first, then give yourself a short break."
      } else if (
        lowerText.includes('tired') ||
        lowerText.includes('exhausted')
      ) {
        response =
          "You sound like you need a little recharge. 😴 Consider taking a 20–30 minute break before starting your next task."
      } else if (
        lowerText.includes('assignment') ||
        lowerText.includes('study')
      ) {
        response =
          "Let's make it smaller. 📚 Start with the easiest part of the assignment for 20–30 minutes. You don't have to finish everything at once."
      } else if (
        lowerText.includes('break') ||
        lowerText.includes('rest')
      ) {
        response =
          "Yes, taking a break is okay. 🌱 A short walk, some water, or simply stepping away from your screen can help you recharge."
      } else if (
        lowerText.includes('thank')
      ) {
        response =
          "You're welcome! 🌿 I'm always here when things feel a little overwhelming."
      }

      setConversation(prev => [
        ...prev,
        {
          sender: 'ai',
          text: response
        }
      ])
    }, 600)
  }

  function quickMessage(text) {
    setMessage(text)
  }

  return (
    <section className="task-section ai-companion">

      {/* Introduction */}
      <div className="ai-intro">
        <div className="ai-icon">
          🌿
        </div>

        <h1>
          Talk to Timo
        </h1>

      <div className="companion-status">
        Timo is here to help you find a little room
        to breathe.
      </div>


      </div>

      {/* Chat box */}
      <div className="ai-chat-box">

        {/* Conversation */}
        <div className="ai-conversation">
          {conversation.map((item, index) => (
            <div
              key={index}
              className={`ai-message-row ${
                item.sender === 'user'
                  ? 'user-message-row'
                  : 'ai-message-row'
              }`}
            >
              <div
                className={`ai-message ${
                  item.sender === 'user'
                    ? 'user-message'
                    : 'timo-message'
                }`}
              >
                {item.sender === 'ai' && (
                  <div className="timo-label">
                    🌿 Timo
                  </div>
                )}

                {item.text}
              </div>
            </div>
          ))}
        </div>

        {/* Quick suggestions */}
        <div className="quick-suggestions">

          <button
            type="button"
            onClick={() =>
              quickMessage("I'm feeling stressed")
            }
          >
            😮‍💨 I'm stressed
          </button>

          <button
            type="button"
            onClick={() =>
              quickMessage("I feel tired")
            }
          >
            😴 I'm tired
          </button>

          <button
            type="button"
            onClick={() =>
              quickMessage("Help me with my tasks")
            }
          >
            📚 Help with tasks
          </button>

        </div>

        {/* Message input */}
        <form
          onSubmit={sendMessage}
          className="ai-message-form"
        >
          <input
            type="text"
            value={message}
            onChange={event =>
              setMessage(event.target.value)
            }
            placeholder="Talk to Timo..."
            maxLength={500}
          />

          <button
            type="submit"
            disabled={!message.trim()}
            aria-label="Send message"
            className="send-message-button"
          >
            ➤
          </button>
        </form>

      </div>

    </section>
  )
}

export default AICompanion




