type SSECallbacks<TData> = {
  onEvent: (event: string, data: TData) => void;
  onError?: (error: Error) => void;
};

export const parseSSEStream = async <TData>(
  response: Response,
  callbacks: SSECallbacks<TData>,
  signal?: AbortSignal,
): Promise<void> => {
  if (!response.body) {
    throw new Error("Streaming response body is missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let currentEvent = "message";
  let dataLines: string[] = [];

  const flushEvent = () => {
    if (dataLines.length === 0) return;
    const rawData = dataLines.join("\n");
    dataLines = [];
    try {
      const parsed = JSON.parse(rawData) as TData;
      callbacks.onEvent(currentEvent, parsed);
    } catch (error) {
      callbacks.onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to parse SSE payload"),
      );
    }
  };

  while (true) {
    if (signal?.aborted) {
      reader.cancel().catch(() => undefined);
      return;
    }

    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);

      if (line.startsWith("event:")) {
        currentEvent = line.replace("event:", "").trim() || "message";
      } else if (line.startsWith("data:")) {
        dataLines.push(line.replace("data:", "").trim());
      } else if (line === "") {
        flushEvent();
        currentEvent = "message";
      }

      newlineIndex = buffer.indexOf("\n");
    }
  }

  if (buffer.length > 0) {
    const finalLine = buffer.replace(/\r$/, "");
    if (finalLine.startsWith("data:")) {
      dataLines.push(finalLine.replace("data:", "").trim());
    }
    flushEvent();
  }
};
