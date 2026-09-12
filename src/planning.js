export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export function parseDate(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d,12) }
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDate(s)) === s }
export function tasksForDay(tasks, day) { return tasks.filter(t => t.date === day) }

export function suggestMove(tasks, day, capacity, today, capacityForDay = () => capacity) {
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
      if (!task.fixed && !task.done && task.category !== 'Recovery' && (!task.deadline || destination <= task.deadline) && conflicts(tasks,{...task,date:destination}).length===0 && before + task.points <= capacityForDay(destination)) {
        options.push({ task, destination, sourceBefore: total, sourceAfter: total - task.points, destinationBefore: before, destinationAfter: before + task.points, remaining: Math.max(0, total - task.points - capacity), offset })
      }
    }
  }
  const priorityRank = task => ({low:0,medium:1,high:2}[task.priority || "medium"] ?? 1)
  options.sort((a, b) => priorityRank(a.task) - priorityRank(b.task) || a.remaining - b.remaining || a.destinationAfter - b.destinationAfter || a.offset - b.offset || a.task.id.localeCompare(b.task.id))
  return options[0] || null
}

export function migrateTask(task,today) {
 const next={...task,priority:["high","medium","low"].includes(task.priority)?task.priority:"medium",date:validDate(task.date)?task.date:today,points:task.category==='Recovery'?0:Number(task.points)}
 next.startTime=task.startTime || task.start || ''
 next.endTime=task.endTime || ''
 if(!next.endTime && next.startTime && task.duration){const end=minutes(next.startTime)+Number(task.duration); if(end<=1440)next.endTime=end===1440?'24:00':String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0')}
 return next
}
const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3))
export function conflicts(tasks,task) {
 if(!task.startTime||!task.endTime)return []
 return tasks.filter(t=>t.id!==task.id&&t.date===task.date&&t.startTime&&t.endTime&&minutes(task.startTime)<minutes(t.endTime)&&minutes(task.endTime)>minutes(t.startTime))
}

export function summarizeSchedule(tasks, today, daysAhead = 14, dailyCapacity = 8) {
  const days = []
  for (let i = 0; i < daysAhead; i++) {
    const d = parseDate(today)
    d.setDate(d.getDate() + i)
    const key = dateKey(d)
    const dayTasks = tasks.filter(t => t.date === key)
    const points = dayTasks.reduce((s, t) => s + Number(t.points || 0), 0)
    days.push({
      date: key,
      points,
      capacity: dailyCapacity,
      taskCount: dayTasks.length,
      hasFixed: dayTasks.some(t => t.fixed),
      taskNames: dayTasks.slice(0, 5).map(t => t.name),
    })
  }
  return days
}
