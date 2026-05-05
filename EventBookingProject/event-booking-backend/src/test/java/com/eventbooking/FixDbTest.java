package com.eventbooking;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class FixDbTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    public void runFix() {
        System.out.println("====== STARTING FULL DATA RESET ======");
        try {
            // Disable FK checks so we can delete in any order
            jdbc.execute("SET FOREIGN_KEY_CHECKS=0");

            // Clear all transactional tables
            jdbc.execute("TRUNCATE TABLE attendees");
            System.out.println("✓ attendees cleared");
            jdbc.execute("TRUNCATE TABLE bookings");
            System.out.println("✓ bookings cleared");
            jdbc.execute("TRUNCATE TABLE notifications");
            System.out.println("✓ notifications cleared");
            
            // Event join tables
            try { jdbc.execute("TRUNCATE TABLE event_expenses"); } catch(Exception ignored) {}
            try { jdbc.execute("TRUNCATE TABLE event_organizing_depts"); } catch(Exception ignored) {}
            try { jdbc.execute("TRUNCATE TABLE event_target_departments"); } catch(Exception ignored) {}
            try { jdbc.execute("TRUNCATE TABLE event_target_years"); } catch(Exception ignored) {}
            try { jdbc.execute("TRUNCATE TABLE event_photos"); } catch(Exception ignored) {}
            try { jdbc.execute("TRUNCATE TABLE event_coordinators"); } catch(Exception ignored) {}
            System.out.println("✓ event join tables cleared");

            // Clear events
            jdbc.execute("TRUNCATE TABLE events");
            System.out.println("✓ events cleared");

            // Delete all non-admin users
            int deleted = jdbc.update("DELETE FROM users WHERE role != 'ADMIN'");
            System.out.println("✓ " + deleted + " non-admin users removed");

            // Re-enable FK checks
            jdbc.execute("SET FOREIGN_KEY_CHECKS=1");

            // Schema fixes
            try { jdbc.execute("ALTER TABLE bookings MODIFY status VARCHAR(50)"); System.out.println("✓ bookings.status widened"); } catch(Exception e) { System.out.println("  bookings.status OK"); }
            try { jdbc.execute("ALTER TABLE bookings MODIFY payment_status VARCHAR(50)"); System.out.println("✓ bookings.payment_status widened"); } catch(Exception e) { System.out.println("  bookings.payment_status OK"); }
            try { jdbc.execute("ALTER TABLE events MODIFY image_url LONGTEXT"); System.out.println("✓ events.image_url widened"); } catch(Exception e) { System.out.println("  events.image_url OK"); }

            System.out.println("====== RESET COMPLETE ======");
        } catch (Exception e) {
            try { jdbc.execute("SET FOREIGN_KEY_CHECKS=1"); } catch(Exception ignored) {}
            e.printStackTrace();
            System.out.println("====== RESET FAILED — see above ======");
        }
    }
}
