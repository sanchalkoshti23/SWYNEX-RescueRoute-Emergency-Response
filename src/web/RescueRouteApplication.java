package web;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import model.EmergencyUnit;
import model.units.Ambulance;
import model.units.FireTruck;
import model.units.PoliceVehicle;
import service.EmergencyService;
import service.DemoUnitLocations;

@SpringBootApplication
public class RescueRouteApplication {

    public static void main(String[] args) {
        SpringApplication.run(RescueRouteApplication.class, args);
    }

    @Bean
    public EmergencyService emergencyService() {
        EmergencyService emergencyService = new EmergencyService();
        registerUnitIfMissing(emergencyService, new Ambulance(1001,
                DemoUnitLocations.forUnit(1001).latitude(), DemoUnitLocations.forUnit(1001).longitude()));
        registerUnitIfMissing(emergencyService, new Ambulance(1002,
                DemoUnitLocations.forUnit(1002).latitude(), DemoUnitLocations.forUnit(1002).longitude()));
        registerUnitIfMissing(emergencyService, new FireTruck(2001,
                DemoUnitLocations.forUnit(2001).latitude(), DemoUnitLocations.forUnit(2001).longitude()));
        registerUnitIfMissing(emergencyService, new FireTruck(2002,
                DemoUnitLocations.forUnit(2002).latitude(), DemoUnitLocations.forUnit(2002).longitude()));
        registerUnitIfMissing(emergencyService, new PoliceVehicle(3001,
                DemoUnitLocations.forUnit(3001).latitude(), DemoUnitLocations.forUnit(3001).longitude()));
        registerUnitIfMissing(emergencyService, new PoliceVehicle(3002,
                DemoUnitLocations.forUnit(3002).latitude(), DemoUnitLocations.forUnit(3002).longitude()));
        return emergencyService;
    }

    private void registerUnitIfMissing(EmergencyService emergencyService, EmergencyUnit unit) {
        boolean alreadyRegistered = emergencyService.getAllUnits().stream()
                .anyMatch(existingUnit -> existingUnit.getId() == unit.getId());
        if (!alreadyRegistered && !emergencyService.addUnit(unit)) {
            throw new IllegalStateException("Could not register default emergency unit " + unit.getId());
        }
    }
}
