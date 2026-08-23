import "server-only";

import { db } from "@/lib/db/pool";

type ScoreRow = {
  contractor_id: string;
  raw_score: number | string;
  stroyselect_score: number | string;
  confidence_percent: number | string;
  confidence_level: "low" | "medium" | "high";
  confidence_explanation: string;
  score_cap: number;
  verification_points: number;
  reviews_points: number;
  projects_points: number;
  profile_points: number;
  services_points: number;
  geography_points: number;
  portfolio_points: number;
  proposal_points: number;
  review_count: number;
  average_rating: number | string;
  service_count: number;
  area_count: number;
  portfolio_count: number;
  bid_count: number;
  avg_bid_completeness: number | string;
};

export type ContractorScore = {
  score: number;
  rawScore: number;
  confidencePercent: number;
  confidenceLevel: "low" | "medium" | "high";
  confidenceLabel: string;
  confidenceExplanation: string;
  isConfidenceLimited: boolean;
  level: "excellent" | "strong" | "developing" | "new";
  label: string;
  factors: Array<{
    key: string;
    label: string;
    points: number;
    maxPoints: number;
  }>;
  strengths: string[];
  improvements: string[];
};

export async function getContractorScore(
  contractorId: string
): Promise<ContractorScore | null> {
  const result = await db.query<ScoreRow>(
    `
      SELECT
        contractor_id,
        raw_score,
        stroyselect_score,
        confidence_percent,
        confidence_level,
        confidence_explanation,
        score_cap,
        verification_points,
        reviews_points,
        projects_points,
        profile_points,
        services_points,
        geography_points,
        portfolio_points,
        proposal_points,
        review_count,
        average_rating,
        service_count,
        area_count,
        portfolio_count,
        bid_count,
        avg_bid_completeness
      FROM public.contractor_score_maturity
      WHERE contractor_id = $1::uuid
      LIMIT 1
    `,
    [contractorId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const factors = [
    factor("verification", "Проверка компании", row.verification_points, 20),
    factor("reviews", "Отзывы и рейтинг", row.reviews_points, 20),
    factor("projects", "Завершённые проекты", row.projects_points, 15),
    factor("profile", "Полнота профиля", row.profile_points, 15),
    factor("services", "Специализации", row.services_points, 10),
    factor("geography", "География работ", row.geography_points, 8),
    factor("portfolio", "Портфолио", row.portfolio_points, 8),
    factor("proposals", "Качество предложений", row.proposal_points, 4),
  ];

  const strengths = factors
    .filter((item) => item.points / item.maxPoints >= 0.75)
    .sort((a, b) => b.points / b.maxPoints - a.points / a.maxPoints)
    .slice(0, 4)
    .map((item) => item.label);

  const improvements = factors
    .filter((item) => item.points / item.maxPoints < 0.6)
    .sort((a, b) => a.points / a.maxPoints - b.points / b.maxPoints)
    .slice(0, 3)
    .map((item) => getImprovementText(item.key));

  const score = clampScore(row.stroyselect_score);
  const rawScore = clampScore(row.raw_score);
  const confidencePercent = clampScore(row.confidence_percent);
  const level = getLevel(score);

  return {
    score,
    rawScore,
    confidencePercent,
    confidenceLevel: row.confidence_level,
    confidenceLabel: getConfidenceLabel(row.confidence_level),
    confidenceExplanation: row.confidence_explanation,
    isConfidenceLimited: score < rawScore || Number(row.score_cap) < 100,
    level,
    label: getLevelLabel(level),
    factors,
    strengths,
    improvements,
  };
}

function factor(key: string, label: string, points: number, maxPoints: number) {
  return {
    key,
    label,
    points: Math.max(0, Number(points) || 0),
    maxPoints,
  };
}

function clampScore(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(100, Math.max(0, Math.round(number)))
    : 0;
}

function getLevel(score: number): ContractorScore["level"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 50) return "developing";
  return "new";
}

function getLevelLabel(level: ContractorScore["level"]) {
  switch (level) {
    case "excellent":
      return "Отличная репутация";
    case "strong":
      return "Сильный профиль";
    case "developing":
      return "Развивающийся профиль";
    default:
      return "Новый подрядчик";
  }
}

function getConfidenceLabel(level: ContractorScore["confidenceLevel"]) {
  switch (level) {
    case "high":
      return "Высокая достоверность";
    case "medium":
      return "Средняя достоверность";
    default:
      return "Мало данных";
  }
}

function getImprovementText(key: string) {
  switch (key) {
    case "verification":
      return "Завершить проверку компании";
    case "reviews":
      return "Получить больше отзывов от заказчиков";
    case "projects":
      return "Завершить больше проектов на платформе";
    case "profile":
      return "Заполнить профиль компании подробнее";
    case "services":
      return "Добавить специализации и основное направление";
    case "geography":
      return "Указать города и регионы работы";
    case "portfolio":
      return "Добавить выполненные работы в портфолио";
    case "proposals":
      return "Заполнять предложения подробнее";
    default:
      return "Дополнить данные профиля";
  }
}
