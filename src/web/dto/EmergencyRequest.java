package web.dto;

public record EmergencyRequest(
        Integer id,
        String category,
        String location,
        String description,
        Double latitude,
        Double longitude) {
}
