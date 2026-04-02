package com.dms.backend.modules.finance.service;

import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientEntity;
import com.dms.backend.modules.finance.persistence.InvoiceEntity;
import com.dms.backend.modules.sales.persistence.SalesContractEntity;
import com.dms.backend.modules.workshop.persistence.WorkshopJobEntity;
import com.dms.backend.modules.workshop.persistence.WorkshopJobItemEntity;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class InvoicePdfService {
    private static final String CO = "Apex Motorsport";
    private static final String ADDR = "Schenuerweg 28, 3008 Bern";
    private static final String TEL = "078 234 80 28";
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final BigDecimal VAT_RATE = new BigDecimal("0.081");
    private static final Color BORDER = new Color(180, 180, 180);

    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.BLACK);
    private static final Font H2 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);
    private static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
    private static final Font BOLD8 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.BLACK);
    private static final Font SMALL = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.GRAY);
    private static final Font ITALIC = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.BLACK);

    public byte[] render(InvoiceEntity inv, ClientEntity client, WorkshopJobEntity job, CarEntity car, List<WorkshopJobItemEntity> items) {
        return render(inv, client, job, car, items, null);
    }

    public byte[] render(InvoiceEntity inv, ClientEntity client, WorkshopJobEntity job, CarEntity car, List<WorkshopJobItemEntity> items, SalesContractEntity contract) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 50, 50, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            try { Image img = Image.getInstance(new ClassPathResource("apex-logo.png").getURL()); img.scaleToFit(80, 32); doc.add(img); } catch (Exception ignored) {}
            doc.add(new Paragraph(CO + " · " + ADDR + " · Tel: " + TEL, SMALL));
            doc.add(sp(6));

            String clientName = (client.getFirstName() != null ? client.getFirstName() : "") + " " + (client.getLastName() != null ? client.getLastName() : "");
            Paragraph addr = new Paragraph();
            addr.setAlignment(Element.ALIGN_RIGHT);
            addr.add(new Chunk(clientName.trim() + "\n", BOLD8));
            if (client.getAddressLine() != null) addr.add(new Chunk(client.getAddressLine() + "\n", BODY));
            String city = "";
            if (client.getZipCode() != null) city += client.getZipCode() + " ";
            if (client.getCity() != null) city += client.getCity();
            if (!city.isBlank()) addr.add(new Chunk(city.trim(), BODY));
            doc.add(addr);
            doc.add(sp(12));

            doc.add(new Paragraph("Invoice " + inv.getInvoiceNumber(), TITLE));
            doc.add(sp(6));

            String invoiceDate = inv.getIssuedAt() != null ? DF.format(inv.getIssuedAt()) : DF.format(inv.getCreatedAt());
            PdfPTable dateRow = new PdfPTable(5);
            dateRow.setWidthPercentage(100);
            dateRow.setWidths(new float[]{20, 20, 20, 20, 20});
            addHeaderValue(dateRow, "Invoice Date", invoiceDate);
            addHeaderValue(dateRow, "Received", invoiceDate);
            addHeaderValue(dateRow, "Delivered", invoiceDate);
            addHeaderValue(dateRow, "Customer No.", client.getId().substring(0, 6));
            addHeaderValue(dateRow, "Phone", client.getPhone() != null ? client.getPhone() : "—");
            doc.add(dateRow);
            doc.add(sp(6));

            if (car != null) {
                String vehicle = (car.getMake() != null ? car.getMake() + " " : "") + car.getModel();
                doc.add(new Paragraph(vehicle, H2));
                doc.add(sp(2));
                PdfPTable vInfo = new PdfPTable(6);
                vInfo.setWidthPercentage(100);
                vInfo.setWidths(new float[]{16, 17, 17, 16, 17, 17});
                String plateVal = car.getPlate() != null ? car.getPlate() : "—";
                if (contract != null && contract.getRegistrationPlate() != null && !contract.getRegistrationPlate().isBlank()) {
                    plateVal = contract.getRegistrationPlate();
                }
                addHeaderValue(vInfo, "License Plate", plateVal);
                addHeaderValue(vInfo, "First Reg.", car.getFirstRegistrationDate() != null ? DF.format(car.getFirstRegistrationDate()) : "—");
                addHeaderValue(vInfo, "Chassis No.", car.getVin() != null ? car.getVin() : "—");
                addHeaderValue(vInfo, "Mileage", car.getMileageKm() != null ? String.format("%,d", car.getMileageKm()).replace(",", "'") : "—");
                addHeaderValue(vInfo, "Registry No.", car.getStammnummer() != null ? car.getStammnummer() : "—");
                addHeaderValue(vInfo, "Contract Date", contract != null ? DF.format(contract.getContractDate()) : "—");
                doc.add(vInfo);
            } else if (contract != null) {
                doc.add(new Paragraph("Sales contract " + DF.format(contract.getContractDate()), H2));
                doc.add(sp(2));
            }
            doc.add(sp(10));

            PdfPTable itemTable = new PdfPTable(7);
            itemTable.setWidthPercentage(100);
            itemTable.setWidths(new float[]{10, 30, 10, 10, 14, 10, 16});
            String[] headers = {"Art. No.", "Description", "Qty", "Unit", "Unit Price", "Discount", "Total"};
            for (String h : headers) {
                PdfPCell hc = new PdfPCell(new Phrase(h, H2));
                hc.setBorderColor(BORDER); hc.setBorderWidth(0);
                hc.setBorderWidthBottom(1); hc.setPadding(4);
                itemTable.addCell(hc);
            }

            if (contract != null) {
                String cn = (client.getFirstName() != null ? client.getFirstName() : "") + " " + (client.getLastName() != null ? client.getLastName() : "");
                PdfPCell ref = new PdfPCell();
                ref.setColspan(7); ref.setBorder(0); ref.setPadding(4);
                ref.addElement(new Paragraph("Reference — Sales contract dated " + DF.format(contract.getContractDate()) + " · Customer: " + cn.trim(), ITALIC));
                if (car != null) {
                    ref.addElement(new Paragraph("Vehicle: " + (car.getMake() != null ? car.getMake() + " " : "") + car.getModel()
                        + (car.getVin() != null ? " · VIN " + car.getVin() : ""), ITALIC));
                }
                itemTable.addCell(ref);
            }

            if (job != null && job.getDescription() != null && !job.getDescription().isBlank()) {
                PdfPCell desc = new PdfPCell();
                desc.setColspan(7); desc.setBorder(0); desc.setPadding(4);
                desc.addElement(new Paragraph("Workshop Services:", BOLD8));
                desc.addElement(new Paragraph(job.getDescription(), ITALIC));
                itemTable.addCell(desc);
            }

            long subtotalCents = 0;
            if (items != null && !items.isEmpty()) {
                for (WorkshopJobItemEntity it : items) {
                    long lineTot = it.computeTotal();
                    subtotalCents += lineTot;
                    addItemRow(itemTable, it.getArtNr() != null ? it.getArtNr() : "",
                        it.getName(),
                        it.getQuantity().toPlainString(),
                        it.getUnit() != null ? it.getUnit() : "",
                        formatChf(it.getUnitPriceCents()),
                        it.getDiscountPct() != null && it.getDiscountPct().compareTo(BigDecimal.ZERO) > 0 ? it.getDiscountPct().toPlainString() + "%" : "",
                        formatChf(lineTot));
                }
            } else if (contract != null) {
                int art = 1;
                long sellExcl = inclCentsToExclCents(contract.getSellingPriceCents());
                subtotalCents += sellExcl;
                String vDesc = car != null ? "Vehicle sale — " + (car.getMake() != null ? car.getMake() + " " : "") + car.getModel() : "Vehicle sale";
                addItemRow(itemTable, String.format("%02d", art++), vDesc, "1.00", "pc", formatChf(sellExcl), "", formatChf(sellExcl));
                long prep = contract.getPrepFeeCents() != null ? contract.getPrepFeeCents() : 0L;
                if (prep > 0) {
                    long prepExcl = inclCentsToExclCents(prep);
                    subtotalCents += prepExcl;
                    addItemRow(itemTable, String.format("%02d", art++), "Preparation fee", "1.00", "pc", formatChf(prepExcl), "", formatChf(prepExcl));
                }
                long addC = contract.getAdditionalCostsCents() != null ? contract.getAdditionalCostsCents() : 0L;
                if (addC > 0) {
                    long addExcl = inclCentsToExclCents(addC);
                    subtotalCents += addExcl;
                    String addLabel = contract.getAdditionalCostsText() != null && !contract.getAdditionalCostsText().isBlank()
                        ? contract.getAdditionalCostsText() : "Additional costs";
                    addItemRow(itemTable, String.format("%02d", art++), addLabel, "1.00", "pc", formatChf(addExcl), "", formatChf(addExcl));
                }
            } else {
                String desc = "Service";
                if (car != null) {
                    desc = "Vehicle Sale — " + (car.getMake() != null ? car.getMake() + " " : "") + car.getModel();
                }
                subtotalCents = inv.getAmountCents();
                BigDecimal totalIncl = BigDecimal.valueOf(subtotalCents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                subtotalCents = totalIncl.divide(BigDecimal.ONE.add(VAT_RATE), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
                addItemRow(itemTable, "", desc, "1.00", "pc", formatChf(subtotalCents), "", formatChf(subtotalCents));
            }

            doc.add(itemTable);
            doc.add(sp(8));

            BigDecimal subtotal = BigDecimal.valueOf(subtotalCents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal vat;
            BigDecimal rounded;
            BigDecimal diff;
            if (contract != null) {
                BigDecimal invIncl = BigDecimal.valueOf(inv.getAmountCents()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                vat = invIncl.subtract(subtotal).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
                BigDecimal gross = subtotal.add(vat);
                rounded = roundTo5Rappen(invIncl);
                diff = rounded.subtract(gross);
            } else {
                vat = subtotal.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP);
                BigDecimal gross = subtotal.add(vat);
                rounded = roundTo5Rappen(gross);
                diff = rounded.subtract(gross);
            }

            PdfPTable totals = new PdfPTable(2);
            totals.setWidthPercentage(50);
            totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totals.setWidths(new float[]{60, 40});
            addTotalRow(totals, "Total", formatChfBd(subtotal), false);
            addTotalRow(totals, "Plus VAT 8.1%", formatChfBd(vat), false);
            if (diff.abs().compareTo(BigDecimal.ZERO) > 0) addTotalRow(totals, "Rounding Difference", formatChfBd(diff), false);
            addTotalRow(totals, "Invoice Total", "CHF " + formatChfBd(rounded), true);
            doc.add(totals);

            doc.add(sp(20));
            doc.add(new Paragraph(CO + " · " + ADDR + " · " + TEL, SMALL));
            doc.close();
            return baos.toByteArray();
        } catch (DocumentException e) { throw new IllegalStateException("PDF error", e); }
    }

    private static void addHeaderValue(PdfPTable t, String label, String value) {
        PdfPCell c = new PdfPCell();
        c.setBorder(0); c.setPadding(2);
        c.addElement(new Paragraph(label, H2));
        c.addElement(new Paragraph(value, BODY));
        t.addCell(c);
    }

    private static void addItemRow(PdfPTable t, String artNr, String name, String qty, String unit, String price, String discount, String total) {
        String[] vals = {artNr, name, qty, unit, price, discount, total};
        for (int i = 0; i < vals.length; i++) {
            PdfPCell c = new PdfPCell(new Phrase(vals[i], BODY));
            c.setBorder(0); c.setPadding(3);
            if (i >= 2) c.setHorizontalAlignment(Element.ALIGN_RIGHT);
            t.addCell(c);
        }
    }

    private static void addTotalRow(PdfPTable t, String label, String val, boolean bold) {
        Font f = bold ? BOLD8 : BODY;
        PdfPCell lc = new PdfPCell(new Phrase(label, f)); lc.setBorder(0); lc.setPadding(3); t.addCell(lc);
        PdfPCell vc = new PdfPCell(new Phrase(val, f)); vc.setBorder(0); vc.setPadding(3); vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        if (bold) { vc.setBorderWidthTop(1); vc.setBorderColor(BORDER); lc.setBorderWidthTop(1); lc.setBorderColor(BORDER); }
        t.addCell(vc);
    }

    private static BigDecimal roundTo5Rappen(BigDecimal v) {
        return v.multiply(BigDecimal.valueOf(20)).setScale(0, RoundingMode.HALF_UP).divide(BigDecimal.valueOf(20), 2, RoundingMode.HALF_UP);
    }

    /** Convert tax-included CHF amount (cents) to net/excl-VAT cents for line display. */
    private static long inclCentsToExclCents(long inclCents) {
        BigDecimal incl = BigDecimal.valueOf(inclCents).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return incl.divide(BigDecimal.ONE.add(VAT_RATE), 2, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
    }

    private static String formatChf(long cents) {
        BigDecimal v = BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return v.toPlainString();
    }
    private static String formatChfBd(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
    private static Paragraph sp(float h) { Paragraph p = new Paragraph(" "); p.setSpacingBefore(h); return p; }
}
