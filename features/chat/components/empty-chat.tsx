import {
  MessageCircle,
} from "lucide-react";

export function EmptyChat() {
  return (
    <div className="flex min-h-[340px] items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-secondary text-primary">
          <MessageCircle className="h-7 w-7" />
        </div>

        <h3 className="mt-5 text-lg font-bold text-foreground">
          Начните обсуждение проекта
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Здесь будут храниться
          сообщения между заказчиком
          и подрядчиком по этому объекту.
        </p>
      </div>
    </div>
  );
}