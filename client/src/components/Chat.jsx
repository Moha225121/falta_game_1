import { MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function Chat({ messages = [], onSend }) {
  const [message, setMessage] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function submit(event) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setMessage("");
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
          placeholder="رسالة"
        />
        <button className="icon-button" type="submit" aria-label="إرسال">
          <Send size={18} />
        </button>
      </form>
    </aside>
  );
}
