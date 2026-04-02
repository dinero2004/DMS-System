package com.dms.backend.modules.sales.service;

import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientEntity;
import com.dms.backend.modules.sales.persistence.SalesContractEntity;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class ContractPdfService {
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

    public byte[] render(SalesContractEntity ct, ClientEntity client, CarEntity car) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 50, 50, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            try { Image img = Image.getInstance(new ClassPathResource("apex-logo.png").getURL()); img.scaleToFit(80, 32); doc.add(img); } catch (Exception ignored) {}
            doc.add(new Paragraph(CO + " · " + ADDR + " · Tel: " + TEL, SMALL));
            doc.add(sp(6));

            String clientName = ((client.getFirstName() != null ? client.getFirstName() : "") + " " + (client.getLastName() != null ? client.getLastName() : "")).trim();
            Paragraph addr = new Paragraph();
            addr.setAlignment(Element.ALIGN_RIGHT);
            addr.add(new Chunk(clientName + "\n", BOLD8));
            if (client.getAddressLine() != null) addr.add(new Chunk(client.getAddressLine() + "\n", BODY));
            String city = "";
            if (client.getZipCode() != null) city += client.getZipCode() + " ";
            if (client.getCity() != null) city += client.getCity();
            if (!city.isBlank()) addr.add(new Chunk(city.trim() + "\n", BODY));
            if (client.getPhone() != null) addr.add(new Chunk("Tel: " + client.getPhone() + "\n", BODY));
            if (client.getEmail() != null) addr.add(new Chunk(client.getEmail() + "\n", BODY));
            if (client.getBirthday() != null) addr.add(new Chunk("Date of Birth: " + DF.format(client.getBirthday()), BODY));
            doc.add(addr);
            doc.add(sp(12));

            doc.add(new Paragraph("Vehicle Sales Contract", TITLE));
            doc.add(sp(6));

            PdfPTable dateRow = new PdfPTable(4);
            dateRow.setWidthPercentage(100);
            dateRow.setWidths(new float[]{25, 25, 25, 25});
            addHeaderValue(dateRow, "Contract Date", DF.format(ct.getContractDate()));
            addHeaderValue(dateRow, "Customer No.", client.getId().substring(0, 6));
            addHeaderValue(dateRow, "Phone", client.getPhone() != null ? client.getPhone() : "—");
            addHeaderValue(dateRow, "Insurance", ct.getInsuranceCompany() != null ? ct.getInsuranceCompany() : "—");
            doc.add(dateRow);
            doc.add(sp(6));

            if (car != null) {
                String vehicle = (car.getMake() != null ? car.getMake() + " " : "") + car.getModel();
                doc.add(new Paragraph(vehicle, H2));
                doc.add(sp(2));
                PdfPTable vInfo = new PdfPTable(6);
                vInfo.setWidthPercentage(100);
                vInfo.setWidths(new float[]{16, 17, 17, 16, 17, 17});
                addHeaderValue(vInfo, "License Plate", ct.getRegistrationPlate() != null ? ct.getRegistrationPlate() : (car.getPlate() != null ? car.getPlate() : "—"));
                addHeaderValue(vInfo, "First Reg.", car.getFirstRegistrationDate() != null ? DF.format(car.getFirstRegistrationDate()) : "—");
                addHeaderValue(vInfo, "Chassis No.", car.getVin() != null ? car.getVin() : "—");
                addHeaderValue(vInfo, "Mileage", car.getMileageKm() != null ? String.format("%,d", car.getMileageKm()).replace(",", "'") + " km" : "—");
                addHeaderValue(vInfo, "Fuel Type", car.getFuelType() != null ? car.getFuelType() : "—");
                addHeaderValue(vInfo, "Year", car.getModelYear() != null ? String.valueOf(car.getModelYear()) : "—");
                doc.add(vInfo);
            }
            doc.add(sp(10));

            PdfPTable itemTable = new PdfPTable(4);
            itemTable.setWidthPercentage(100);
            itemTable.setWidths(new float[]{10, 50, 20, 20});
            String[] headers = {"Pos.", "Description", "Qty", "Amount (CHF)"};
            for (String h : headers) {
                PdfPCell hc = new PdfPCell(new Phrase(h, H2));
                hc.setBorderColor(BORDER); hc.setBorderWidth(0); hc.setBorderWidthBottom(1); hc.setPadding(4);
                itemTable.addCell(hc);
            }

            int pos = 1;
            long subtotalCents = ct.getSellingPriceCents();
            addContractRow(itemTable, String.valueOf(pos++), "Vehicle — " + (car != null ? ((car.getMake() != null ? car.getMake() + " " : "") + car.getModel()) : "—"), "1", fmtChf(ct.getSellingPriceCents()));

            long prepFee = ct.getPrepFeeCents() != null ? ct.getPrepFeeCents() : 0;
            if (prepFee > 0) {
                subtotalCents += prepFee;
                addContractRow(itemTable, String.valueOf(pos++), "Preparation Fee", "1", fmtChf(prepFee));
            }

            long additionalCosts = ct.getAdditionalCostsCents() != null ? ct.getAdditionalCostsCents() : 0;
            if (additionalCosts > 0 && ct.getAdditionalCostsText() != null) {
                subtotalCents += additionalCosts;
                addContractRow(itemTable, String.valueOf(pos++), ct.getAdditionalCostsText(), "1", fmtChf(additionalCosts));
            }

            doc.add(itemTable);
            doc.add(sp(8));

            BigDecimal subtotal = BigDecimal.valueOf(subtotalCents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal vatAmt = subtotal.multiply(VAT_RATE).divide(VAT_RATE.add(BigDecimal.ONE), 2, RoundingMode.HALF_UP);
            BigDecimal exclVat = subtotal.subtract(vatAmt);

            PdfPTable totals = new PdfPTable(2);
            totals.setWidthPercentage(50);
            totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totals.setWidths(new float[]{60, 40});
            addTotalRow(totals, "Subtotal (excl. VAT)", fmtBd(exclVat), false);
            addTotalRow(totals, "VAT 8.1%", fmtBd(vatAmt), false);
            addTotalRow(totals, "Total (incl. VAT)", "CHF " + fmtBd(subtotal), true);
            doc.add(totals);

            if (ct.getNotes() != null && !ct.getNotes().isBlank()) {
                doc.add(sp(6)); doc.add(new Paragraph("Notes", H2)); doc.add(new Paragraph(ct.getNotes(), BODY));
            }

            doc.add(sp(20));
            PdfPTable sig = new PdfPTable(2); sig.setWidthPercentage(100);
            sig.addCell(sigCell("Seller (" + CO + ")")); sig.addCell(sigCell("Buyer (" + clientName + ")"));
            doc.add(sig); doc.add(sp(8));
            doc.add(new Paragraph("Place: Bern    Date: " + DF.format(ct.getContractDate()), BODY));
            doc.add(sp(10));
            doc.add(new Paragraph(CO + " · " + ADDR + " · " + TEL, SMALL));

            doc.close();
            return baos.toByteArray();
        } catch (DocumentException e) { throw new IllegalStateException("Failed to build contract PDF", e); }
    }

    private static void addHeaderValue(PdfPTable t, String label, String value) {
        PdfPCell c = new PdfPCell(); c.setBorder(0); c.setPadding(2);
        c.addElement(new Paragraph(label, H2)); c.addElement(new Paragraph(value, BODY)); t.addCell(c);
    }

    private static void addContractRow(PdfPTable t, String pos, String desc, String qty, String amount) {
        String[] vals = {pos, desc, qty, amount};
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

    private static PdfPCell sigCell(String label) {
        PdfPCell c = new PdfPCell(); c.setBorder(0); c.setPadding(6);
        c.addElement(sp(24)); c.addElement(new Paragraph("________________________________________", BODY));
        c.addElement(new Paragraph(label, SMALL)); return c;
    }

    private static String fmtChf(long cents) { return BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP).toPlainString(); }
    private static String fmtBd(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
    private static Paragraph sp(float h) { Paragraph p = new Paragraph(" "); p.setSpacingBefore(h); return p; }
}
