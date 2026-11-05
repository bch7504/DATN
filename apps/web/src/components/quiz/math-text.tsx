import katex from "katex";
import type { ReactElement, ReactNode } from "react";

interface MathTextProps {
  text: string;
  className?: string;
}

const MATH_SEGMENT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

/**
 * Renders plain text and explicitly delimited LaTeX without trusting user HTML.
 *
 * @param props.text Required source text. Inline math uses `$...$`; display math uses `$$...$$`.
 * @param props.className Optional CSS classes for the wrapper.
 * @returns A React element containing escaped text and KaTeX-generated HTML/MathML.
 * @throws Never. Invalid LaTeX is rendered by KaTeX as an error-colored source fragment.
 */
export function MathText({ text, className = "" }: MathTextProps): ReactElement {
  const segments = text.split(MATH_SEGMENT);

  return (
    <span className={`whitespace-pre-wrap ${className}`.trim()}>
      {segments.map((segment, index): ReactNode => {
        const isDisplay = segment.startsWith("$$") && segment.endsWith("$$");
        const isInline = !isDisplay && segment.startsWith("$") && segment.endsWith("$");
        if (!isDisplay && !isInline) return <span key={index}>{segment}</span>;

        const expression = segment.slice(isDisplay ? 2 : 1, isDisplay ? -2 : -1);
        const html = katex.renderToString(expression, {
          displayMode: isDisplay,
          output: "htmlAndMathml",
          strict: "warn",
          throwOnError: false,
          trust: false,
        });

        const Element = isDisplay ? "div" : "span";
        return <Element key={index} className={isDisplay ? "my-2 overflow-x-auto" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </span>
  );
}
