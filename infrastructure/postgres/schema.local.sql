


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";












CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."bid_status" AS ENUM (
    'submitted',
    'viewed',
    'shortlisted',
    'accepted',
    'rejected',
    'withdrawn'
);


ALTER TYPE "public"."bid_status" OWNER TO "postgres";


CREATE TYPE "public"."contractor_verification_status" AS ENUM (
    'draft',
    'pending',
    'verified',
    'rejected',
    'suspended'
);


ALTER TYPE "public"."contractor_verification_status" OWNER TO "postgres";


CREATE TYPE "public"."project_event_type" AS ENUM (
    'project_created',
    'project_published',
    'contractor_selected',
    'project_started',
    'stage_created',
    'stage_started',
    'stage_completed',
    'stage_cancelled',
    'comment_added',
    'photo_uploaded',
    'document_uploaded',
    'project_completed',
    'project_cancelled',
    'dispute_opened',
    'stage_submitted_for_review',
    'stage_approved',
    'stage_revision_requested'
);


ALTER TYPE "public"."project_event_type" OWNER TO "postgres";


CREATE TYPE "public"."project_stage_status" AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'cancelled',
    'awaiting_review',
    'revision_required'
);


ALTER TYPE "public"."project_stage_status" OWNER TO "postgres";


CREATE TYPE "public"."project_status" AS ENUM (
    'draft',
    'submitted',
    'moderation',
    'needs_clarification',
    'published',
    'collecting_bids',
    'contractor_selected',
    'in_progress',
    'completed',
    'cancelled',
    'disputed'
);


