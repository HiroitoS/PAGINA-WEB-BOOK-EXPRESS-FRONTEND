export const EDUCATION_LEVELS = {
  INITIAL: "initial",
  PRIMARY: "primary",
  SECONDARY: "secondary",
};

export function normalizeEducationLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function educationLevelKey(value) {
  const label = normalizeEducationLabel(value);

  if (label.includes("inicial")) {
    return EDUCATION_LEVELS.INITIAL;
  }

  if (label.includes("primaria")) {
    return EDUCATION_LEVELS.PRIMARY;
  }

  if (label.includes("secundaria")) {
    return EDUCATION_LEVELS.SECONDARY;
  }

  return null;
}

export function gradeLevelKey(value) {
  const label = normalizeEducationLabel(value);

  if (label.includes("primaria")) {
    return EDUCATION_LEVELS.PRIMARY;
  }

  if (label.includes("secundaria")) {
    return EDUCATION_LEVELS.SECONDARY;
  }

  if (label.includes("inicial")) {
    return EDUCATION_LEVELS.INITIAL;
  }

  if (/\b[345]\s+anos?\b/.test(label)) {
    return EDUCATION_LEVELS.INITIAL;
  }

  return null;
}

export function gradeMatchesLevel(gradeName, levelName) {
  const gradeKey = gradeLevelKey(gradeName);
  const levelKey = educationLevelKey(levelName);

  return Boolean(gradeKey && levelKey && gradeKey === levelKey);
}
