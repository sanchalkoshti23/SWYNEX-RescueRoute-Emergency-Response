package model;

public abstract class EmergencyUnit {
    private final int id;
    private final String unitType;
    private boolean available = true;
    private double latitude;
    private double longitude;
    private final double startingLatitude;
    private final double startingLongitude;
    private final boolean simulatedLocation;

    public EmergencyUnit(int id, String unitType) {
        this(id, unitType, 0, 0, false);
    }

    public EmergencyUnit(int id, String unitType, double latitude, double longitude) {
        this(id, unitType, latitude, longitude, true);
    }

    private EmergencyUnit(int id, String unitType, double latitude, double longitude, boolean simulatedLocation) {
        if (id <= 0) {
            throw new IllegalArgumentException("Unit ID must be a positive integer.");
        }
        if (unitType == null || unitType.isBlank()) {
            throw new IllegalArgumentException("Unit type is required.");
        }
        this.id = id;
        this.unitType = unitType;
        this.simulatedLocation = simulatedLocation;
        this.startingLatitude = latitude;
        this.startingLongitude = longitude;
        if (simulatedLocation) {
            setSimulationCoordinates(latitude, longitude);
        }
    }

    protected EmergencyUnit(EmergencyUnit source) {
        id = source.id;
        unitType = source.unitType;
        available = source.available;
        latitude = source.latitude;
        longitude = source.longitude;
        startingLatitude = source.startingLatitude;
        startingLongitude = source.startingLongitude;
        simulatedLocation = source.simulatedLocation;
    }

    public int getId() {
        return id;
    }

    public String getUnitType() {
        return unitType;
    }

    public boolean isAvailable() {
        return available;
    }

    public boolean markDispatched() {
        if (!available) {
            return false;
        }
        available = false;
        return true;
    }

    public void release() {
        available = true;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public boolean hasCoordinates() {
        return simulatedLocation;
    }

    public void setSimulationCoordinates(double latitude, double longitude) {
        if (!simulatedLocation) {
            throw new IllegalStateException("This unit has no simulated location.");
        }
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < 15.5 || latitude > 22.1 || longitude < 72.5 || longitude > 80.9) {
            throw new IllegalArgumentException("Simulated unit coordinates must be within the Maharashtra map area.");
        }
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void resetSimulationCoordinates() {
        if (simulatedLocation) {
            latitude = startingLatitude;
            longitude = startingLongitude;
        }
    }

    public abstract void respond();

    public abstract EmergencyUnit copy();

    @Override
    public String toString() {
        return "EmergencyUnit{" +
                "id=" + id +
                ", unitType='" + unitType + '\'' +
                ", available=" + available +
                '}';
    }
}