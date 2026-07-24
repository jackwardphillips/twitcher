export function validateProductionPollerEnvironment(writeSightings: boolean): void {
  if (writeSightings && !process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required for production polling');
  }
}
