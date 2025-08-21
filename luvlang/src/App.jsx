import { useState } from 'react'
import './App.css'

function App() {
  const [isRegistered, setIsRegistered] = useState(false)

  return (
    <div className="luvlang-app">
      <header className="hero">
        <h1 className="logo">LuvLang</h1>
        <p className="tagline">Connect Hearts Through Language</p>
      </header>

      <main className="content">
        <section className="intro">
          <h2>Find Your Perfect Match</h2>
          <p>
            LuvLang brings together people who share a passion for languages and culture. 
            Whether you're learning a new language or want to share your native tongue, 
            find meaningful connections here.
          </p>
        </section>

        <section className="features">
          <div className="feature-card">
            <h3>🌍 Language Exchange</h3>
            <p>Practice languages with native speakers worldwide</p>
          </div>
          <div className="feature-card">
            <h3>💕 Meaningful Connections</h3>
            <p>Meet people who share your interests and values</p>
          </div>
          <div className="feature-card">
            <h3>🎯 Smart Matching</h3>
            <p>AI-powered matching based on language goals and personality</p>
          </div>
        </section>

        <section className="cta">
          {!isRegistered ? (
            <div>
              <h3>Ready to Start Your Journey?</h3>
              <button 
                className="cta-button"
                onClick={() => setIsRegistered(true)}
              >
                Join LuvLang Today
              </button>
            </div>
          ) : (
            <div className="success-message">
              <h3>Welcome to LuvLang! 🎉</h3>
              <p>Your adventure in language and love begins now.</p>
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>&copy; 2025 LuvLang. Connecting hearts through language.</p>
      </footer>
    </div>
  )
}

export default App
