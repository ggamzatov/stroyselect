export type ContractorCompanyType =
  | "individual"
  | "self_employed"
  | "entrepreneur"
  | "company";

export type ContractorVerificationStatus =
  | "draft"
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export type ContractorCompanyFormData = {
  publicName: string;
  legalName?: string;
  companyType: ContractorCompanyType;
  inn?: string;
  ogrn?: string;
  description: string;
  foundedYear?: number;
  employeeCount?: number;
  minimumProjectBudget?: number;
  maximumProjectBudget?: number;
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  telegram?: string;
  acceptsNewProjects: boolean;
  categoryIds: number[];
  cities: string[];
};