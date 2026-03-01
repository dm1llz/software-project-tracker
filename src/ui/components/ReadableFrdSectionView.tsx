import { memo } from "react";

import type { RenderedSection } from "../../types/reviewContracts";

type ReadableFrdSectionViewProps = {
  sections: RenderedSection[];
};

const formatFieldValue = (value: string | number | boolean | null | Array<string | number | boolean | null>): string =>
  Array.isArray(value) ? value.map((item) => String(item)).join(", ") : String(value);

const RenderSectionContent = memo(({ section }: { section: RenderedSection }) => {
  if (section.kind === "scalar") {
    return <p className="rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200">{String(section.content.value)}</p>;
  }

  if (section.kind === "object") {
    return (
      <ul className="space-y-2 text-sm text-slate-200">
        {section.content.fields.map((field) => (
          <li key={field.path} className="rounded-lg bg-slate-950/60 p-3">
            <strong className="text-slate-100">{field.label}</strong>
            {": "}
            {formatFieldValue(field.value)}
          </li>
        ))}
      </ul>
    );
  }

  if (section.content.itemKind === "scalar") {
    return (
      <ul className="space-y-2 text-sm text-slate-200">
        {section.content.items.map((item, index) => (
          <li key={`${section.id}-scalar-${index}`} className="rounded-lg bg-slate-950/60 p-3">
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-3 text-sm text-slate-200">
      {section.content.items.map((item) => (
        <li key={item.id} className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
          <strong className="text-slate-100">{item.title}</strong>
          <ul className="mt-2 space-y-2">
            {item.fields.map((field) => (
              <li key={field.path} className="rounded-md bg-slate-900/70 p-2">
                {field.label}
                {": "}
                {formatFieldValue(field.value)}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
});

RenderSectionContent.displayName = "RenderSectionContent";

const ReadableSectionArticle = memo(({ section }: { section: RenderedSection }) => (
  <article className="mt-3 rounded-xl border border-slate-700/70 bg-slate-900/50 p-4">
    <h4 className="text-sm font-semibold text-slate-100">{section.title}</h4>
    <p className="mt-1 text-xs text-slate-400">{section.path}</p>
    <RenderSectionContent section={section} />
  </article>
));

ReadableSectionArticle.displayName = "ReadableSectionArticle";

export const ReadableFrdSectionView = memo(({ sections }: ReadableFrdSectionViewProps) => (
  <section
    aria-label="Readable FRD"
    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/30"
  >
    <h3 className="text-base font-semibold text-slate-100">Readable FRD</h3>
    {sections.map((section) => (
      <ReadableSectionArticle key={section.id} section={section} />
    ))}
  </section>
));

ReadableFrdSectionView.displayName = "ReadableFrdSectionView";
