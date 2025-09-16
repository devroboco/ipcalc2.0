import { Title } from "./components/Title";
import { Paragraph } from "./components/Paragraph";
import FormSection from "./components/FormSection";

function App() {
  return (
    <>
      <Title text='Divisão em sub-rede IPv4' />
      <Paragraph
        text='Para usar a ferramenta digite o endereço de rede, a máscara ou prefixo, e escolha a quantidade de 
sub-redes e hosts por sub-rede que deseja calcular.'
      />
      <FormSection />
    </>
  );
}

export default App;
