package web.dto;

import model.EmergencyUnit;

public record UnitResponse(int id, String unitType, boolean available, double latitude, double longitude, boolean simulatedLocation) {

    public static UnitResponse from(EmergencyUnit unit) {
        return new UnitResponse(unit.getId(), unit.getUnitType(), unit.isAvailable(),
                unit.getLatitude(), unit.getLongitude(), unit.hasCoordinates());
    }
}