ALTER TYPE "public"."project_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'customer',
    'contractor',
    'manager',
    'moderator',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_project_workspace"("target_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and (
        p.customer_id = public.current_user_id()

        or exists (
          select 1
          from public.contractor_companies c
          where c.id = p.selected_contractor_id
            and c.owner_id = public.current_user_id()
        )

        or exists (
          select 1
          from public.profiles pr
          where pr.id = public.current_user_id()
            and pr.role in (
              'admin',
              'moderator',
              'manager'
            )
            and pr.is_blocked = false
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_access_project_workspace"("target_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_mutate_project_workspace"("target_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.projects p

    left join public.contractor_companies cc
      on cc.id = p.selected_contractor_id

    join public.profiles profile
      on profile.id = public.current_user_id()

    where p.id = target_project_id

      /*
       * Пользователь не заблокирован.
       */
      and coalesce(
        profile.is_blocked,
        false
      ) = false

      /*
       * Проект не заблокирован
       * администрацией.
       */
      and coalesce(
        p.is_admin_blocked,
        false
      ) = false

      /*
       * Пользователь является заказчиком
       * либо владельцем выбранной
       * компании подрядчика.
       */
      and (
        p.customer_id = public.current_user_id()

        or

        cc.owner_id = public.current_user_id()
      )
  );
$$;


ALTER FUNCTION "public"."can_mutate_project_workspace"("target_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_project_files"("target_project_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.projects p

    left join public.contractor_companies cc
      on cc.id = p.selected_contractor_id

    join public.profiles profile
      on profile.id = public.current_user_id()

    where p.id = target_project_id

      and coalesce(
        profile.is_blocked,
        false
      ) = false

      and (
        p.customer_id = public.current_user_id()

        or

        cc.owner_id = public.current_user_id()
      )
  );
$$;


ALTER FUNCTION "public"."can_read_project_files"("target_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_storage_project_id"("object_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
declare
  first_part text;
begin
  first_part := split_part(object_name, '/', 1);

  if first_part ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  then
    return first_part::uuid;
  end if;

  return null;
end;
$_$;


ALTER FUNCTION "public"."get_storage_project_id"("object_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_area_recommendation_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then

    perform public.recalculate_contractor_recommendation_score(
      new.contractor_id
    );

    return new;

  elsif tg_op = 'DELETE' then

    perform public.recalculate_contractor_recommendation_score(
      old.contractor_id
    );

    return old;

  elsif tg_op = 'UPDATE' then

    if old.contractor_id is distinct from new.contractor_id then

      perform public.recalculate_contractor_recommendation_score(
        old.contractor_id
      );

    end if;

    perform public.recalculate_contractor_recommendation_score(
      new.contractor_id
    );

    return new;

  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."handle_area_recommendation_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_contractor_company_score_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.recalculate_contractor_recommendation_score(
    new.id
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_contractor_company_score_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_contractor_review_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'DELETE' then

    perform
      public.recalculate_contractor_rating(
        old.contractor_id
      );

    return old;
  end if;

  perform
    public.recalculate_contractor_rating(
      new.contractor_id
    );

  if
    tg_op = 'UPDATE'
    and old.contractor_id
      is distinct from
      new.contractor_id
  then

    perform
      public.recalculate_contractor_rating(
        old.contractor_id
      );

  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_contractor_review_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    phone,
    email
  )
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'customer'::public.user_role
    ),
    coalesce(
      new.raw_user_meta_data ->> 'first_name',
      ''
    ),
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.email
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_portfolio_recommendation_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then

    perform public.recalculate_contractor_recommendation_score(
      new.contractor_id
    );

    return new;

  elsif tg_op = 'DELETE' then

    perform public.recalculate_contractor_recommendation_score(
      old.contractor_id
    );

    return old;

  elsif tg_op = 'UPDATE' then

    if old.contractor_id is distinct from new.contractor_id then

      perform public.recalculate_contractor_recommendation_score(
        old.contractor_id
      );

    end if;

    perform public.recalculate_contractor_recommendation_score(
      new.contractor_id
    );

    return new;

  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."handle_portfolio_recommendation_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_project_contractor_statistics"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  /*
   * Если раньше был другой подрядчик,
   * пересчитываем и его.
   */
  if old.selected_contractor_id is not null
     and (
       new.selected_contractor_id is distinct from
       old.selected_contractor_id
       or new.status is distinct from old.status
     )
  then
    perform public.recalculate_contractor_rating(
      old.selected_contractor_id
    );
  end if;

  /*
   * Пересчитываем текущего подрядчика.
   */
  if new.selected_contractor_id is not null
     and (
       new.selected_contractor_id is distinct from
       old.selected_contractor_id
       or new.status is distinct from old.status
     )
  then
    perform public.recalculate_contractor_rating(
      new.selected_contractor_id
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_project_contractor_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_service_recommendation_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then

    perform public.recalculate_contractor_recommendation_score(
      new.contractor_id
    );

    return new;

  elsif tg_op = 'DELETE' then

    perform public.recalculate_contractor_recommendation_score(
      old.contractor_id
    );

    return old;

  elsif tg_op = 'UPDATE' then

    if old.contractor_id is distinct from new.contractor_id then

      perform public.recalculate_contractor_recommendation_score(
        old.contractor_id
      );

    end if;

    perform public.recalculate_contractor_recommendation_score(
      new.contractor_id
    );

    return new;

  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."handle_service_recommendation_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = public.current_user_id()
      and role::text = 'admin'
      and coalesce(is_blocked, false) = false
  );
$$;


ALTER FUNCTION "public"."is_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = public.current_user_id()
      and role in (
        'admin',
        'moderator',
        'manager'
      )
      and coalesce(is_blocked, false) = false
  );
$$;


ALTER FUNCTION "public"."is_staff_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := public.current_user_id();
  v_now timestamptz := now();
  updated_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Необходимо войти';
  end if;

  update public.notifications
  set
    is_read = true,
    read_at = v_now
  where user_id = current_user_id
    and is_read = false;

  get diagnostics
    updated_count = row_count;

  return jsonb_build_object(
    'success', true,
    'message', 'Уведомления прочитаны',
    'updated_count', updated_count
  );
end;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("target_notification_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := public.current_user_id();
  v_now timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Необходимо войти';
  end if;

  update public.notifications
  set
    is_read = true,
    read_at = v_now
  where id = target_notification_id
    and user_id = current_user_id
    and is_read = false;

  if not found then
    if exists (
      select 1
      from public.notifications
      where id = target_notification_id
        and user_id = current_user_id
        and is_read = true
    ) then
      return jsonb_build_object(
        'success', true,
        'message', 'Уведомление уже прочитано'
      );
    end if;

    raise exception
      'Уведомление не найдено';
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Уведомление прочитано'
  );
end;
$$;


ALTER FUNCTION "public"."mark_notification_read"("target_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_contractor_rating"("contractor_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  avg_rating numeric;
  avg_quality numeric;
  avg_deadline numeric;
  avg_communication numeric;
  reviews_count integer;
  completed_count integer;
begin
  /*
   * Средние оценки подрядчика.
   */
  select
    avg(r.rating),
    avg(r.quality_rating),
    avg(r.deadline_rating),
    avg(r.communication_rating),
    count(*)
  into
    avg_rating,
    avg_quality,
    avg_deadline,
    avg_communication,
    reviews_count
  from public.contractor_reviews r
  where r.contractor_id =
    contractor_uuid;

  /*
   * Количество завершённых проектов.
   */
  select count(*)
  into completed_count
  from public.projects p
  where p.selected_contractor_id =
    contractor_uuid
    and p.status = 'completed';

  /*
   * Обновляем статистику компании.
   */
  update public.contractor_companies
  set
    rating =
      case
        when reviews_count > 0
          and avg_rating is not null
        then round(
          avg_rating,
          2
        )
        else 0
      end,

    rating_count =
      coalesce(
        reviews_count,
        0
      ),

    quality_rating =
      case
        when avg_quality is not null
        then round(
          avg_quality,
          2
        )
        else null
      end,

    deadline_rating =
      case
        when avg_deadline is not null
        then round(
          avg_deadline,
          2
        )
        else null
      end,

    communication_rating =
      case
        when avg_communication is not null
        then round(
          avg_communication,
          2
        )
        else null
      end,

    completed_projects_count =
      coalesce(
        completed_count,
        0
      )

  where id =
    contractor_uuid;
end;
$$;


ALTER FUNCTION "public"."recalculate_contractor_rating"("contractor_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_contractor_recommendation_score"("contractor_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  contractor_rating numeric;
  contractor_rating_count integer;
  contractor_completed integer;
  contractor_accepts boolean;
  portfolio_count integer;
  service_count integer;
  area_count integer;
  score numeric;
begin
  select
    coalesce(c.rating, 0),
    coalesce(c.rating_count, 0),
    coalesce(c.completed_projects_count, 0),
    coalesce(c.accepts_new_projects, false)
  into
    contractor_rating,
    contractor_rating_count,
    contractor_completed,
    contractor_accepts
  from public.contractor_companies c
  where c.id = contractor_uuid;

  if not found then
    return;
  end if;

  select count(*)
  into portfolio_count
  from public.contractor_portfolio_projects p
  where p.contractor_id = contractor_uuid;

  select count(*)
  into service_count
  from public.contractor_services s
  where s.contractor_id = contractor_uuid;

  select count(*)
  into area_count
  from public.contractor_service_areas a
  where a.contractor_id = contractor_uuid;

  score :=
      /*
       * Рейтинг — до 50 баллов.
       */
      contractor_rating * 10

      /*
       * Отзывы — до 15 баллов.
       * После 30 отзывов дополнительный
       * вес почти не нужен.
       */
      +
      least(
        contractor_rating_count,
        30
      ) * 0.5

      /*
       * Завершённые проекты —
       * до 20 баллов.
       */
      +
      least(
        contractor_completed,
        20
      )

      /*
       * Портфолио — до 6 баллов.
       */
      +
      least(
        portfolio_count,
        3
      ) * 2

      /*
       * Заполненные специализации —
       * до 4 баллов.
       */
      +
      least(
        service_count,
        4
      )

      /*
       * География — до 3 баллов.
       */
      +
      least(
        area_count,
        3
      )

      /*
       * Принимает новые проекты.
       */
      +
      case
        when contractor_accepts
        then 5
        else 0
      end;

  update public.contractor_companies
  set recommendation_score =
    round(
      score,
      4
    )
  where id =
    contractor_uuid;
end;
$$;


ALTER FUNCTION "public"."recalculate_contractor_recommendation_score"("contractor_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_project_stage"("target_stage_id" "uuid", "target_project_id" "uuid", "decision" "text", "review_comment" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  current_user_id uuid := public.current_user_id();

  current_stage public.project_stages%rowtype;
  current_project public.projects%rowtype;

  v_now timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Необходимо войти';
  end if;

  select *
  into current_project
  from public.projects
  where id = target_project_id
    and customer_id = current_user_id;

  if not found then
    raise exception
      'Проект не найден или не принадлежит заказчику';
  end if;

  select *
  into current_stage
  from public.project_stages
  where id = target_stage_id
    and project_id = target_project_id
  for update;

  if not found then
    raise exception 'Этап не найден';
  end if;

  if current_stage.status::text <> 'awaiting_review' then
    raise exception
      'Этот этап сейчас нельзя принять';
  end if;

  if decision = 'approve' then
    update public.project_stages
    set
      status = 'completed',
      actual_completed_at = v_now,
      reviewed_at = v_now,
      reviewed_by = current_user_id,
      customer_review_comment = null,
      updated_at = v_now
    where id = target_stage_id
      and project_id = target_project_id;

    insert into public.project_events (
      project_id,
      author_id,
      event_type,
      title,
      description,
      metadata
    )
    values (
      target_project_id,
      current_user_id,
      'stage_approved',
      'Этап принят заказчиком',
      current_stage.title,
      jsonb_build_object(
        'stage_id',
        current_stage.id
      )
    );

    return jsonb_build_object(
      'success', true,
      'message', 'Этап принят'
    );
  end if;

  if decision = 'revision' then
    if review_comment is null
       or char_length(trim(review_comment)) < 2 then
      raise exception
        'Укажите замечание для подрядчика';
    end if;

    update public.project_stages
    set
      status = 'revision_required',
      actual_completed_at = null,
      reviewed_at = v_now,
      reviewed_by = current_user_id,
      customer_review_comment = trim(review_comment),
      updated_at = v_now
    where id = target_stage_id
      and project_id = target_project_id;

    insert into public.project_events (
      project_id,
      author_id,
      event_type,
      title,
      description,
      metadata
    )
    values (
      target_project_id,
      current_user_id,
      'stage_revision_requested',
      'Этап возвращён на доработку',
      trim(review_comment),
      jsonb_build_object(
        'stage_id',
        current_stage.id,
        'stage_title',
        current_stage.title
      )
    );

    return jsonb_build_object(
      'success', true,
      'message', 'Замечание отправлено подрядчику'
    );
  end if;

  raise exception 'Некорректное решение';
end;
$$;


ALTER FUNCTION "public"."review_project_stage"("target_stage_id" "uuid", "target_project_id" "uuid", "decision" "text", "review_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "public_name" "text" NOT NULL,
    "legal_name" "text",
    "inn" character varying(12),
    "ogrn" character varying(15),
    "description" "text",
    "founded_year" integer,
    "employee_count" integer,
    "minimum_project_budget" numeric(14,2),
    "maximum_project_budget" numeric(14,2),
    "verification_status" "public"."contractor_verification_status" DEFAULT 'draft'::"public"."contractor_verification_status" NOT NULL,
    "verification_comment" "text",
    "rating" numeric(4,2) DEFAULT 0 NOT NULL,
    "rating_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_type" "text",
    "contact_phone" "text",
    "contact_email" "text",
    "website" "text",
    "telegram" "text",
    "accepts_new_projects" boolean DEFAULT true NOT NULL,
    "quality_rating" numeric(3,2),
    "deadline_rating" numeric(3,2),
    "communication_rating" numeric(3,2),
    "completed_projects_count" integer DEFAULT 0 NOT NULL,
    "recommendation_score" numeric(10,4) DEFAULT 0 NOT NULL,
    CONSTRAINT "contractor_budget_range_check" CHECK ((("maximum_project_budget" IS NULL) OR ("minimum_project_budget" IS NULL) OR ("maximum_project_budget" >= "minimum_project_budget"))),
    CONSTRAINT "contractor_company_type_check" CHECK ((("company_type" IS NULL) OR ("company_type" = ANY (ARRAY['individual'::"text", 'self_employed'::"text", 'entrepreneur'::"text", 'company'::"text"]))))
);


ALTER TABLE "public"."contractor_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_portfolio_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "portfolio_project_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "storage_bucket" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractor_portfolio_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_portfolio_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "city" "text",
    "completed_year" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractor_portfolio_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "quality_rating" integer,
    "deadline_rating" integer,
    "communication_rating" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contractor_reviews_communication_rating_check" CHECK ((("communication_rating" IS NULL) OR (("communication_rating" >= 1) AND ("communication_rating" <= 5)))),
    CONSTRAINT "contractor_reviews_deadline_rating_check" CHECK ((("deadline_rating" IS NULL) OR (("deadline_rating" >= 1) AND ("deadline_rating" <= 5)))),
    CONSTRAINT "contractor_reviews_quality_rating_check" CHECK ((("quality_rating" IS NULL) OR (("quality_rating" >= 1) AND ("quality_rating" <= 5)))),
    CONSTRAINT "contractor_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."contractor_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_service_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "region" "text" DEFAULT 'Республика Дагестан'::"text" NOT NULL,
    "city" "text" NOT NULL,
    "travel_radius_km" integer,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contractor_service_area_radius_check" CHECK ((("travel_radius_km" IS NULL) OR (("travel_radius_km" >= 0) AND ("travel_radius_km" <= 1000))))
);


ALTER TABLE "public"."contractor_service_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_services" (
    "contractor_id" "uuid" NOT NULL,
    "category_id" bigint NOT NULL,
    "years_experience" integer,
    "is_primary" boolean DEFAULT false NOT NULL,
    CONSTRAINT "contractor_service_experience_check" CHECK ((("years_experience" IS NULL) OR (("years_experience" >= 0) AND ("years_experience" <= 100))))
);


ALTER TABLE "public"."contractor_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contractor_verification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "previous_status" "public"."contractor_verification_status" NOT NULL,
    "new_status" "public"."contractor_verification_status" NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "verification_status_change_check" CHECK (("previous_status" <> "new_status"))
);


ALTER TABLE "public"."contractor_verification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "notification_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "project_id" "uuid",
    "message_id" "uuid",
    "url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deduplication_key" "text",
    CONSTRAINT "notifications_body_length_check" CHECK ((("body" IS NULL) OR ("char_length"("body") <= 2000))),
    CONSTRAINT "notifications_read_state_check" CHECK (((("is_read" = false) AND ("read_at" IS NULL)) OR (("is_read" = true) AND ("read_at" IS NOT NULL)))),
    CONSTRAINT "notifications_title_length_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 1) AND ("char_length"(TRIM(BOTH FROM "title")) <= 200))),
    CONSTRAINT "notifications_url_length_check" CHECK ((("url" IS NULL) OR ("char_length"("url") <= 1000)))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text",
    "phone" "text",
    "city" "text",
    "avatar_path" "text",
    "is_blocked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "blocked_reason" "text",
    "blocked_at" timestamp with time zone,
    "blocked_by" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "contractor_id" "uuid" NOT NULL,
    "price" numeric(14,2) NOT NULL,
    "duration_days" integer NOT NULL,
    "message" "text" NOT NULL,
    "proposed_start_date" "date",
    "status" "public"."bid_status" DEFAULT 'submitted'::"public"."bid_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_bid_duration_check" CHECK ((("duration_days" >= 1) AND ("duration_days" <= 3650))),
    CONSTRAINT "project_bid_message_check" CHECK ((("char_length"("message") >= 20) AND ("char_length"("message") <= 3000))),
    CONSTRAINT "project_bid_price_check" CHECK (("price" > (0)::numeric))
);


ALTER TABLE "public"."project_bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_chat_reads" (
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_message_id" "uuid",
    "last_read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_chat_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "event_type" "public"."project_event_type" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_event_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 3000))),
    CONSTRAINT "project_event_title_length_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 200)))
);


ALTER TABLE "public"."project_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_name" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_message_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" "uuid",
    "uploaded_by" "uuid",
    "file_category" "text" DEFAULT 'document'::"text" NOT NULL,
    "storage_bucket" "text" DEFAULT 'chat-files'::"text" NOT NULL,
    CONSTRAINT "project_message_files_category_check" CHECK (("file_category" = ANY (ARRAY['image'::"text", 'document'::"text", 'invoice'::"text", 'archive'::"text", 'other'::"text"]))),
    CONSTRAINT "project_message_files_size_check" CHECK ((("size_bytes" > 0) AND ("size_bytes" <= 20971520)))
);


ALTER TABLE "public"."project_message_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "message_text" "text" NOT NULL,
    "reply_to_id" "uuid",
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "project_messages_deleted_state_check" CHECK (((("is_deleted" = false) AND ("deleted_at" IS NULL) AND ("deleted_by" IS NULL)) OR (("is_deleted" = true) AND ("deleted_at" IS NOT NULL) AND ("deleted_by" IS NOT NULL)))),
    CONSTRAINT "project_messages_text_check" CHECK ((("char_length"(TRIM(BOTH FROM "message_text")) >= 1) AND ("char_length"(TRIM(BOTH FROM "message_text")) <= 5000)))
);


ALTER TABLE "public"."project_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_stage_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "stage_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_category" "text" DEFAULT 'other'::"text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_stage_files_category_check" CHECK (("file_category" = ANY (ARRAY['before_photo'::"text", 'progress_photo'::"text", 'after_photo'::"text", 'document'::"text", 'invoice'::"text", 'other'::"text"]))),
    CONSTRAINT "project_stage_files_description_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 1000))),
    CONSTRAINT "project_stage_files_name_check" CHECK ((("char_length"("file_name") >= 1) AND ("char_length"("file_name") <= 255))),
    CONSTRAINT "project_stage_files_path_check" CHECK ((("char_length"("storage_path") >= 5) AND ("char_length"("storage_path") <= 1000))),
    CONSTRAINT "project_stage_files_size_check" CHECK ((("file_size" > 0) AND ("file_size" <= 20971520)))
);


ALTER TABLE "public"."project_stage_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "status" "public"."project_stage_status" DEFAULT 'planned'::"public"."project_stage_status" NOT NULL,
    "planned_start_date" "date",
    "planned_end_date" "date",
    "actual_started_at" timestamp with time zone,
    "actual_completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "price" numeric(14,2),
    "progress_weight" integer DEFAULT 0 NOT NULL,
    "submitted_for_review_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "customer_review_comment" "text",
    CONSTRAINT "project_stage_dates_check" CHECK ((("planned_start_date" IS NULL) OR ("planned_end_date" IS NULL) OR ("planned_end_date" >= "planned_start_date"))),
    CONSTRAINT "project_stage_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 3000))),
    CONSTRAINT "project_stage_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "project_stage_title_length_check" CHECK ((("char_length"("title") >= 2) AND ("char_length"("title") <= 150))),
    CONSTRAINT "project_stages_price_check" CHECK ((("price" IS NULL) OR ("price" >= (0)::numeric))),
    CONSTRAINT "project_stages_progress_weight_check" CHECK ((("progress_weight" >= 0) AND ("progress_weight" <= 100))),
    CONSTRAINT "project_stages_review_comment_length_check" CHECK ((("customer_review_comment" IS NULL) OR ("char_length"("customer_review_comment") <= 3000)))
);


ALTER TABLE "public"."project_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "category_id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "region" "text" DEFAULT 'Республика Дагестан'::"text" NOT NULL,
    "city" "text" NOT NULL,
    "address" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "object_type" "text",
    "object_area" numeric(10,2),
    "floors_count" integer,
    "budget_min" numeric(14,2),
    "budget_max" numeric(14,2),
    "materials_required" boolean,
    "desired_start_date" "date",
    "desired_end_date" "date",
    "status" "public"."project_status" DEFAULT 'draft'::"public"."project_status" NOT NULL,
    "moderation_comment" "text",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "property_type" "text",
    "selected_contractor_id" "uuid",
    "selected_bid_id" "uuid",
    "contractor_selected_at" timestamp with time zone,
    "work_started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "is_admin_blocked" boolean DEFAULT false NOT NULL,
    "admin_block_reason" "text",
    "admin_blocked_at" timestamp with time zone,
    "admin_blocked_by" "uuid",
    CONSTRAINT "project_area_check" CHECK ((("object_area" IS NULL) OR ("object_area" > (0)::numeric))),
    CONSTRAINT "project_budget_check" CHECK ((("budget_max" IS NULL) OR ("budget_min" IS NULL) OR ("budget_max" >= "budget_min"))),
    CONSTRAINT "project_dates_check" CHECK ((("desired_end_date" IS NULL) OR ("desired_start_date" IS NULL) OR ("desired_end_date" >= "desired_start_date"))),
    CONSTRAINT "project_description_length_check" CHECK ((("char_length"("description") >= 30) AND ("char_length"("description") <= 5000))),
    CONSTRAINT "project_floors_check" CHECK ((("floors_count" IS NULL) OR (("floors_count" >= 1) AND ("floors_count" <= 100)))),
    CONSTRAINT "project_title_length_check" CHECK ((("char_length"("title") >= 10) AND ("char_length"("title") <= 150))),
    CONSTRAINT "projects_property_type_check" CHECK ((("property_type" IS NULL) OR ("property_type" = ANY (ARRAY['apartment'::"text", 'private_house'::"text", 'commercial'::"text", 'land'::"text", 'industrial'::"text", 'other'::"text"]))))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_categories" (
    "id" bigint NOT NULL,
    "parent_id" bigint,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_categories" OWNER TO "postgres";


ALTER TABLE "public"."service_categories" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."service_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_companies"
    ADD CONSTRAINT "contractor_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_portfolio_files"
    ADD CONSTRAINT "contractor_portfolio_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_portfolio_projects"
    ADD CONSTRAINT "contractor_portfolio_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_reviews"
    ADD CONSTRAINT "contractor_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_reviews"
    ADD CONSTRAINT "contractor_reviews_project_unique" UNIQUE ("project_id");



ALTER TABLE ONLY "public"."contractor_service_areas"
    ADD CONSTRAINT "contractor_service_areas_contractor_id_region_city_key" UNIQUE ("contractor_id", "region", "city");



ALTER TABLE ONLY "public"."contractor_service_areas"
    ADD CONSTRAINT "contractor_service_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_services"
    ADD CONSTRAINT "contractor_services_pkey" PRIMARY KEY ("contractor_id", "category_id");



ALTER TABLE ONLY "public"."contractor_verification_logs"
    ADD CONSTRAINT "contractor_verification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_bids"
    ADD CONSTRAINT "project_bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_bids"
    ADD CONSTRAINT "project_bids_project_id_contractor_id_key" UNIQUE ("project_id", "contractor_id");



ALTER TABLE ONLY "public"."project_chat_reads"
    ADD CONSTRAINT "project_chat_reads_pkey" PRIMARY KEY ("project_id", "user_id");



ALTER TABLE ONLY "public"."project_events"
    ADD CONSTRAINT "project_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_images"
    ADD CONSTRAINT "project_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_images"
    ADD CONSTRAINT "project_images_project_id_storage_path_key" UNIQUE ("project_id", "storage_path");



ALTER TABLE ONLY "public"."project_message_files"
    ADD CONSTRAINT "project_message_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_stage_files"
    ADD CONSTRAINT "project_stage_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_stage_files"
    ADD CONSTRAINT "project_stage_files_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."project_stages"
    ADD CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_slug_key" UNIQUE ("slug");



CREATE UNIQUE INDEX "contractor_companies_inn_unique" ON "public"."contractor_companies" USING "btree" ("inn") WHERE ("inn" IS NOT NULL);



CREATE UNIQUE INDEX "contractor_companies_owner_unique" ON "public"."contractor_companies" USING "btree" ("owner_id");



CREATE INDEX "contractor_portfolio_files_project_idx" ON "public"."contractor_portfolio_files" USING "btree" ("portfolio_project_id");



CREATE INDEX "contractor_portfolio_projects_contractor_id_idx" ON "public"."contractor_portfolio_projects" USING "btree" ("contractor_id");



CREATE INDEX "contractor_reviews_contractor_id_idx" ON "public"."contractor_reviews" USING "btree" ("contractor_id");



CREATE INDEX "contractor_reviews_created_at_idx" ON "public"."contractor_reviews" USING "btree" ("created_at" DESC);



CREATE INDEX "contractor_reviews_customer_id_idx" ON "public"."contractor_reviews" USING "btree" ("customer_id");



CREATE INDEX "contractor_verification_logs_admin_idx" ON "public"."contractor_verification_logs" USING "btree" ("admin_id");



CREATE INDEX "contractor_verification_logs_contractor_idx" ON "public"."contractor_verification_logs" USING "btree" ("contractor_id");



CREATE INDEX "contractor_verification_logs_created_at_idx" ON "public"."contractor_verification_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_logs_admin_id" ON "public"."admin_audit_logs" USING "btree" ("admin_id");



CREATE INDEX "idx_admin_audit_logs_created_at" ON "public"."admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_logs_entity" ON "public"."admin_audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_contractor_companies_accepts_projects" ON "public"."contractor_companies" USING "btree" ("accepts_new_projects");



CREATE INDEX "idx_contractor_companies_completed_projects" ON "public"."contractor_companies" USING "btree" ("completed_projects_count" DESC);



CREATE INDEX "idx_contractor_companies_max_budget" ON "public"."contractor_companies" USING "btree" ("maximum_project_budget");



CREATE INDEX "idx_contractor_companies_min_budget" ON "public"."contractor_companies" USING "btree" ("minimum_project_budget");



CREATE INDEX "idx_contractor_companies_public_name_trgm" ON "public"."contractor_companies" USING "gin" ("public_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_contractor_companies_rating" ON "public"."contractor_companies" USING "btree" ("rating" DESC);



CREATE INDEX "idx_contractor_companies_rating_count" ON "public"."contractor_companies" USING "btree" ("rating_count" DESC);



CREATE INDEX "idx_contractor_companies_recommendation" ON "public"."contractor_companies" USING "btree" ("recommendation_score" DESC);



CREATE INDEX "idx_contractor_companies_verification" ON "public"."contractor_companies" USING "btree" ("verification_status");



CREATE INDEX "idx_contractor_service_areas_city" ON "public"."contractor_service_areas" USING "btree" ("city");



CREATE INDEX "idx_contractor_services_category" ON "public"."contractor_services" USING "btree" ("category_id");



CREATE INDEX "idx_profiles_blocked_at" ON "public"."profiles" USING "btree" ("blocked_at" DESC);



CREATE INDEX "idx_profiles_blocked_by" ON "public"."profiles" USING "btree" ("blocked_by");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_project_message_files_message" ON "public"."project_message_files" USING "btree" ("message_id");



CREATE INDEX "idx_projects_is_admin_blocked" ON "public"."projects" USING "btree" ("is_admin_blocked");



CREATE UNIQUE INDEX "notifications_deduplication_key_unique_idx" ON "public"."notifications" USING "btree" ("deduplication_key") WHERE ("deduplication_key" IS NOT NULL);



CREATE INDEX "notifications_message_idx" ON "public"."notifications" USING "btree" ("message_id");



CREATE INDEX "notifications_project_idx" ON "public"."notifications" USING "btree" ("project_id");



CREATE INDEX "notifications_user_created_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_user_unread_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "project_bids_contractor_idx" ON "public"."project_bids" USING "btree" ("contractor_id");



CREATE INDEX "project_bids_created_at_idx" ON "public"."project_bids" USING "btree" ("created_at" DESC);



CREATE INDEX "project_bids_project_idx" ON "public"."project_bids" USING "btree" ("project_id");



CREATE INDEX "project_bids_status_idx" ON "public"."project_bids" USING "btree" ("status");



CREATE INDEX "project_chat_reads_project_read_idx" ON "public"."project_chat_reads" USING "btree" ("project_id", "last_read_at");



CREATE INDEX "project_chat_reads_user_idx" ON "public"."project_chat_reads" USING "btree" ("user_id");



CREATE INDEX "project_events_project_created_idx" ON "public"."project_events" USING "btree" ("project_id", "created_at" DESC);



CREATE INDEX "project_events_project_idx" ON "public"."project_events" USING "btree" ("project_id");



CREATE INDEX "project_events_type_idx" ON "public"."project_events" USING "btree" ("event_type");



CREATE INDEX "project_images_project_idx" ON "public"."project_images" USING "btree" ("project_id");



CREATE INDEX "project_message_files_project_idx" ON "public"."project_message_files" USING "btree" ("project_id");



CREATE UNIQUE INDEX "project_message_files_storage_path_unique" ON "public"."project_message_files" USING "btree" ("storage_path");



CREATE INDEX "project_message_files_uploaded_by_idx" ON "public"."project_message_files" USING "btree" ("uploaded_by");



CREATE INDEX "project_messages_project_created_idx" ON "public"."project_messages" USING "btree" ("project_id", "created_at");



CREATE INDEX "project_stage_files_created_idx" ON "public"."project_stage_files" USING "btree" ("stage_id", "created_at" DESC);



CREATE INDEX "project_stage_files_project_idx" ON "public"."project_stage_files" USING "btree" ("project_id");



CREATE INDEX "project_stage_files_stage_idx" ON "public"."project_stage_files" USING "btree" ("stage_id");



CREATE INDEX "project_stages_project_idx" ON "public"."project_stages" USING "btree" ("project_id");



CREATE INDEX "project_stages_project_sort_idx" ON "public"."project_stages" USING "btree" ("project_id", "sort_order");



CREATE INDEX "project_stages_status_idx" ON "public"."project_stages" USING "btree" ("status");



CREATE INDEX "projects_category_idx" ON "public"."projects" USING "btree" ("category_id");



CREATE INDEX "projects_city_idx" ON "public"."projects" USING "btree" ("city");



CREATE INDEX "projects_created_at_idx" ON "public"."projects" USING "btree" ("created_at" DESC);



CREATE INDEX "projects_customer_idx" ON "public"."projects" USING "btree" ("customer_id");



CREATE INDEX "projects_selected_bid_idx" ON "public"."projects" USING "btree" ("selected_bid_id");



CREATE INDEX "projects_selected_contractor_idx" ON "public"."projects" USING "btree" ("selected_contractor_id");



CREATE INDEX "projects_status_idx" ON "public"."projects" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "contractor_companies_set_updated_at" BEFORE UPDATE ON "public"."contractor_companies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "contractor_reviews_rating_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."contractor_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."handle_contractor_review_rating"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "projects_set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_area_recommendation_score" AFTER INSERT OR DELETE OR UPDATE ON "public"."contractor_service_areas" FOR EACH ROW EXECUTE FUNCTION "public"."handle_area_recommendation_score"();



CREATE OR REPLACE TRIGGER "trg_contractor_company_score_update" AFTER UPDATE OF "rating", "rating_count", "completed_projects_count", "accepts_new_projects" ON "public"."contractor_companies" FOR EACH ROW EXECUTE FUNCTION "public"."handle_contractor_company_score_update"();



CREATE OR REPLACE TRIGGER "trg_portfolio_recommendation_score" AFTER INSERT OR DELETE OR UPDATE ON "public"."contractor_portfolio_projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_portfolio_recommendation_score"();



CREATE OR REPLACE TRIGGER "trg_project_contractor_statistics" AFTER UPDATE OF "status", "selected_contractor_id" ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."handle_project_contractor_statistics"();



CREATE OR REPLACE TRIGGER "trg_service_recommendation_score" AFTER INSERT OR DELETE OR UPDATE ON "public"."contractor_services" FOR EACH ROW EXECUTE FUNCTION "public"."handle_service_recommendation_score"();



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contractor_companies"
    ADD CONSTRAINT "contractor_companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_portfolio_files"
    ADD CONSTRAINT "contractor_portfolio_files_portfolio_project_id_fkey" FOREIGN KEY ("portfolio_project_id") REFERENCES "public"."contractor_portfolio_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_portfolio_files"
    ADD CONSTRAINT "contractor_portfolio_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_portfolio_projects"
    ADD CONSTRAINT "contractor_portfolio_projects_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_reviews"
    ADD CONSTRAINT "contractor_reviews_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_reviews"
    ADD CONSTRAINT "contractor_reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_reviews"
    ADD CONSTRAINT "contractor_reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_service_areas"
    ADD CONSTRAINT "contractor_service_areas_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_services"
    ADD CONSTRAINT "contractor_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contractor_services"
    ADD CONSTRAINT "contractor_services_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_verification_logs"
    ADD CONSTRAINT "contractor_verification_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contractor_verification_logs"
    ADD CONSTRAINT "contractor_verification_logs_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."project_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_bids"
    ADD CONSTRAINT "project_bids_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractor_companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_bids"
    ADD CONSTRAINT "project_bids_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_chat_reads"
    ADD CONSTRAINT "project_chat_reads_last_read_message_id_fkey" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."project_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_chat_reads"
    ADD CONSTRAINT "project_chat_reads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_chat_reads"
    ADD CONSTRAINT "project_chat_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_events"
    ADD CONSTRAINT "project_events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_events"
    ADD CONSTRAINT "project_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_images"
    ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_message_files"
    ADD CONSTRAINT "project_message_files_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."project_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_message_files"
    ADD CONSTRAINT "project_message_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_message_files"
    ADD CONSTRAINT "project_message_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."project_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_messages"
    ADD CONSTRAINT "project_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_stage_files"
    ADD CONSTRAINT "project_stage_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_stage_files"
    ADD CONSTRAINT "project_stage_files_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_stage_files"
    ADD CONSTRAINT "project_stage_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_stages"
    ADD CONSTRAINT "project_stages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_stages"
    ADD CONSTRAINT "project_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_stages"
    ADD CONSTRAINT "project_stages_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_admin_blocked_by_fkey" FOREIGN KEY ("admin_blocked_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_selected_bid_id_fkey" FOREIGN KEY ("selected_bid_id") REFERENCES "public"."project_bids"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_selected_contractor_id_fkey" FOREIGN KEY ("selected_contractor_id") REFERENCES "public"."contractor_companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_categories"
    ADD CONSTRAINT "service_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT;



CREATE POLICY "Anyone can read active categories" ON "public"."service_categories" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Anyone can read verified contractor companies" ON "public"."contractor_companies" FOR SELECT TO "authenticated", "anon" USING ((("verification_status" = 'verified'::"public"."contractor_verification_status") OR ("owner_id" = public.current_user_id())));



CREATE POLICY "Anyone can read verified contractor service areas" ON "public"."contractor_service_areas" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "contractor_service_areas"."contractor_id") AND (("contractor_companies"."verification_status" = 'verified'::"public"."contractor_verification_status") OR ("contractor_companies"."owner_id" = public.current_user_id()))))));



