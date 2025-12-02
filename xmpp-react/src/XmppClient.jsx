import { useState, useEffect, useRef } from "react";
import { client, xml } from "@xmpp/client";

export default function XmppClient({ id }) {
  const [xmpp, setXmpp] = useState(null);
  const [jid, setJid] = useState("");
  const [password, setPassword] = useState("");
  const [connected, setConnected] = useState(false);

  const [to, setTo] = useState("");
  const [body, setBody] = useState("");

  const [messages, setMessages] = useState([]); // 💬 bolhas estilo WhatsApp
  const [logs, setLogs] = useState([]);

  const chatRef = useRef(null);

  const log = (msg) => setLogs((l) => [...l, msg]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const connect = async () => {
    const c = client({
      service: "ws://localhost:5280/websocket",
      domain: "localhost",
      username: jid.split("@")[0],
      password,
      resource: `web${id}`,
    });

    c.on("error", (err) => log("❌ " + err.toString()));

    c.on("online", (address) => {
      log(`✔️ Online como ${address.toString()}`);
      setConnected(true);
      c.send(xml("presence"));
    });

    c.on("stanza", async (stanza) => {
      log("⬅️ " + stanza.toString());

      if (stanza.is("message") && stanza.getChild("body")) {
        const incomingBody = stanza.getChildText("body");
        const msgId = stanza.attrs.id;

        setMessages((m) => [
          ...m,
          {
            id: msgId,
            body: incomingBody,
            from: stanza.attrs.from,
            incoming: true,
          },
        ]);

        c.send(
          xml(
            "message",
            { to: stanza.attrs.from },
            xml("received", {
              xmlns: "urn:xmpp:chat-markers:0",
              id: msgId,
            })
          )
        );
      }

      if (stanza.is("message") && stanza.getChild("received")) {
        const markerId = stanza.getChild("received").attrs.id;

        setMessages((m) =>
          m.map((msg) =>
            msg.id === markerId ? { ...msg, received: true } : msg
          )
        );
      }

      if (stanza.is("message") && stanza.getChild("displayed")) {
        const markerId = stanza.getChild("displayed").attrs.id;

        setMessages((m) =>
          m.map((msg) =>
            msg.id === markerId ? { ...msg, displayed: true } : msg
          )
        );
      }
    });

    await c.start();
    setXmpp(c);
  };

  const sendMessage = () => {
    if (!xmpp || !body) return;

    const messageId = "m" + Date.now();

    const stanza = xml(
      "message",
      { to, type: "chat", id: messageId },
      xml("body", {}, body),
      xml("markable", { xmlns: "urn:xmpp:chat-markers:0" })
    );

    xmpp.send(stanza);

    setMessages((m) => [
      ...m,
      {
        id: messageId,
        body,
        from: jid,
        incoming: false,
        received: false,
        displayed: false,
      },
    ]);

    setBody("");
  };

  return (
    <div style={{ border: "1px solid #444", padding: 20, margin: 10, width: "50%" }}>
      <h2>Cliente {id}</h2>

      {!connected && (
        <>
          <input
            placeholder="JID (ex: user1@localhost)"
            value={jid}
            onChange={(e) => setJid(e.target.value)}
            style={{ width: "100%", marginBottom: 5 }}
          />
          <input
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", marginBottom: 5 }}
          />
          <button onClick={connect}>Conectar</button>
        </>
      )}

      {connected && (
        <>
          <h4>Conectado como: {jid}</h4>

          <input
            placeholder="Enviar para..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: "100%", marginBottom: 10 }}
          />

          <div
            ref={chatRef}
            style={{
              height: 300,
              overflowY: "auto",
              padding: 10,
              background: "#f5f5f5",
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.incoming ? "flex-start" : "flex-end",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    maxWidth: "70%",
                    background: msg.incoming ? "#e0e0e0" : "#a0e78e",
                  }}
                >
                  <div style={{color: 'black'}}>{msg.body}</div>

                  {!msg.incoming && (
                    <div style={{ fontSize: 10, marginTop: 4, textAlign: "right", color: 'black' }}>
                      {msg.displayed
                        ? "✓✓ Lida"
                        : msg.received
                        ? "✓ Entregue"
                        : "⏳ Enviada"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 5 }}>
            <input
              placeholder="Mensagem..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ flex: 1 }}
            />
            <button onClick={sendMessage}>Enviar</button>
          </div>
        </>
      )}

      <h4>Logs XML</h4>
      <div style={{ background: "black", height: 200, overflowY: "auto", padding: 5 }}>
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}