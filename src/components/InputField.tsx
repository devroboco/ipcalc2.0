import FormField from "./FormField";

type InputFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
  readOnly?: boolean;
  helperText?: string;
  className?: string;
  numeric?: boolean;
  min?: number;
  max?: number;
};

const baseInput =
  "w-full h-11 rounded-sm border border-gray-300 bg-white px-4 " +
  "font-roboto text-[15px] text-[#1E1E1E] placeholder:text-gray-400 " +
  "outline-none transition " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-200 " +
  "disabled:bg-gray-200 disabled:text-gray-600 disabled:placeholder:text-gray-500 disabled:cursor-not-allowed";

export default function InputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  readOnly,
  helperText,
  className = "",
  numeric,
  min,
  max,
}: InputFieldProps) {
  const blockKeys = new Set(["e", "E", "+", "-", ".", ",", " "]);

  return (
    <FormField
      label={label}
      htmlFor={id}
      disabled={disabled}
      helperText={helperText}
    >
      <input
        id={id}
        type={numeric ? "text" : type}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (numeric) {
            const onlyDigits = raw.replace(/\D+/g, "");
            let next = onlyDigits;
            if (min != null && next !== "" && Number(next) < min)
              next = String(min);
            if (max != null && next !== "" && Number(next) > max)
              next = String(max);
            onChange(next);
          } else {
            onChange(raw);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        inputMode={numeric ? "numeric" : undefined}
        pattern={numeric ? "\\d*" : undefined}
        onKeyDown={(e) => {
          if (numeric && blockKeys.has(e.key)) {
            e.preventDefault();
          }
        }}
        onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
          if (!numeric) return;
          const data = (e.nativeEvent as InputEvent).data;
          if (data && /\D/.test(data)) e.preventDefault();
        }}
        onPaste={(e) => {
          if (!numeric) return;
          const text = e.clipboardData.getData("text");
          if (!/^\d+$/.test(text)) e.preventDefault();
        }}
        className={`${baseInput} ${
          readOnly ? "cursor-default" : ""
        } ${className}`}
        aria-readonly={readOnly || undefined}
      />
    </FormField>
  );
}
