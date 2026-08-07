"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  MessageSquareText,
  Star,
} from "lucide-react";

type ReviewProfile = {
  id: string;
  first_name: string;
  last_name: string | null;
};

type ReviewProject = {
  id: string;
  title: string;
  city: string | null;
};

type Review = {
  id: string;
  project_id: string;
  contractor_id: string;
  customer_id: string;

  rating: number;

  quality_rating:
    number | null;

  deadline_rating:
    number | null;

  communication_rating:
    number | null;

  comment:
    string | null;

  created_at: string;
  updated_at: string;

  projects:
    | ReviewProject
    | ReviewProject[]
    | null;

  profiles:
    | ReviewProfile
    | ReviewProfile[]
    | null;
};

type Distribution = {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
};

type Props = {
  reviews: Review[];

  total: number;

  averageRating: number;
  averageQuality: number;
  averageDeadline: number;
  averageCommunication: number;

  distribution:
    Distribution;
};

type RatingFilter =
  | "all"
  | 5
  | 4
  | 3
  | 2
  | 1;

export function ContractorReviews({
  reviews,
  total,
  averageRating,
  averageQuality,
  averageDeadline,
  averageCommunication,
  distribution,
}: Props) {
  const [
    filter,
    setFilter,
  ] =
    useState<
      RatingFilter
    >("all");

  const filteredReviews =
    useMemo(
      () => {
        if (
          filter ===
          "all"
        ) {
          return reviews;
        }

        return reviews.filter(
          (review) =>
            review.rating ===
            filter
        );
      },
      [
        reviews,
        filter,
      ]
    );

  if (
    total === 0
  ) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
          <MessageSquareText className="h-5 w-5" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-foreground">
          Отзывов пока нет
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          После завершения проектов здесь
          появятся оценки заказчиков.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общий рейтинг */}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-[1.5rem] border border-border bg-secondary/50 p-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Общий рейтинг
          </p>

          <p className="mt-3 text-5xl font-black tracking-tight text-foreground">
            {averageRating.toFixed(
              1
            )}
          </p>

          <div className="mt-3 flex justify-center">
            <StaticStars
              rating={
                averageRating
              }
              size="large"
            />
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {total}{" "}
            {formatReviewCount(
              total
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Качество работ"
            value={
              averageQuality
            }
          />

          <MetricCard
            label="Соблюдение сроков"
            value={
              averageDeadline
            }
          />

          <MetricCard
            label="Коммуникация"
            value={
              averageCommunication
            }
          />
        </div>
      </div>

      {/* Распределение */}

      <div className="rounded-[1.5rem] border border-border bg-background/60 p-5">
        <p className="text-sm font-bold text-foreground">
          Распределение оценок
        </p>

        <div className="mt-5 space-y-3">
          {[
            5,
            4,
            3,
            2,
            1,
          ].map(
            (rating) => {
              const count =
                distribution[
                  rating as keyof Distribution
                ];

              const percent =
                total > 0
                  ? Math.round(
                      (
                        count /
                        total
                      ) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={
                    rating
                  }
                  className="grid grid-cols-[40px_1fr_40px] items-center gap-3"
                >
                  <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    {rating}

                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width:
                          `${percent}%`,
                      }}
                    />
                  </div>

                  <span className="text-right text-xs text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Фильтры */}

      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={
            filter ===
            "all"
          }
          onClick={() =>
            setFilter(
              "all"
            )
          }
        >
          Все ({total})
        </FilterButton>

        {[
          5,
          4,
          3,
          2,
          1,
        ].map(
          (rating) => (
            <FilterButton
              key={
                rating
              }
              active={
                filter ===
                rating
              }
              onClick={() =>
                setFilter(
                  rating as RatingFilter
                )
              }
            >
              {rating} ★
            </FilterButton>
          )
        )}
      </div>

      {/* Список */}

      <div className="space-y-4">
        {filteredReviews.length ===
        0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Отзывов с такой оценкой нет.
          </div>
        ) : (
          filteredReviews.map(
            (
              review
            ) => {
              const customer =
                getSingleRelation(
                  review.profiles
                );

              const project =
                getSingleRelation(
                  review.projects
                );

              return (
                <article
                  key={
                    review.id
                  }
                  className="rounded-[1.5rem] border border-border bg-background/60 p-5 md:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <StaticStars
                        rating={
                          review.rating
                        }
                      />

                      <h3 className="mt-3 font-bold text-foreground">
                        {project?.title ??
                          "Завершённый проект"}
                      </h3>

                      {project?.city && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {
                            project.city
                          }
                        </p>
                      )}
                    </div>

                    <time
                      dateTime={
                        review.created_at
                      }
                      className="text-xs text-muted-foreground"
                    >
                      {formatDate(
                        review.created_at
                      )}
                    </time>
                  </div>

                  {(review.quality_rating ||
                    review.deadline_rating ||
                    review.communication_rating) && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {review.quality_rating && (
                        <SmallMetric
                          label="Качество"
                          value={
                            review.quality_rating
                          }
                        />
                      )}

                      {review.deadline_rating && (
                        <SmallMetric
                          label="Сроки"
                          value={
                            review.deadline_rating
                          }
                        />
                      )}

                      {review.communication_rating && (
                        <SmallMetric
                          label="Общение"
                          value={
                            review.communication_rating
                          }
                        />
                      )}
                    </div>
                  )}

                  {review.comment && (
                    <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {
                        review.comment
                      }
                    </p>
                  )}

                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCustomerName(
                        customer
                      )}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Заказчик проекта
                    </p>
                  </div>
                </article>
              );
            }
          )
        )}
      </div>
    </div>
  );
}

function StaticStars({
  rating,
  size = "normal",
}: {
  rating: number;
  size?:
    | "normal"
    | "large";
}) {
  return (
    <div className="flex items-center gap-1">
      {[
        1,
        2,
        3,
        4,
        5,
      ].map(
        (star) => (
          <Star
            key={
              star
            }
            className={[
              size ===
              "large"
                ? "h-6 w-6"
                : "h-4 w-4",

              star <=
              Math.round(
                rating
              )
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/25",
            ].join(
              " "
            )}
          />
        )
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background/60 p-5">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-2xl font-black text-foreground">
          {value > 0
            ? value.toFixed(
                1
              )
            : "—"}
        </span>

        {value > 0 && (
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
        )}
      </div>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
      {label}

      <strong>
        {value}
      </strong>

      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
    </span>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick:
    () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background/60 text-foreground hover:bg-secondary",
      ].join(
        " "
      )}
    >
      {children}
    </button>
  );
}

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

function formatCustomerName(
  customer:
    | ReviewProfile
    | null
) {
  if (!customer) {
    return "Заказчик";
  }

  const firstName =
    customer.first_name;

  const lastInitial =
    customer.last_name
      ? `${customer.last_name.charAt(
          0
        )}.`
      : "";

  return [
    firstName,
    lastInitial,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle:
        "long",
    }
  ).format(
    new Date(value)
  );
}

function formatReviewCount(
  count: number
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "отзывов";
  }

  if (
    last === 1
  ) {
    return "отзыв";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "отзыва";
  }

  return "отзывов";
}