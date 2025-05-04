export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  );
}