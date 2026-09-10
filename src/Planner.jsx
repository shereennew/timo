import {dateKey,parseDate,conflicts} from './planning'
import {timelineFor} from './timeline'
export default function Planner({date,today,tasks,onDate,onEdit,onToggle,onAdd}) {
 const {rows,unscheduled}=timelineFor(tasks)
 function step(offset){const d=parseDate(date);d.setDate(d.getDate()+offset);onDate(dateKey(d))}
 function card(task){return <article className="planner-card" key={task.id}>
   <p className="planner-time">{task.startTime&&task.endTime?`${task.startTime}–${task.endTime}`:'Choose a time when ready'}</p>
   <label className="completion-toggle"><input type="checkbox" checked={!!task.done} onChange={()=>onToggle(task)} /><strong style={{textDecoration:task.done?'line-through':'none'}}>{task.name}</strong></label>
   <div className="planner-meta"><span>{task.category}</span><span className={`priority-badge priority-${task.priority||'medium'}`}>{task.priority||'medium'} priority</span>{task.fixed&&<span>Fixed</span>}</div>
   {task.deadline&&<p className="helper">Due {task.deadline}</p>}
   {conflicts(tasks,task).length>0&&<p className="helper">Overlapping plans — check the times.</p>}
   <button className="remove-task" onClick={()=>onEdit(task)} aria-label={`Edit ${task.name}`}>Edit</button>
 </article>}
 return <section className="daily-planner">
   <h2 aria-live="polite">{parseDate(date).toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'})}</h2>
   <div className="intro"><h1>Your daily planner</h1><p>A little structure, a little breathing room.</p></div>

   

   <p className="helper">{tasks.filter(t=>t.done).length} of {tasks.length} done. Free time shows gaps between scheduled tasks.</p>
   <div className="planner-timeline">{rows.length?rows.map(row=>row.kind==='gap'?<div className="planner-gap" key={`gap-${row.start}`}><strong>{row.start}–{row.end}</strong><span>Free time</span></div>:card(row.task)):<p>No timed plans yet.</p>}</div>
   {unscheduled.length>0&&<section><h2>Unscheduled</h2><p className="helper">These tasks have no complete time slot yet.</p>{unscheduled.map(card)}</section>}
   <section className="planner-date-controls" aria-label="Change planner date"><h2>Change day</h2>
   <div className="planner-navigation"><button onClick={()=>step(-1)} aria-label="Previous day">‹</button><label>Choose date<input type="date" required value={date} onChange={e=>{if(e.target.value)onDate(e.target.value)}} /></label><button onClick={()=>step(1)} aria-label="Next day">›</button></div>
   <div className="page-actions"><button onClick={()=>onDate(today)}>Back to today</button><button onClick={onAdd}>+ Add task</button></div></section>
 </section>
}

