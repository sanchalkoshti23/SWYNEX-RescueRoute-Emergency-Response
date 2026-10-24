package web.api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import model.Emergency;
import model.EmergencyUnit;
import service.EmergencyService;
import web.dto.DashboardStatsResponse;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final EmergencyService emergencyService;

    public DashboardController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    @GetMapping("/stats")
    public DashboardStatsResponse getStats() {
        List<Emergency> emergencies = emergencyService.getAllEmergencies();
        List<EmergencyUnit> units = emergencyService.getAllUnits();

        int unresolvedEmergencies = 0;
        for (Emergency emergency : emergencies) {
            if (!"RESOLVED".equals(emergency.getStatus())) {
                unresolvedEmergencies++;
            }
        }

        int availableUnits = 0;
        for (EmergencyUnit unit : units) {
            if (unit.isAvailable()) {
                availableUnits++;
            }
        }

        return new DashboardStatsResponse(
                emergencies.size(),
                unresolvedEmergencies,
                availableUnits,
                emergencyService.getDispatchedUnitCount());
    }
}
