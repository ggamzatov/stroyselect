export type NotificationItem = {
  id: string;
  user_id: string;
  actor_id: string | null;

  notification_type: string;

  title: string;

  body: string | null;

  project_id: string | null;

  message_id: string | null;

  url: string | null;

  metadata: Record<string, unknown>;

  is_read: boolean;

  read_at: string | null;

  created_at: string;

  actor:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
      }
    | null;
};