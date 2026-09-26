export function haptic() {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(10)
    return
  }
  const label = document.createElement('label')
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.setAttribute('aria-hidden', 'true')
  label.hidden = true
  label.append(input)
  document.body.append(label)
  label.click()
  label.remove()
}
