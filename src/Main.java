import java.util.ArrayList;
import java.util.Locale;
import java.util.Scanner;

import model.Emergency;
import model.EmergencyUnit;
import model.units.Ambulance;
import model.units.FireTruck;
import model.units.PoliceVehicle;
import service.EmergencyService;

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        EmergencyService emergencyService = new EmergencyService();
        boolean running = true;

        while (running) {
            displayMenu();
            int choice = readInteger(scanner, "Choose an option: ");

            switch (choice) {
                case 1:
                    reportNewEmergency(scanner, emergencyService);
                    break;
                case 2:
                    viewAllEmergencies(emergencyService);
                    break;
                case 3:
                    searchEmergency(scanner, emergencyService);
                    break;
                case 4:
                    registerEmergencyUnit(scanner, emergencyService);
                    break;
                case 5:
                    viewAllUnits(emergencyService);
                    break;
                case 6:
                    dispatchUnit(scanner, emergencyService);
                    break;
                case 7:
                    updateEmergencyStatus(scanner, emergencyService);
                    break;
                case 8:
                    System.out.println(emergencyService.getReport());
                    break;
                case 9:
                    running = false;
                    break;
                default:
                    System.out.println("Invalid menu choice. Please choose 1 through 9.");
            }
        }

        scanner.close();
        System.out.println("RescueRoute closed.");
    }

    private static void displayMenu() {
        System.out.println("\n=== RescueRoute Emergency Response ===");
        System.out.println("1. Report New Emergency");
        System.out.println("2. View All Emergencies");
        System.out.println("3. Search Emergency by ID");
        System.out.println("4. Register Emergency Unit");
        System.out.println("5. View All Units");
        System.out.println("6. Dispatch Unit");
        System.out.println("7. Update Emergency Status");
        System.out.println("8. Generate Report");
        System.out.println("9. Exit");
    }

    private static void reportNewEmergency(Scanner scanner, EmergencyService service) {
        int id = readPositiveInteger(scanner, "Emergency ID: ");
        System.out.print("Category (MEDICAL, FIRE, SECURITY): ");
        String category = scanner.nextLine().trim().toUpperCase(Locale.ROOT);
        if (!category.equals("MEDICAL") && !category.equals("FIRE") && !category.equals("SECURITY")) {
            System.out.println("Invalid category. Emergency was not added.");
            return;
        }

        System.out.print("Location: ");
        String location = scanner.nextLine().trim();
        System.out.print("Description: ");
        String description = scanner.nextLine().trim();

        Emergency emergency = new Emergency(id, category, location, description);
        if (service.addEmergency(emergency)) {
            System.out.println("Emergency reported successfully.");
        } else {
            System.out.println("An emergency with that ID already exists.");
        }
    }

    private static void viewAllEmergencies(EmergencyService service) {
        ArrayList<Emergency> emergencies = service.getAllEmergencies();
        if (emergencies.isEmpty()) {
            System.out.println("No emergencies have been reported.");
            return;
        }

        for (Emergency emergency : emergencies) {
            System.out.println(emergency);
        }
    }

    private static void searchEmergency(Scanner scanner, EmergencyService service) {
        int id = readPositiveInteger(scanner, "Emergency ID to search: ");
        Emergency emergency = service.findEmergencyById(id);
        if (emergency == null) {
            System.out.println("Emergency not found.");
        } else {
            System.out.println(emergency);
        }
    }

    private static void registerEmergencyUnit(Scanner scanner, EmergencyService service) {
        int id = readPositiveInteger(scanner, "Unit ID: ");
        System.out.print("Unit type (AMBULANCE, FIRETRUCK, POLICE): ");
        String unitType = scanner.nextLine().trim().toUpperCase(Locale.ROOT);

        EmergencyUnit unit;
        switch (unitType) {
            case "AMBULANCE":
                unit = new Ambulance(id);
                break;
            case "FIRETRUCK":
                unit = new FireTruck(id);
                break;
            case "POLICE":
                unit = new PoliceVehicle(id);
                break;
            default:
                System.out.println("Invalid unit type. Unit was not registered.");
                return;
        }

        if (service.addUnit(unit)) {
            System.out.println("Emergency unit registered successfully.");
        } else {
            System.out.println("A unit with that ID already exists.");
        }
    }

    private static void viewAllUnits(EmergencyService service) {
        ArrayList<EmergencyUnit> units = service.getAllUnits();
        if (units.isEmpty()) {
            System.out.println("No emergency units have been registered.");
            return;
        }

        for (EmergencyUnit unit : units) {
            System.out.println(unit + " | Availability: " + (unit.isAvailable() ? "Available" : "Unavailable"));
        }
    }

    private static void dispatchUnit(Scanner scanner, EmergencyService service) {
        int emergencyId = readPositiveInteger(scanner, "Emergency ID to dispatch: ");
        if (service.dispatchUnit(emergencyId)) {
            System.out.println("A suitable unit was dispatched successfully.");
        } else {
            System.out.println("Dispatch failed. Check the emergency status and unit availability.");
        }
    }

    private static void updateEmergencyStatus(Scanner scanner, EmergencyService service) {
        int emergencyId = readPositiveInteger(scanner, "Emergency ID to resolve: ");
        System.out.print("Enter ARRIVED for a dispatched unit, or RESOLVED for an arrived unit: ");
        String status = scanner.nextLine().trim().toUpperCase(Locale.ROOT);

        if (!status.equals("ARRIVED") && !status.equals("RESOLVED")) {
            System.out.println("Enter ARRIVED or RESOLVED. A unit must be dispatched before arrival and arrival recorded before resolution.");
            return;
        }

        if (service.updateEmergencyStatus(emergencyId, status)) {
            System.out.println("Emergency status updated to " + status + ".");
        } else {
            System.out.println("Could not resolve emergency. Check the emergency ID and current status.");
        }
    }

    private static int readPositiveInteger(Scanner scanner, String prompt) {
        while (true) {
            int value = readInteger(scanner, prompt);
            if (value > 0) {
                return value;
            }
            System.out.println("Please enter a positive integer.");
        }
    }

    private static int readInteger(Scanner scanner, String prompt) {
        while (true) {
            System.out.print(prompt);
            String input = scanner.nextLine().trim();
            try {
                return Integer.parseInt(input);
            } catch (NumberFormatException exception) {
                System.out.println("Invalid input. Please enter a whole number.");
            }
        }
    }
}