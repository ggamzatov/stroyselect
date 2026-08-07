type Props = {
  status: string;
};

export function VerificationStatusBadge({
  status,
}: Props) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case "pending":
      return {
        label: "Ожидает проверки",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "verified":
      return {
        label: "Подтверждён",
        className:
          "bg-green-100 text-green-800",
      };

    case "rejected":
      return {
        label: "Отклонён",
        className:
          "bg-red-100 text-red-800",
      };

    case "suspended":
      return {
        label: "Приостановлен",
        className:
          "bg-slate-200 text-slate-800",
      };

    case "draft":
      return {
        label: "Черновик",
        className:
          "bg-blue-100 text-blue-800",
      };

    default:
      return {
        label: status,
        className:
          "bg-slate-100 text-slate-700",
      };
  }
}