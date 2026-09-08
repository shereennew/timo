export function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function parseDate(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d,12) }
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDate(s)) === s }
export function tasksForDay(tasks, day) { return tasks.filter(t => t.date === day) }

// Prefer one move that resolves overload, then the lightest destination.
export function suggestMove(tasks, day, capacity, today) {
  const source = tasksForDay(tasks, day)
  const total = source.reduce((sum, task) => sum + task.points, 0)
  if (total <= capacity || day < today) return null
  const options = []
  for (let offset = 1; offset <= 7; offset++) {
    const date = parseDate(day)
    date.setDate(date.getDate() + offset)
    const destination = dateKey(date)
    const before = tasksForDay(tasks, destination).reduce((sum, task) => sum + task.points, 0)
    for (const task of source) {
      if (before + task.points <= capacity) {
        options.push({ task, destination, sourceBefore: total, sourceAfter: total - task.points, destinationBefore: before, destinationAfter: before + task.points, remaining: Math.max(0, total - task.points - capacity), offset })
      }
    }
  }
  options.sort((a, b) => a.remaining - b.remaining || a.destinationAfter - b.destinationAfter || a.offset - b.offset || a.task.id.localeCompare(b.task.id))
  return options[0] || null
}