CREATE POLICY "Anyone can read verified contractor services" ON "public"."contractor_services" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "contractor_services"."contractor_id") AND (("contractor_companies"."verification_status" = 'verified'::"public"."contractor_verification_status") OR ("contractor_companies"."owner_id" = public.current_user_id()))))));



CREATE POLICY "Contractors can create own company" ON "public"."contractor_companies" FOR INSERT TO "authenticated" WITH CHECK ((("owner_id" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = public.current_user_id()) AND ("profiles"."role" = 'contractor'::"public"."user_role") AND ("profiles"."is_blocked" = false))))));



CREATE POLICY "Contractors can update own company" ON "public"."contractor_companies" FOR UPDATE TO "authenticated" USING (("owner_id" = public.current_user_id())) WITH CHECK (("owner_id" = public.current_user_id()));



CREATE POLICY "Contractors manage own service areas" ON "public"."contractor_service_areas" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "contractor_service_areas"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "contractor_service_areas"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id())))));



CREATE POLICY "Contractors manage own services" ON "public"."contractor_services" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "contractor_services"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "contractor_services"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id())))));



CREATE POLICY "Contractors read own bids" ON "public"."project_bids" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "project_bids"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id())))));



CREATE POLICY "Contractors read own company" ON "public"."contractor_companies" FOR SELECT TO "authenticated" USING (("owner_id" = public.current_user_id()));



