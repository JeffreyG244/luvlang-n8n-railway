import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Analytics = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Analytics dashboard coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;