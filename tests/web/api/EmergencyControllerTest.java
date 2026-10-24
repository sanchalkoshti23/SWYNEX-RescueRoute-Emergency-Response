package web.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import service.EmergencyService;
import web.dto.ApiErrorResponse;
import web.dto.EmergencyRequest;
import web.dto.EmergencyResponse;
import web.dto.SimulationPositionRequest;

class EmergencyControllerTest {
    @Test
    void createsCoordinateReportWithGeneratedIdAndOptionalDescription() {
        EmergencyController controller = new EmergencyController(new EmergencyService());
        ResponseEntity<?> response = controller.createEmergency(
                new EmergencyRequest(null, "ACCIDENT", "Pune", null, 18.52, 73.85));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        EmergencyResponse emergency = assertInstanceOf(EmergencyResponse.class, response.getBody());
        assertEquals(1, emergency.id());
        assertEquals(18.52, emergency.latitude());
        assertEquals("", emergency.description());
        assertEquals("REPORTED", emergency.status());
    }

    @Test
    void rejectsInvalidTypeAndCoordinates() {
        EmergencyController controller = new EmergencyController(new EmergencyService());
        ResponseEntity<?> invalidType = controller.createEmergency(
                new EmergencyRequest(null, "OTHER", "Pune", "", 18.52, 73.85));
        ResponseEntity<?> invalidCoordinates = controller.createEmergency(
                new EmergencyRequest(null, "FIRE", "Pune", "", 18.52, 81.0));

        assertEquals(HttpStatus.BAD_REQUEST, invalidType.getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, invalidCoordinates.getStatusCode());
        assertInstanceOf(ApiErrorResponse.class, invalidCoordinates.getBody());
    }

    @Test
    void acceptsLegacyLocationOnlyReportsWithoutInventingCoordinates() {
        EmergencyController controller = new EmergencyController(new EmergencyService());
        ResponseEntity<?> response = controller.createEmergency(
                new EmergencyRequest(24, "MEDICAL", "Pune", "Legacy API client", null, null));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        EmergencyResponse emergency = assertInstanceOf(EmergencyResponse.class, response.getBody());
        assertEquals(24, emergency.id());
        assertEquals(null, emergency.latitude());
        assertEquals(null, emergency.longitude());
    }

    @Test
    void rejectsResolutionUntilArrivalHasBeenRecorded() {
        EmergencyService service = new EmergencyService();
        service.addUnit(new model.units.Ambulance(1001, 18.52, 73.85));
        service.addEmergency(new model.Emergency(1, "MEDICAL", "Pune", "", 18.53, 73.86));
        service.dispatchUnit(1);
        EmergencyController controller = new EmergencyController(service);

        ResponseEntity<?> response = controller.resolveEmergency(1);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void recordsArrivalAndRejectsInvalidSimulationPositions() {
        EmergencyService service = new EmergencyService();
        service.addUnit(new model.units.Ambulance(1001, 18.52, 73.85));
        service.addEmergency(new model.Emergency(1, "MEDICAL", "Pune", "", 18.53, 73.86));
        EmergencyController controller = new EmergencyController(service);

        ResponseEntity<?> dispatched = controller.dispatchEmergency(1);
        ResponseEntity<?> badPosition = controller.updateSimulationPosition(
                1, new SimulationPositionRequest(18.53, 81.0));
        ResponseEntity<?> arrived = controller.arriveEmergency(1);
        ResponseEntity<?> resolved = controller.resolveEmergency(1);

        assertEquals(HttpStatus.OK, dispatched.getStatusCode());
        EmergencyResponse dispatchedEmergency = assertInstanceOf(EmergencyResponse.class, dispatched.getBody());
        assertEquals("DISPATCHED", dispatchedEmergency.status());
        assertEquals(1001, dispatchedEmergency.assignedUnitId());
        assertEquals(HttpStatus.BAD_REQUEST, badPosition.getStatusCode());
        assertEquals(HttpStatus.OK, arrived.getStatusCode());
        assertEquals("ARRIVED", ((EmergencyResponse) arrived.getBody()).status());
        assertEquals(HttpStatus.OK, resolved.getStatusCode());
        assertEquals("RESOLVED", ((EmergencyResponse) resolved.getBody()).status());
        assertEquals("RESOLVED", service.findEmergencyById(1).getStatus());
        org.junit.jupiter.api.Assertions.assertTrue(service.getAllUnits().get(0).isAvailable());
    }
}
