type ProjectEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

type Props = {
  events: ProjectEvent[];
};

export function WorkspaceTimeline({
  events,
}: Props) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">
        История проекта
      </h2>

      {events.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Событий пока нет.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {events.map((event) => (
            <article
              key={event.id}
              className="relative border-l-2 border-slate-200 pl-6"
            >
              <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-blue-700" />

              <p className="text-xs text-slate-500">
                {formatDateTime(
                  event.created_at
                )}
              </p>

              <h3 className="mt-1 font-semibold">
                {event.title}
              </h3>

              {event.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {event.description}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}