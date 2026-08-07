export type WorkspaceStage = {
  id: string;
  title: string;
  description: string | null;
  price: number | string | null;
  progress_weight: number;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
};