CREATE POLICY "Contractors read published project images" ON "public"."project_images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_images"."project_id") AND ("projects"."status" = 'published'::"public"."project_status")))));



CREATE POLICY "Contractors update own active bids" ON "public"."project_bids" FOR UPDATE TO "authenticated" USING ((("status" = ANY (ARRAY['submitted'::"public"."bid_status", 'viewed'::"public"."bid_status", 'shortlisted'::"public"."bid_status"])) AND (EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "project_bids"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "project_bids"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id())))));



CREATE POLICY "Customers can create own projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((("customer_id" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = public.current_user_id()) AND ("profiles"."role" = 'customer'::"public"."user_role") AND ("profiles"."is_blocked" = false))))));



CREATE POLICY "Customers can delete own draft projects" ON "public"."projects" FOR DELETE TO "authenticated" USING ((("customer_id" = public.current_user_id()) AND ("status" = 'draft'::"public"."project_status")));



CREATE POLICY "Customers can read own projects" ON "public"."projects" FOR SELECT TO "authenticated" USING (("customer_id" = public.current_user_id()));



CREATE POLICY "Customers can update editable own projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((("customer_id" = public.current_user_id()) AND ("status" = ANY (ARRAY['draft'::"public"."project_status", 'submitted'::"public"."project_status", 'needs_clarification'::"public"."project_status"])))) WITH CHECK (("customer_id" = public.current_user_id()));



