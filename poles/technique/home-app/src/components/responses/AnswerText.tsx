import { Fragment } from "react";

function Inline({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>)}</>;
}
export function AnswerText({ text, timeline = false }: { text: string; timeline?: boolean }) {
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const dates = lines.filter(line => /^(?:[-*•]\s*)?(?:\*\*)?(?:\d{1,2}\s+\S+\s+)?(?:1[5-9]|20)\d{2}\b/.test(line));
  return <div className="answer-prose">{timeline && dates.length >= 2 ? <>
    {lines.filter(line => !dates.includes(line)).map((line, i) => <p key={i}><Inline text={line.replace(/^#{1,6}\s*/, "")} /></p>)}
    <ol className="biography-timeline">{dates.map((line, i) => <li key={i}><span className="timeline-year">{line.match(/(?:1[5-9]|20)\d{2}/)?.[0]}</span><p><Inline text={line.replace(/^[-*•]\s+/, "").replace(/^(?:\*\*)?(?:1[5-9]|20)\d{2}(?:\*\*)?\s*[:–—-]?\s*/, "")} /></p></li>)}</ol>
  </> : lines.map((line, i) => /^#{1,6}\s+/.test(line) ? <h3 key={i}><Inline text={line.replace(/^#{1,6}\s+/, "")} /></h3> : /^[-*•]\s+/.test(line) ? <p className="answer-bullet" key={i}><Inline text={line.replace(/^[-*•]\s+/, "")} /></p> : <p key={i}><Inline text={line} /></p>)}</div>;
}
