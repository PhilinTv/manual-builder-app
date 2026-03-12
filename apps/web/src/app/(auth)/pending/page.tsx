import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Pending</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Your account is pending admin approval. You will be able to access the
          application once an administrator approves your account.
        </p>
      </CardContent>
    </Card>
  );
}
