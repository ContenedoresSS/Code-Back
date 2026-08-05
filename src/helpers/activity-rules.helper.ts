import {
  ACTIVITY_RULES,
  ACTIVITY_RULE_KEYS,
  type ActivityRules,
  type ActivityRulesPatch,
} from "../config/activity-rules.catalog.js";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getDefaultActivityRules(): ActivityRules {
  const defaults: Partial<ActivityRules> = {};

  for (const key of ACTIVITY_RULE_KEYS) {
    defaults[key] = ACTIVITY_RULES[key].default;
  }

  return defaults as ActivityRules;
}

// Tolera null, JSON parcial y claves ajenas al catálogo: lo que falte toma su
// valor por defecto, así una actividad creada antes de que una regla existiera
// sigue siendo válida.
export function resolveActivityRules(stored: unknown): ActivityRules {
  const rules = getDefaultActivityRules();

  if (!isPlainRecord(stored)) {
    return rules;
  }

  for (const key of ACTIVITY_RULE_KEYS) {
    const value = stored[key];

    if (typeof value === "boolean") {
      rules[key] = value;
    }
  }

  return rules;
}

export function mergeActivityRules(
  current: ActivityRules,
  patch: ActivityRulesPatch
): ActivityRules {
  const merged: ActivityRules = { ...current };

  for (const key of ACTIVITY_RULE_KEYS) {
    const value = patch[key];

    if (typeof value === "boolean") {
      merged[key] = value;
    }
  }

  return merged;
}
