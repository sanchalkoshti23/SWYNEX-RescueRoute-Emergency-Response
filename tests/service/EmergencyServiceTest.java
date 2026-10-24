package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import model.Emergency;
import model.units.Ambulance;
import model.units.FireTruck;

class EmergencyServiceTest {
    @Test
    void dispatchesClosestCompatibleAvailableUnitAndCompletesLifecycle() {
        EmergencyService service = new EmergencyService();
        Ambulance farther = new Ambulance(1001, 19.0760, 72.8777);
        Ambulance nearer = new Ambulance(1002, 18.5204, 73.8567);
        service.addUnit(farther);
        service.addUnit(nearer);
        Emergency emergency = new Emergency(1, "ACCIDENT", "Pune", "", 18.5300, 73.8600);
        assertTrue(service.addEmergency(emergency));

        assertTrue(service.dispatchUnit(1));
        assertEquals(1002, service.findEmergencyById(1).getAssignedUnitId());
        assertTrue(findUnit(service, 1001).isAvailable());
        assertFalse(findUnit(service, 1002).isAvailable());
        assertEquals("DISPATCHED", service.findEmergencyById(1).getStatus());
        assertFalse(service.updateEmergencyStatus(1, "RESOLVED"));
        assertFalse(service.updateEmergencyStatus(1, "DISPATCHED"));
        assertTrue(service.updateSimulationPosition(1, 18.5250, 73.8580));
        assertTrue(service.updateEmergencyStatus(1, "ARRIVED"));
        assertTrue(service.updateEmergencyStatus(1, "RESOLVED"));
        assertEquals("RESOLVED", service.findEmergencyById(1).getStatus());
        assertTrue(findUnit(service, 1002).isAvailable());
        assertEquals(0, service.getDispatchedUnitCount());
    }

    @Test
    void rejectsUnavailableAndDuplicateAssignments() {
        EmergencyService service = new EmergencyService();
        Ambulance ambulance = new Ambulance(1001, 18.5204, 73.8567);
        service.addUnit(ambulance);
        service.addEmergency(new Emergency(1, "MEDICAL", "Pune", "", 18.52, 73.85));
        service.addEmergency(new Emergency(2, "ACCIDENT", "Pune", "", 18.53, 73.86));

        assertTrue(service.dispatchUnit(1));
        assertFalse(service.dispatchUnit(1));
        assertFalse(service.dispatchUnit(2));
        assertEquals(1, service.getDispatchedUnitCount());
    }

    @Test
    void choosesOnlyTheUnitTypeSuitableForEmergency() {
        EmergencyService service = new EmergencyService();
        Ambulance ambulance = new Ambulance(1001, 18.5204, 73.8567);
        FireTruck fireTruck = new FireTruck(2001, 19.9975, 73.7898);
        service.addUnit(ambulance);
        service.addUnit(fireTruck);
        Emergency fire = new Emergency(1, "FIRE", "Nashik", "", 19.99, 73.78);
        service.addEmergency(fire);

        assertTrue(service.dispatchUnit(1));
        assertEquals(2001, service.findEmergencyById(1).getAssignedUnitId());
        assertTrue(findUnit(service, 1001).isAvailable());
    }

    @Test
    void rejectsOutOfRegionAndIncompleteCoordinates() {
        assertThrows(IllegalArgumentException.class, () -> new Emergency(1, "MEDICAL", "Pune", "", 18.5, 81.0));
        assertThrows(IllegalArgumentException.class, () -> new Emergency(1, "MEDICAL", "Pune", "", null, 73.8));
        assertThrows(IllegalArgumentException.class,
                () -> new Emergency(1, "MEDICAL", "Pune", "", Double.NaN, 73.8));
        assertThrows(IllegalArgumentException.class, () -> new Emergency(0, "MEDICAL", "Pune", ""));
        assertThrows(IllegalArgumentException.class, () -> new Emergency(1, "OTHER", "Pune", ""));
        assertThrows(IllegalArgumentException.class, () -> new Ambulance(0));
        assertThrows(IllegalArgumentException.class, () -> new FireTruck(-1, 19.0, 73.0));
    }

