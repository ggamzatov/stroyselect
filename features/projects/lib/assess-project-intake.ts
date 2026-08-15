export type ProjectIntakeData = {
  category_id: number | string | null;
  title: string;
  description: string | null;
  property_type: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  budget_min: number | string | null;
  budget_max: number | string | null;
  desired_start_date: string | null;
  desired_end_date: string | null;
};

export type ProjectIntakeAssessment = {
  score: number;
  level: "basic" | "good" | "strong";
  completedChecks: number;
  totalChecks: number;
  suggestions: string[];
};

type Check = {
  weight: number;
  passed: boolean;
  suggestion: string;
};

export function assessProjectIntake(
  project: ProjectIntakeData
): ProjectIntakeAssessment {
  const descriptionLength = project.description?.trim().length ?? 0;
  const hasBudget =
    toNumber(project.budget_min) !== null ||
    toNumber(project.budget_max) !== null;

  const checks: Check[] = [
    {
      weight: 15,
      passed: project.category_id !== null,
      suggestion: "Выберите точную категорию работ — это главный сигнал для matching.",
    },
    {
      weight: 10,
      passed: project.title.trim().length >= 12,
      suggestion: "Сделайте название проекта более конкретным: тип работ + объект + город.",
    },
    {
      weight: 20,
      passed: descriptionLength >= 120,
      suggestion: "Расширьте описание: добавьте объём работ, состояние объекта, материалы и ожидаемый результат.",
    },
    {
      weight: 10,
      passed: Boolean(project.property_type),
      suggestion: "Укажите тип объекта, чтобы отсечь нерелевантных подрядчиков.",
    },
    {
      weight: 15,
      passed: Boolean(project.city?.trim() && project.region?.trim()),
      suggestion: "Уточните город и регион — география сильно влияет на качество подбора.",
    },
    {
      weight: 15,
      passed: hasBudget,
      suggestion: "Добавьте ориентир по бюджету, чтобы повысить точность совпадения с компаниями.",
    },
    {
      weight: 10,
      passed: Boolean(project.desired_start_date || project.desired_end_date),
      suggestion: "Добавьте желаемые сроки начала или завершения работ.",
    },
    {
      weight: 5,
      passed: Boolean(project.address?.trim()),
      suggestion: "Добавьте адрес или ориентир объекта — это поможет оценить логистику.",
    },
  ];

  const score = checks.reduce(
    (total, check) => total + (check.passed ? check.weight : 0),
    0
  );

  return {
    score,
    level: score >= 85 ? "strong" : score >= 65 ? "good" : "basic",
    completedChecks: checks.filter((check) => check.passed).length,
    totalChecks: checks.length,
    suggestions: checks
      .filter((check) => !check.passed)
      .sort((a, b) => b.weight - a.weight)
      .map((check) => check.suggestion)
      .slice(0, 4),
  };
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
