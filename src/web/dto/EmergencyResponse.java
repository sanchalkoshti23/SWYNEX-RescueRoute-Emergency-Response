package web.dto;

import model.Emergency;

public record EmergencyResponse(
        int id,
        String category,
        String location,
        String description,
        String status,
        Double latitude,
        Double longitude,
        Integer assignedUnitId) {

    public static EmergencyResponse from(Emergency emergency) {
        return new EmergencyResponse(
                emergency.getId(),
                emergency.getCategory(),
                emergency.getLocation(),
                emergency.getDescription(),
                emergency.getStatus(),
                emergency.getLatitude(),
                emergency.getLongitude(),
                emergency.getAssignedUnitId());
    }
}
