package model.units;

import model.EmergencyUnit;

public class Ambulance extends EmergencyUnit {

    public Ambulance(int id) {
        super(id, "Ambulance");
    }

    public Ambulance(int id, double latitude, double longitude) {
        super(id, "Ambulance", latitude, longitude);
    }

    private Ambulance(Ambulance source) {
        super(source);
    }

    @Override
    public Ambulance copy() {
        return new Ambulance(this);
    }

    @Override
    public void respond() {
        System.out.println("Ambulance is providing medical assistance.");
    }
}