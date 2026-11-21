import { useState, useEffect } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { OrganizationPortal } from './organization/OrganizationPortal'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigateTo = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  // Preview Organization Portal at /organization
  if (currentPath.startsWith('/organization')) {
    return <OrganizationPortal />
  }

  return (
    <>
      {/* Quick Navigation Banner for Portal Development Preview */}
      <div style={{
        backgroundColor: '#ECFBF8',
        borderBottom: '1px solid #BCEFE6',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10756F', fontWeight: 600, fontSize: '14px' }}>
          <span>🛡️ ReliefLink Development Preview:</span>
          <span style={{ color: '#0F172A', fontWeight: 500 }}>Organization Management Portal is available at <code>/organization</code></span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigateTo('/organization')}
            style={{
              backgroundColor: '#10756F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            type="button"
          >
            Dashboard &rarr;
          </button>
          <button
            onClick={() => navigateTo('/organization/incidents')}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#10756F',
              border: '1px solid #BCEFE6',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            type="button"
          >
            🚨 Crisis Incidents &rarr;
          </button>
          <button
            onClick={() => navigateTo('/organization/aid-requests')}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#10756F',
              border: '1px solid #BCEFE6',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            type="button"
          >
            📦 Aid Requests &rarr;
          </button>
          <button
            onClick={() => navigateTo('/organization/response-teams')}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#10756F',
              border: '1px solid #BCEFE6',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            type="button"
          >
            👥 Response Teams &rarr;
          </button>
          <button
            onClick={() => navigateTo('/organization/assigned-areas')}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#10756F',
              border: '1px solid #BCEFE6',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            type="button"
          >
            📍 Assigned Areas &rarr;
          </button>
          <button
            onClick={() => navigateTo('/organization/settings')}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#10756F',
              border: '1px solid #BCEFE6',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
            type="button"
          >
            ⚙️ Org Settings &rarr;
          </button>
        </div>
      </div>

      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
