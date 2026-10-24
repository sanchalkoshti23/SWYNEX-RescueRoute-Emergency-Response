package model.units;

import model.EmergencyUnit;

public class FireTruck extends EmergencyUnit {

    public FireTruck(int id) {
        super(id, "FireTruck");
    }

    public FireTruck(int id, double latitude, double longitude) {
        super(id, "FireTruck", latitude, longitude);
    }

    private FireTruck(FireTruck source) {
        super(source);
    }

    @Override
    public FireTruck copy() {
        return new FireTruck(this);
    }

    @Override
    public void respond() {
        System.out.println("Fire truck is responding to a fire emergency.");
    }
}