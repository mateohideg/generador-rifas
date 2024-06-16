import { createSignal, onCleanup } from 'solid-js'
import { save, open } from '@tauri-apps/api/dialog';
import { writeBinaryFile, readBinaryFile } from '@tauri-apps/api/fs';

function App() {

  const [quantity, setQuantity] = createSignal(1);
  const [organizationName, setOrganizationName] = createSignal('');
  const [rifaName, setRifaName] = createSignal('');
  const [price, setPrice] = createSignal('');
  const [firstPrize, setFirstPrize] = createSignal('');
  const [secondPrize, setSecondPrize] = createSignal('');
  const [thirdPrize, setThirdPrize] = createSignal('');
  const [logo, setLogo] = createSignal<Uint8Array>();
  const [logoName, setLogoName] = createSignal('');

  // Set up Web Worker
  const [worker, setWorker] = createSignal<Worker | null>(null);
  setWorker(new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  }));

  onCleanup(() => {
    if (worker()) {
      worker()?.terminate();
    }
  });

  return (
    <>
      <form class="container mx-auto p-4 flex flex-col" onSubmit={async () => {
        if (worker()) {
          // Send data to the Web Worker
          worker()?.postMessage({
            rifaDetails: {
              quantity: quantity(),
              organizationName: organizationName(),
              rifaName: rifaName(),
              firstPrize: firstPrize(),
              secondPrize: secondPrize(),
              thirdPrize: thirdPrize(),
              price: price(),
              logo: logo()
            }
          });

          worker()!.onmessage = async (event) => {
            // Save file
            const filePath = await save({
              filters: [{
                name: 'PDF',
                extensions: ['pdf']
              }]
            });
            if (filePath) await writeBinaryFile(filePath, event.data);

            // Clean up
            setQuantity(1);
            setOrganizationName('');
            setRifaName('');
            setPrice('');
            setFirstPrize('');
            setSecondPrize('');
            setThirdPrize('');
            setLogo(undefined);
            setLogoName('')
          }
        }
      }} method="dialog">
        <h1 class="text-4xl mb-4">Generador Rifas PS</h1>

        <label for="quantity">Cantidad de páginas* | <b>5 rifas por página</b> </label>
        <input type="number" id="quantity" name="quantity" class="border p-2 mb-4" onChange={(event) => {
          const value = Number(event.currentTarget.value);
          if (value >= 1 && !isNaN(value)) {
            setQuantity(value);
          }
        }} value={quantity()} required />

        <label for="organizationName">Nombre de la organización* </label>
        <input type="text" id="organizationName" name="organizationName" class="border p-2 mb-4" onChange={(event) => setOrganizationName(event.currentTarget.value)} value={organizationName()} required />

        <input type="button" value={!logo() ? 'Elegir logo*' : 'Seleccionado: ' + logoName()} id="logo" name="logo" class={'mb-4 border rounded p-2 text-white ' + (logo() ? 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700' : 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700')} onClick={async () => {
          // Request open dialog
          const selected = await open({
            filters: [{
              name: 'Image',
              extensions: ['png']
            }]
          });

          // Open file and use a text input to validate the form
          if (typeof selected === 'string') readBinaryFile(selected).then(file => {
            setLogo(file);
            setLogoName(selected);
          });
        }} />
        <input type="text" value={logoName()} required hidden />

        <label for="rifaName">Nombre de la rifa* </label>
        <input type="text" id="rifaName" name="rifaName" class="border p-2 mb-4" onChange={(event) => setRifaName(event.currentTarget.value)} value={rifaName()} required />

        <label for="price">Precio* </label>
        <input type="text" id="price" name="price" class="border p-2 mb-4" onChange={(event) => setPrice(event.currentTarget.value)} value={price()} required />

        <label for="firstPrize">Primer premio* </label>
        <input type="text" id="firstPrize" name="firstPrize" class="border p-2 mb-4" onChange={(event) => setFirstPrize(event.currentTarget.value)} value={firstPrize()} required />

        <label for="secondPrize">Segundo premio* </label>
        <input type="text" id="secondPrize" name="secondPrize" class="border p-2 mb-4" onChange={(event) => setSecondPrize(event.currentTarget.value)} value={secondPrize()} required />

        <label for="thirdPrize">Tercer premio* </label>
        <input type="text" id="thirdPrize" name="thirdPrize" class="border p-2" onChange={(event) => setThirdPrize(event.currentTarget.value)} value={thirdPrize()} required />

        <input type="submit" value="Guardar PDF" class={'border rounded-lg p-4 m-4 text-white ' + ((quantity() && organizationName() && rifaName() && price() && firstPrize() && secondPrize() && thirdPrize() && logo()) ? 'bg-teal-500 hover:bg-teal-600 active:bg-teal-700' : 'bg-red-500 hover:bg-red-600 active:bg-red-700')} />
      </form>
    </>
  )
}

export default App
