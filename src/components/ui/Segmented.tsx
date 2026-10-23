"use client";

/** Grupo de opções exclusivas (períodos, moeda). Navegável por setas como qualquer radio. */
export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="inline-flex">
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex rounded-control border border-line p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-[4px] px-2.5 py-1 text-[0.8rem] text-muted transition-colors hover:text-ink has-checked:bg-accent-soft has-checked:font-medium has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
