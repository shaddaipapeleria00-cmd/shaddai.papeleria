import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, Order, Transaction, Client, CatalogSettings } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getLocalTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  // Avoid UTC midnight timezone shift bug (e.g. "2026-11-10" showing as 09/11 in Argentina UTC-3)
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to load image as base64 data URL for jsPDF
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    // If already base64 data URL
    if (imageUrl.startsWith('data:image/')) {
      resolve(imageUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 120, 120);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
          return;
        }
      } catch (err) {
        // Fallback on CORS or canvas taint
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

// Export Catalog to PDF with images
export async function exportCatalogPDF(products: Product[], catalogSettings: CatalogSettings) {
  const doc = new jsPDF();

  // Header styling
  doc.setFillColor(244, 114, 182); // Rose pink
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(catalogSettings.appName, 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    catalogSettings.appTagline.toUpperCase() +
      (catalogSettings.businessWhatsApp ? ` • WhatsApp: ${catalogSettings.businessWhatsApp}` : ''),
    15,
    26
  );

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Catálogo Oficial de Productos', 15, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el ${new Date().toLocaleDateString('es-AR')} • Pedidos directos vía WhatsApp`, 15, 48);

  // Preload product thumbnails
  const imageMap: Record<number, string | null> = {};
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    if (prod.images && prod.images.length > 0) {
      imageMap[i] = await getBase64ImageFromUrl(prod.images[0]);
    } else {
      imageMap[i] = null;
    }
  }

  const tableData = products.map((prod, idx) => {
    const priceText = prod.promoActive
      ? `${formatCurrency(prod.finalPrice)}\n(${prod.promoLabel || 'PROMO'})`
      : formatCurrency(prod.finalPrice);

    const variantsText = prod.variants && prod.variants.length > 0
      ? '\nVariantes: ' + prod.variants.map((v) => `${v.name} (${v.options.join(', ')})`).join(' | ')
      : '';

    return [
      '', // Column 0 reserved for image drawing
      prod.name + variantsText,
      prod.category,
      prod.type === 'stock' ? (prod.stockQuantity > 0 ? `Stock (${prod.stockQuantity})` : 'Agotado') : 'Por Pedido',
      priceText,
      prod.description.substring(0, 100) + (prod.description.length > 100 ? '...' : ''),
    ];
  });

  autoTable(doc, {
    startY: 53,
    head: [['Foto', 'Producto & Variantes', 'Categoría', 'Disponibilidad', 'Precio', 'Descripción']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [244, 114, 182],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      minCellHeight: 18,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { fontStyle: 'bold', cellWidth: 46 },
      2: { cellWidth: 26 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 50 },
    },
    didDrawCell: (data) => {
      // Draw thumbnail inside column 0
      if (data.section === 'body' && data.column.index === 0) {
        const base64Img = imageMap[data.row.index];
        if (base64Img) {
          try {
            doc.addImage(
              base64Img,
              'JPEG',
              data.cell.x + 2,
              data.cell.y + 2,
              14,
              14
            );
          } catch (e) {
            // ignore draw errors
          }
        }
      }
    },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount} • Shaddai Papelería • Pedidos por WhatsApp al ${catalogSettings.businessWhatsApp}`,
      15,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`Catalogo_SHADDAI_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Export Finance Report to PDF
export function exportFinancePDF(
  monthLabel: string,
  totalIncome: number,
  totalExpenses: number,
  netProfit: number,
  openingBalance: number,
  closingBalance: number,
  transactions: Transaction[],
  expensesByCategory: { category: string; amount: number }[]
) {
  const doc = new jsPDF();

  doc.setFillColor(219, 39, 119);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SHADDAI - Reporte Financiero', 15, 17);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${monthLabel} | Generado el ${new Date().toLocaleDateString('es-AR')}`, 15, 25);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del Período', 15, 40);

  const summaryData = [
    ['Saldo Inicial (del mes anterior)', formatCurrency(openingBalance)],
    ['Total Ingresos del Mes', formatCurrency(totalIncome)],
    ['Total Egresos del Mes', formatCurrency(totalExpenses)],
    ['Ganancia Neta (Ingresos - Egresos)', formatCurrency(netProfit)],
    ['Saldo Final Acumulado (Flujo de Caja)', formatCurrency(closingBalance)],
  ];

  autoTable(doc, {
    startY: 44,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { halign: 'right', cellWidth: 60, fontStyle: 'bold' },
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  if (expensesByCategory.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución de Egresos por Categoría', 15, currentY);

    const catData = expensesByCategory.map((c) => [
      c.category,
      formatCurrency(c.amount),
      `${Math.round((c.amount / (totalExpenses || 1)) * 100)}%`,
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Categoría', 'Monto Total', '%']],
      body: catData,
      theme: 'grid',
      headStyles: { fillColor: [244, 114, 182], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Transacciones', 15, currentY);

  const txData = transactions.map((t) => [
    formatDate(t.date),
    t.type === 'ingreso' ? 'INGRESO' : 'EGRESO',
    t.category,
    t.description,
    t.type === 'ingreso' ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(t.amount)}`,
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
    body: txData,
    theme: 'striped',
    headStyles: { fillColor: [70, 70, 70], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 35 },
      3: { cellWidth: 70 },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Reporte_Finanzas_SHADDAI_${monthLabel.replace(/\s+/g, '_')}.pdf`);
}

// Export Finances to CSV
export function exportTransactionsCSV(transactions: Transaction[]) {
  const headers = ['ID', 'Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Monto', 'MetodoPago', 'ID_Pedido'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.type,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount,
    t.paymentMethod,
    t.orderId || '',
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Finanzas_SHADDAI_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Orders to PDF
export function exportOrdersPDF(orders: Order[]) {
  const doc = new jsPDF('landscape');

  doc.setFillColor(244, 114, 182);
  doc.rect(0, 0, 297, 25, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SHADDAI - Listado y Control de Pedidos', 15, 16);

  const orderData = orders.map((o) => [
    o.orderNumber,
    formatDate(o.createdAt),
    o.clientName,
    o.clientPhone,
    o.items.map((it) => `${it.quantity}x ${it.productName}`).join('; '),
    formatCurrency(o.totalAmount),
    formatCurrency(o.amountPaid),
    formatCurrency(o.balanceDue),
    o.status.toUpperCase().replace('_', ' '),
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['Nº Pedido', 'Fecha', 'Cliente', 'WhatsApp', 'Productos', 'Total', 'Cobrado', 'Saldo', 'Estado']],
    body: orderData,
    theme: 'grid',
    headStyles: { fillColor: [244, 114, 182], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 22 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28 },
      4: { cellWidth: 80 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 25, fontStyle: 'bold' },
    },
  });

  doc.save(`Pedidos_SHADDAI_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Export Orders to CSV
export function exportOrdersCSV(orders: Order[]) {
  const headers = ['NroPedido', 'Fecha', 'Cliente', 'Telefono', 'Email', 'Direccion', 'Total', 'Cobrado', 'SaldoPendiente', 'Estado', 'MetodoEntrega', 'MetodoPago'];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.createdAt,
    `"${(o.clientName || '').replace(/"/g, '""')}"`,
    o.clientPhone,
    o.clientEmail || '',
    `"${(o.clientAddress || '').replace(/"/g, '""')}"`,
    o.totalAmount,
    o.amountPaid,
    o.balanceDue,
    o.status,
    o.deliveryMethod,
    o.paymentMethod,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Pedidos_SHADDAI_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Contacts as vCard (.vcf)
export function exportContactsVCard(clients: Client[]) {
  let vcfString = '';
  clients.forEach((c) => {
    vcfString += 'BEGIN:VCARD\r\nVERSION:3.0\r\n';
    vcfString += `FN:${c.name}\r\n`;
    if (c.phone) vcfString += `TEL;TYPE=CELL:${c.phone}\r\n`;
    if (c.email) vcfString += `EMAIL:${c.email}\r\n`;
    if (c.address) vcfString += `ADR;TYPE=HOME:;;${c.address};;;;\r\n`;
    if (c.notes) vcfString += `NOTE:${c.notes}\r\n`;
    vcfString += 'END:VCARD\r\n';
  });

  const blob = new Blob([vcfString], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Contactos_Clientes_SHADDAI.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Parse imported vCard (.vcf) or CSV
export function parseVCard(vcfText: string): Partial<Client>[] {
  const cards = vcfText.split(/BEGIN:VCARD/i).filter(Boolean);
  const clients: Partial<Client>[] = [];

  cards.forEach((card) => {
    const fnMatch = card.match(/FN:(.*?)(\r?\n|$)/i);
    const telMatch = card.match(/TEL.*?:(.*?)(\r?\n|$)/i);
    const emailMatch = card.match(/EMAIL.*?:(.*?)(\r?\n|$)/i);
    const adrMatch = card.match(/ADR.*?:(.*?)(\r?\n|$)/i);
    const noteMatch = card.match(/NOTE:(.*?)(\r?\n|$)/i);

    const name = fnMatch ? fnMatch[1].trim() : '';
    const phone = telMatch ? telMatch[1].replace(/[^\d+]/g, '').trim() : '';
    const email = emailMatch ? emailMatch[1].trim() : '';
    const address = adrMatch ? adrMatch[1].replace(/;/g, ' ').trim() : '';
    const notes = noteMatch ? noteMatch[1].trim() : '';

    if (name || phone) {
      clients.push({
        name: name || phone,
        phone: phone || '',
        email,
        address,
        notes,
      });
    }
  });

  return clients;
}

// Generate Official Digital Receipt / Comprobante PDF for an individual order
export function generateOrderReceiptPDF(order: Order, catalogSettings: CatalogSettings) {
  const doc = new jsPDF();

  // Top header banner in rose-pink gradient
  doc.setFillColor(244, 114, 182); // Rose pink
  doc.rect(0, 0, 210, 36, 'F');

  // Business Name & Tagline
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(catalogSettings.appName || 'SHADDAI', 15, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(catalogSettings.appTagline || 'Papelería Artesanal & Diseño', 15, 26);

  // Voucher / Comprobante title on top right
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE DE PEDIDO', 195, 18, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº #${order.orderNumber}`, 195, 26, { align: 'right' });

  // Order & Client Details Cards
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);

  // Column 1: Client Data
  let startY = 46;
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE:', 15, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${order.clientName}`, 15, startY + 6);
  doc.text(`WhatsApp: ${order.clientPhone}`, 15, startY + 12);
  if (order.clientAddress) {
    doc.text(`Dirección: ${order.clientAddress}`, 15, startY + 18);
  }

  // Column 2: Order Metadata
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLES DEL PEDIDO:', 120, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${formatDate(order.createdAt)}`, 120, startY + 6);
  doc.text(
    `Entrega: ${
      order.deliveryMethod === 'retirar'
        ? 'Retiro en Taller'
        : order.deliveryMethod === 'domicilio'
        ? 'Envío a Domicilio'
        : 'Correo Argentino'
    }`,
    120,
    startY + 12
  );
  doc.text(
    `Estado: ${order.status.toUpperCase().replace('_', ' ')}`,
    120,
    startY + 18
  );

  // Products Table
  const tableBody = order.items.map((it) => {
    let variantsStr = '';
    if (it.selectedVariants && Object.keys(it.selectedVariants).length > 0) {
      variantsStr =
        '\nVariantes: ' +
        Object.entries(it.selectedVariants)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
    }
    return [
      String(it.quantity),
      it.productName + variantsStr,
      formatCurrency(it.price),
      formatCurrency(it.price * it.quantity),
    ];
  });

  autoTable(doc, {
    startY: startY + 26,
    head: [['Cant.', 'Descripción del Producto', 'Precio Unit.', 'Subtotal']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [244, 114, 182],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 105 },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;

  // Subtotals and totals summary block
  const isFullyPaid = (order.balanceDue <= 0) || ((order.amountPaid || 0) >= order.totalAmount);
  const totalsData: string[][] = [
    ['Subtotal Productos:', formatCurrency(order.subtotal || order.totalAmount)],
  ];
  if (order.shippingCost && order.shippingCost > 0) {
    totalsData.push(['Costo de Envío:', formatCurrency(order.shippingCost)]);
  }
  totalsData.push(['TOTAL DEL PEDIDO:', formatCurrency(order.totalAmount)]);
  totalsData.push(['Total Abonado / Pagado:', formatCurrency(order.amountPaid || 0)]);
  totalsData.push([
    isFullyPaid ? 'ESTADO:' : 'SALDO PENDIENTE:',
    isFullyPaid ? '✅ PAGADO' : formatCurrency(order.balanceDue || 0),
  ]);

  autoTable(doc, {
    startY: currentY,
    body: totalsData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold', cellWidth: 145 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Partial Payments History if present
  if (order.partialPayments && order.partialPayments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('HISTORIAL DE PAGOS REGISTRADOS:', 15, currentY);

    const paymentRows = order.partialPayments.map((p) => [
      formatDate(p.date),
      p.method.toUpperCase(),
      p.note || 'Pago recibido',
      formatCurrency(p.amount),
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha', 'Método', 'Detalle', 'Monto']],
      body: paymentRows,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: 255,
        fontSize: 8,
      },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 35 },
        2: { cellWidth: 92 },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Fully Paid banner or Bank Details
  if (isFullyPaid) {
    doc.setFillColor(236, 253, 245); // light emerald
    doc.setDrawColor(16, 185, 129); // emerald 500
    doc.roundedRect(15, currentY, 180, 14, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70);
    doc.text('✅ ESTE PEDIDO SE ENCUENTRA TOTALMENTE PAGADO. ¡MUCHAS GRACIAS POR TU COMPRA!', 105, currentY + 9, {
      align: 'center',
    });
  } else if (catalogSettings.bankInfo?.cbu || catalogSettings.bankInfo?.alias) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(15, currentY, 180, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(153, 27, 27);
    doc.text('DATOS PARA TRANSFERIR SALDO RESTANTE:', 20, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Banco: ${catalogSettings.bankInfo.banco || '-'} • Titular: ${catalogSettings.bankInfo.titular || '-'} • Alias: ${catalogSettings.bankInfo.alias || '-'} • CBU: ${catalogSettings.bankInfo.cbu || '-'}`,
      20,
      currentY + 12
    );
  }

  // Footer notes
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Comprobante generado electrónicamente por ${catalogSettings.appName || 'Shaddai'}. Contacto: ${catalogSettings.businessWhatsApp || ''}`,
    105,
    285,
    { align: 'center' }
  );

  doc.save(`Comprobante_Pedido_${order.orderNumber}_${order.clientName.replace(/\s+/g, '_')}.pdf`);
}
