export function timelineFor(tasks) {
  const timed=tasks.filter(t=>t.startTime&&t.endTime).slice().sort((a,b)=>a.startTime.localeCompare(b.startTime)||a.endTime.localeCompare(b.endTime))
  const rows=[]
  let end=null
  for(const task of timed){
    if(end&&task.startTime>end) rows.push({kind:'gap',start:end,end:task.startTime})
    rows.push({kind:'task',task})
    if(!end||task.endTime>end)end=task.endTime
  }
  return {rows,unscheduled:tasks.filter(t=>!t.startTime||!t.endTime)}
}