CREATE POLICY "Customers create own projects" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((("customer_id" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = public.current_user_id()) AND ("profiles"."role" = 'customer'::"public"."user_role") AND ("profiles"."is_blocked" = false))))));



CREATE POLICY "Customers delete own drafts" ON "public"."projects" FOR DELETE TO "authenticated" USING ((("customer_id" = public.current_user_id()) AND ("status" = 'draft'::"public"."project_status")));



CREATE POLICY "Customers manage own project images" ON "public"."project_images" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_images"."project_id") AND ("projects"."customer_id" = public.current_user_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_images"."project_id") AND ("projects"."customer_id" = public.current_user_id())))));



CREATE POLICY "Customers read bids for own projects" ON "public"."project_bids" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_bids"."project_id") AND ("projects"."customer_id" = public.current_user_id())))));



CREATE POLICY "Customers read own projects" ON "public"."projects" FOR SELECT TO "authenticated" USING (("customer_id" = public.current_user_id()));



CREATE POLICY "Customers update bids for own projects" ON "public"."project_bids" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_bids"."project_id") AND ("projects"."customer_id" = public.current_user_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_bids"."project_id") AND ("projects"."customer_id" = public.current_user_id())))));



CREATE POLICY "Customers update own projects" ON "public"."projects" FOR UPDATE TO "authenticated" USING (("customer_id" = public.current_user_id())) WITH CHECK (("customer_id" = public.current_user_id()));



