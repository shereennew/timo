import { useState } from 'react'
import './App.css'
function read(key,fallback){try{return localStorage.getItem(key)||fallback}catch{return fallback}}
export default function Profile({theme,setTheme,background,setBackground}) {
 const [view,setView]=useState('menu')
 const [name,setName]=useState(()=>read('timo-name','Mindful User'))
 const [username,setUsername]=useState(()=>read('timo-username','mindful_planner'))
 const [message,setMessage]=useState('')
 function save(e){e.preventDefault();try{localStorage.setItem('timo-name',name);localStorage.setItem('timo-username',username);setMessage('Profile saved in this browser.')}catch{setMessage('Could not save. Browser storage may be unavailable.')}}
 return <section className="profile-container">
 <div className="profile-header"><div className="profile-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()||'U'}</div><h1>Profile & Preferences</h1></div>
 {view==='menu'?<div className="profile-menu-grid"><button className="menu-nav-btn account-btn" onClick={()=>setView('account')}>👤 Profile details</button><button className="menu-nav-btn settings-btn" onClick={()=>setView('settings')}>⚙️ Appearance</button></div>:<>
 <button className="back-button" onClick={()=>{setView('menu');setMessage('')}}>← Back</button>
 {view==='account'?<form className="profile-form" onSubmit={save}>
 <p className="helper">Local profile only. Sign-in, passwords and cross-device syncing are not connected.</p>
 <div className="form-group"><label htmlFor="profile-name">Name</label><input id="profile-name" required maxLength={40} value={name} onChange={e=>setName(e.target.value)} /></div>
 <div className="form-group"><label htmlFor="profile-username">Username</label><input id="profile-username" required maxLength={40} value={username} onChange={e=>setUsername(e.target.value)} /></div>
 <button className="primary-button">Save profile</button><p role="status">{message}</p>
 </form>:<div className="profile-form"><div className="form-group"><label htmlFor="theme-select">Colour theme</label><select id="theme-select" className="theme-dropdown" value={theme} onChange={e=>setTheme(e.target.value)}><option value="purple">Lavender</option><option value="pink">Blush pink</option><option value="blue">Pastel blue</option><option value="green">Pastel green</option></select></div><div className="form-group"><label htmlFor="background-select">Background</label><select id="background-select" className="theme-dropdown" value={background} onChange={e=>setBackground(e.target.value)}><option value="warm">Warm white</option><option value="lilac">Lilac</option><option value="white">White</option></select></div><p className="helper">Theme changes apply immediately. Task and recovery notifications are not available yet.</p></div>}
 </>}
 </section>
}
