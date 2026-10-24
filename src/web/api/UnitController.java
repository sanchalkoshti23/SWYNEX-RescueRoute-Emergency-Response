package web.api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import service.EmergencyService;
import web.dto.UnitResponse;

@RestController
@RequestMapping("/api/units")
public class UnitController {
    private final EmergencyService emergencyService;

    public UnitController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    @GetMapping
    public List<UnitResponse> getUnits() {
        return emergencyService.getAllUnits().stream()
                .map(UnitResponse::from)
                .toList();
    }
}