CREATE POLICY "Selected contractor creates stage files" ON "public"."project_stage_files" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM (("public"."projects" "p"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "p"."selected_contractor_id")))
     JOIN "public"."project_stages" "s" ON (("s"."project_id" = "p"."id")))
  WHERE (("p"."id" = "project_stage_files"."project_id") AND ("s"."id" = "project_stage_files"."stage_id") AND ("c"."owner_id" = public.current_user_id()) AND ("p"."status" = ANY (ARRAY['contractor_selected'::"public"."project_status", 'in_progress'::"public"."project_status"])) AND ("s"."status" = ANY (ARRAY['planned'::"public"."project_stage_status", 'in_progress'::"public"."project_stage_status", 'revision_required'::"public"."project_stage_status", 'awaiting_review'::"public"."project_stage_status"])))))));



CREATE POLICY "Selected contractor reads assigned projects" ON "public"."projects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "c"
  WHERE (("c"."id" = "projects"."selected_contractor_id") AND ("c"."owner_id" = public.current_user_id())))));



CREATE POLICY "Selected contractor updates assigned project" ON "public"."projects" FOR UPDATE TO "authenticated" USING (("selected_contractor_id" IN ( SELECT "contractor_companies"."id"
   FROM "public"."contractor_companies"
  WHERE ("contractor_companies"."owner_id" = public.current_user_id())))) WITH CHECK (("selected_contractor_id" IN ( SELECT "contractor_companies"."id"
   FROM "public"."contractor_companies"
  WHERE ("contractor_companies"."owner_id" = public.current_user_id()))));



