package web.dto;

public record DashboardStatsResponse(
        int totalEmergencies,
        int unresolvedEmergencies,
        int availableUnits,
        int dispatchedUnits) {
}
