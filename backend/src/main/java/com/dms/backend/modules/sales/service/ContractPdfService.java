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
    private static final String COMPANY = "Apex Motorsport";
    private static final String ADDR = "Schenuerweg 28, 3008 Bern";
    private static final String TEL = "078 234 80 28";
    private static final DateTimeFormatter DFMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(15, 23, 42));
    private static final Font H2 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(15, 23, 42));
    private static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
    private static final Font BOLD9 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
    private static final Font SMALL = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.GRAY);

    public byte[] render(SalesContractEntity ct, ClientEntity client, CarEntity car) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 40, 40, 30, 30);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            try { Image img = Image.getInstance(new ClassPathResource("apex-logo.png").getURL()); img.scaleToFit(90, 36); doc.add(img); } catch (Exception ignored) {}

            doc.add(new Paragraph(COMPANY, TITLE));
            doc.add(new Paragraph(ADDR + " · Tel: " + TEL, BODY));
            doc.add(sp(10));
            doc.add(new Paragraph("Vehicle Sales Contract", TITLE));
            doc.add(new Paragraph("Date: " + DFMT.format(ct.getContractDate()), BODY));
            doc.add(sp(8));

            PdfPTable parties = new PdfPTable(2); parties.setWidthPercentage(100); parties.setWidths(new float[]{50, 50});
            PdfPCell sellerCell = partyCell("Seller", COMPANY + "\n" + ADDR + "\nTel: " + TEL);
            String buyerName = (client.getFirstName() + " " + client.getLastName()).trim();
            StringBuilder buyerInfo = new StringBuilder(buyerName);
            if (client.getAddressLine() != null) buyerInfo.append("\n").append(client.getAddressLine());
            String cityLine = joinCity(client); if (cityLine != null) buyerInfo.append("\n").append(cityLine);
            if (client.getPhone() != null) buyerInfo.append("\nTel: ").append(client.getPhone());
            if (client.getEmail() != null) buyerInfo.append("\n").append(client.getEmail());
            if (client.getBirthday() != null) buyerInfo.append("\nDate of Birth: ").append(DFMT.format(client.getBirthday()));
            PdfPCell buyerCell = partyCell("Buyer", buyerInfo.toString());
            parties.addCell(sellerCell); parties.addCell(buyerCell);
            doc.add(parties); doc.add(sp(8));

            doc.add(new Paragraph("Vehicle Details", H2)); doc.add(sp(2));
            PdfPTable vt = new PdfPTable(2); vt.setWidthPercentage(100); vt.setWidths(new float[]{30, 70});
            addRow(vt, "Make / Model", (car.getMake() != null ? car.getMake() + " " : "") + car.getModel());
            if (car.getVin() != null) addRow(vt, "VIN", car.getVin());
            if (car.getStammnummer() != null) addRow(vt, "Stammnummer", car.getStammnummer());
            if (car.getColor() != null) addRow(vt, "Color", car.getColor());
            if (car.getTrimColor() != null) addRow(vt, "Trim Color", car.getTrimColor());
            if (car.getModelYear() != null) addRow(vt, "Year", String.valueOf(car.getModelYear()));
            if (car.getMileageKm() != null) addRow(vt, "Mileage", car.getMileageKm() + " km");
            if (car.getFuelType() != null) addRow(vt, "Fuel Type", car.getFuelType());
            if (car.getFirstRegistrationDate() != null) addRow(vt, "First Registration", DFMT.format(car.getFirstRegistrationDate()));
            if (ct.getRegistrationPlate() != null) addRow(vt, "Reg. Plate", ct.getRegistrationPlate());
            if (ct.getInsuranceCompany() != null) addRow(vt, "Insurance", ct.getInsuranceCompany());
            doc.add(vt); doc.add(sp(8));

            BigDecimal price = BigDecimal.valueOf(ct.getSellingPriceCents()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal vatRate = BigDecimal.valueOf(0.081);
            BigDecimal vatAmt = price.multiply(vatRate).divide(vatRate.add(BigDecimal.ONE), 2, RoundingMode.HALF_UP);
            doc.add(new Paragraph("Selling price (incl. 8.1% VAT): CHF " + price.toPlainString(), BOLD9));
            doc.add(new Paragraph("Thereof VAT: CHF " + vatAmt.toPlainString(), BODY));

            if (ct.getNotes() != null && !ct.getNotes().isBlank()) { doc.add(sp(6)); doc.add(new Paragraph("Notes", H2)); doc.add(new Paragraph(ct.getNotes(), BODY)); }

            doc.add(sp(20));
            PdfPTable sig = new PdfPTable(2); sig.setWidthPercentage(100);
            sig.addCell(sigCell("Seller (" + COMPANY + ")")); sig.addCell(sigCell("Buyer (" + buyerName + ")"));
            doc.add(sig); doc.add(sp(8));
            doc.add(new Paragraph("Place: Bern    Date: " + DFMT.format(ct.getContractDate()), BODY));
            doc.add(sp(10));
            doc.add(new Paragraph(COMPANY + " · " + ADDR + " · " + TEL, SMALL));

            doc.close();
            return baos.toByteArray();
        } catch (DocumentException e) { throw new IllegalStateException("Failed to build contract PDF", e); }
    }

    private static void addRow(PdfPTable t, String label, String val) {
        PdfPCell lc = new PdfPCell(new Phrase(label, BOLD9)); lc.setBorderColor(new Color(200, 208, 218)); lc.setPadding(4); t.addCell(lc);
        PdfPCell vc = new PdfPCell(new Phrase(val, BODY)); vc.setBorderColor(new Color(200, 208, 218)); vc.setPadding(4); t.addCell(vc);
    }
    private static PdfPCell partyCell(String title, String body) {
        PdfPCell c = new PdfPCell(); c.setBorder(0); c.setPadding(4);
        c.addElement(new Paragraph(title, H2)); c.addElement(new Paragraph(body, BODY)); return c;
    }
    private static PdfPCell sigCell(String label) {
        PdfPCell c = new PdfPCell(); c.setBorder(0); c.setPadding(6);
        c.addElement(sp(24)); c.addElement(new Paragraph("________________________________________", BODY));
        c.addElement(new Paragraph(label, SMALL)); return c;
    }
    private static Paragraph sp(float h) { Paragraph p = new Paragraph(" "); p.setSpacingBefore(h); return p; }
    private static String joinCity(ClientEntity c) {
        if (c.getZipCode() == null && c.getCity() == null) return null;
        if (c.getZipCode() == null) return c.getCity(); if (c.getCity() == null) return c.getZipCode();
        return c.getZipCode() + " " + c.getCity();
    }
}
