import { useState, useCallback } from "react";
import type { ChatMessage } from "../types";

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "agent",
    content:
      "Hi! I'm your Itinerary Assistant. Ask me to move, swap, or remove activities from your trip.",
    timestamp: new Date(Date.now() - 600000),
  },
  {
    id: "2",
    role: "user",
    content: "Can you move the Eiffel Tower visit to Day 2 morning?",
    timestamp: new Date(Date.now() - 540000),
  },
  {
    id: "3",
    role: "agent",
    content:
      "Moving the Eiffel Tower to Day 2 morning would conflict with Notre-Dame Cathedral. Would you like to swap them, or remove Notre-Dame?",
    timestamp: new Date(Date.now() - 480000),
  },
  {
    id: "4",
    role: "user",
    content: "Swap them.",
    timestamp: new Date(Date.now() - 420000),
  },
  {
    id: "5",
    role: "agent",
    content:
      "Done! I've swapped the Eiffel Tower and Notre-Dame Cathedral. Now: Day 1 morning = Notre-Dame, Day 2 afternoon = Eiffel Tower.",
    timestamp: new Date(Date.now() - 360000),
  },
  {
    id: "6",
    role: "user",
    content: "Great, can you also move the Seine River Cruise to Day 3 evening?",
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: "7",
    role: "agent",
    content:
      "The Seine River Cruise has been moved to Day 3 evening. Day 3 evening is now: Seine River Cruise.",
    timestamp: new Date(Date.now() - 240000),
  },
  {
    id: "8",
    role: "user",
    content: "What does Day 2 look like now?",
    timestamp: new Date(Date.now() - 180000),
  },
  {
    id: "9",
    role: "agent",
    content:
      "Day 2 currently looks like this:\n• Morning: Louvre Museum\n• Afternoon: Eiffel Tower\n• Evening: Le Marais food tour",
    timestamp: new Date(Date.now() - 120000),
  },
  {
    id: "10",
    role: "user",
    content: "Perfect, save it!",
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: "11",
    role: "agent",
    content:
      "Your itinerary has been saved. Enjoy your trip to Paris! Let me know if you'd like any more changes.",
    timestamp: new Date(Date.now() - 30000),
  },
];

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const toggleChat = useCallback(() => setIsChatOpen((prev) => !prev), []);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    setInputValue("");
  }, [inputValue]);

  return { messages, isChatOpen, toggleChat, inputValue, setInputValue, handleSend };
}
