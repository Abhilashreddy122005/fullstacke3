import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class FixDb {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/event_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
        String user = "root";
        String pass = "Abhi@122005";

        try {
            Connection conn = DriverManager.getConnection(url, user, pass);
            Statement stmt = conn.createStatement();
            
            System.out.println("Altering status column...");
            stmt.executeUpdate("ALTER TABLE bookings MODIFY status VARCHAR(50);");
            
            System.out.println("Altering payment_status column...");
            stmt.executeUpdate("ALTER TABLE bookings MODIFY payment_status VARCHAR(50);");
            
            System.out.println("Success!");
            stmt.close();
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
