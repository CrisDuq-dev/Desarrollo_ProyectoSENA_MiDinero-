import { useLayoutEffect } from 'react'

const DESKTOP_QUERY = '(min-width: 961px)'
const MIN_HEIGHT = 360

function useColumnLimit(leftRef, cardRef) {
  useLayoutEffect(() => {
    const left = leftRef.current
    const card = cardRef.current
    if (!left || !card) return undefined

    const media = window.matchMedia(DESKTOP_QUERY)
    let frame = 0

    const apply = () => {
      frame = 0
      if (!media.matches) {
        card.style.removeProperty('--list-max-h')
        return
      }
      const available =
        left.getBoundingClientRect().bottom - card.getBoundingClientRect().top
      const next = `${Math.max(MIN_HEIGHT, Math.floor(available))}px`
      if (card.style.getPropertyValue('--list-max-h') !== next) {
        card.style.setProperty('--list-max-h', next)
      }
    }

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply)
    }

    apply()

    const observer = new ResizeObserver(schedule)
    observer.observe(left)
    if (card.parentElement) observer.observe(card.parentElement)

    window.addEventListener('resize', schedule)
    media.addEventListener('change', schedule)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      media.removeEventListener('change', schedule)
      card.style.removeProperty('--list-max-h')
    }
  }, [leftRef, cardRef])
}

export default useColumnLimit
