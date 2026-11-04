import './LimitedInput.css'

export default function LimitedInput({ value = '', maxLength = 35, ...props }) {
  const remaining = maxLength - String(value).length

  const countClass =
    'limited-input__count' +
    (remaining <= 8 ? ' is-low' : '') +
    (remaining <= 0 ? ' is-zero' : '')

  return (
    <div className="limited-input">
      <input
        type="text"
        className="limited-input__field"
        value={value}
        maxLength={maxLength}
        {...props}
      />
      <span className={countClass} aria-hidden="true">
        {remaining}
      </span>
    </div>
  )
}