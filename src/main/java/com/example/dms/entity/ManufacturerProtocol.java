package com.example.dms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "manufacturer_protocols")
public class ManufacturerProtocol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String manufacturer;

    @Column(nullable = false)
    private String model;

    private String generation;

    @Column(nullable = false, length = 4000)
    private String inspectionChecklist;

    @Column(length = 4000)
    private String knownIssues;

    @Column(length = 4000)
    private String valuationGuidance;

    protected ManufacturerProtocol() {
    }

    public ManufacturerProtocol(String manufacturer, String model, String generation, String inspectionChecklist,
                                String knownIssues, String valuationGuidance) {
        this.manufacturer = manufacturer;
        this.model = model;
        this.generation = generation;
        this.inspectionChecklist = inspectionChecklist;
        this.knownIssues = knownIssues;
        this.valuationGuidance = valuationGuidance;
    }

    public Long getId() {
        return id;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getGeneration() {
        return generation;
    }

    public void setGeneration(String generation) {
        this.generation = generation;
    }

    public String getInspectionChecklist() {
        return inspectionChecklist;
    }

    public void setInspectionChecklist(String inspectionChecklist) {
        this.inspectionChecklist = inspectionChecklist;
    }

    public String getKnownIssues() {
        return knownIssues;
    }

    public void setKnownIssues(String knownIssues) {
        this.knownIssues = knownIssues;
    }

    public String getValuationGuidance() {
        return valuationGuidance;
    }

    public void setValuationGuidance(String valuationGuidance) {
        this.valuationGuidance = valuationGuidance;
    }
}
