package service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Comparator;
import java.util.stream.Collectors;

import model.Emergency;
import model.EmergencyUnit;
import model.units.Ambulance;
import model.units.FireTruck;
import model.units.PoliceVehicle;

public class EmergencyService {
    private ArrayList<Emergency> emergencies;
    private ArrayList<EmergencyUnit> units;
    private Map<Integer, EmergencyUnit> assignedUnits;

    public EmergencyService() {
        emergencies = new ArrayList<>();
        units = new ArrayList<>();
        assignedUnits = new HashMap<>();
    }

    public synchronized boolean addEmergency(Emergency emergency) {
        if (emergency == null || findEmergencyInternal(emergency.getId()) != null) {
            return false;
        }
        emergencies.add(emergency.copy());
        return true;
    }

    public synchronized ArrayList<Emergency> getAllEmergencies() {
        return emergencies.stream()
                .map(Emergency::copy)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public synchronized Emergency findEmergencyById(int id) {
        Emergency emergency = findEmergencyInternal(id);
        return emergency == null ? null : emergency.copy();
    }

    private Emergency findEmergencyInternal(int id) {
        for (Emergency emergency : emergencies) {
            if (emergency.getId() == id) {
                return emergency;
            }
        }
        return null;
    }

    public synchronized boolean addUnit(EmergencyUnit unit) {
        if (unit == null) {
            return false;
        }
        for (EmergencyUnit existingUnit : units) {
            if (existingUnit.getId() == unit.getId()) {
                return false;
            }
        }
        units.add(unit.copy());
        return true;
    }

    public synchronized ArrayList<EmergencyUnit> getAllUnits() {
        return units.stream()
                .map(EmergencyUnit::copy)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public synchronized int getDispatchedUnitCount() {
        return assignedUnits.size();
    }

    public synchronized int nextEmergencyId() {
        return emergencies.stream().mapToInt(Emergency::getId).max().orElse(0) + 1;
    }

    public synchronized boolean dispatchUnit(int emergencyId) {
        Emergency emergency = findEmergencyInternal(emergencyId);
        if (emergency == null
                || !"REPORTED".equals(emergency.getStatus())
                || assignedUnits.containsKey(emergencyId)) {
            return false;
        }

        EmergencyUnit unit = units.stream()
                .filter(EmergencyUnit::isAvailable)
                .filter(candidate -> isCompatibleUnit(emergency, candidate))
                .min(Comparator.comparingDouble(candidate -> distanceFromEmergency(emergency, candidate)))
                .orElse(null);
        if (unit == null) {
            return false;
        }
        if (!unit.markDispatched()) {
            return false;
        }
        if (!emergency.dispatchTo(unit.getId())) {
            unit.release();
            return false;
        }
        assignedUnits.put(emergencyId, unit);
        unit.respond();
        return true;
    }

    public synchronized boolean updateEmergencyStatus(int emergencyId, String newStatus) {
        Emergency emergency = findEmergencyInternal(emergencyId);
        if (emergency == null) {
            return false;
        }

        if ("ARRIVED".equals(newStatus)) {
            return assignedUnits.containsKey(emergencyId) && emergency.markArrived();
        }
        if (!"RESOLVED".equals(newStatus) || !assignedUnits.containsKey(emergencyId)
                || !emergency.resolve()) {
            return false;
        }

        EmergencyUnit assignedUnit = assignedUnits.remove(emergencyId);
        assignedUnit.release();
        return true;
    }

    public synchronized boolean updateSimulationPosition(int emergencyId, double latitude, double longitude) {
        Emergency emergency = findEmergencyInternal(emergencyId);
        EmergencyUnit unit = assignedUnits.get(emergencyId);
        if (emergency == null || unit == null || !unit.hasCoordinates()
                || !"DISPATCHED".equals(emergency.getStatus())) {
            return false;
        }
        try {
            unit.setSimulationCoordinates(latitude, longitude);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public synchronized boolean resetSimulationPosition(int emergencyId) {
        Emergency emergency = findEmergencyInternal(emergencyId);
        EmergencyUnit unit = assignedUnits.get(emergencyId);
        if (emergency == null || unit == null || !"DISPATCHED".equals(emergency.getStatus())
                || !unit.hasCoordinates()) {
            return false;
        }
        unit.resetSimulationCoordinates();
        return true;
    }

    public synchronized String getReport() {
        int unresolvedEmergencies = 0;
        int availableUnits = 0;
        for (Emergency emergency : emergencies) {
            if (!"RESOLVED".equals(emergency.getStatus())) {
                unresolvedEmergencies++;
            }
        }
        for (EmergencyUnit unit : units) {
            if (unit.isAvailable()) {
                availableUnits++;
            }
        }

        return "Total emergencies: " + emergencies.size()
                + "\nUnresolved emergencies: " + unresolvedEmergencies
                + "\nAvailable units: " + availableUnits
                + "\nCurrently assigned units: " + assignedUnits.size();
    }

    private boolean isCompatibleUnit(Emergency emergency, EmergencyUnit unit) {
        String category = emergency.getCategory();
        return (("MEDICAL".equals(category) || "ACCIDENT".equals(category)) && unit instanceof Ambulance)
                || ("FIRE".equals(category) && unit instanceof FireTruck)
                || ("SECURITY".equals(category) && unit instanceof PoliceVehicle);
    }

    private double distanceFromEmergency(Emergency emergency, EmergencyUnit unit) {
        if (!emergency.hasCoordinates() || !unit.hasCoordinates()) {
            return Double.POSITIVE_INFINITY;
        }
        double earthRadiusKm = 6371;
        double lat1 = Math.toRadians(unit.getLatitude());
        double lat2 = Math.toRadians(emergency.getLatitude());
        double latitudeDelta = lat2 - lat1;
        double longitudeDelta = Math.toRadians(emergency.getLongitude() - unit.getLongitude());
        double haversine = Math.pow(Math.sin(latitudeDelta / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(longitudeDelta / 2), 2);
        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    }

}