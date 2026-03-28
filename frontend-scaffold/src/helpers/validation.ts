export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const USERNAME_RE = /^[a-z][a-z0-9_]{2,31}$/;

export const validateUsername = (username: string): ValidationResult => {
  const trimmed = username.trim();

  if (trimmed.length < 3 || trimmed.length > 32) {
    return { valid: false, error: "Username must be 3-32 characters long." };
  }

  if (!USERNAME_RE.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username must start with a letter and contain only lowercase letters, numbers, or underscores.",
    };
  }

  if (trimmed.endsWith("_")) {
    return { valid: false, error: "Username cannot end with an underscore." };
  }

  if (trimmed.includes("__")) {
    return { valid: false, error: "Username cannot contain consecutive underscores." };
  }

  return { valid: true };
};

export const validateDisplayName = (name: string): ValidationResult => {
  const trimmed = name.trim();

  if (trimmed.length === 0 || trimmed.length > 64) {
    return { valid: false, error: "Display name must be 1-64 characters." };
  }

  return { valid: true };
};

export const validateBio = (bio: string): ValidationResult => {
  if (bio.length > 280) {
    return { valid: false, error: "Bio must be 280 characters or fewer." };
  }

  return { valid: true };
};
