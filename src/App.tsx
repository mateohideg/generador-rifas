import { createEffect, createSignal, onCleanup } from 'solid-js'
import { AppBar, Box, Button, Dialog, DialogContent, DialogContentText, DialogTitle, LinearProgress, Stack, TextField, Toolbar, Typography } from "@suid/material"
import { save, open } from '@tauri-apps/api/dialog';
import { writeBinaryFile, readBinaryFile } from '@tauri-apps/api/fs';

function App() {
  const [quantity, setQuantity] = createSignal(1);
  const [organizationName, setOrganizationName] = createSignal('');
  const [raffleName, setRaffleName] = createSignal('');
  const [price, setPrice] = createSignal('');
  const [firstPrize, setFirstPrize] = createSignal('');
  const [secondPrize, setSecondPrize] = createSignal('');
  const [thirdPrize, setThirdPrize] = createSignal('');
  const [logo, setLogo] = createSignal<Uint8Array>();
  const [logoName, setLogoName] = createSignal('');
  const [savingDialog, setSavingDialog] = createSignal(false);

  // Set up Web Workers
  const [workers, setWorkers] = createSignal<Worker[]>([]);
  const [completedWorkers, setCompletedWorkers] = createSignal<{
    index: number,
    content: ArrayBuffer
  }[]>([]);
  const [progressArray, setProgressArray] = createSignal<number[]>([]);
  const [progress, setProgress] = createSignal(0);

  const newWorkers = Array.from({ length: navigator.hardwareConcurrency }, () => new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  }));
  setWorkers(newWorkers);

  onCleanup(() => {
    workers().forEach(worker => worker.terminate());
  });

  createEffect(() => {
    setProgress(() => {
      const progressPre = progressArray().reduce((previousValue, currentValue) => previousValue + currentValue, 0) / progressArray().length;
      const progress = !isNaN(progressPre) ? Math.round(progressPre) : 0;
      return progress;
    });
  }, [progressArray]);

  createEffect(() => {
    newWorkers.forEach((worker, index) => {
      worker.onmessage = async (event) => {
        if (event.data.type === 'progress') {
          // Update progress for this Web Worker
          setProgressArray(prev => {
            const newProgress = [...prev];
            newProgress[index] = event.data.progress;
            return newProgress;
          });
        } else if (event.data.type === 'complete') {
          setCompletedWorkers(prev => {
            const newPrev = [...prev];
            newPrev.push({ index: index, content: event.data.content });
            return newPrev;
          });
          if (completedWorkers().length === workers().length) {
            worker.postMessage({
              completedWorkers: completedWorkers()
            });
          }
        } else if (event.data.type === 'file') {
          // Save file
          const filePath = await save({
            filters: [{
              name: 'PDF',
              extensions: ['pdf']
            }]
          });
          if (filePath) await writeBinaryFile(filePath, event.data.content);

          // Clean up
          setQuantity(1);
          setOrganizationName('');
          setRaffleName('');
          setPrice('');
          setFirstPrize('');
          setSecondPrize('');
          setThirdPrize('');
          setLogo(undefined);
          setLogoName('');
          setProgressArray([]);

          // Close dialog
          setSavingDialog(false);
        }
      }
    });
  }, []);

  return (
    <>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Generador Rifas PS (5 rifas por página)
            </Typography>
          </Toolbar>
        </AppBar>
      </Box>

      <Stack component="form" p={2} onSubmit={async () => {
        // Open dialog
        setSavingDialog(true);

        // Web Worker shenanigans
        const pagesPerWorker = Math.ceil(quantity() / workers().length);
        workers().forEach((worker, index) => {
          const startPage = index * pagesPerWorker;
          const endPage = Math.min((index + 1) * pagesPerWorker, quantity());

          worker.postMessage({
            startPage,
            endPage,
            raffleDetails: {
              quantity: quantity(),
              organizationName: organizationName(),
              raffleName: raffleName(),
              firstPrize: firstPrize(),
              secondPrize: secondPrize(),
              thirdPrize: thirdPrize(),
              price: price(),
              logo: logo()
            }
          });
        });
      }} method="dialog">
        <TextField type="number" label="Cantidad de páginas" margin="normal" onChange={(event) => {
          const value = Number(event.currentTarget.value);
          if (value >= 1 && !isNaN(value)) {
            setQuantity(value);
          }
        }} value={quantity()} required />
        <TextField type="text" label="Nombre de la organización" margin="normal" onChange={(event) => setOrganizationName(event.currentTarget.value)} value={organizationName()} required />

        <Button variant="outlined" sx={{
          marginTop: '8px'
        }} onClick={async () => {
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
        }}>{!logo() ? 'Elegir logo *' : 'Seleccionado: ' + logoName()}</Button>
        <input type="text" value={logoName()} required hidden />

        <TextField type="text" label="Nombre de la rifa" margin="normal" onChange={(event) => setRaffleName(event.currentTarget.value)} value={raffleName()} required />
        <TextField type="text" label="Precio" margin="normal" onChange={(event) => setPrice(event.currentTarget.value)} value={price()} required />
        <TextField type="text" label="Primer premio" margin="normal" onChange={(event) => setFirstPrize(event.currentTarget.value)} value={firstPrize()} required />
        <TextField type="text" label="Segundo premio" margin="normal" onChange={(event) => setSecondPrize(event.currentTarget.value)} value={secondPrize()} required />
        <TextField type="text" label="Tercer premio" margin="normal" onChange={(event) => setThirdPrize(event.currentTarget.value)} value={thirdPrize()} required />
        <Button type="submit" variant="contained" disabled={!(quantity() && organizationName() && raffleName() && price() && firstPrize() && secondPrize() && thirdPrize() && logo())}>Guardar PDF</Button>
      </Stack>

      <Dialog open={savingDialog()}>
        <DialogTitle>
          Creando archivo...
        </DialogTitle>
        <DialogContent>
          <LinearProgress variant="determinate" value={progress()} />
          <DialogContentText sx={{
            marginTop: '8px'
          }}>
            {progress()}%
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default App;
