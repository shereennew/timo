import { GoogleGenAI } from '@google/genai';
import { dateKey, parseDate, tasksForDay } from './planning';

// Initialize the Gemini client using Vite environment variables
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const MODEL_NAME = 'gemini-3.5-flash-lite';

/**
 * 1. Analyzes an uploaded file (syllabus, document, photo) to extract deadlines and micro-tasks.
 */
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

/**
 * 2. Suggests an intelligent workload adjustment when the user is overloaded.
 */
export async function suggestAIAdjustment(tasks, selectedDate, dailyCapacity, today, skippedTaskIds = [], categories, tasksForDay, parseDate, dateKey) {
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

    Choose ONE flexible task from the available tasks list to move to one of the upcoming days where it won't cause an overload.
    Return ONLY a valid JSON object with:
    - "taskId": string (the id of the task to move)
    - "destinationDate": string (YYYY-MM-DD format of the target day)
    - "reason": string (a short friendly sentence explaining why this helps)`;

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
            aiReason: result.reason
        };
    } catch (error) {
        console.error("Gemini suggestion error:", error);
        return null;
    }
}

/**
 * 3. Generates a comforting daily insight message based on user mood and overload status.
 */
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

/**
 * 4. Handles chat agent messaging with Tool Use (Function Calling) enabled.
 */
export async function sendAgentMessage(messages, filePart = null) {
    try {
        const systemInstruction = `
You are Timo, a warm and concise productivity companion. 
Rules for your answers:
1. Be direct and concise. 
2. When the user asks for specific information (like free time, a single task, or a deadline), provide ONLY that information. Do not dump the entire schedule or unrequested details unless explicitly asked.
3. Keep your tone encouraging, helpful, and natural.
4. Use bullet points whenever you are listing items, free time slots, or multiple details to keep your responses clean and easy to read.
5. Be direct and provide only the specific information requested.
`;

        const contents = [systemInstruction];

        for (const msg of messages) {
            contents.push(`${msg.role === 'user' ? 'User' : 'Timo'}: ${msg.content}`);
        }

        if (filePart) {
            contents.push(filePart);
        }

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: contents,
            config: {
                tools: [{
                    functionDeclarations: [
                        {
                            name: 'create_task',
                            description: 'Create a new task in the user planner schedule.',
                            parameters: {
                                type: 'OBJECT',
                                properties: {
                                    name: { type: 'STRING', description: 'The title of the task' },
                                    category: { type: 'STRING', enum: ['Academic', 'Work', 'Social'] },
                                    points: { type: 'NUMBER', description: '1 for light, 2 for medium, 3 for heavy' },
                                    date: { type: 'STRING', description: 'YYYY-MM-DD format' },
                                    startTime: { type: 'STRING', description: 'HH:MM format, e.g. 14:00' },
                                    endTime: { type: 'STRING', description: 'HH:MM format, e.g. 15:00' }
                                },
                                required: ['name', 'date', 'startTime', 'endTime']
                            }
                        }
                    ]
                }]
            }
        });

        return {
            text: response.text || null,
            functionCalls: response.functionCalls || []
        };
    } catch (error) {
        console.error("Agent chat error:", error);
        throw error;
    }
}