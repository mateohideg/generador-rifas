import { useEffect, useRef, useState } from 'preact/hooks'
import { jsPDF } from 'jspdf';

interface rifaDetailsType {
  quantity: number,
  organizationName: string,
  rifaName: string,
  firstPrize: string,
  secondPrize: string,
  thirdPrize: string,
  price: string,
  logo: File | undefined
};

// https://stackoverflow.com/a/26047748
function setDPI(canvas: HTMLCanvasElement, dpi: number) {
  // Set up CSS size.
  canvas.style.width = canvas.style.width || canvas.width + 'px';
  canvas.style.height = canvas.style.height || canvas.height + 'px';

  // Resize canvas and scale future draws.
  const scaleFactor = dpi / 96;
  canvas.width = Math.ceil(canvas.width * scaleFactor);
  canvas.height = Math.ceil(canvas.height * scaleFactor);
  const ctx = canvas.getContext('2d');
  ctx?.scale(scaleFactor, scaleFactor);
}

function drawCard(ctx: CanvasRenderingContext2D, originY: number, rifaNumber: string) {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;

  // Main rectangle
  ctx.beginPath();
  ctx.rect(1, originY + 1, 594, 141);
  ctx.stroke();

  // Divider
  ctx.beginPath();
  ctx.rect(142, originY + 1, 1, 141);
  ctx.stroke();

  // Price container
  ctx.beginPath();
  ctx.arc(559, originY + 106, 33, 0, 2 * Math.PI);
  ctx.stroke();

  // Permanent text
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.save();

  ctx.rotate(-Math.PI / 2);

  ctx.fillText('Nombre: ', -90 - originY, 26);
  ctx.fillText('Cel: ', -108 - originY, 50);

  ctx.fillText('N°: ' + rifaNumber.padStart(3, '0'), -97 - originY, 120);

  ctx.restore();
}

function drawInformation(ctx: CanvasRenderingContext2D, originY: number, rifaDetails: rifaDetailsType, logo: HTMLImageElement) {
  // Organizaton name
  ctx.font = '24px sans-serif';
  ctx.fillText(rifaDetails.organizationName, 143 + 382 / 2, originY + 30);

  // Rifa name
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(rifaDetails.rifaName, 143 + 24, originY + 54);

  // Prizes list
  ctx.fillText('Premio 1: ' + rifaDetails.firstPrize, 143 + 24, originY + 78);
  ctx.fillText('Premio 2: ' + rifaDetails.secondPrize, 143 + 24, originY + 102);
  ctx.fillText('Premio 3: ' + rifaDetails.thirdPrize, 143 + 24, originY + 126);

  // Price
  ctx.fillText(rifaDetails.price, 559 - ctx.measureText(rifaDetails.price).width / 2, originY + 106 + 6);

  // Logo
  ctx.drawImage(logo, 595 - 70, originY + 1, 70, 70);
}

export function Canvas(props: { rifaDetails: rifaDetailsType }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current as HTMLCanvasElement;

      setDPI(canvas, 300);

      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 595, 842);

        const doc = new jsPDF({
          compress: true
        });

        const reader = new FileReader();
        reader.onload = (event) => {
          const logo = new Image();
          if (event.target?.result) {
            logo.src = event.target?.result.toString();
            logo.onload = () => {
              let rifaNumber = 0;
              for (let i = 0; i < props.rifaDetails.quantity; i++) {
                for (let i = 0; i < 5; i++) {
                  rifaNumber++;
                  drawCard(ctx, i * 146, rifaNumber.toString());
                  drawInformation(ctx, i * 146, props.rifaDetails, logo)
                }

                doc.addImage(canvas?.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
                if (i < props.rifaDetails.quantity - 1) doc.addPage();
                ctx.clearRect(0, 0, 595, 842);
              }
              doc.save('rifas.pdf');
            }
          }
        }

        if (props.rifaDetails.logo) reader.readAsDataURL(props.rifaDetails.logo);
      }
    }
  }, []);

  return <canvas ref={canvasRef} width={595} height={842} style={{ display: 'none' }} />;
}

export function App() {

  const [quantity, setQuantity] = useState(0);
  const [organizationName, setOrganizationName] = useState('');
  const [rifaName, setRifaName] = useState('');
  const [price, setPrice] = useState('');
  const [firstPrize, setFirstPrize] = useState('');
  const [secondPrize, setSecondPrize] = useState('');
  const [thirdPrize, setThirdPrize] = useState('');
  const [logo, setLogo] = useState<File>();

  const [created, setCreated] = useState(false);

  return (
    <>
      <form class="container mx-auto p-4 flex flex-col" onSubmit={() => setCreated(true)} method="dialog">
        <h1 class="text-4xl mb-4">Generador Rifas PS</h1>

        <label for="quantity">Cantidad de páginas | <b>5 rifas / página</b>: </label>
        <input type="number" id="quantity" name="quantity" class="border p-2 mb-4" onInput={(event) => setQuantity(Number(event.currentTarget.value))} value={quantity} required />

        <label for="organizationName">Nombre de la organización: </label>
        <input type="text" id="organizationName" name="organizationName" class="border p-2 mb-4" onInput={(event) => setOrganizationName(event.currentTarget.value)} value={organizationName} required />

        <label for="logo">Logo:</label>
        <input type="file" id="logo" name="logo" accept="image/png, image/jpeg" class="mb-4" onInput={(event) => setLogo(event.currentTarget.files ? event.currentTarget.files[0] : undefined)} required />

        <label for="rifaName">Nombre de la rifa: </label>
        <input type="text" id="rifaName" name="rifaName" class="border p-2 mb-4" onInput={(event) => setRifaName(event.currentTarget.value)} value={rifaName} required />

        <label for="price">Precio: </label>
        <input type="text" id="price" name="price" class="border p-2 mb-4" onInput={(event) => setPrice(event.currentTarget.value)} value={price} required />

        <label for="firstPrize">Primer premio: </label>
        <input type="text" id="firstPrize" name="firstPrize" class="border p-2 mb-4" onInput={(event) => setFirstPrize(event.currentTarget.value)} value={firstPrize} required />

        <label for="secondPrize">Segundo premio: </label>
        <input type="text" id="secondPrize" name="secondPrize" class="border p-2 mb-4" onInput={(event) => setSecondPrize(event.currentTarget.value)} value={secondPrize} required />

        <label for="thirdPrize">Tercer premio: </label>
        <input type="text" id="thirdPrize" name="thirdPrize" class="border p-2" onInput={(event) => setThirdPrize(event.currentTarget.value)} value={thirdPrize} required />

        <input type="submit" value="Guardar PDF" class="border rounded-lg p-4 m-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white" />
      </form>
      {created ? <Canvas rifaDetails={{
        quantity: quantity,
        organizationName: organizationName,
        rifaName: rifaName,
        price: price,
        firstPrize: firstPrize,
        secondPrize: secondPrize,
        thirdPrize: thirdPrize,
        logo: logo
      }} /> : null}
    </>
  )
}
