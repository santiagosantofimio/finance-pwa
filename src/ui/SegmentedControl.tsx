import styles from './SegmentedControl.module.css'

interface Segment<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  segments: Segment<T>[]
  onChange: (value: T) => void
  label: string
}

export function SegmentedControl<T extends string>({ value, segments, onChange, label }: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  )
  return (
    <div className={styles.control} role="radiogroup" aria-label={label}>
      <span
        className={styles.thumb}
        style={{ width: `calc((100% - 4px) / ${segments.length})`, transform: `translateX(${index * 100}%)` }}
        aria-hidden
      />
      {segments.map((segment) => (
        <button
          key={segment.value}
          type="button"
          role="radio"
          aria-checked={segment.value === value}
          className={styles.segment}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  )
}
