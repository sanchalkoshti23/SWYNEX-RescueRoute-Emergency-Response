package model;

import java.util.Locale;
import java.util.Set;

public class Emergency {
    private static final Set<String> VALID_CATEGORIES = Set.of("ACCIDENT", "MEDICAL", "FIRE", "SECURITY");

    private final int id;
    private final String category;
    private final String location;
    private final String description;
    private String status;
    private Double latitude;
    private Double longitude;
    private Integer assignedUnitId;

    public Emergency(int id, String category, String location, String description) {
        this(id, category, location, description, null, null);
    }

    public Emergency(int id, String category, String location, String description, Double latitude, Double longitude) {
        if (id <= 0) {
            throw new IllegalArgumentException("Emergency ID must be a positive integer.");
        }
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("Emergency category is required.");
        }
        String normalizedCategory = category.trim().toUpperCase(Locale.ROOT);
        if (!VALID_CATEGORIES.contains(normalizedCategory)) {
            throw new IllegalArgumentException("Invalid emergency category.");
        }
        this.id = id;
        this.category = normalizedCategory;
        this.location = location;
        this.description = description == null ? "" : description;
        this.status = "REPORTED";
        setCoordinates(latitude, longitude);
    }

    private Emergency(Emergency source) {
        this(source.id, source.category, source.location, source.description, source.latitude, source.longitude);
        this.status = source.status;
        this.assignedUnitId = source.assignedUnitId;
    }

    public Emergency copy() {
        return new Emergency(this);
    }

    public int getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public String getLocation() {
        return location;
    }

    public String getDescription() {
        return description;
    }

    public String getStatus() {
        return status;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public Integer getAssignedUnitId() {
        return assignedUnitId;
    }

    public boolean hasCoordinates() {
        return latitude != null && longitude != null;
    }

    private void setCoordinates(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("Latitude and longitude must be supplied together.");
        }
        if (latitude != null && (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < 15.5 || latitude > 22.1 || longitude < 72.5 || longitude > 80.9)) {
            throw new IllegalArgumentException("Coordinates must be within the supported Maharashtra map area.");
        }
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public boolean dispatchTo(int assignedUnitId) {
        if (assignedUnitId <= 0 || !"REPORTED".equals(status)) {
            return false;
        }
        this.assignedUnitId = assignedUnitId;
        this.status = "DISPATCHED";
        return true;
    }

    public boolean markArrived() {
        if (!"DISPATCHED".equals(status) || assignedUnitId == null) {
            return false;
        }
        status = "ARRIVED";
        return true;
    }

    public boolean resolve() {
        if (!"ARRIVED".equals(status) || assignedUnitId == null) {
            return false;
        }
        status = "RESOLVED";
        return true;
    }

    @Override
    public String toString() {
        return "Emergency{" +
                "id=" + id +
                ", category='" + category + '\'' +
                ", location='" + location + '\'' +
                ", description='" + description + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}