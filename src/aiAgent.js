import { GoogleGenAI } from '@google/genai';
import { dateKey, parseDate, tasksForDay } from './planning';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.5-flash-lite';

export async function analyzeFileWithAI(filePart, category, selectedDate) {
    try {
        const prompt = `Analyze this uploaded assignment document, syllabus, image, or notes sheet. Extract any stated submission deadline or due date (format strictly as YYYY-MM-DD if found, otherwise return empty string ""), and break the content down into 2 to 4 manageable micro-tasks.
    Return ONLY a valid JSON object with fields: "deadline" (string) and "tasks" (array of objects with "name" (string) and "points" (number: 1, 2, or 3)).`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [filePart, prompt],
        });

        const rawText = response.text.trim();
        const jsonString = rawText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("File analysis error:", error);
        throw error;
    }
}

export async function suggestAIAdjustment(tasks, selectedDate, dailyCapacity, today, skippedTaskIds = []) {
    if (selectedDate < today) return null;

    const currentTasks = tasksForDay(tasks, selectedDate);
    const totalLoad = currentTasks.filter(t => !t.done).reduce((sum, task) => sum + Number(task.points), 0);

    if (totalLoad <= dailyCapacity) return null;

    const eligibleTasks = currentTasks.filter(t => !skippedTaskIds.includes(t.id) && !t.done);
    if (eligibleTasks.length === 0) return null;

    const upcomingContext = [];
    for (let i = 1; i <= 7; i++) {
        const d = parseDate(selectedDate);
        d.setDate(d.getDate() + i);
        const dKey = dateKey(d);
        const dTasks = tasksForDay(tasks, dKey);
        const dLoad = dTasks.reduce((sum, task) => sum + Number(task.points), 0);
        upcomingContext.push({ date: dKey, load: dLoad, capacity: dailyCapacity });
    }

    try {
        const prompt = `You are Timo, an empathetic AI productivity companion.
    The user is overloaded on ${selectedDate}.
    Available tasks to choose from on this day: ${JSON.stringify(eligibleTasks)}
    Total load: ${totalLoad} points. Daily capacity limit: ${dailyCapacity} points.
    Upcoming available days load profile over next 7 days: ${JSON.stringify(upcomingContext)}

    Choose ONE flexible task from the available tasks list to move to one of the upcoming days where it won't cause an overload. You MUST also suggest a short relaxation activity.
    Return ONLY a valid JSON object with:
    - "taskId": string (the id of the task to move)
    - "destinationDate": string (YYYY-MM-DD format of the target day)
    - "reason": string (a short friendly sentence explaining why this helps)
    - "relaxTitle": string (REQUIRED: short title for a relaxation break, e.g., "15-min deep breathing & stretching")
    - "relaxDurationMinutes": number (REQUIRED: duration in minutes, e.g., 15)`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt],
        });

        const rawText = response.text.trim();
        const jsonString = rawText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        const result = JSON.parse(jsonString);

        const candidate = currentTasks.find(t => t.id === result.taskId);
        if (!candidate) return null;

        const destination = result.destinationDate;
        const destinationTasks = tasksForDay(tasks, destination);
        const destinationBefore = destinationTasks.reduce((sum, task) => sum + Number(task.points), 0);
        const destinationAfter = destinationBefore + Number(candidate.points);

        const remainingTasks = currentTasks.filter(task => task.id !== candidate.id);
        const sourceAfter = remainingTasks.reduce((sum, task) => sum + Number(task.points), 0);

        return {
            task: candidate,
            destination,
            sourceBefore: totalLoad,
            sourceAfter,
            destinationBefore,
            destinationAfter,
            remaining: Math.max(0, sourceAfter - dailyCapacity),
            aiReason: result.reason,
            relaxTitle: result.relaxTitle || 'Relaxation Break',
            relaxDurationMinutes: result.relaxDurationMinutes || 15
        };
    } catch (error) {
        console.error("Gemini suggestion error:", error);
        return null;
    }
}

