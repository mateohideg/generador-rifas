import { jsPDF } from 'jspdf';

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

function drawCard(ctx: OffscreenCanvasRenderingContext2D, originY: number, rifaNumber: string) {
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
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.save();

    // Prepare for vertical text
    ctx.textAlign = 'left';
    ctx.translate(0, originY + 129);
    ctx.rotate(-Math.PI / 2);

    ctx.fillText('Nombre: ', 0, 26);
    ctx.fillText('Cel: ', 0, 50);
    ctx.fillText('N°: ' + rifaNumber.padStart(3, '0'), 0, 129);

    // Restore to the default text style
    ctx.restore();
}

function drawInformation(ctx: OffscreenCanvasRenderingContext2D, originY: number, rifaDetails: rifaDetailsType, logo: ImageBitmap) {
    // Organizaton name
    ctx.font = '24px serif';
    ctx.fillText(rifaDetails.organizationName, 143 + 382 / 2, originY + 30);

    // Rifa name
    ctx.font = '18px serif';
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

self.onmessage = async (event: MessageEvent<{ rifaDetails: rifaDetailsType }>) => {
    const { rifaDetails } = event.data;

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
    const logo = await createImageBitmap(new Blob([rifaDetails.logo], { type: 'image/png' }));

    // Create all the pages
    let rifaNumber = 0;
    for (let i = 0; i < rifaDetails.quantity; i++) {
        for (let i = 0; i < 5; i++) {
            rifaNumber++;
            drawCard(ctx, i * 146, rifaNumber.toString());
            drawInformation(ctx, i * 146, rifaDetails, logo)
        }

        // Add page to PDF
        const blob = await offscreenCanvas.convertToBlob();
        const bytes = await blob.arrayBuffer();
        const pdfBytes = new Uint8Array(bytes);
        doc.addImage(pdfBytes, 'PNG', 0, 0, 210, 297);
        if (i < rifaDetails.quantity - 1) doc.addPage();

        // Clear canvas (again)
        ctx.clearRect(0, 0, 595, 842);
    }

    // Send PDF to the main thread
    self.postMessage(doc.output('arraybuffer'));
};
