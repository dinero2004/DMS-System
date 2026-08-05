package com.example.dms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@SpringBootTest
@ActiveProfiles("test")
class DmsValuationMvpApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void contextLoads() {
    }

    @Test
    void seedDataIsAvailable() throws Exception {
        mockMvc.perform(get("/api/vehicles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].manufacturer", hasItem("BMW")))
                .andExpect(jsonPath("$[*].manufacturer", hasItem("Tesla")))
                .andExpect(jsonPath("$[*].manufacturer", hasItem("Toyota")));

        mockMvc.perform(get("/api/manufacturer-protocols"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].model", hasItem("3 Series")))
                .andExpect(jsonPath("$[*].model", hasItem("Model 3")))
                .andExpect(jsonPath("$[*].model", hasItem("Corolla")));
    }

    @Test
    void canCreateAndFetchVehicleServiceRecordAndManufacturerProtocol() throws Exception {
        String vehicleJson = """
                {
                  "vin": "TESTVIN0000000001",
                  "manufacturer": "Volkswagen",
                  "model": "Golf",
                  "modelYear": 2021,
                  "mileageKm": 42000,
                  "fuelType": "Petrol",
                  "transmission": "Manual",
                  "firstRegistrationDate": "2021-04-18",
                  "askingPrice": 18400.00
                }
                """;

        JsonNode vehicle = objectMapper.readTree(mockMvc.perform(post("/api/vehicles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(vehicleJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.vin").value("TESTVIN0000000001"))
                .andReturn()
                .getResponse()
                .getContentAsString());
        long vehicleId = vehicle.get("id").asLong();

        mockMvc.perform(get("/api/vehicles/{id}", vehicleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value("Golf"));

        String serviceRecordJson = """
                {
                  "vehicleId": %d,
                  "serviceDate": "2026-01-20",
                  "mileageKm": 43000,
                  "description": "Annual inspection and oil service",
                  "performedBy": "Demo Workshop",
                  "cost": 520.00
                }
                """.formatted(vehicleId);

        JsonNode serviceRecord = objectMapper.readTree(mockMvc.perform(post("/api/service-records")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(serviceRecordJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.vehicleId").value(vehicleId))
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(get("/api/service-records/{id}", serviceRecord.get("id").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Annual inspection and oil service"));

        String protocolJson = """
                {
                  "manufacturer": "Volkswagen",
                  "model": "Golf",
                  "generation": "Mk8",
                  "inspectionChecklist": "Check service history, DSG behavior if equipped, infotainment, brakes, tyres, and body condition.",
                  "knownIssues": "Inspect electronics, water ingress traces, and software update status.",
                  "valuationGuidance": "Trim, mileage, service history, and equipment level drive the MVP estimate."
                }
                """;

        JsonNode protocol = objectMapper.readTree(mockMvc.perform(post("/api/manufacturer-protocols")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(protocolJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.manufacturer").value("Volkswagen"))
                .andReturn()
                .getResponse()
                .getContentAsString());

        mockMvc.perform(get("/api/manufacturer-protocols/{id}", protocol.get("id").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generation").value("Mk8"));
    }

    @Test
    void canSuggestExplainableRuleBasedVehicleValuation() throws Exception {
        String requestJson = """
                {
                  "vehicleId": 1
                }
                """;

        mockMvc.perform(post("/api/vehicle-valuations/suggest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vehicleId").value(1))
                .andExpect(jsonPath("$.suggestedPrice").isNumber())
                .andExpect(jsonPath("$.confidenceScore", greaterThan(0)))
                .andExpect(jsonPath("$.positiveFactors", not(empty())))
                .andExpect(jsonPath("$.marketReferenceIds", not(empty())))
                .andExpect(jsonPath("$.serviceRecordCount", greaterThan(0)))
                .andExpect(jsonPath("$.manufacturerProtocolId").value(1))
                .andExpect(jsonPath("$.explanation").isString());
    }

    @Test
    void canUpdateVehicle() throws Exception {
        String updateJson = """
                {
                  "vin": "WBA8E9G50JNU12345",
                  "manufacturer": "BMW",
                  "model": "3 Series",
                  "modelYear": 2018,
                  "mileageKm": 83500,
                  "fuelType": "Petrol",
                  "transmission": "Automatic",
                  "firstRegistrationDate": "2018-06-12",
                  "askingPrice": 23900.00,
                  "ownerId": 1
                }
                """;

        mockMvc.perform(put("/api/vehicles/{id}", 1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mileageKm").value(83500))
                .andExpect(jsonPath("$.askingPrice").value(23900.00));
    }
}
