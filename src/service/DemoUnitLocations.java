package service;

import java.util.Map;

public final class DemoUnitLocations {
    public record Coordinates(double latitude, double longitude) {
    }

    private static final Map<Integer, Coordinates> LOCATIONS = Map.of(
            1001, new Coordinates(18.5204, 73.8567),
            1002, new Coordinates(19.0760, 72.8777),
            2001, new Coordinates(19.9975, 73.7898),
            2002, new Coordinates(21.1458, 79.0882),
            3001, new Coordinates(16.7050, 74.2433),
            3002, new Coordinates(20.9374, 77.7796));

    private DemoUnitLocations() {
    }

    public static Coordinates forUnit(int unitId) {
        Coordinates coordinates = LOCATIONS.get(unitId);
        if (coordinates == null) {
            throw new IllegalArgumentException("No demonstration location configured for unit " + unitId + ".");
        }
        return coordinates;
    }
}
