import { PAYMENT_METHOD_LABELS } from '../../db/labels'
import type { Category, Transaction } from '../../db/types'
import { formatDayShort, formatSignedMoney } from '../../lib/format'
import { CategoryIcon } from '../../ui/CategoryIcon'
import { Row } from '../../ui/Group'

interface TransactionRowProps {
  transaction: Transaction
  category?: Category
  showDate?: boolean
  onSelect: (transaction: Transaction) => void
}

export function TransactionRow({ transaction, category, showDate = false, onSelect }: TransactionRowProps) {
  const categoryName = category?.name ?? 'Sin categoría'
  const payment = PAYMENT_METHOD_LABELS[transaction.paymentMethod]
  const title = transaction.note || categoryName
  const parts = [showDate ? formatDayShort(transaction.date) : null, transaction.note ? categoryName : null, payment]
  return (
    <Row
      leading={<CategoryIcon category={category} />}
      title={title}
      subtitle={parts.filter(Boolean).join(' · ')}
      trailing={
        <span className="amount" data-kind={transaction.kind}>
          {formatSignedMoney(transaction.amount, transaction.kind)}
        </span>
      }
      onClick={() => onSelect(transaction)}
      ariaLabel={`${title}, ${formatSignedMoney(transaction.amount, transaction.kind)}, ${formatDayShort(transaction.date)}`}
    />
  )
}
