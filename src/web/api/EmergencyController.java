package web.api;

import java.net.URI;
import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import model.Emergency;
import service.EmergencyService;
import web.dto.ApiErrorResponse;
import web.dto.EmergencyRequest;
import web.dto.EmergencyResponse;
import web.dto.SimulationPositionRequest;

@RestController
@RequestMapping("/api/emergencies")
public class EmergencyController {
    private static final List<String> VALID_CATEGORIES = List.of("ACCIDENT", "MEDICAL", "FIRE", "SECURITY");

    private final EmergencyService emergencyService;

    public EmergencyController(EmergencyService emergencyService) {
        this.emergencyService = emergencyService;
    }

    @GetMapping
    public List<EmergencyResponse> getEmergencies() {
        return emergencyService.getAllEmergencies().stream()
                .map(EmergencyResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEmergency(@PathVariable int id) {
        if (id <= 0) {
            return badRequest("Emergency ID must be a positive integer.");
        }

        Emergency emergency = emergencyService.findEmergencyById(id);
        if (emergency == null) {
            return notFound("Emergency " + id + " was not found.");
        }
        return ResponseEntity.ok(EmergencyResponse.from(emergency));
    }

    @PostMapping
    public ResponseEntity<?> createEmergency(@RequestBody EmergencyRequest request) {
        if (request == null) {
            return badRequest("An emergency request body is required.");
        }
        if (request.id() != null && request.id() <= 0) {
            return badRequest("Emergency ID must be a positive integer when supplied.");
        }
        if (request.category() == null || request.category().isBlank()) {
            return badRequest("Category is required. Use ACCIDENT, FIRE, MEDICAL, or SECURITY.");
        }

        String category = request.category().trim().toUpperCase(Locale.ROOT);
        if (!VALID_CATEGORIES.contains(category)) {
            return badRequest("Invalid category. Use ACCIDENT, FIRE, MEDICAL, or SECURITY.");
        }
        if ((request.latitude() == null) != (request.longitude() == null)) {
            return badRequest("Latitude and longitude must be supplied together.");
        }
        if (request.latitude() != null && !isWithinMaharashtra(request.latitude(), request.longitude())) {
            return badRequest("Emergency coordinates must be within the supported Maharashtra map area.");
        }
        if (request.latitude() == null && (request.location() == null || request.location().isBlank())) {
            return badRequest("Location is required.");
        }

        int emergencyId = request.id() == null ? emergencyService.nextEmergencyId() : request.id();
        Emergency emergency = new Emergency(
                emergencyId,
                category,
                request.location() == null || request.location().isBlank()
                        ? String.format(Locale.ROOT, "%.5f, %.5f", request.latitude(), request.longitude())
                        : request.location().trim(),
                request.description() == null ? "" : request.description().trim(),
                request.latitude(),
                request.longitude());
        if (!emergencyService.addEmergency(emergency)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiErrorResponse("An emergency with ID " + emergencyId + " already exists."));
        }

        return ResponseEntity.created(URI.create("/api/emergencies/" + emergency.getId()))
                .body(EmergencyResponse.from(emergency));
    }

    @PostMapping("/{id}/dispatch")
    public ResponseEntity<?> dispatchEmergency(@PathVariable int id) {
        if (id <= 0) {
            return badRequest("Emergency ID must be a positive integer.");
        }

        Emergency emergency = emergencyService.findEmergencyById(id);
        if (emergency == null) {
            return notFound("Emergency " + id + " was not found.");
        }
        if (!"REPORTED".equals(emergency.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiErrorResponse(
                            "Emergency " + id + " cannot be dispatched from status " + emergency.getStatus() + "."));
        }
        if (!emergencyService.dispatchUnit(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiErrorResponse(
                            "Dispatch failed. No available unit may be compatible with this emergency."));
        }

        return ResponseEntity.ok(EmergencyResponse.from(emergencyService.findEmergencyById(id)));
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<?> resolveEmergency(@PathVariable int id) {
        if (id <= 0) {
            return badRequest("Emergency ID must be a positive integer.");
        }

        Emergency emergency = emergencyService.findEmergencyById(id);
        if (emergency == null) {
            return notFound("Emergency " + id + " was not found.");
        }
        if (!emergencyService.updateEmergencyStatus(id, "RESOLVED")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiErrorResponse("Emergency " + id + " could not be resolved in its current state."));
        }

        return ResponseEntity.ok(EmergencyResponse.from(emergencyService.findEmergencyById(id)));
    }

    @PostMapping("/{id}/arrive")
    public ResponseEntity<?> arriveEmergency(@PathVariable int id) {
        if (id <= 0) {
            return badRequest("Emergency ID must be a positive integer.");
        }
        Emergency emergency = emergencyService.findEmergencyById(id);
        if (emergency == null) {
            return notFound("Emergency " + id + " was not found.");
        }
        if (!emergencyService.updateEmergencyStatus(id, "ARRIVED")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiErrorResponse("Emergency " + id + " cannot be marked arrived from status "
                            + emergency.getStatus() + "."));
        }
        return ResponseEntity.ok(EmergencyResponse.from(emergencyService.findEmergencyById(id)));
    }

    @PostMapping("/{id}/simulation-position")
    public ResponseEntity<?> updateSimulationPosition(
            @PathVariable int id,
            @RequestBody SimulationPositionRequest request) {
        if (id <= 0) {
            return badRequest("Emergency ID must be a positive integer.");
        }
        if (request == null || request.latitude() == null || request.longitude() == null
                || !isWithinMaharashtra(request.latitude(), request.longitude())) {
            return badRequest("A valid simulated position within the Maharashtra map area is required.");
        }
        Emergency emergency = emergencyService.findEmergencyById(id);
        if (emergency == null) {
            return notFound("Emergency " + id + " was not found.");
        }
        if (!emergencyService.updateSimulationPosition(id, request.latitude(), request.longitude())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiErrorResponse("Emergency " + id + " has no active dispatched unit to update."));
        }
        return ResponseEntity.ok(EmergencyResponse.from(emergencyService.findEmergencyById(id)));
    }

    @PostMapping("/{id}/simulation-reset")
    public ResponseEntity<?> resetSimulation(@PathVariable int id) {
        if (id <= 0) {
            return badRequest("Emergency ID must be a positive integer.");
        }
        Emergency emergency = emergencyService.findEmergencyById(id);
        if (emergency == null) {
            return notFound("Emergency " + id + " was not found.");
        }
        if (!emergencyService.resetSimulationPosition(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiErrorResponse("Only an active dispatch with a simulated unit can be reset."));
        }
        return ResponseEntity.ok(EmergencyResponse.from(emergencyService.findEmergencyById(id)));
    }

    private boolean isWithinMaharashtra(double latitude, double longitude) {
        return Double.isFinite(latitude) && Double.isFinite(longitude)
                && latitude >= 15.5 && latitude <= 22.1
                && longitude >= 72.5 && longitude <= 80.9;
    }

    private ResponseEntity<ApiErrorResponse> badRequest(String message) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(message));
    }

    private ResponseEntity<ApiErrorResponse> notFound(String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiErrorResponse(message));
    }
}
