\# 🚑 RescueRoute — Emergency Response System



\## About the Project



RescueRoute is a Java-based emergency response simulation system developed as part of the SWYNEX Java Developer Internship.



It provides an interactive web dashboard for reporting emergencies, dispatching suitable emergency units, visualizing routes, and simulating emergency vehicle movement.



The project demonstrates the four pillars of Object-Oriented Programming (OOP) through a practical application.



\## Features



\- Report and view emergencies.

\- Manage ambulances, fire trucks, and police vehicles.

\- Dispatch appropriate available emergency units.

\- Prevent an already-dispatched unit from being assigned to another emergency.

\- Display emergency routes on a map.

\- Simulate emergency vehicle movement.

\- Start, pause, and resume vehicle movement.

\- Track vehicle arrival.

\- Resolve emergencies and release assigned units.

\- Display dashboard statistics.

\- Handle API errors.

\- Run automated tests.



\## Technologies Used



\- Java

\- Spring Boot

\- Maven

\- HTML

\- CSS

\- JavaScript

\- REST APIs

\- Git and GitHub



\## Object-Oriented Programming Concepts



\### 1. Encapsulation



Encapsulation protects an object's internal state and controls access to its data through methods and validation.



In RescueRoute, emergency and emergency-unit objects manage their state through controlled operations.



\### 2. Inheritance



Inheritance allows a class to reuse and extend the functionality of another class.



The `Ambulance`, `FireTruck`, and `PoliceVehicle` classes extend the common `EmergencyUnit` class.



\### 3. Abstraction



Abstraction hides unnecessary implementation details and exposes essential functionality.



The common emergency-unit design provides a shared structure for working with different emergency-unit types.



\### 4. Polymorphism



Polymorphism allows different object types to be handled through a common parent type while providing type-specific behavior where implemented.



RescueRoute uses the common `EmergencyUnit` type to work with different emergency-unit implementations.



\## Emergency Response Workflow



1\. Report an emergency.

2\. View emergency details.

3\. Dispatch an appropriate available unit.

4\. Display the route to the emergency location.

5\. Start the vehicle simulation.

6\. Pause or resume the simulation.

7\. Track the vehicle's arrival.

8\. Resolve the emergency.

9\. Release the assigned unit for future emergencies.



\## Project Structure



```text

SWYNEX-RescueRoute-Emergency-Response/

├── pom.xml

├── .gitignore

├── README.md

├── src/

│   ├── Main.java

│   ├── model/

│   │   ├── Emergency.java

│   │   ├── EmergencyUnit.java

│   │   └── units/

│   │       ├── Ambulance.java

│   │       ├── FireTruck.java

│   │       └── PoliceVehicle.java

│   ├── service/

│   │   ├── DemoUnitLocations.java

│   │   └── EmergencyService.java

│   ├── web/

│   │   ├── RescueRouteApplication.java

│   │   ├── api/

│   │   └── dto/

│   └── main/resources/static/

│       ├── index.html

│       ├── style.css

│       └── app.js

└── tests/

```



\## Prerequisites



Install the following before running the application:



\- Java Development Kit (JDK)

\- Apache Maven

\- A modern web browser



\## How to Run the Project



\### 1. Clone the repository



```bash

git clone https://github.com/sanchalkoshti23/SWYNEX-RescueRoute-Emergency-Response.git

```



\### 2. Open the project directory



```bash

cd SWYNEX-RescueRoute-Emergency-Response

```



\### 3. Run the tests



```bash

mvn test

```



\### 4. Start the application



```bash

mvn spring-boot:run

```



\### 5. Open the dashboard



Visit:



http://localhost:8080/



Keep the terminal open while using the application.



\## Testing



The project includes automated tests for emergency-service functionality and REST API behavior.



Run the tests with:



```bash

mvn test

```



Check the Maven output for `BUILD SUCCESS` and confirm that no tests failed.



\## Limitations



\- Vehicle movement is simulated and does not represent real-time GPS tracking.

\- Emergency and dispatch data is stored in application memory and resets when the application restarts.

\- Route display depends on the routing implementation and external routing-service availability.

\- This is an educational simulation, not a production emergency dispatch

