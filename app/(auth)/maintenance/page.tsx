import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
            系统维护中
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            系统正在进行维护，暂时无法访问。请稍后再试。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
