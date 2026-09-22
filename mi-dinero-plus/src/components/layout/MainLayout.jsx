import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import ScrollToTop from './ScrollToTop'

function MainLayout() {
  return (
    <div className="main-layout">
      <ScrollToTop />
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .main-layout {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-page, #0b1220);
          color: var(--text-primary);
        }

        .main-content {
          flex: 1;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        @media (max-width: 900px) {
          .main-content {
            padding-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

export default MainLayout