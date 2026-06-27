import { logger } from "./logger";

interface EnvVarConfig {
  name: string;
  required: boolean;
  defaultValue?: string;
  validate?: (value: string) => boolean;
  errorMessage?: string;
}

const envVars: EnvVarConfig[] = [
  {
    name: "NODE_ENV",
    required: false,
    defaultValue: "development",
  },
  {
    name: "PORT",
    required: false,
    defaultValue: "8000",
    validate: (v) => {
      const num = parseInt(v, 10);
      return num > 0 && num <= 65535;
    },
    errorMessage: "PORT must be a number between 1 and 65535",
  },
  {
    name: "MONGO_URI",
    required: true,
    validate: (v) => v.startsWith("mongodb"),
    errorMessage: "MONGO_URI must be a valid MongoDB connection string",
  },
  {
    name: "REDIS_URL",
    required: false,
    defaultValue: "redis://localhost:6379",
    validate: (v) => v.startsWith("redis"),
    errorMessage: "REDIS_URL must be a valid Redis connection string",
  },
  {
    name: "CORS_ORIGINS",
    required: false,
  },
  {
    name: "JWT_SECRET",
    required: true,
    validate: (v) => v.length >= 32,
    errorMessage: "JWT_SECRET must be at least 32 characters",
  },
  {
    name: "CLERK_PUBLISHABLE_KEY",
    required: true,
    validate: (v) => v.startsWith("pk_"),
    errorMessage: "CLERK_PUBLISHABLE_KEY must start with 'pk_'",
  },
  {
    name: "CLERK_SECRET_KEY",
    required: true,
    validate: (v) => v.startsWith("sk_"),
    errorMessage: "CLERK_SECRET_KEY must start with 'sk_'",
  },
  {
    name: "GROQ_API_KEY",
    required: true,
    validate: (v) => v.length > 0,
  },
  {
    name: "GEMINI_API_KEY",
    required: false,
  },
  {
    name: "AZURE_SPEECH_KEY",
    required: false,
    validate: (v) => !v || v.length > 0,
  },
  {
    name: "AZURE_SPEECH_REGION",
    required: false,
  },
  {
    name: "CLOUDINARY_CLOUD_NAME",
    required: false,
  },
  {
    name: "CLOUDINARY_API_KEY",
    required: false,
  },
  {
    name: "CLOUDINARY_API_SECRET",
    required: false,
  },
  {
    name: "SENTRY_DSN",
    required: false,
  },
  {
    name: "FIREBASE_PROJECT_ID",
    required: false,
  },
  {
    name: "FIREBASE_PRIVATE_KEY",
    required: false,
  },
  {
    name: "FIREBASE_CLIENT_EMAIL",
    required: false,
  },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRequired: string[] = [];

  for (const envVar of envVars) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.required) {
        missingRequired.push(envVar.name);
        errors.push(`Required environment variable '${envVar.name}' is not set`);
      } else if (envVar.defaultValue) {
        process.env[envVar.name] = envVar.defaultValue;
        warnings.push(`Using default value for '${envVar.name}': ${envVar.defaultValue}`);
      }
      continue;
    }

    if (envVar.validate && !envVar.validate(value)) {
      errors.push(envVar.errorMessage || `Invalid value for '${envVar.name}'`);
    }
  }

  if (process.env.NODE_ENV === "production") {
    const productionRequired = ["MONGO_URI", "REDIS_URL", "JWT_SECRET", "CLERK_SECRET_KEY"];
    for (const name of productionRequired) {
      if (!process.env[name]) {
        errors.push(`Production requires '${name}' to be set`);
      }
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      warnings.push("JWT_SECRET should be at least 64 characters in production");
    }
  }

  const valid = errors.length === 0;

  if (!valid) {
    logger.error({ errors, missingRequired }, "Environment validation failed");
  } else {
    logger.info({ warnings: warnings.length }, "Environment validated", warnings.length > 0 ? { warnings } : {});
  }

  return { valid, errors, warnings, missingRequired };
}

export function requireEnvVars() {
  const result = validateEnvironment();
  if (!result.valid) {
    logger.fatal(
      { errors: result.errors, missing: result.missingRequired },
      "Missing required environment variables"
    );
    process.exit(1);
  }
}