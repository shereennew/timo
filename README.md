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



Timo by Git Push and Pray
Team: Eryne Chuah Ee Wen, Shereen New Jia Ning, Chong Tze Xuen, Chieng Mee Hui
Problem Statement: Stress & Workload Manager
Video Presentation: [Unlisted Youtube Link] 
Presentation Slides: [Public Link] 

1. Project Overview

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


2. Ideation & Process
2.1 Ideas We Considered
Table of every distinct idea generated, with why each was kept or dropped, order it so that chosen ideas are listed first

| Idea | Why it was dropped/kept |
| ---- | ----------------------- |
| Interactive Cat To-Do List | It was dropped because neither members have experience in using Unity Engine and C# |
| Interactive Avatar-Based Student Stress & Task Management | Dropped because implementing consequences into a stress and workload manager will guilt-trip the user into logging in everyday |
| Gamified Student Workload and Energy Management System | Dropped because the reward system makes the user feel obligated to keep logging in and doing tasks |
| Timo | Chosen because the features targets what problems stakeholders are facing and present the solution to their issues in a simplified way to tackle it |


2.2 Ideation Boards
You can embed the images directly (recommended) or have links to your ideation board. Don’t feel forced to add as many diagrams as you can for “more marks”. The reviewers want to know how your team put your minds together to create your solution. It can be messy, with a lot of small dropped ideas. Add 1–2 lines under each explaining what it shows.


IMPORTANT: You can express this in any way you like, including but not limited to:
Mindmaps
Problem trees
Flowcharts
User flows
Crazy eights
Affinity diagrams
SCAMPER grids
Fishbone diagrams
5 Whys chains
Any other scribbles :)
You can embed images in markdown like so:
![Mindmap](mindmap.png)
2.3 Mentor Consultation
Date
Mentor
Feedback Received
What Was Changed









Even if you disagreed with a piece of feedback, you can say so and explain why. You will not be penalised for doing something against a mentor’s advice, it will still count as engaging with it.
3. Design & Prototype
UI Prototype: [ Public Link ]
Check that it opens in an incognito window. This can be a link to Figma, Canva, Netlify, Vercel or any other board where you showcase your UI. It can be clickable with hyperlinks or simply ordered screenshots.
We recommend you embed or link 4–8 key screens as images, with a caption on each explaining the interaction
4. What Makes It Different

List out novel features and explain briefly which each is original or what the twist is.
You can have a comparison table to compare with existing solutions named in section 1 but this is completely optional.

5. Technical Architecture & Feasibility
Tech stack
Tell us your frontend, backend, database, APIs and services, as well as how and where you will be hosting. For each, try to tell us why you chose that technology, and what constraints you expect to face (For example, you chose Supabase because it’s free but you’ll still need a proxy)

| Component | Technology | Purpose | 
| --------- | ---------- | ------- |
| Frontend | Andriod Studio + Kotlin + Jetpack Compose | Build the Android mobile application with a modern, responsive UI |
| Backend | Firebase Cloud Functions | Handles backend logic and securely communicates with external APIs |
| Database | Firebase Firestore | Stores user accounts, tasks, schedules, check-ins, capacity data and points. Easy to integrate with Android |
| Authentication | Firebase Authentication | Provides secure user registration and login without building authentication from scratch |
| AI | Gemini API | Extracts information from uploaded documents, breaks assignments into tasks, provide recovery recommendations, and act as an AI chatbot when user feel stressed | 
| Notifications | Android WorkManager | Handles scheduled reminders and check-in notifications reliably | 
| Smartwatch | Android Health Connect | Allows the app to access supported health/activity data from compatible devices |

Expected Constraints:
1. Gemini - AI-generated tasks and deadlines may be inaccurate so users can review and edit generatee tasks before saving them
2. Firebase - Free-tier limits may restrict storage and usage during development
3. Smartwatch - Health data availability depends on the user's device and permissions so the app must still work without a smartwatch
4. Developement time - To remain feasible, advanced smartwatch integration will be treated as secondary if time is limited


System architecture diagram (Optional, if you feel it would help the reviewers understand your architecture better)


Build plan & scope
Explicitly tell the reviewer what you plan to build during the building phase. Narrow scope will read as realistic and feasible, not as a lack of ambition.

Phase 1 - Core Workload Management
Buiild:
1. User registration/login
2. Smart workload document upload
3. Gemini extraction and task decomposition
4. User review/edit/delete for generated tasks
5. Calendar/day task views
6. Capacity and Workload Dashboard

Phase 2 - Adaptive Capacity System
Build:
1. Initial stress quiz during user registration
2. Daily check-ins
3. Dynamic energy capacity calculation
4. Workload category tracking
5. Capacity status:
  a. 80-100%: stable
  b. 60-79&: need a break
  c. 30-59%: danger
  d. 0-29%: code red
6. Overload Intervention
7. Recovery recommendations
8. Adaptive Planner

Phase 3 - Supporting Features
Build:
1. Activity reminders and check-ins
2. Health connect/smartwatch integration

During the building phase, the team will focus primarily on the core workload, capacity, intervention and adaptive planning system. Smartwatch integration will be implemented only if sufficient development time remains. This ensures that the core functionality is completed and demonstrable within the competition timeframe.