CREATE POLICY "Selected contractor updates project stages" ON "public"."project_stages" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "p"."selected_contractor_id")))
  WHERE (("p"."id" = "project_stages"."project_id") AND ("c"."owner_id" = public.current_user_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "p"."selected_contractor_id")))
  WHERE (("p"."id" = "project_stages"."project_id") AND ("c"."owner_id" = public.current_user_id())))));



CREATE POLICY "Selected contractors create project stages" ON "public"."project_stages" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "p"."selected_contractor_id")))
  WHERE (("p"."id" = "project_stages"."project_id") AND ("c"."owner_id" = public.current_user_id()) AND ("p"."status" = ANY (ARRAY['contractor_selected'::"public"."project_status", 'in_progress'::"public"."project_status"])))))));



CREATE POLICY "Selected contractors delete planned stages" ON "public"."project_stages" FOR DELETE TO "authenticated" USING ((("status" = 'planned'::"public"."project_stage_status") AND (EXISTS ( SELECT 1
   FROM ("public"."projects" "p"
     JOIN "public"."contractor_companies" "c" ON (("c"."id" = "p"."selected_contractor_id")))
  WHERE (("p"."id" = "project_stages"."project_id") AND ("c"."owner_id" = public.current_user_id()))))));



CREATE POLICY "Staff can create admin audit logs" ON "public"."admin_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_staff_user"() AND ("admin_id" = public.current_user_id())));



CREATE POLICY "Staff can create verification logs" ON "public"."contractor_verification_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_staff_user"() AND ("admin_id" = public.current_user_id())));



CREATE POLICY "Staff can read admin audit logs" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_staff_user"());



CREATE POLICY "Staff can read all contractor companies" ON "public"."contractor_companies" FOR SELECT TO "authenticated" USING ("public"."is_staff_user"());



CREATE POLICY "Staff can read all contractor service areas" ON "public"."contractor_service_areas" FOR SELECT TO "authenticated" USING ("public"."is_staff_user"());



CREATE POLICY "Staff can read all contractor services" ON "public"."contractor_services" FOR SELECT TO "authenticated" USING ("public"."is_staff_user"());



CREATE POLICY "Staff can read verification logs" ON "public"."contractor_verification_logs" FOR SELECT TO "authenticated" USING ("public"."is_staff_user"());



CREATE POLICY "Staff can update contractor verification" ON "public"."contractor_companies" FOR UPDATE TO "authenticated" USING ("public"."is_staff_user"()) WITH CHECK ("public"."is_staff_user"());



CREATE POLICY "Staff can update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."is_staff_user"() AND ((("role")::"text" <> ALL (ARRAY['admin'::"text", 'moderator'::"text", 'manager'::"text"])) OR "public"."is_admin_user"()))) WITH CHECK (("public"."is_staff_user"() AND ((("role")::"text" <> ALL (ARRAY['admin'::"text", 'moderator'::"text", 'manager'::"text"])) OR "public"."is_admin_user"())));



CREATE POLICY "Staff can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_staff_user"());



CREATE POLICY "Uploaders delete own message files" ON "public"."project_message_files" FOR DELETE TO "authenticated" USING ((("uploaded_by" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id")));



CREATE POLICY "Uploaders delete own stage files" ON "public"."project_stage_files" FOR DELETE TO "authenticated" USING ((("uploaded_by" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM "public"."project_stages" "s"
  WHERE (("s"."id" = "project_stage_files"."stage_id") AND ("s"."status" <> 'completed'::"public"."project_stage_status"))))));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = public.current_user_id()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = public.current_user_id())) WITH CHECK (("id" = public.current_user_id()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = public.current_user_id()));



CREATE POLICY "Users create own chat state" ON "public"."project_chat_reads" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id")));



CREATE POLICY "Users delete own messages" ON "public"."project_messages" FOR DELETE TO "authenticated" USING ((("sender_id" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id")));



CREATE POLICY "Users read own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = public.current_user_id()));



CREATE POLICY "Users update own chat state" ON "public"."project_chat_reads" FOR UPDATE TO "authenticated" USING ((("user_id" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id"))) WITH CHECK ((("user_id" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id")));



CREATE POLICY "Users update own messages" ON "public"."project_messages" FOR UPDATE TO "authenticated" USING ((("sender_id" = public.current_user_id()) AND ("is_deleted" = false) AND "public"."can_access_project_workspace"("project_id"))) WITH CHECK ((("sender_id" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id")));



CREATE POLICY "Users update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = public.current_user_id())) WITH CHECK (("user_id" = public.current_user_id()));



CREATE POLICY "Verified contractors create bids" ON "public"."project_bids" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."id" = "project_bids"."contractor_id") AND ("contractor_companies"."owner_id" = public.current_user_id()) AND ("contractor_companies"."verification_status" = 'verified'::"public"."contractor_verification_status") AND ("contractor_companies"."accepts_new_projects" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."projects"
  WHERE (("projects"."id" = "project_bids"."project_id") AND ("projects"."status" = 'published'::"public"."project_status"))))));



CREATE POLICY "Verified contractors read published projects" ON "public"."projects" FOR SELECT TO "authenticated" USING ((("status" = ANY (ARRAY['published'::"public"."project_status", 'collecting_bids'::"public"."project_status"])) AND (EXISTS ( SELECT 1
   FROM "public"."contractor_companies"
  WHERE (("contractor_companies"."owner_id" = public.current_user_id()) AND ("contractor_companies"."verification_status" = 'verified'::"public"."contractor_verification_status") AND ("contractor_companies"."accepts_new_projects" = true))))));



CREATE POLICY "Workspace participants create message files" ON "public"."project_message_files" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id") AND (EXISTS ( SELECT 1
   FROM "public"."project_messages" "pm"
  WHERE (("pm"."id" = "project_message_files"."message_id") AND ("pm"."project_id" = "project_message_files"."project_id") AND ("pm"."sender_id" = public.current_user_id()))))));



CREATE POLICY "Workspace participants create project events" ON "public"."project_events" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id")));



CREATE POLICY "Workspace participants read chat states" ON "public"."project_chat_reads" FOR SELECT TO "authenticated" USING ("public"."can_access_project_workspace"("project_id"));



CREATE POLICY "Workspace participants read message files" ON "public"."project_message_files" FOR SELECT TO "authenticated" USING ("public"."can_access_project_workspace"("project_id"));



CREATE POLICY "Workspace participants read messages" ON "public"."project_messages" FOR SELECT TO "authenticated" USING ("public"."can_access_project_workspace"("project_id"));



CREATE POLICY "Workspace participants read project events" ON "public"."project_events" FOR SELECT TO "authenticated" USING ("public"."can_access_project_workspace"("project_id"));



CREATE POLICY "Workspace participants read project stages" ON "public"."project_stages" FOR SELECT TO "authenticated" USING ("public"."can_access_project_workspace"("project_id"));



CREATE POLICY "Workspace participants read stage files" ON "public"."project_stage_files" FOR SELECT TO "authenticated" USING ("public"."can_access_project_workspace"("project_id"));



