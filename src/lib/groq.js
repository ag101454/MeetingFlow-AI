import Groq from 'groq-sdk';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

export const groq = new Groq({
  apiKey: groqApiKey,
  dangerouslyAllowBrowser: true
});

// Transcription using Whisper (free via Groq)
export async function transcribeAudio(audioFile) {
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      response_format: "verbose_json",
    });
    return transcription;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// Generate meeting insights
export async function generateMeetingInsights(transcript) {
  const prompt = `
    Analyze this meeting transcript and provide a structured output in JSON format:
    
    Transcript: "${transcript}"
    
    Return ONLY a JSON object with these fields:
    {
      "summary": "Executive summary of the meeting (2-3 sentences)",
      "highlights": ["Key highlight 1", "Key highlight 2", "Key highlight 3"],
      "decisions": ["Decision 1", "Decision 2"],
      "risks": ["Risk 1 if any", "Risk 2 if any"],
      "questions": ["Question 1 if any", "Question 2 if any"],
      "action_items": [
        {
          "title": "Task title",
          "description": "Detailed task description",
          "assignee": "Person name mentioned",
          "priority": "low|medium|high|urgent",
          "deadline": "Deadline if mentioned in the transcript"
        }
      ]
    }
  `;

  const completion = await groq.chat.completions.create({
    model: "mixtral-8x7b-32768", // Free model
    messages: [
      { 
        role: "system", 
        content: "You are an AI meeting assistant that analyzes transcripts and extracts actionable insights. Always respond with valid JSON." 
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content);
}

// AI Assistant for project queries
export async function askAssistant(question, context) {
  const prompt = `
    You are MeetingFlow AI Assistant, a helpful project management assistant.
    
    Available Context:
    ${JSON.stringify(context, null, 2)}
    
    User Question: ${question}
    
    Instructions:
    - Answer based ONLY on the provided context
    - If information is not in context, say "I don't have enough information to answer that"
    - Be concise and professional
    - Format lists and data clearly
    - Suggest actions when appropriate
  `;

  const completion = await groq.chat.completions.create({
    model: "llama3-8b-8192", // Fast and free
    messages: [
      { role: "system", content: "You are MeetingFlow AI, a professional project management assistant." },
      { role: "user", content: prompt }
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });

  return completion.choices[0].message.content;
}

// Generate weekly reports
export async function generateWeeklyReport(projectData) {
  const prompt = `
    Generate a professional weekly project report based on this data:
    ${JSON.stringify(projectData, null, 2)}
    
    Include these sections:
    1. Executive Summary
    2. Completed Tasks This Week
    3. In Progress Tasks
    4. Upcoming Deadlines
    5. Team Productivity Overview
    6. Risks and Blockers
    7. Next Week's Goals
    8. Recommendations
    
    Format in markdown for easy reading.
  `;

  const completion = await groq.chat.completions.create({
    model: "mixtral-8x7b-32768",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 2000,
  });

  return completion.choices[0].message.content;
}Meetings.jsx