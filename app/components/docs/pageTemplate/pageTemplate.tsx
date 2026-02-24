import { useEffect, useMemo, useState } from "react";

import styleSheet from "./pageTemplate.css?url";

type PageTemplateProps = {
  children?: React.ReactNode;
};

type Heading = {
  id: string;
  text: string;
};

export function links() {
  return [{ rel: "stylesheet", href: styleSheet }];
}

export default function PageTemplate({ children }: PageTemplateProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>("");

  useEffect(() => {
    const contentElement = document.querySelector<HTMLElement>(".text");
    if (!contentElement) return;

    const discoveredHeadings = Array.from(contentElement.querySelectorAll("h2"))
      .map((heading, index) => {
        if (!heading.id) {
          heading.id = `section-${index + 1}`;
        }

        return {
          id: heading.id,
          text: heading.textContent?.trim() || `Section ${index + 1}`,
        };
      })
      .filter((heading) => heading.text.length > 0);

    setHeadings(discoveredHeadings);
    setActiveHeading(discoveredHeadings[0]?.id ?? "");
  }, [children]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry) {
          setActiveHeading(visibleEntry.target.id);
        }
      },
      {
        rootMargin: "-15% 0px -65% 0px",
        threshold: [0.1, 0.3, 0.6],
      },
    );

    headings.forEach(({ id }) => {
      const target = document.getElementById(id);
      if (target) observer.observe(target);
    });

    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY <= 10 && headings[0]) {
        setActiveHeading(headings[0].id);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  const renderedSidebarLinks = useMemo(
    () =>
      headings.map((heading) => (
        <button
          key={heading.id}
          className={`link ${activeHeading === heading.id ? "link-active" : ""}`.trim()}
          onClick={() => {
            document.getElementById(heading.id)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
          type="button"
        >
          {heading.text}
        </button>
      )),
    [activeHeading, headings],
  );

  return (
    <div className="page-container">
      <aside className="sidebar" aria-label="Page sections">
        {renderedSidebarLinks}
      </aside>
      <article className="content">
        <div className="text">{children}</div>
      </article>
    </div>
  );
}
