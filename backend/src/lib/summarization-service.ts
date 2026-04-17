import { PrismaClient } from '@prisma/client';

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
 * Generates a concise chase intel summary using Gemini API.
 */
export async function summarizeIncident(prisma: PrismaClient, incidentId: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured. Skipping summarization.');
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

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        geminiSummary: summary || incident.geminiSummary, // Retain old if new is empty? Spec says: "Fallback: If no new signal is found in recent comments, retain the old summary. If no useful signal exists at all, return an empty string."
        // Actually, if Gemini returns empty, we might want to keep the old one if it was better.
        // But the prompt says "return an empty string if no useful signal exists".
        // Let's follow: "If no new signal is found in recent comments, retain the old summary."
        summaryGeneratedAt: now
      }
    });
  } catch (error) {
    console.error(`Failed to summarize incident ${incidentId}:`, error);
  }
}
