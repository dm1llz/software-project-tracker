import type { RenderedSection } from "../../types/reviewContracts";

type ReadableFrdSectionViewProps = {
  sections: RenderedSection[];
};

const renderSection = (section: RenderedSection) => {
  if (section.kind === "scalar") {
    return <p>{String(section.content.value)}</p>;
  }

  if (section.kind === "object") {
    return (
      <ul>
        {section.content.fields.map((field) => (
          <li key={field.path}>
            <strong>{field.label}</strong>
            {": "}
            {Array.isArray(field.value) ? field.value.join(", ") : String(field.value)}
          </li>
        ))}
      </ul>
    );
  }

  if (section.content.itemKind === "scalar") {
    return (
      <ul>
        {section.content.items.map((item, index) => (
          <li key={`${section.id}-scalar-${index}`}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  return (
    <ul>
      {section.content.items.map((item) => (
        <li key={item.id}>
          <strong>{item.title}</strong>
          <ul>
            {item.fields.map((field) => (
              <li key={field.path}>
                {field.label}
                {": "}
                {Array.isArray(field.value) ? field.value.join(", ") : String(field.value)}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

export const ReadableFrdSectionView = ({ sections }: ReadableFrdSectionViewProps) => (
  <section aria-label="Readable FRD">
    <h3>Readable FRD</h3>
    {sections.map((section) => (
      <article key={section.id}>
        <h4>{section.title}</h4>
        <p>{section.path}</p>
        {renderSection(section)}
      </article>
    ))}
  </section>
);
