import { Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function Chat({ messages = [], onSend, connected = true, sending = false }) {
  const [message, setMessage] = useState("");
  const [localSending, setLocalSending] = useState(false);
  const listRef = useRef(null);
  const isSending = sending || localSending;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function submit(event) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !connected || isSending) {
      return;
    }
    setLocalSending(true);
    try {
      await onSend(trimmed);
      setMessage("");
    } finally {
      setLocalSending(false);
    }
  }

  return (
    <aside className="chat-panel">
      <div className="section-title">
        <MessageCircle size={18} />
        <h2>الدردشة</h2>
      </div>
      <div className="chat-list" ref={listRef}>
        {messages.map((item) => (
          <div className={`chat-message ${item.type === "system" ? "system" : ""}`} key={item.id}>
            {item.type === "player" ? <strong>{item.playerName}</strong> : null}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={180}
          placeholder={connected ? "رسالة" : "جاري الاتصال"}
          disabled={!connected || isSending}
        />
        <button className="icon-button" type="submit" aria-label="إرسال" disabled={!connected || isSending || !message.trim()}>
          {isSending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
        </button>
      </form>
    </aside>
  );
}
