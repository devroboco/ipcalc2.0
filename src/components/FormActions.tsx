type FormActionsProps = {
  onClear?: () => void;
  onSubmit?: () => void;
};

export default function FormActions({ onClear, onSubmit }: FormActionsProps) {
  return (
    <div className='col-span-full flex flex-col md:flex-row items-center justify-center gap-6 mt-2'>
      <button
        type='button'
        onClick={onClear}
        className='cursor-pointer min-w-32 w-full md:w-auto rounded-sm bg-[#FF2600] px-8 py-2 text-white font-semibold hover:brightness-110 active:scale-95 transition'
      >
        LIMPAR
      </button>
      <button
        type='submit'
        onClick={onSubmit}
        className='cursor-pointer min-w-32 w-full md:w-auto rounded-sm bg-[#04C04C] px-6 py-2 text-white font-semibold hover:brightness-110 active:scale-95 transition'
      >
        CALCULAR
      </button>
    </div>
  );
}
