type TitleProps = {
  text: string;
};

export function Title({ text }: TitleProps) {
  return (
    <h1 className='font-roboto font-bold text-[40px] text-brandBlack text-center mt-[20px]'>
      {text}
    </h1>
  );
}
