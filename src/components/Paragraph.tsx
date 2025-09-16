type ParagraphProps = {
  text: string;
};

export function Paragraph({ text }: ParagraphProps) {
  return (
    <p className='font-roboto text-brandBlack text-[20px] text-center mt-[10px] max-w-[1000px] mx-auto'>
      {text}
    </p>
  );
}
