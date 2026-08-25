export type ContractorCatalogSort =
  | "recommended"
  | "rating"
  | "reviews"
  | "completed"
  | "newest";

export type ContractorCatalogFilters = {
  search?: string;
  city?: string;
  categoryId?: string;
  minRating?: number;
  minBudget?: number;
  maxBudget?: number;
  verifiedOnly?: boolean;
  acceptsProjectsOnly?: boolean;
  hasPortfolio?: boolean;
  sort?: ContractorCatalogSort;
  page?: number;
};

export type ContractorCatalogService = {
  id: string;
  name: string;
};

export type ContractorCatalogArea = {
  city: string;
  region: string | null;
  is_primary: boolean;
};

export type ContractorCatalogItem = {
  id: string;
  public_name: string;
  company_type: string | null;
  description: string | null;
  founded_year: number | null;
  employee_count: number | null;
  minimum_project_budget: number | null;
  maximum_project_budget: number | null;
  verification_status: string;
  accepts_new_projects: boolean;
  rating: number;
  rating_count: number;
  quality_rating: number | null;
  deadline_rating: number | null;
  communication_rating: number | null;
  completed_projects_count: number;
  recommendation_score: number;
  raw_score: number;
  score_confidence_percent: number;
  score_confidence_level: "low" | "medium" | "high";
  score_confidence_explanation: string;
  created_at: string;
  services: ContractorCatalogService[];
  areas: ContractorCatalogArea[];
  portfolio_count: number;
};

export type ContractorCatalogResult = {
  items: ContractorCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
