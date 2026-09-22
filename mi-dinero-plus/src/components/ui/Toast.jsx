import { useEffect } from 'react'

function Toast({ message, visible }) {
  if (!visible) return null

  return (
    <div className="toast-box">
      {message}
      <style>{`
        .toast-box {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          padding: 0.9rem 1.2rem;
          background: #111827;
          color: white;
          border-radius: 0.85rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
          z-index: 60;
        }
      `}</style>
    </div>
  )
}

export default Toast
