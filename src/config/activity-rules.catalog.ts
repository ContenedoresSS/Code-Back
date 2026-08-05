import { RuleEnforcement } from "../types/enums/rule-enforcement.enum.js";

export interface ActivityRuleDefinition {
  default: boolean;
  enforcedAt: RuleEnforcement;
}

// Fuente única de verdad: las reglas se guardan en la columna JSON
// activities.rules y las ausentes se resuelven contra este catálogo, así que
// agregar una regla no requiere migrar la base de datos.
export const ACTIVITY_RULES = {
  allowCopy: { default: true, enforcedAt: RuleEnforcement.Frontend },
  allowPaste: { default: true, enforcedAt: RuleEnforcement.Frontend },
  allowFileDownload: { default: true, enforcedAt: RuleEnforcement.Frontend },
  allowCodeEdit: { default: true, enforcedAt: RuleEnforcement.Both },
  allowFileUpload: { default: true, enforcedAt: RuleEnforcement.Both },
  // false porque es el comportamiento que ya tenía el backend: la entrega se
  // evalúa con el lenguaje de la actividad, ignorando el que mande el cliente.
  allowLanguageChange: { default: false, enforcedAt: RuleEnforcement.Backend },
} as const satisfies Record<string, ActivityRuleDefinition>;

export type ActivityRuleKey = keyof typeof ACTIVITY_RULES;

export type ActivityRules = Record<ActivityRuleKey, boolean>;

export type ActivityRulesPatch = Partial<ActivityRules>;

export const ACTIVITY_RULE_KEYS = Object.keys(ACTIVITY_RULES) as ActivityRuleKey[];
