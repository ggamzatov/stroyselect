export type StageFile = {
  id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number | string;
  mime_type: string;
  file_category: string;
  description: string | null;
  created_at: string;
  signed_url: string | null;
};

export type MaterialTab =
  | "all"
  | "photos"
  | "documents";