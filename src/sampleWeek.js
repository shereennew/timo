import { dateKey, parseDate, conflicts } from './planning'

// Add this sample week once, keeping existing plans and finding free time slots.
export function addSampleWeek(existing, today) {
  const days = [
    [['Review lecture notes','Academic',2,60],['Assignment research','Academic',3,90],['Call a friend','Social',1,30]],
    [['Practice quiz questions','Academic',2,60],['Cafe shift','Work',3,180],['Group project check-in','Social',1,30]],
    [['Read next chapter','Academic',1,45],['Lunch with friends','Social',1,60]],
    [['Outline presentation','Academic',2,60],['Prepare for the week','Academic',1,30]],
    [['Attend a lecture','Academic',2,60],['Write assignment draft','Academic',3,90],['Part-time shift','Work',3,120],['Society meeting','Social',1,45]],
    [['Revise difficult topics','Academic',2,60],['Proofread assignment','Academic',1,45],['Catch up with classmates','Social',1,30]],
    [['Submit assignment','Academic',1,30],['Presentation practice','Academic',2,60],['Celebrate the week with friends','Social',1,60]],
  ]
  const result=[...existing]
  days.forEach((entries,offset)=>{
    const d=parseDate(today);d.setDate(d.getDate()+offset);const date=dateKey(d)
    entries.forEach(([name,category,points,duration],index)=>{
      const id=`sample-week-v2-${offset}-${index}`
      if(result.some(t=>t.id===id))return
      const task={id,name,category,points,date,fixed:['Cafe shift','Part-time shift','Attend a lecture','Society meeting'].includes(name),done:false,deadline:category==='Academic'?dateKey(new Date(d.getFullYear(),d.getMonth(),d.getDate()+2,12)):'',startTime:'',endTime:''}
      const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
      for(let start=9*60;start+duration<=21*60;start+=30){
        const timed={...task,startTime:time(start),endTime:time(start+duration)}
        if(!conflicts(result,timed).length){Object.assign(task,timed);break}
      }
      result.push(task)
    })
  })
  return result
}
