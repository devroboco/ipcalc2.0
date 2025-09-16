import FormField from "./FormField";

type InputFieldProps = {
  id: string;
  label: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  value: string | number;
  onChange: (val: string) => void;
  disabled?: boolean;
  helperText?: string;
  className?: string;
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
  helperText,
  className = "",
}: InputFieldProps) {
  return (
    <FormField
      label={label}
      htmlFor={id}
      disabled={disabled}
      helperText={helperText}
    >
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseInput} ${className}`}
      />
    </FormField>
  );
}
