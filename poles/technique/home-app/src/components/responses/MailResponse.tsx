import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Mail as MailIcon, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateLabel } from "@/lib/assistant";
import type { Mail } from "@/lib/useResponseData";

// Mobile adaptation of the Panel Gmail stack: sender, subject, preview,
// attachment links and horizontal navigation over actual API results.
export function MailResponse({ mails }: { mails: Mail[] }) {
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const move = (direction: number) => setIndex(value => (value + direction + mails.length) % mails.length);
  if (!mails.length) return <p className="response-empty">Aucun mail ne correspond à cette recherche.</p>;
  const mail = mails[index % mails.length];
  const sender = mail.from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || mail.from;
  return <div className="mail-response">
    <div className="mail-stack-mobile" onPointerDown={event => { start.current = event.clientX; }} onPointerUp={event => { if (start.current !== null && Math.abs(event.clientX - start.current) > 44) move(event.clientX < start.current ? 1 : -1); start.current = null; }} onPointerCancel={() => { start.current = null; }}>
      <article className="mail-result-card" key={mail.id}>
        <div className="mail-sender"><span className="sender-avatar">{sender.slice(0, 2).toUpperCase() || <MailIcon size={17} />}</span><div><strong>{sender}</strong><time>{dateLabel(mail.receivedAt)}</time></div></div>
        <h3>{mail.subject || "Sans objet"}</h3><p className="mail-snippet">{mail.snippet}</p>
        {mail.body && <details className="mail-body"><summary>Lire le message</summary><p>{mail.body}</p></details>}
        {!!mail.attachments?.length && <div className="mail-attachments">{mail.attachments.map(attachment => <a key={attachment.id} href={`/v1/workspace/google/gmail/messages/${encodeURIComponent(mail.id)}/attachments/${encodeURIComponent(attachment.id)}?mime=${encodeURIComponent(attachment.mimeType)}`} target="_blank" rel="noopener noreferrer" onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()}><Paperclip size={13} /><span>{attachment.name}</span></a>)}</div>}
      </article>
    </div>
    <div className="mail-pagination"><Button variant="ghost" size="icon" aria-label="Mail précédent" disabled={mails.length < 2} onClick={() => move(-1)}><ChevronLeft size={18} /></Button><span>{index % mails.length + 1} sur {mails.length} mails</span><Button variant="ghost" size="icon" aria-label="Mail suivant" disabled={mails.length < 2} onClick={() => move(1)}><ChevronRight size={18} /></Button></div>
  </div>;
}
