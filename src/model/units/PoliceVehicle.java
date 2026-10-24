package model.units;

import model.EmergencyUnit;

public class PoliceVehicle extends EmergencyUnit {

    public PoliceVehicle(int id) {
        super(id, "PoliceVehicle");
    }

    public PoliceVehicle(int id, double latitude, double longitude) {
        super(id, "PoliceVehicle", latitude, longitude);
    }

    private PoliceVehicle(PoliceVehicle source) {
        super(source);
    }

    @Override
    public PoliceVehicle copy() {
        return new PoliceVehicle(this);
    }

    @Override
    public void respond() {
        System.out.println("Police vehicle is responding to a security emergency.");
    }
}