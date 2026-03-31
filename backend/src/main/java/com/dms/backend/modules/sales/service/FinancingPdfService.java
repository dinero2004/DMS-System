package com.dms.backend.modules.sales.service;

import com.dms.backend.modules.customervehicle.persistence.CarEntity;
import com.dms.backend.modules.customervehicle.persistence.ClientEntity;
import com.dms.backend.modules.sales.persistence.FinancingOfferEntity;
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
public class FinancingPdfService {
    private static final String CO = "Apex Motorsport";
    private static final String ADDR = "Schenuerweg 28, 3008 Bern";
    private static final String TEL = "078 234 80 28";
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final BigDecimal VAT = new BigDecimal("0.081");
    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(15, 23, 42));
    private static final Font H2 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(15, 23, 42));
    private static final Font BODY = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
    private static final Font BOLD9 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
    private static final Font SMALL = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.GRAY);
    private static final Font BIG_BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(15, 23, 42));

    public byte[] render(FinancingOfferEntity offer, CarEntity car, ClientEntity client) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 40, 40, 30, 30);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            try { Image img = Image.getInstance(new ClassPathResource("apex-logo.png").getURL()); img.scaleToFit(90, 36); doc.add(img); } catch (Exception ignored) {}
            doc.add(new Paragraph(CO, TITLE));
            doc.add(new Paragraph(ADDR + " · Tel: " + TEL, BODY));
            doc.add(sp(12));

            String type = "LEASING".equals(offer.getOfferType()) ? "Leasing" : "Financing";
            doc.add(new Paragraph(type + " Offer", TITLE));
            doc.add(new Paragraph("Date: " + DF.format(offer.getCreatedAt()), BODY));
            doc.add(sp(10));

            if (client != null) {
                doc.add(new Paragraph("Client", H2));
                String name = ((client.getFirstName() != null ? client.getFirstName() : "") + " " + (client.getLastName() != null ? client.getLastName() : "")).trim();
                doc.add(new Paragraph(name, BOLD9));
                if (client.getAddressLine() != null) doc.add(new Paragraph(client.getAddressLine(), BODY));
                String city = "";
                if (client.getZipCode() != null) city += client.getZipCode() + " ";
                if (client.getCity() != null) city += client.getCity();
                if (!city.isBlank()) doc.add(new Paragraph(city.trim(), BODY));
                if (client.getPhone() != null) doc.add(new Paragraph("Tel: " + client.getPhone(), BODY));
                doc.add(sp(8));
            }

            if (car != null) {
                doc.add(new Paragraph("Vehicle", H2));
                String label = (car.getMake() != null ? car.getMake() + " " : "") + car.getModel();
                doc.add(new Paragraph(label, BOLD9));
                if (car.getVin() != null) doc.add(new Paragraph("VIN: " + car.getVin(), BODY));
                if (car.getModelYear() != null) doc.add(new Paragraph("Year: " + car.getModelYear(), BODY));
                if (car.getColor() != null) doc.add(new Paragraph("Color: " + car.getColor(), BODY));
                if (car.getMileageKm() != null) doc.add(new Paragraph("Mileage: " + car.getMileageKm() + " km", BODY));
                doc.add(sp(8));
            }

            doc.add(new Paragraph(type + " Terms", H2));
            doc.add(sp(4));
            PdfPTable t = new PdfPTable(2);
            t.setWidthPercentage(80);
            t.setWidths(new float[]{50, 50});

            BigDecimal vv = cents(offer.getVehicleValueCents());
            BigDecimal dp = cents(offer.getDownPaymentCents());
            BigDecimal mp = cents(offer.getMonthlyPaymentCents());

            addRow(t, "Vehicle Value (incl. VAT)", "CHF " + fmt(vv));
            BigDecimal vvExcl = vv.divide(BigDecimal.ONE.add(VAT), 2, RoundingMode.HALF_UP);
            BigDecimal vatAmt = vv.subtract(vvExcl);
            addRow(t, "  thereof VAT 8.1%", "CHF " + fmt(vatAmt));
            addRow(t, "  excl. VAT", "CHF " + fmt(vvExcl));
            addRow(t, "Down Payment", "CHF " + fmt(dp));

            if ("LEASING".equals(offer.getOfferType()) && offer.getResidualValueCents() != null) {
                BigDecimal rv = cents(offer.getResidualValueCents());
                String pctStr = offer.getResidualPct() != null ? " (" + offer.getResidualPct().toPlainString() + "%)" : "";
                addRow(t, "Residual Value (incl. VAT)" + pctStr, "CHF " + fmt(rv));
            }

            addRow(t, "Duration", offer.getDurationMonths() + " months");
            addRow(t, "Interest Rate", offer.getInterestRatePct().toPlainString() + "% p.a.");
            doc.add(t);
            doc.add(sp(14));

            doc.add(new Paragraph("Monthly Payment", BIG_BOLD));
            doc.add(new Paragraph("CHF " + fmt(mp) + " / month (incl. VAT)", BIG_BOLD));
            BigDecimal mpExcl = mp.divide(BigDecimal.ONE.add(VAT), 2, RoundingMode.HALF_UP);
            doc.add(new Paragraph("CHF " + fmt(mpExcl) + " / month (excl. VAT)", BODY));
            doc.add(sp(20));

            doc.add(new Paragraph("This offer is non-binding and valid for 14 days.", BODY));
            doc.add(sp(30));

            PdfPTable sig = new PdfPTable(2); sig.setWidthPercentage(100);
            sig.addCell(sigCell(CO)); if (client != null) { String cn = ((client.getFirstName() != null ? client.getFirstName() : "") + " " + (client.getLastName() != null ? client.getLastName() : "")).trim(); sig.addCell(sigCell(cn)); } else sig.addCell(sigCell("Client"));
            doc.add(sig);
            doc.add(sp(10));
            doc.add(new Paragraph(CO + " · " + ADDR + " · " + TEL, SMALL));

            doc.close();
            return baos.toByteArray();
        } catch (DocumentException e) { throw new IllegalStateException("PDF error", e); }
    }

    private static void addRow(PdfPTable t, String label, String val) {
        PdfPCell lc = new PdfPCell(new Phrase(label, BOLD9)); lc.setBorderColor(new Color(200, 208, 218)); lc.setPadding(5); t.addCell(lc);
        PdfPCell vc = new PdfPCell(new Phrase(val, BODY)); vc.setBorderColor(new Color(200, 208, 218)); vc.setPadding(5); vc.setHorizontalAlignment(Element.ALIGN_RIGHT); t.addCell(vc);
    }
    private static PdfPCell sigCell(String label) {
        PdfPCell c = new PdfPCell(); c.setBorder(0); c.setPadding(6);
        c.addElement(sp(20)); c.addElement(new Paragraph("________________________________________", BODY));
        c.addElement(new Paragraph(label, SMALL)); return c;
    }
    private static Paragraph sp(float h) { Paragraph p = new Paragraph(" "); p.setSpacingBefore(h); return p; }
    private static BigDecimal cents(Long c) { return BigDecimal.valueOf(c != null ? c : 0).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP); }
    private static String fmt(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
}
