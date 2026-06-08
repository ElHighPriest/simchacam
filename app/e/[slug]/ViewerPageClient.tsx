"use client";

import { useEffect, useState } from "react";
import ViewerRoom from "@/app/components/ViewerRoom";

type ViewerPageClientProps = {
  slug: string;
};

export default function ViewerPageClient({
  slug,
}: ViewerPageClientProps) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function joinRoom() {
      try {
        const response = await fetch("/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: slug,
            participantName: `viewer-${Math.random()
              .toString(36)
              .substring(2, 8)}`,
            canPublish: false,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error);
        }

        setToken(data.token);
        setServerUrl(data.url);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    joinRoom();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Connecting to livestream...
      </main>
    );
  }

  if (!token || !serverUrl) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Could not connect to livestream.
      </main>
    );
  }

  return <ViewerRoom token={token} serverUrl={serverUrl} />;
}