CREATE POLICY "Workspace participants send messages" ON "public"."project_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = public.current_user_id()) AND "public"."can_access_project_workspace"("project_id")));



ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_portfolio_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_portfolio_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_service_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractor_verification_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer creates completed project review" ON "public"."contractor_reviews" FOR INSERT TO "authenticated" WITH CHECK ((("customer_id" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "contractor_reviews"."project_id") AND ("p"."customer_id" = public.current_user_id()) AND ("p"."status" = 'completed'::"public"."project_status") AND ("p"."selected_contractor_id" = "contractor_reviews"."contractor_id"))))));



CREATE POLICY "customer deletes own review" ON "public"."contractor_reviews" FOR DELETE TO "authenticated" USING (("customer_id" = public.current_user_id()));



CREATE POLICY "customer updates own review" ON "public"."contractor_reviews" FOR UPDATE TO "authenticated" USING (("customer_id" = public.current_user_id())) WITH CHECK ((("customer_id" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "contractor_reviews"."project_id") AND ("p"."customer_id" = public.current_user_id()) AND ("p"."status" = 'completed'::"public"."project_status") AND ("p"."selected_contractor_id" = "contractor_reviews"."contractor_id"))))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portfolio files delete own" ON "public"."contractor_portfolio_files" FOR DELETE TO "authenticated" USING ((("uploaded_by" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM ("public"."contractor_portfolio_projects" "cpp"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "cpp"."contractor_id")))
  WHERE (("cpp"."id" = "contractor_portfolio_files"."portfolio_project_id") AND ("cc"."owner_id" = public.current_user_id()))))));



CREATE POLICY "portfolio files insert own" ON "public"."contractor_portfolio_files" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM ("public"."contractor_portfolio_projects" "cpp"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "cpp"."contractor_id")))
  WHERE (("cpp"."id" = "contractor_portfolio_files"."portfolio_project_id") AND ("cc"."owner_id" = public.current_user_id()))))));



CREATE POLICY "portfolio files select" ON "public"."contractor_portfolio_files" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "portfolio files update own" ON "public"."contractor_portfolio_files" FOR UPDATE TO "authenticated" USING ((("uploaded_by" = public.current_user_id()) AND (EXISTS ( SELECT 1
   FROM ("public"."contractor_portfolio_projects" "cpp"
     JOIN "public"."contractor_companies" "cc" ON (("cc"."id" = "cpp"."contractor_id")))
  WHERE (("cpp"."id" = "contractor_portfolio_files"."portfolio_project_id") AND ("cc"."owner_id" = public.current_user_id())))))) WITH CHECK (("uploaded_by" = public.current_user_id()));



CREATE POLICY "portfolio projects delete own" ON "public"."contractor_portfolio_projects" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_portfolio_projects"."contractor_id") AND ("cc"."owner_id" = public.current_user_id())))));



CREATE POLICY "portfolio projects insert own" ON "public"."contractor_portfolio_projects" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_portfolio_projects"."contractor_id") AND ("cc"."owner_id" = public.current_user_id())))));



CREATE POLICY "portfolio projects select" ON "public"."contractor_portfolio_projects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "portfolio projects update own" ON "public"."contractor_portfolio_projects" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_portfolio_projects"."contractor_id") AND ("cc"."owner_id" = public.current_user_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."contractor_companies" "cc"
  WHERE (("cc"."id" = "contractor_portfolio_projects"."contractor_id") AND ("cc"."owner_id" = public.current_user_id())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_chat_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_message_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_stage_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews select authenticated" ON "public"."contractor_reviews" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."service_categories" ENABLE ROW LEVEL SECURITY;



















GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."can_access_project_workspace"("target_project_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_access_project_workspace"("target_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_project_workspace"("target_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_project_workspace"("target_project_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_mutate_project_workspace"("target_project_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_mutate_project_workspace"("target_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_mutate_project_workspace"("target_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_mutate_project_workspace"("target_project_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_read_project_files"("target_project_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_read_project_files"("target_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_project_files"("target_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_project_files"("target_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_storage_project_id"("object_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_storage_project_id"("object_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_storage_project_id"("object_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_area_recommendation_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_area_recommendation_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_area_recommendation_score"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_contractor_company_score_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_contractor_company_score_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_contractor_company_score_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_contractor_review_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_contractor_review_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_contractor_review_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_portfolio_recommendation_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_portfolio_recommendation_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_portfolio_recommendation_score"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_project_contractor_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_project_contractor_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_project_contractor_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_service_recommendation_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_service_recommendation_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_service_recommendation_score"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_staff_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_staff_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_staff_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_all_notifications_read"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_notification_read"("target_notification_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_notification_read"("target_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("target_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("target_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_contractor_rating"("contractor_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_contractor_rating"("contractor_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_contractor_rating"("contractor_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_contractor_recommendation_score"("contractor_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_contractor_recommendation_score"("contractor_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_contractor_recommendation_score"("contractor_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."review_project_stage"("target_stage_id" "uuid", "target_project_id" "uuid", "decision" "text", "review_comment" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_project_stage"("target_stage_id" "uuid", "target_project_id" "uuid", "decision" "text", "review_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."review_project_stage"("target_stage_id" "uuid", "target_project_id" "uuid", "decision" "text", "review_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_project_stage"("target_stage_id" "uuid", "target_project_id" "uuid", "decision" "text", "review_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_companies" TO "anon";
GRANT ALL ON TABLE "public"."contractor_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_companies" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_portfolio_files" TO "anon";
GRANT ALL ON TABLE "public"."contractor_portfolio_files" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_portfolio_files" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_portfolio_projects" TO "anon";
GRANT ALL ON TABLE "public"."contractor_portfolio_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_portfolio_projects" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_reviews" TO "anon";
GRANT ALL ON TABLE "public"."contractor_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_service_areas" TO "anon";
GRANT ALL ON TABLE "public"."contractor_service_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_service_areas" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_services" TO "anon";
GRANT ALL ON TABLE "public"."contractor_services" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_services" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_verification_logs" TO "anon";
GRANT ALL ON TABLE "public"."contractor_verification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_verification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_bids" TO "anon";
GRANT ALL ON TABLE "public"."project_bids" TO "authenticated";
GRANT ALL ON TABLE "public"."project_bids" TO "service_role";



GRANT ALL ON TABLE "public"."project_chat_reads" TO "anon";
GRANT ALL ON TABLE "public"."project_chat_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."project_chat_reads" TO "service_role";



GRANT ALL ON TABLE "public"."project_events" TO "anon";
GRANT ALL ON TABLE "public"."project_events" TO "authenticated";
GRANT ALL ON TABLE "public"."project_events" TO "service_role";



GRANT ALL ON TABLE "public"."project_images" TO "anon";
GRANT ALL ON TABLE "public"."project_images" TO "authenticated";
GRANT ALL ON TABLE "public"."project_images" TO "service_role";



GRANT ALL ON TABLE "public"."project_message_files" TO "anon";
GRANT ALL ON TABLE "public"."project_message_files" TO "authenticated";
GRANT ALL ON TABLE "public"."project_message_files" TO "service_role";



GRANT ALL ON TABLE "public"."project_messages" TO "anon";
GRANT ALL ON TABLE "public"."project_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."project_messages" TO "service_role";



GRANT ALL ON TABLE "public"."project_stage_files" TO "anon";
GRANT ALL ON TABLE "public"."project_stage_files" TO "authenticated";
GRANT ALL ON TABLE "public"."project_stage_files" TO "service_role";



GRANT ALL ON TABLE "public"."project_stages" TO "anon";
GRANT ALL ON TABLE "public"."project_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."project_stages" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."service_categories" TO "anon";
GRANT ALL ON TABLE "public"."service_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."service_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."service_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."service_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."service_categories_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































