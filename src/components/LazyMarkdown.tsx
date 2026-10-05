import ReactMarkdown from "react-markdown";

type LazyMarkdownProps = {
  children: string;
};

export function LazyMarkdown({ children }: LazyMarkdownProps) {
  const rendered = children
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .split("\n")
    .filter((line) => !/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*$/.test(line))
    .map((line) =>
      /^\s*\|.*\|\s*$/.test(line)
        ? line
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim())
            .join(" · ")
        : line,
    )
    .join("\n")
    .replace(/Kallistis(?:svg)+/gi, "Kallistis")
    .replace(/(?:svg){2,}/gi, "")
    .trim();
  return <ReactMarkdown>{rendered}</ReactMarkdown>;
}
