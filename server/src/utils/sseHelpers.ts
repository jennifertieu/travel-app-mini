import { Response } from "express";

export const initSSE = (response: Response): void => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  // Disable Nagle's algorithm so writes are sent immediately
  response.socket?.setNoDelay(true);
  response.flushHeaders();
};

export const sendSSEEvent = (
  response: Response,
  event: string,
  data: unknown
): void => {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  // Force flush to prevent Node/Express from buffering
  if (typeof (response as any).flush === "function") {
    (response as any).flush();
  }
};

export const endSSE = (response: Response): void => {
  response.end();
};