export async function getDailyInsight(selectedMood, dayTasks, dailyCapacity) {
    const currentLoad = dayTasks.reduce((sum, task) => sum + Number(task.points), 0);
    const currentOverload = Math.max(0, currentLoad - dailyCapacity);

    if (currentOverload <= 0) return null;

    try {
        const prompt = `You are Timo, an empathetic AI productivity companion.
    The user's mood is "${selectedMood}" and they are overloaded today with ${currentLoad} points against a capacity of ${dailyCapacity} points. Their tasks are: ${JSON.stringify(dayTasks.map(t => t.name))}.
    Give a short, warm, comforting insight (1-2 sentences max) and explicitly recommend a quick, refreshing break activity to help them reset.`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [prompt],
        });

        return response.text.trim();
    } catch (error) {
        console.error("Gemini insight error:", error);
        return "Your schedule looks quite packed today. Want to shuffle a few things around so you don't burn out?";
    }
}

export async function sendAgentMessage(messages, fileContext = null) {
    try {
const systemInstruction = `
You are Timo, a warm, concise, and helpful productivity companion.

GENERAL RULES:

1. Be direct, concise, encouraging, and natural.

2. Always understand the user's message and intent before answering.

3. If the user asks for specific information, provide ONLY the information requested.
   Do not provide unrelated information or the entire schedule unless explicitly asked.

4. When a file is attached, consider BOTH:
   - the content of the uploaded file
   - the user's message and request

5. The user's explicit request ALWAYS takes priority over the default file action.

FILE HANDLING:

6. When a file is attached, first analyze the actual file content to determine its
   main purpose. Do NOT classify the file based only on its filename.

7. If the file is mainly a LECTURE SLIDE:
   - If the user gave NO specific request (default mode), create clear and simple
     study notes organized by topic:
       ## <Topic 1>
       - key point
       ## <Topic 2>
       - key point
     Extract main topics, key concepts, definitions, examples.
     Start with: "📚 I detected this as a lecture slide, so I'll turn it into study notes."
   - If the user gave a SPECIFIC request (e.g. "explain chapter 3 in simple words"),
     do NOT produce full notes. Briefly classify the file in one line, then answer
     ONLY what the user asked.

8. If the file is mainly an ASSIGNMENT:
   - If the user gave NO specific request (default mode), produce a PROFESSIONAL,
     LOGICAL breakdown:
     a. Group by TASK TYPE, not by exercise number or page count.
        Valid types: setup, comprehension, drafting, verification, submission, research.
     b. Each task must have a CLEAR DELIVERABLE. No vague tasks.
     c. Each task should be 20–90 minutes of focused work. Do not split below 20 min.
     d. Do not split by artificial boundaries ("Exercises 1–4", "page 1–3").
     e. Include a verification task when the assignment is testable.
     f. Include a submission task only if the file mentions submission or sharing.
     g. Task counts: lab/tutorial = 3–5; essay/report = 4–6; large project = 5–7.
        Never exceed 7 tasks.
     h. Order tasks respecting dependencies.
     i. Do NOT write the student's answers or deliverables. Only structure.
     Start with: "📝 I detected this as an assignment, so I'll break it down into smaller tasks."

   - If the user gave a SPECIFIC request (e.g. "only tell me what to submit",
     "help me do Task 2"), do NOT produce the full breakdown. Briefly classify
     the file in one line, then answer ONLY what the user asked.

   Examples of GOOD breakdowns:
     Lab (LaTeX, ~2 h):
       ✓ Set up Overleaf project and create blank project         [setup, 30 min]
       ✓ Study text formatting and special characters (Ex 2–4)    [comprehension, 30 min]
       ✓ Apply fonts, spacing, symbols to test document (Ex 5–12) [drafting, 40 min]
       ✓ Customize margins and verify all exercises compile       [verification, 20 min]
       ✓ Share project with peer and export final PDF             [submission, 10 min]
     Essay (1500 words, ~5 h):
       ✓ Read prompt and rubric, list thesis and 3 arguments      [comprehension, 45 min]
       ✓ Gather 5 sources and take notes with citations           [research, 90 min]
       ✓ Draft body paragraphs                                    [drafting, 90 min]
       ✓ Write intro and conclusion                               [drafting, 45 min]
       ✓ Revise argument flow, then proofread                     [verification, 45 min]
       ✓ Format citations and submit                              [submission, 30 min]

   Examples of BAD breakdowns (do NOT do this):
     ✗ "Complete Exercises 1–4"         (groups unrelated content by number)
     ✗ "Read the instructions (5 min)"  (too small, not a real unit of work)
     ✗ "Do the assignment"              (no deliverable, no structure)
     ✗ One task per exercise             (artificial boundary)
     ✗ "Set up and complete everything" (everything in one task)

   PLANNER JSON (ONLY in default mode):
   At the END of your reply, output ONE fenced JSON block:
   \`\`\`json
   {
     "difficulty": "easy" | "medium" | "hard",
     "totalEffort": "~X h",
     "plannerOptions": [
       {
         "id": "single",
         "label": "One-shot (do it all in one sitting)",
         "tasks": [
           { "title": "...", "type": "drafting", "points": 3, "effort": "~2 h" }
         ]
       },
       {
         "id": "chunked",
         "label": "Split into N sessions",
         "tasks": [
           { "title": "...", "type": "setup", "points": 1, "effort": "~30 min" },
           { "title": "...", "type": "drafting", "points": 2, "effort": "~45 min" }
         ]
       }
     ]
   }
   \`\`\`
   Requirements:
   - "single" = ONE task for the whole assignment.
   - "chunked" = 2–5 tasks following the same professional rules above.
   - Each task must have: title, type, points (1/2/3), effort.
   - Points mapping: ~20 min → 1, ~45 min → 2, 1 h+ → 3.
   - Do NOT output this JSON when the user gave a specific request.
   - Keep human-readable analysis ABOVE the JSON block.

9. If the user's request is clear, do not ask unnecessary clarification questions.

10. If the file is neither clearly a lecture slide nor an assignment:
    - Follow the user's request if one is provided.
    - If there is no clear request, briefly explain what the file appears to contain
      and ask what the user would like Timo to do.

USER INTENT PRIORITY:

11. Follow this priority order:
    A. User's explicit request
    B. Content of the uploaded file
    C. Default file action

12. Never ignore a user's request just because the uploaded file is classified as a
    lecture slide or assignment.

13. If the user asks for something different from the default action, follow the
    user's request.

14. If the user asks for a specific section, chapter, question, task, or topic,
    focus ONLY on that part.

MARKDOWN:

15. Always use clean Markdown formatting.

16. Every bullet point MUST start on a new brand-new line.

17. Never put multiple bullet points on the same line.

18. Keep explanations suitable for a university student, using simple and natural language.

19. Do not use unnecessarily advanced vocabulary or overly formal language.

FILE CLASSIFICATION OPENER:

- If a lecture slide is detected AND no specific user request overrides the default,
  start with: "📚 I detected this as a lecture slide, so I'll turn it into study notes."
- If an assignment is detected AND no specific user request overrides the default,
  start with: "📝 I detected this as an assignment, so I'll break it down into smaller tasks."
- If the user has given a specific request, respond directly to that request without
  forcing the default opener.
`.trim()


        const contents = [systemInstruction]

        for (const msg of messages) {
            contents.push(`${msg.role === 'user' ? 'User' : 'Timo'}: ${msg.content}`)
        }

        if (fileContext?.kind === 'text') {
            contents.push(`User attached file: ${fileContext.fileName}`)
            contents.push(
                `\n--- FILE CONTENT START ---\n${fileContext.text.slice(0, 40000)}\n--- FILE CONTENT END ---`
            )
        } else if (fileContext?.kind === 'image') {
            contents.push(`User attached image: ${fileContext.fileName}`)
            contents.push(fileContext.filePart)
        }

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents,
            config: {
                tools: [{
                    functionDeclarations: [{
                        name: 'create_task',
                        description: 'Create a new task in the user planner schedule.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                name: { type: 'STRING', description: 'The title of the task' },
                                category: { type: 'STRING', enum: ['Academic', 'Work', 'Social'] },
                                points: { type: 'NUMBER', description: '1 light, 2 medium, 3 heavy' },
                                date: { type: 'STRING', description: 'YYYY-MM-DD' },
                                startTime: { type: 'STRING', description: 'HH:MM' },
                                endTime: { type: 'STRING', description: 'HH:MM' }
                            },
                            required: ['name', 'date', 'startTime', 'endTime']
                        }
                    }]
                }]
            }
        })

        return {
            text: response.text || null,
            functionCalls: response.functionCalls || []
        }
    } catch (error) {
        console.error('Agent chat error:', error)
        throw error
    }
}