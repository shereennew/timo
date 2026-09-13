Timo by Git Push and Pray  
Team: Eryne Chuah Ee Wen, Shereen New Jia Ning, Chong Tze Xuen, Chieng Mee Hui  
Problem Statement: Stress & Workload Manager  
Video Presentation: [Timo Video Presentation](https://youtu.be/k9M8wnI8tVw)   
Presentation Slides: [Timo Presentation Slides](https://www.canva.com/design/DAHU3ykx1O4/pL2p9p5OW3lgPycNHYHdzQ/edit)

# 1. Project Overview

University students struggle to manage overlapping academic, work, social, personal, and physical commitments, making it difficult to recognise when their workload exceeds their capacity. For example: difficulty deciding what to prioritize or postpone, insufficient breaks and recovery time and schedules becoming unrealistic when new commitments arise. 

The primary stakeholders are university students, who experience the effects of excessive workload directly. Secondary stakeholders are lecturers and academic staff, and students working part-time. 

Exisiting productivity apps provide useful task and scheduling functions but don't fully address this gap. Google Calendar allows users to organize events, schedules and tasks while Todoist provides task organization, priorities, deadlines and AI-assisted task generation. However, these tools primarily help users organise what they need to do.

Our proposed solution focuses on determining what the student can realistically handle, detecting excessive workload, dynamically postponing lower-priority work and incorporating recovery into the schedule. Rather than simply helping students complete more tasks, the system is designed to help them maintain a sustainable workload.

Feature list: 
1. Overload Intervention and Recovery Assistant
2. Smart workload manager
3. Check ins
4. Energy capacity measurement
5. Capacity and Workload Dashboard
6. Adaptive Planner
7. AI chatbot  

These are the features going to be implemented into the app.

# 2. Ideation & Process  
## 2.1 Ideas We Considered  

| Idea | Why it was dropped/kept |
| ---- | ----------------------- |
| Interactive Cat To-Do List | It was dropped because neither members have experience in using Unity Engine and C# |
| Interactive Avatar-Based Student Stress & Task Management | Dropped because implementing consequences into a stress and workload manager will guilt-trip the user into logging in everyday |
| Gamified Student Workload and Energy Management System | Dropped because the reward system makes the user feel obligated to keep logging in and doing tasks |
| Timo | Chosen because the features targets what problems stakeholders are facing and present the solution to their issues in a simplified way to tackle it |

## 2.2 Ideation Boards  
### Mindmaps  
2nd draft  
<img width="891" height="1271" alt="2nd draft" src="https://github.com/user-attachments/assets/b97f3a92-8b1f-4e82-a7bf-5dd8574854d9" />  
Draft of Interactive Avatar-Based Student Stress & Task Management. Scribbles and doodles are avatar drafts.

Final draft  
<img width="1280" height="944" alt="final draft" src="https://github.com/user-attachments/assets/7b452329-1dbc-4560-ae3a-c081d929f4f0" />
Finalized mindmaps of the final features.    


### Feature Flowcharts  
### Login, logout and register
<img width="1861" height="911" alt="login, logout, signup drawio" src="https://github.com/user-attachments/assets/48c0471a-48a8-4f98-89ca-afe40667be09" /><br>
Usual login and logout. First-time registration will have to answer a short quiz to determine energy capacity. Energy capacity will be different for every user.

### Smart workload manager
<img width="597" height="1451" alt="smart workload manager drawio" src="https://github.com/user-attachments/assets/997b7822-55a6-4f70-93c8-4d722025c912" /> <br>
User can upload documents (e.g. assignment guidelines) to AI and it'll automatically extract details to create a schedule for the user. User can also modify the generated tasks before saving it into the schedule.  

### Popup notification
<img width="467" height="1362" alt="popup notification" src="https://github.com/user-attachments/assets/f7eab4fb-0d57-45c9-a185-f1d2f536e6f5" /><br>
Popup notification occurs when the user opens the app for the first time of the day to ask about their energy status for the day. There are notifications for reminders that a task is about to start and a quick check-in if the user is doing the task or would like to postpone said task.  

### Overload intervention
<img width="862" height="1751" alt="codenection-Overload intervenetion  drawio" src="https://github.com/user-attachments/assets/caf77e76-bc78-43ba-90b6-1b645e0b6806" /><br>
If the user's workload capacity is overloaded, the app will schedule a rest task. If therer's no available time, the app will instead ask if the user would like to postpone some tasks to rest.  

### Capacity and workload dashboard
<img width="439" height="928" alt="capacity and workload dashboard" src="https://github.com/user-attachments/assets/532b1794-ceb8-484b-b2de-e57d50bec2cf" /><br>
Users can view their energy capacity, today's task and schedule, workload summary and categories.  

### Adaptive planner
<img width="423" height="1591" alt="adaptive planner" src="https://github.com/user-attachments/assets/082018b9-7dba-42b9-a5c3-2325f69de15a" /><br>
User can add their own tasks in whichever category they prefer and if there are conflicts, the app will ask the user if they'd like to trade a low priority task with another on a different day.  

### Recovery assistant
<img width="491" height="1007" alt="recovery assistant" src="https://github.com/user-attachments/assets/62b03569-32c6-441a-855c-84a8c9789624" /><br>
The app will track the user's energy capacity and trigger different responses by recommending suitable rest and relaxing activities based on the remaining capacity.  


## 2.3 Mentor Consultation
| Date | Mentor | Feedback Received | What Was Changed |
| ---- | ------ | ----------------- | ---------------- |
| 10 September 2026 | Looi Wei En | Focus more on demonstrating the prototype | Changed focus from features to creating a semi-working prototype |
| 11 September 2026 | Lim Zi Yang | Integrate Moodle/student portal and health data, build an AI agent | Created mock health data and built an Ai chatbot. Student portal will be integrated into the app in the future |


# 3. Design & Prototype
UI Prototype: [ Public Link ]
Check that it opens in an incognito window. This can be a link to Figma, Canva, Netlify, Vercel or any other board where you showcase your UI. It can be clickable with hyperlinks or simply ordered screenshots.
We recommend you embed or link 4–8 key screens as images, with a caption on each explaining the interaction


# 4. What Makes It Different

| Novel Feature | What makes it different |
|---|---|
| Dynamic Energy Capacity | Instead of only tracking tasks, the app calculates the user's current capacity based on workload, available time, stress check-ins and recovery activities. |
| Adaptive Workload Intervention | When the user's capacity drops, the app doesn't just send a warning. It automatically reduces or postpones lower-priority tasks while protecting important deadlines. |
| AI-powered Workload Breakdown | Users can upload their syllabi or assignment documents, and Gemini extracts deadlines and breaks large assignments into smaller, manageable tasks, reducing manual task creation. |
| Recovery-Aware Planning | Recovery is treated as part of workload management. The app recommends suitable breaks or recovery activities based on the user's current capacity instead of simply encouraging them to work more. |
| Continuous Recalculation | The user's capacity doesn't simply reset every day. Changes in workload, completed tasks, stress and recovery continuously affect their current capacity and schedule. |

Existing productivity apps mainly help users organize what they need to do. Our system goes further by considering what the user can realistically handle and actively adjusting their workload when their capacity decreases.


# 5. Technical Architecture & Feasibility
## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Android Studio + Kotlin + Jetpack Compose | Build the Android mobile application with a modern, responsive UI |
| Backend | Firebase Cloud Functions | Handles backend logic and securely communicates with external APIs |
| Database | Firebase Firestore | Stores user accounts, tasks, schedules, check-ins, capacity data and points. Easy to integrate with Android |
| Authentication | Firebase Authentication | Provides secure user registration and login without building authentication from scratch |
| AI | Gemini API | Extracts information from uploaded documents, breaks assignments into tasks, provides recovery recommendations, and acts as an AI chatbot when users feel stressed |
| Notifications | Android WorkManager | Handles scheduled reminders and check-in notifications reliably |
| Health data | Android Health Connect | Allows the app to access supported health/activity data from compatible devices |
| Student portal | Moodle | Allows the app to read course information, syllabi, more coursework without much user intervention |

### Expected Constraints:
1. Gemini - AI-generated tasks and deadlines may be inaccurate so users can review and edit generatee tasks before saving them
2. Firebase - Free-tier limits may restrict storage and usage during development
3. Smartwatch - Health data availability depends on the user's device and permissions so the app must still work without a smartwatch
4. Development time - To remain feasible, advanced smartwatch integration will be treated as secondary if time is limited

## System architecture diagram  


## Build plan & scope  
### Phase 1 - Core Workload Management  
1. User registration/login
2. Smart workload document upload
3. Gemini extraction and task decomposition
4. User review/edit/delete for generated tasks
5. Calendar/day task views
6. Capacity and Workload Dashboard

### Phase 2 - Adaptive Capacity System  
1. Initial stress quiz during user registration
2. Daily check-ins
3. Dynamic energy capacity calculation
4. Workload category tracking
5. Capacity status:
    - 80-100%: stable
    - 60-79%: need a break
    - 30-59%: danger
    - 0-29%: code red
6. Overload Intervention
7. Recovery recommendations
8. Adaptive Planner

### Phase 3 - Supporting Features  
1. Activity reminders and check-ins
2. Health connect/smartwatch integration

During the building phase, the team will focus primarily on the core workload, capacity, intervention and adaptive planning system. Smartwatch integration will be implemented only if sufficient development time remains. This ensures that the core functionality is completed and demonstrable within the competition timeframe.


# timö — tiny moments: first screen

A mobile-first student workload dashboard made with React, JavaScript, and ordinary CSS.

## Run it

Open this folder in VS Code, open a terminal, then run:

```sh
npm install
npm run dev
```

Open the local address Vite prints. Keep the terminal running. Save an edit to see the browser update automatically.

## Files to learn first

- `src/App.jsx`: the dashboard markup, sample categories, calculated total, and suggestion button. JSX is HTML-like markup inside JavaScript. `className` connects an element to CSS.
- `src/App.css`: dashboard colors, cards, spacing, and small-screen adjustments.
- `src/index.css`: page-wide font, background, and box sizing.
- `src/main.jsx`: attaches the App component to the `root` element in the HTML file.
- `index.html`: the browser page, title, description, and root element.
- `package.json`: dependencies and commands. `dev` runs the local app; `build` creates a production version; `lint` checks code.
- `vite.config.js`: connects React to Vite. You can leave this alone for now.

## Try your first edit

In `src/App.jsx`, change Academic’s `points: 5` to `points: 2` and save. The total becomes 7 / 8 and the warning disappears. Change it back to restore the overloaded demo.

The demo starts at 10 planned points against 8 points of capacity. Points represent illustrative effort, not hours or a medical score. Recovery time is shown separately. Lighten My Load opens a suggestion; it does not move tasks or save changes. Refreshing resets the panel. No database, AI service, account, or extra styling framework is connected.

The generated starter uses Oxlint for its `npm run lint` command.





