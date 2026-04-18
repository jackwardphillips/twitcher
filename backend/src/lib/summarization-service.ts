import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

/**
 * Aggregates all observer comments for an incident from the last 7 days.
 */
export async function getRecentComments(prisma: PrismaClient, incidentId: string): Promise<string> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sightings = await prisma.sighting.findMany({
    where: {
      incidentId,
      date: {
        gte: sevenDaysAgo,
      },
      details: {
        not: null,
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  return sightings
    .map(s => s.details?.trim())
    .filter(d => !!d)
    .join(' ');
}

/**
 * Generates a concise chase intel summary using Groq or Gemini API.
 */
export async function summarizeIncident(prisma: PrismaClient, incidentId: string): Promise<void> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    console.warn('Neither GROQ_API_KEY nor GEMINI_API_KEY is configured. Skipping summarization.');
    return;
  }

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, geminiSummary: true, summaryGeneratedAt: true }
  });

  if (!incident) return;

  // Skip if already summarized today
  const now = new Date();
  if (incident.summaryGeneratedAt) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastGen = new Date(incident.summaryGeneratedAt.getFullYear(), incident.summaryGeneratedAt.getMonth(), incident.summaryGeneratedAt.getDate());
    if (lastGen.getTime() === today.getTime()) {
      return;
    }
  }

  const comments = await getRecentComments(prisma, incidentId);

  // Skip if no comments and no prior summary
  if (!comments && !incident.geminiSummary) {
    return;
  }

  const prompt = `
Summarize the recent chase intel for this bird sighting based on the following observer comments.
Existing summary (for context/refinement): "${incident.geminiSummary || ''}"
Recent comments (last 7 days): "${comments}"

Instruction: Extract precise location cues (trails, landmarks, distances), timing patterns, and behavioral context.
Noise Filter: Ignore content-free phrases like "continuing," "still present," or "seen today."
Output Format: 1–2 sentences of plain prose. If no useful signal exists, return an empty string.
`;

  let summary = '';
  let success = false;

  // Try Groq first if available
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a birding assistant providing concise chase intel.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 150
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        summary = data.choices?.[0]?.message?.content?.trim() || '';
        success = true;
      } else {
        const errorData = await response.json() as any;
        console.warn(`Groq API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Groq summarization failed:', error);
    }
  }

  // Fallback to Gemini if Groq failed or not available
  if (!success && geminiKey) {
    try {
      // Use v1beta and gemini-2.0-flash as per spec/list
      const model = 'gemini-2.0-flash';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        success = true;
      } else {
        const errorData = await response.json() as any;
        console.warn(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Gemini summarization failed:', error);
    }
  }

  if (success) {
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        geminiSummary: summary || incident.geminiSummary,
        summaryGeneratedAt: now
      }
    });
  }
}

/**
 * Runs a summarization cycle for all active incidents (sightings in the last 7 days).
 */
export async function runSummarizationCycle(prisma: PrismaClient): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeIncidents = await prisma.incident.findMany({
    where: {
      lastSeen: {
        gte: sevenDaysAgo,
      },
      status: {
        in: ['OPEN', 'CLOSED']
      }
    },
    include: {
      sightings: {
        take: 1,
        orderBy: { date: 'desc' }
      }
    }
  });

  console.log(`Starting summarization cycle for ${activeIncidents.length} incidents...`);

  for (const incident of activeIncidents) {
    console.log(`Processing summary for: ${incident.commonName}...`);
    await summarizeIncident(prisma, incident.id);
    // 2 second delay for Groq (safe 30 RPM)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('Summarization cycle complete.');
}
