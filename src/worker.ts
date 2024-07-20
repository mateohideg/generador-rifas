import { jsPDF } from 'jspdf';
import OpenSans from './Open_Sans/OpenSans-VariableFont_wdth,wght.ttf';

function setDPI(canvas: OffscreenCanvas, dpi: number) {
    // Get the original width and height of the canvas
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;

    // Resize canvas and scale future draws.
    const scaleFactor = dpi / 96;
    canvas.width = Math.ceil(originalWidth * scaleFactor);
    canvas.height = Math.ceil(originalHeight * scaleFactor);

    // Get the 2D rendering context and scale it
    const ctx = canvas.getContext('2d');
    ctx?.scale(scaleFactor, scaleFactor);
}

function drawCard(ctx: OffscreenCanvasRenderingContext2D, originY: number, raffleNumber: string) {
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

    // Default text style
    ctx.font = '18px OpenSans';
    ctx.textAlign = 'center';
    ctx.save();

    // Prepare for vertical text
    ctx.textAlign = 'left';
    ctx.translate(0, originY + 129);
    ctx.rotate(-Math.PI / 2);

    ctx.fillText('N: ', 0, 26);
    ctx.fillText('Cel: ', 0, 50);
    ctx.fillText('N° ' + raffleNumber.padStart(3, '0'), 0, 129);

    // Number watermark
    ctx.restore();
    ctx.font = '32px OpenSans';
    ctx.fillStyle = '#e6e6e6';
    ctx.textBaseline = 'middle';
    ctx.fillText('N° ' + raffleNumber.padStart(3, '0'), 143 + 382 / 2, originY + 141 / 2);

    // Restore the default text style
    ctx.restore();
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'alphabetic';
}

function drawInformation(ctx: OffscreenCanvasRenderingContext2D, originY: number, raffleDetails: raffleDetailsType, logo: ImageBitmap) {
    // Organizaton name
    ctx.font = '24px OpenSans';
    ctx.fillText(raffleDetails.organizationName, 143 + 382 / 2, originY + 30);

    // Raffle name
    ctx.font = '18px OpenSans';
    ctx.textAlign = 'left';
    ctx.fillText(raffleDetails.raffleName, 143 + 12, originY + 54);

    // Prizes list
    ctx.fillText('Premio 1: ' + raffleDetails.firstPrize, 143 + 12, originY + 78);
    ctx.fillText('Premio 2: ' + raffleDetails.secondPrize, 143 + 12, originY + 102);
    ctx.fillText('Premio 3: ' + raffleDetails.thirdPrize, 143 + 12, originY + 126);

    // Price
    ctx.fillText(raffleDetails.price, 559 - ctx.measureText(raffleDetails.price).width / 2, originY + 106 + 6);

    // Logo
    ctx.drawImage(logo, 595 - 70, originY + 1, 70, 70);
}

self.onmessage = async (event: MessageEvent<{ raffleDetails: raffleDetailsType }>) => {
    const { raffleDetails } = event.data;

    const offscreenCanvas = new OffscreenCanvas(595, 842);
    setDPI(offscreenCanvas, 300);
    const ctx = offscreenCanvas.getContext('2d');

    // This shouldn't ever happen
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 595, 842);

    // Create PDF
    const doc = new jsPDF({
        compress: true
    });

    // Load logo
    const logo = await createImageBitmap(new Blob([raffleDetails.logo], { type: 'image/png' }));

    // Load font
    const f = new FontFace("OpenSans", await (await fetch(OpenSans)).arrayBuffer());
    await f.load();
    self.fonts.add(f);
    
    // Create all the pages
    let raffleNumber = 0;
    for (let i = 0; i < raffleDetails.quantity; i++) {
        for (let i = 0; i < 5; i++) {
            raffleNumber++;
            drawCard(ctx, i * 146, raffleNumber.toString());
            drawInformation(ctx, i * 146, raffleDetails, logo)
        }

        // Add page to PDF
        const blob = await offscreenCanvas.convertToBlob();
        const bytes = await blob.arrayBuffer();
        const pdfBytes = new Uint8Array(bytes);
        doc.addImage(pdfBytes, 'PNG', 0, 0, 210, 297);
        if (i < raffleDetails.quantity - 1) doc.addPage();

        // Clear canvas (again)
        ctx.clearRect(0, 0, 595, 842);

        // Send raffleNumber (for progrss bar)
        self.postMessage({
            type: 'raffleNumber',
            content: raffleNumber
        });
    }

    // Send PDF to the main thread
    self.postMessage({
        type: 'file',
        content: doc.output('arraybuffer')
    });
};
