import { createElement } from 'react'
import type { Category } from '../db/types'
import { iconFor } from './category-icons'
import styles from './CategoryIcon.module.css'

interface CategoryIconProps {
  category?: Pick<Category, 'color' | 'icon'>
  size?: number
  shape?: 'rounded' | 'circle'
}

export function CategoryIcon({ category, size = 32, shape = 'rounded' }: CategoryIconProps) {
  return (
    <span
      className={styles.chip}
      style={{
        backgroundColor: category?.color ?? '#868e96',
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? '50%' : Math.round(size * 0.3),
      }}
    >
      {createElement(iconFor(category?.icon ?? 'ellipsis'), {
        size: Math.round(size * 0.56),
        strokeWidth: 2.1,
        color: '#ffffff',
        'aria-hidden': true,
      })}
    </span>
  )
}
