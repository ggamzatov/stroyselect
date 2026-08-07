import { DashboardHeader } from
  "@/features/layout/components/dashboard-header";

type Props = {
  children:
    React.ReactNode;
};

export default function ContractorLayout({
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {children}
    </div>
  );
}