import FormField from "./FormField";

export type Option = { value: string; label: string };

type SelectFieldProps = {
  id: string;
  label: string;
  placeholder?: string;
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  helperText?: string;
  className?: string;
};

const baseSelect =
  "w-full h-11 rounded-sm border border-gray-300 bg-white px-4 pr-10" +
  "font-roboto text-[15px] text-[#1E1E1E] outline-none transition " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-200 " +
  "disabled:bg-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed" +
  " appearance-none";

export default function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  helperText,
  className = "",
}: SelectFieldProps) {
  return (
    <FormField
      label={label}
      htmlFor={id}
      disabled={disabled}
      helperText={helperText}
    >
      <div className='relative w-full'>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`${baseSelect} ${className}`}
        >
          {placeholder && <option value=''>{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-4 w-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            strokeWidth={2}
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M19 9l-7 7-7-7'
            />
          </svg>
        </span>
      </div>
    </FormField>
  );
}
