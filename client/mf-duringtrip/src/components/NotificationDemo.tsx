import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotifications } from "../hooks/useNotifications";

export const NotificationDemo: React.FC = () => {
  const { permission, isSupported, requestPermission, sendNotification } =
    useNotifications();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const handleSendTestNotification = () => {
    sendNotification("Travel Assistant", {
      body: "Great restaurant nearby! Check out Joe's Pizza, rated 4.6★",
      tag: "demo-notification",
      requireInteraction: false,
    });
  };

  if (!isSupported) {
    return (
      <Alert variant="warning" className="mb-4">
        <AlertDescription>
          Push notifications are not supported in this browser.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Push Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge
            variant={
              permission === "granted"
                ? "success"
                : permission === "denied"
                  ? "destructive"
                  : "secondary"
            }
          >
            {permission === "granted"
              ? "Enabled"
              : permission === "denied"
                ? "Denied"
                : "Not set"}
          </Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          {permission !== "granted" && (
            <Button
              onClick={handleRequestPermission}
              disabled={permission === "denied"}
              variant={permission === "denied" ? "secondary" : "default"}
            >
              Enable Notifications
            </Button>
          )}

          {permission === "granted" && (
            <Button onClick={handleSendTestNotification} variant="success">
              Send Test Notification
            </Button>
          )}
        </div>

        {permission === "denied" && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              Notifications are blocked. Please enable them in your browser
              settings.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
