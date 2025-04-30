// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI'] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  mongodbUri: process.env.MONGODB_URI!,
}; 