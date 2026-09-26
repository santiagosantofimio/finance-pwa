import type { Category, TransactionKind } from './types'

type CategorySeed = Pick<Category, 'id' | 'name' | 'color' | 'icon'>

const expenseSeeds: CategorySeed[] = [
  { id: 'groceries', name: 'Mercado', color: '#2f9e63', icon: 'shopping-cart' },
  { id: 'dining', name: 'Restaurantes', color: '#e8590c', icon: 'utensils' },
  { id: 'transport', name: 'Transporte', color: '#1c7ed6', icon: 'bus' },
  { id: 'housing', name: 'Vivienda', color: '#7048e8', icon: 'house' },
  { id: 'utilities', name: 'Servicios', color: '#f59f00', icon: 'zap' },
  { id: 'health', name: 'Salud', color: '#e03131', icon: 'heart-pulse' },
  { id: 'education', name: 'Educación', color: '#0c8599', icon: 'graduation-cap' },
  { id: 'entertainment', name: 'Entretenimiento', color: '#d6336c', icon: 'clapperboard' },
  { id: 'shopping', name: 'Compras', color: '#ae3ec9', icon: 'shopping-bag' },
  { id: 'subscriptions', name: 'Suscripciones', color: '#4263eb', icon: 'repeat' },
  { id: 'other-expense', name: 'Otros gastos', color: '#868e96', icon: 'ellipsis' },
]

const incomeSeeds: CategorySeed[] = [
  { id: 'salary', name: 'Salario', color: '#2b8a3e', icon: 'briefcase' },
  { id: 'freelance', name: 'Trabajos extra', color: '#1971c2', icon: 'laptop' },
  { id: 'investments', name: 'Inversiones', color: '#5f3dc4', icon: 'trending-up' },
  { id: 'gifts', name: 'Regalos', color: '#c2255c', icon: 'gift' },
  { id: 'other-income', name: 'Otros ingresos', color: '#868e96', icon: 'ellipsis' },
]

function toCategories(seeds: CategorySeed[], kind: TransactionKind): Category[] {
  return seeds.map((seed, order) => ({ ...seed, kind, order, builtIn: true, archived: false }))
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  ...toCategories(expenseSeeds, 'expense'),
  ...toCategories(incomeSeeds, 'income'),
]
