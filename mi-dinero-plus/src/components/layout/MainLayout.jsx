import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import ScrollToTop from './ScrollToTop'
import IdleGuard from '../common/IdleGuard'

function MainLayout() {
  const location = useLocation()
  const [enterClass, setEnterClass] = useState('page-enter')

  useEffect(() => {
    setEnterClass('page-enter')
    const t = window.setTimeout(() => setEnterClass(''), 750)
    return () => window.clearTimeout(t)
  }, [location.pathname])

  return (
    <div className="main-layout">
      <ScrollToTop />
      <IdleGuard />
      <Navbar />
      <main className="main-content">
        <div key={location.pathname} className={enterClass || undefined}>
          <Outlet />
        </div>
      </main>

      <style>{`
        .main-layout {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-page, #0b1220);
          color: var(--text-primary);
          font-family: 'Nunito', 'Comic Neue', system-ui, sans-serif;
        }

        .main-content {
          flex: 1;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
          padding-top: 5.5rem;
        }

        .page-enter {
          animation: mdpPageEnter 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes mdpPageEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        @media (max-width: 900px) {
          .main-content {
            padding-bottom: 1rem;
            padding-top: 5.25rem;
          }
        }

        @media (max-width: 480px) {
          .main-content {
            padding-top: 4.85rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .page-enter {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

export default MainLayout