    @Test
    void resetReturnsAnActiveVehicleToItsConfiguredDemoOrigin() {
        EmergencyService service = new EmergencyService();
        Ambulance ambulance = new Ambulance(1001, 18.5204, 73.8567);
        service.addUnit(ambulance);
        service.addEmergency(new Emergency(1, "MEDICAL", "Pune", "", 18.53, 73.86));
        assertTrue(service.dispatchUnit(1));
        assertTrue(service.updateSimulationPosition(1, 18.525, 73.858));

        assertTrue(service.resetSimulationPosition(1));

        assertEquals(18.5204, findUnit(service, 1001).getLatitude());
        assertEquals(73.8567, findUnit(service, 1001).getLongitude());
    }

    @Test
    void registrationAndReadResultsAreDetachedCopies() {
        EmergencyService service = new EmergencyService();
        Emergency emergency = new Emergency(1, "MEDICAL", "Pune", "", 18.52, 73.85);
        Ambulance ambulance = new Ambulance(1001, 18.5204, 73.8567);
        service.addEmergency(emergency);
        service.addUnit(ambulance);

        emergency.dispatchTo(9999);
        ambulance.markDispatched();
        ambulance.setSimulationCoordinates(19.0, 74.0);

        assertEquals("REPORTED", service.findEmergencyById(1).getStatus());
        assertTrue(findUnit(service, 1001).isAvailable());
        assertEquals(18.5204, findUnit(service, 1001).getLatitude());

        Emergency emergencySnapshot = service.findEmergencyById(1);
        Ambulance unitSnapshot = (Ambulance) findUnit(service, 1001);
        emergencySnapshot.dispatchTo(8888);
        unitSnapshot.markDispatched();
        unitSnapshot.setSimulationCoordinates(20.0, 75.0);
        service.getAllEmergencies().clear();
        service.getAllUnits().clear();

        assertEquals("REPORTED", service.findEmergencyById(1).getStatus());
        assertNull(service.findEmergencyById(1).getAssignedUnitId());
        assertTrue(findUnit(service, 1001).isAvailable());
        assertEquals(18.5204, findUnit(service, 1001).getLatitude());
    }

    @Test
    void unpositionedUnitsCannotReceiveSimulatedCoordinates() {
        Ambulance ambulance = new Ambulance(1001);
        assertFalse(ambulance.hasCoordinates());
        assertThrows(IllegalStateException.class, () -> ambulance.setSimulationCoordinates(18.5, 73.8));
        EmergencyService service = new EmergencyService();
        service.addUnit(ambulance);
        service.addEmergency(new Emergency(1, "MEDICAL", "Pune", ""));
        assertFalse(service.updateSimulationPosition(1, 18.5, 73.8));
    }

    @Test
    void modelLifecycleOperationsRejectInvalidTransitions() {
        Emergency emergency = new Emergency(1, "MEDICAL", "Pune", "");

        assertFalse(emergency.markArrived());
        assertFalse(emergency.resolve());
        assertFalse(emergency.dispatchTo(0));
        assertTrue(emergency.dispatchTo(1001));
        assertFalse(emergency.dispatchTo(1002));
        assertTrue(emergency.markArrived());
        assertFalse(emergency.markArrived());
        assertTrue(emergency.resolve());
        assertFalse(emergency.resolve());
    }

    @Test
    void unitCopiesPreserveTheirConcreteTypesAndState() {
        EmergencyService service = new EmergencyService();
        service.addUnit(new Ambulance(1001, 18.52, 73.85));
        service.addUnit(new FireTruck(2001, 19.99, 73.78));
        service.addUnit(new model.units.PoliceVehicle(3001, 16.70, 74.24));

        assertTrue(findUnit(service, 1001) instanceof Ambulance);
        assertTrue(findUnit(service, 2001) instanceof FireTruck);
        assertTrue(findUnit(service, 3001) instanceof model.units.PoliceVehicle);
        assertEquals(16.70, findUnit(service, 3001).getLatitude());
    }

    private model.EmergencyUnit findUnit(EmergencyService service, int id) {
        return service.getAllUnits().stream()
                .filter(unit -> unit.getId() == id)
                .findFirst()
                .orElseThrow();
    }
}
