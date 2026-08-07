export type ContractorCategory = {
  id: number;
  name: string;
  slug: string;
};

export type ExistingContractorCompany = {
  id: string;

  public_name: string;
  legal_name: string | null;
  company_type: string | null;

  inn: string | null;
  ogrn: string | null;

  description: string | null;

  founded_year: number | null;
  employee_count: number | null;

  minimum_project_budget: number | null;
  maximum_project_budget: number | null;

  contact_phone: string | null;
  contact_email: string | null;

  website: string | null;
  telegram: string | null;

  accepts_new_projects: boolean;

  verification_status: string;
  verification_comment: string | null;

  contractor_services?: Array<{
    category_id: number;
  }>;

  contractor_service_areas?: Array<{
    city: string;
  }>;
};